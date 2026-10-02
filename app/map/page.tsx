'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

function MapRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams(searchParams ? searchParams.toString() : '');
    params.set('canvas', 'true');
    router.replace(`/?${params.toString()}`);
  }, [router, searchParams]);

  return (
    <div className="w-screen h-screen bg-slate-50 flex flex-col items-center justify-center text-sky-700 gap-3 font-mono text-sm">
      <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
      <span>Launching Whole Canvas Railway Map...</span>
    </div>
  );
}

export default function MapPage() {
  return (
    <Suspense fallback={
      <div className="w-screen h-screen bg-slate-50 flex flex-col items-center justify-center text-sky-700 gap-3 font-mono text-sm">
        <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
        <span>Initializing Map Canvas...</span>
      </div>
    }>
      <MapRedirect />
    </Suspense>
  );
}
