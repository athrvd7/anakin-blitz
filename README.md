# WebMind Agent

Developer intelligence dashboard from `PRD.md`: ask a plain-English research question, watch the agent plan sources, stream source cards, then read a verdict.

## Run

Backend:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env
uvicorn main:app --reload
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

Without API keys, `/api/query` streams realistic demo data so the UI works immediately.
Use `MISTRAL_API_KEY` for tool planning, source summaries, and verdicts.

If Anakin gives a full Wire task endpoint, set `WIRE_TASK_URL` in `backend/.env`.
If Wire action IDs differ from the PRD names, override them with `WIRE_ACTION_*` values from `.env.example`.
