# Connecting the live AI backend

The public GitHub Pages site is static. It cannot run Python or safely hold the Volcengine Ark API key. The AI API must run as a separate HTTPS web service.

## Safe deployment plan

1. Keep the source repository `Rcorange29/loopmove` private.
2. In Render, connect your GitHub account and create a new Blueprint from that private repository. Select branch `hack4sdg-genai-deploy`; the `render.yaml` file configures the Python service, health check, and runtime settings.
3. In the Render service environment settings, set `ARK_API_KEY` to the existing Volcengine Ark API key. Do not commit the value to GitHub or place it in the public repository. Keep `ARK_MODEL` as `doubao-seed-2-1-lite-260915` unless you have verified another model ID is enabled for this account.
4. Wait for the deployment to finish. Open `https://YOUR-SERVICE.onrender.com/api/health`. Confirm `status` is `ok` and `api_key_configured` is `true`. This health check confirms configuration, not that a model request has succeeded.
5. In this public repository's `config.js`, set `window.LOOPMOVE_API_BASE` to the service's HTTPS origin, with no trailing slash. Example: `window.LOOPMOVE_API_BASE = "https://loopmove-ai-api.onrender.com";`
6. Publish the `genai-backend-integration` branch to GitHub Pages for testing first. Do not merge it into `main` until the end-to-end checks pass.

## Required end-to-end checks

- Upload a new, non-sample room photo and confirm the response reflects objects actually in that photo.
- Confirm the browser Network panel shows a successful `POST /api/recognize` to the Render domain, with a real JSON response and no API key in the request.
- Use the smart arrangement flow and confirm `POST /api/arrange` returns one valid date for every movable item.
- Generate the moving explanation and confirm `POST /api/plan` returns text.
- Test a deliberately invalid image and verify the UI reports failure rather than presenting sample output as live AI.
- Test the published GitHub Pages URL, not only a local copy.

## Important limitations

- The current API key and model access have not yet been verified from a live deployment. A successful health check alone does not prove provider authentication or image inference.
- Render's free web services can spin down after inactivity, so the first AI request may be delayed. If the deadline demo must be reliable, deploy and warm the service shortly before judging, and keep a clearly labelled static/demo fallback.
- Do not expose every repository. The public demo needs the front-end files and this deployment guide; the model key must remain a server-side secret.

## Current repository and updated planning API

The old `Rcorange29/loopmove` repository has been removed. Updated backend source now lives in **Rcorange29/loopmove-demo**, root file `ai_service.py`.

After this branch's changes are pushed, reconnect the **existing** Render service `loopmove-ai-api` to `Rcorange29/loopmove-demo`, branch `genai-backend-integration`. Root directory: empty. Build command: `pip install -r requirements.txt`. Start command: `python ai_service.py`. Health check: `/api/health`. Keep the existing `ARK_API_KEY` server environment setting; do not copy it into this repository or chat. Keep the same service URL so config.js remains valid.

The updated health response includes `capabilities` with `dispose`, `plan`, `multilingual` and `recognize_bbox`. The previous service's health response does not prove these new features exist.

New `POST /api/dispose`: request `{language, dest, items:[{id,name,kind,vol}]}`; response `{language, items:[{id,handle,reason}], provider,model,request_id}`. `handle` is sell/donate/recycle. The front end only sends undecided leave-behind items, validates IDs and actions, and ignores stale responses.

Updated `POST /api/plan`: request `{language,dest,dates,items:[{id,name,kind,vol,bucket,handle,fixed}]}`; response includes `text` and the exact requested `language`. The old endpoint returns generic Chinese text and lacks this language contract; the front end rejects it rather than presenting it as a valid current plan.

Manual mode cancels pending requests, clears plan/disposal state and date assignments, keeps inventory and fixed-fixture classifications, and suppresses AI controls and packing guidance. The plan editor is an editable note; item cards remain authoritative, and draft edits do not silently alter dates.

No new backend deployment has been performed by this local change. After deploying, verify genuine inference for disposal and plan plus all three recognition languages and accurate image boxes. Missing model coordinates remain unboxed, with manual correction available.
