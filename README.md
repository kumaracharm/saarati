# EntitleIQ

EntitleIQ is a scholarship discovery and eligibility prototype for students in India.

## 1. Overview and safety notes

- **Prototype status.** The scheme catalogue contains DEMONSTRATION data only. It has three fictional schemes, each marked "[DEMO]". No real scheme information is included.
- **Deterministic rules.** Eligibility is decided by a deterministic Python rule engine. Each rule gives one outcome: PASS, FAIL, UNKNOWN, or NOT_APPLICABLE. The overall status is one of: likely_eligible, potential_match, or not_matched.
- **No promises.** The app never promises approval. Results are indicative only.
- **Browser storage.** Data is kept in browser storage only.

## 2. Prerequisites

- Windows with PowerShell
- Python 3.11 or newer
- Node.js 20 or newer, with npm

## 3. Backend setup (PowerShell)

Run these commands from the workspace root:

```powershell
cd backend
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

- If activation is blocked, run this once, then retry the activation step:

  ```powershell
  Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
  ```

- The `.env` file is optional. The defaults work without it.
- Never commit `.env` to git.

## 4. Run the backend tests

With the backend folder as the current directory and the virtual environment active:

```powershell
python -m pytest -v
```

There are 29 tests in `backend/tests/`.

## 5. Start the backend server

```powershell
python -m uvicorn app.main:app --reload --port 8000
```

Then check these URLs in your browser:

- http://localhost:8000/health
- http://localhost:8000/docs

The backend has these endpoints:

- `GET /health`
- `GET /api/schemes`
- `GET /api/schemes/{scheme_id}`
- `POST /api/extract`
- `POST /api/match`

## 6. Frontend setup (new PowerShell window)

Open a new PowerShell window, then run:

```powershell
cd frontend
npm install
```

Optional. Only set this if the backend runs somewhere other than the default:

```powershell
$env:NEXT_PUBLIC_API_BASE_URL = "http://localhost:8000"
```

## 7. Start the frontend dev server

```powershell
npm run dev
```

Then open http://localhost:3000 in your browser.

The frontend uses the Next.js App Router with TypeScript and Tailwind. Its pages are:

- `/`
- `/profile`
- `/results`
- `/schemes`
- `/schemes/[id]`
- `/tracker`

## 8. Production check for the frontend

```powershell
npm run build
npm run start
```

## 9. Configuration reference

Backend settings go in `backend/.env`. Every key is optional.

| Key | Default | Purpose |
| --- | --- | --- |
| `CORS_ORIGINS` | `http://localhost:3000` | Allowed frontend origin(s) |
| `AI_PROVIDER` | `mock` | Extraction provider. `mock` is the default. |
| `NEXON_API_KEY` | not set | Nexon API key |
| `NEXON_BASE_URL` | not set | Nexon API base URL |

Nexon is NOT connected. If `NEXON_API_KEY` and `NEXON_BASE_URL` are not both set, `POST /api/extract` returns 503. Even when both are set, the HTTP integration raises `NotImplementedError`.

Secrets must never be committed. Keep API keys in `.env` only, and do not commit that file.

## 10. Project layout

```text
backend/     FastAPI + Pydantic API, rule engine, JSON scheme data, pytest tests
frontend/    Next.js + TypeScript + Tailwind web app
README.md    This file
```

## 11. Known limitations

- The scheme catalogue is demonstration data only.
- Extraction uses the mock provider only. Nexon is not connected.
- There is no database. Schemes are stored in a JSON file. SQLite is planned.
- Saved items and statuses live in one browser only.
- There is no authentication.
- Eligibility results are indicative only.
