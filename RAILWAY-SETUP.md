# Railway deployment and recovery notes

This bundle contains the complete original Standard Response source at commit
6d80afc612c005e4b263ce0e8ee819703611368e, plus these deployment notes.
Original project: https://github.com/Imhaohao/Standard-Response
Original authors retain their attribution. The upstream README describes upstream
results and capabilities; those are not new results from this Railway repair.

Live app: https://web-production-d0f204de.up.railway.app/dashboard

## What is included
- Next.js interface: app/, components/, lib/, public/
- Convex database schema, queries, mutations, and simulation: convex/
- Real-call server: voice/
- Python dispatch optimizer: dispatch/
- Tests, evaluation scripts, sample data, package manifests and lockfile

No live database, phone contacts, API keys, deployment admin keys, node_modules,
or local environment files are included.

## Local development
1. Install Node.js compatible with the pinned Next.js version and Python for the optimizer.
2. Run npm ci.
3. Configure a separate development Convex deployment using npx convex dev.
4. Put that development deployment URL in .env.local as NEXT_PUBLIC_CONVEX_URL.
5. Run npm run dev and open /dashboard at the localhost URL printed by Next.js.
6. Keep the stand-in switches enabled for simulated calls and dispatch.

Use a separate development backend: pointing a local UI at production changes
production data. Real calling additionally needs the provider credentials listed
in voice/env.ts and a deployed voice server. Real calling was not verified in the
Railway recovery test.

## Repaired Railway architecture
The original web service and public dashboard URL were retained. The existing
public Convex backend endpoint now runs Caddy and proxies to a clean private
Convex backend. The previous backend volume was preserved for recovery.

Services:
- web: npm ci, npm run build, then npm run start
- convex-backend: image caddy:2.10.2-alpine; healthcheck /version
- convex-recovery: pinned Convex image; start ./run_backend.sh; persistent
  /convex/data volume; private endpoint convex-recovery.railway.internal
- voice: original voice/Dockerfile; provider credentials are configured separately
- solver: original dispatch/Dockerfile; real solver configuration is separate

Caddy start command:
  caddy reverse-proxy --from :3210 --to http://convex-recovery.railway.internal:3210

Convex image:
  ghcr.io/convex/convex-backend@sha256:edf5c02b395b17d58d0e494b401855da72bc01dda934e45552d6790fe430f368

For a fresh installation, create a new INSTANCE_NAME and INSTANCE_SECRET and
configure CONVEX_CLOUD_ORIGIN and CONVEX_SITE_ORIGIN for your deployment. Keep
secrets in Railway variables. The accompanying non-secret JSON lists the resource
settings used during recovery. It is a reference, not a Railway import template.

Deploy Convex functions to a newly configured self-hosted backend using the
Convex CLI and a private env file containing CONVEX_SELF_HOSTED_URL and
CONVEX_SELF_HOSTED_ADMIN_KEY. Never commit that file.

## Verification performed during recovery
- Ready Check created 189 household profiles out of 200 simulated households.
- Issue evacuation warning started outreach; all 200 households completed it.
- Dispatch generated offers, vehicles moved, and over 70 neighbor pickups completed.
- Driver page and rescue map loaded with live simulated state.
- Rewind restored both start buttons and preserved Ready Check profiles.
- Backend memory was about 364 MB at the last observed sample, below its 1 GB cap.

These are observed simulation results, not a guarantee about future uptime or
real emergency operations. The live database state can change after this test.

## Put this code in your own GitHub repo
Create an empty private repository, extract this ZIP, open a terminal in the
standard-response folder, then run:

  git init -b main
  git add .
  git commit -m "Import Standard Response source and Railway deployment notes"
  git remote add origin https://github.com/YOUR_USERNAME/standard-response.git
  git push -u origin main

Replace YOUR_USERNAME with your GitHub username. Preserve the upstream credit.
Do not change the running Railway services' source until you intend to deploy
from your new repository.
