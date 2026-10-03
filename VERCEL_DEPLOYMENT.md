#  Vercel Deployment Guide — DTRS Mapping System (SIH 26028)

This directory is **100% pre-configured and optimized for seamless zero-config deployment on Vercel**.

---

##  Quick Deployment (3 Methods)

### Method 2: Deploy via GitHub / GitLab / Bitbucket

1. Initialize git and commit:
   ```bash
   git init
   git add .
   git commit -m "feat: vercel deployment ready mapping system"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git push -u origin main
   ```
2. Go to [https://vercel.com/new](https://vercel.com/new).
3. Import your GitHub repository.
4. **Vercel will automatically detect**:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: `./`
   - **Build Command**: `next build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`
5. Click **Deploy**.

---

## ️ Environment Variables (Optional)

Configure these in the Vercel Dashboard under **Project Settings  Environment Variables**:

| Variable | Recommended Vercel Value | Description |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` | Base URL of your deployed application |
| `ALLOWED_ORIGIN` | `*` | Allowed CORS origins for external iframe/API access |
| `RAILRADAR_API_KEY` | `rg_421f6723c553455db33d5340235d0814` | RailRadar Real-Time GPS API Key |
| `RAILRADAR_API_URL` | `https://api.railradar.in/v1` | RailRadar API endpoint |

*(Note: SQLite database uses `./data/treta_railway.db` bundled automatically and mirrored into `/tmp` for writable serverless execution).*

---

## ️ Key Architectural Optimizations Applied for Vercel

1. **Root Directory Readiness**:
   - `package.json`, `next.config.mjs`, `tsconfig.json`, `vercel.json`, and `.gitignore` are located at the root so Vercel builds out-of-the-box.

2. **Serverless SQLite Compatibility (`lib/db.ts`)**:
   - Vercel Serverless Functions execute on a read-only filesystem (AWS Lambda).
   - The application automatically initializes a writable SQLite replica into `/tmp/treta_railway.db` upon cold-start, enabling dynamic ETA prediction writes, delay simulation events, and live telemetry updates without permission errors.
   - Includes graceful fallback to readonly mode.

3. **Node File Tracing (`next.config.mjs`)**:
   - Added `outputFileTracingIncludes: { '/api/**': ['./data/**/*'] }` so Vercel's bundler guarantees `treta_railway.db` is packaged with every serverless function deployment.
   - Added `serverExternalPackages: ['better-sqlite3']` so native bindings compile cleanly on Linux x64 Lambda runtime.

4. **Edge-to-Edge Full Canvas View**:
   - Dedicated full-canvas route: `/map` or `/?canvas=true` for embedding in iframes or standalone dashboards with 0 margin, 0 padding, and full viewport responsiveness.
