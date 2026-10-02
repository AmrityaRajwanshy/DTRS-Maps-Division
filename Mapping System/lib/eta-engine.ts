import type { TrainStop, DelayEvent, ETAPredictionResult, DelayAttributionSummary } from './types';
export type { ETAPredictionResult, DelayAttributionSummary };


// Add minutes to HH:MM format
export function addMinutesToTimeString(timeStr: string, minutes: number): string {
  const parts = timeStr.split(' ')[0].split(':');
  let h = parseInt(parts[0], 10);
  let m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return timeStr;

  let totalMinutes = h * 60 + m + Math.round(minutes);
  while (totalMinutes < 0) totalMinutes += 24 * 60;
  const newH = Math.floor((totalMinutes % (24 * 60)) / 60);
  const newM = Math.floor(totalMinutes % 60);

  return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
}

/**
 * Recalculates ETA predictions across all stops for a train given active delay events.
 * Mathematical propagation model:
 * PropagatedDelay(i) = PropagatedDelay(i-1) + InjectedDelay(i) - SlackRecovery(i)
 */
export function calculatePropagatedETA(
  stops: TrainStop[],
  delayEvents: DelayEvent[],
  currentStopSequence: number = 2
): { predictions: ETAPredictionResult[]; attribution: DelayAttributionSummary } {
  // Sort stops by sequence
  const sortedStops = [...stops].sort((a, b) => a.stop_sequence - b.stop_sequence);

  // Group injected delays by station code
  const injectedDelayByStation = new Map<string, DelayEvent>();
  for (const event of delayEvents) {
    injectedDelayByStation.set(event.station_code, event);
  }

  let runningDelay = 0;
  let totalInjected = 0;
  let totalRecovered = 0;
  const predictions: ETAPredictionResult[] = [];
  const breakdown: DelayAttributionSummary['breakdown'] = [];

  let primaryStation = '';
  let primaryCause = 'ON_TIME';
  let primaryDesc = 'Normal operations';
  let highestDelay = 0;

  for (let i = 0; i < sortedStops.length; i++) {
    const stop = sortedStops[i];
    const seq = stop.stop_sequence;
    const sched = stop.scheduled_arrival || stop.scheduled_departure;

    // Check if this station injected a new delay
    const injected = injectedDelayByStation.get(stop.station_code);
    let addedDelayThisStop = 0;
    let causeType = 'ON_TIME';
    let causeDesc = 'Operating per schedule';

    if (injected) {
      addedDelayThisStop = injected.delay_minutes;
      runningDelay += addedDelayThisStop;
      totalInjected += addedDelayThisStop;
      causeType = injected.cause_type;
      causeDesc = injected.cause_description;

      if (injected.delay_minutes > highestDelay) {
        highestDelay = injected.delay_minutes;
        primaryStation = stop.station_name;
        primaryCause = injected.cause_type;
        primaryDesc = injected.cause_description;
      }
    }

    // Determine recovery buffer on subsequent downstream sectors
    let recoveredMinutes = 0;
    if (runningDelay > 0 && i > 0 && !injected) {
      // Distance-based recovery: trains with schedule slack can recover ~1-2 mins per 150-200 km
      const distance = (stop.distance_km - sortedStops[i - 1].distance_km) || 100;
      const recoveryRate = 0.015; // 1.5% of distance in minutes
      recoveredMinutes = Math.min(Math.round(distance * recoveryRate), 2);
      recoveredMinutes = Math.min(recoveredMinutes, runningDelay); // Can't recover more than active delay

      runningDelay -= recoveredMinutes;
      totalRecovered += recoveredMinutes;

      if (runningDelay > 0) {
        causeType = 'PROPAGATED_RECOVERY';
        causeDesc = `Propagated delay from upstream sector (${recoveredMinutes}m buffer recovered)`;
      } else {
        causeType = 'RECOVERED_ON_TIME';
        causeDesc = 'Timetable buffer fully absorbed upstream delay';
      }
    } else if (runningDelay > 0 && !injected) {
      causeType = 'PROPAGATED';
      causeDesc = 'Propagated downstream delay from previous halt';
    }

    const predictedEta = runningDelay > 0 ? addMinutesToTimeString(sched, runningDelay) : sched;

    // Confidence decays slightly with distance from current position
    const distanceStep = Math.abs(seq - currentStopSequence);
    const confidence = Math.max(0.75, Math.min(0.96, 0.95 - (distanceStep * 0.02)));

    const status = seq < currentStopSequence ? 'COMPLETED' : (seq === currentStopSequence ? 'CURRENT' : 'UPCOMING');

    predictions.push({
      station_code: stop.station_code,
      station_name: stop.station_name,
      stop_sequence: seq,
      scheduled_time: sched,
      predicted_eta: predictedEta,
      delay_minutes: runningDelay,
      delay_delta_minutes: addedDelayThisStop - recoveredMinutes,
      cause_type: causeType,
      cause_description: causeDesc,
      confidence: parseFloat(confidence.toFixed(2)),
      recovery_buffer_minutes: recoveredMinutes,
      is_delayed: runningDelay > 0,
      status
    });

    breakdown.push({
      station_code: stop.station_code,
      station_name: stop.station_name,
      delay_added: addedDelayThisStop,
      delay_absorbed: recoveredMinutes,
      cumulative_delay: runningDelay,
      reason: causeDesc
    });
  }

  // Generate SIH 26028 Delay Responsibility Attribution Summary
  const netDestDelay = predictions[predictions.length - 1]?.delay_minutes || 0;
  const delayedStopsCount = predictions.filter(p => p.delay_minutes > 0).length;

  let recommendation = 'Traffic flow normal. Standard dispatch protocol active.';
  if (primaryCause === 'PRECEDING_TRAIN' || primaryCause === 'CONGESTION') {
    recommendation = `Dynamic loop precedence recommended at ${primaryStation} to grant priority to high-speed rake.`;
  } else if (primaryCause === 'SIGNAL_HALT') {
    recommendation = `Verify section interlocking and auto-signaling clearance on upcoming block section.`;
  } else if (primaryCause === 'MAINTENANCE_BLOCK') {
    recommendation = `Speed restriction active. Adjust downstream dwell times to maintain overall sectional throughput.`;
  }

  const attribution: DelayAttributionSummary = {
    train_number: sortedStops[0]?.train_number || '',
    total_delay_minutes: totalInjected,
    primary_cause_station: primaryStation || (sortedStops[0]?.station_name ?? 'N/A'),
    primary_cause_type: primaryCause,
    primary_cause_description: primaryDesc,
    confidence: 0.91,
    stations_affected: delayedStopsCount,
    recovered_minutes: totalRecovered,
    net_destination_delay_minutes: netDestDelay,
    recommendation,
    breakdown
  };

  return { predictions, attribution };
}
