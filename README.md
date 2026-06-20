# WebMind Agent

Developer intelligence dashboard for researching tools, libraries, papers, and technical topics. Ask one plain-English question, watch the agent choose sources, stream live result cards, and read a synthesized verdict.

## Features

- Agent-visible source plan and reasoning trace
- Live Wire source cards for GitHub, Reddit, Hacker News, and arXiv
- Mistral-powered tool planning, per-source summaries, and final verdicts
- Source confidence badges, source links, result filtering, copy verdict, and markdown export
- Demo fallback mode when API keys are missing

## Run Locally

Backend:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env
.venv/bin/uvicorn main:app --reload
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## Environment

Set these in `backend/.env`:

```env
MISTRAL_API_KEY=
MISTRAL_MODEL=mistral-small-latest
WIRE_API_KEY=
ANAKIN_SCRAPER_API_KEY=
WIRE_BASE_URL=https://api.anakin.io/v1/wire
WIRE_TASK_URL=https://api.anakin.io/v1/wire/task
WIRE_ACTION_REDDIT_SEARCH=rt_search
WIRE_ACTION_HACKERNEWS_SEARCH=hn_search
WIRE_ACTION_GITHUB_SEARCH_REPOS=gh_search_repos
WIRE_ACTION_GITHUB_REPO=gh_repo_details
WIRE_ACTION_ARXIV_SEARCH=ax_search_papers
SCRAPER_BASE_URL=https://api.anakin.io/v1/scrape
```

`backend/.env` is ignored by git. Do not commit keys.

## Useful Checks

```bash
cd backend
.venv/bin/python check_wire.py
.venv/bin/python -m py_compile *.py
```

```bash
cd frontend
npm run build
```

## Notes

Wire returns async jobs, so the backend submits the action and polls the returned `poll_url`. If an action fails or returns no data, the app skips that source and continues instead of failing the whole query.
