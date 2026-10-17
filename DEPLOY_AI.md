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
