
# Hoax Monitoring System UI

Frontend for the Hoax Monitoring System.

## Running the UI

From the repo root:

```powershell
npm run dev
```

From the UI folder directly:

```powershell
cd "Hoax Monitoring UI"
npm run dev
```

The development API base URL is loaded from `.env.development.local` and currently points to `http://127.0.0.1:5000`.

## Production

Build the frontend:

```powershell
cd "Hoax Monitoring UI"
node .\node_modules\vite\bin\vite.js build
```

For same-domain hosting, leave `VITE_API_URL` empty in `.env.production`.
For a separate backend domain, set `VITE_API_URL=https://api.your-domain.com`.
