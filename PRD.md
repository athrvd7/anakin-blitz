# WebMind Agent — Product Requirements Document

## Overview

**Product Name:** WebMind Agent  
**Hackathon:** Anakin Blitz 2026 (6-hour sprint)  
**Builder:** Solo  
**Stack:** FastAPI + Gemini 2.5 Flash + React/Vite + Tailwind  
**APIs:** Wire API (Anakin) + Anakin Universal Scraper  

### One-line pitch
A developer intelligence dashboard where you type any question in plain English, and an AI agent autonomously decides which sources to query, fetches structured data across Reddit, HackerNews, GitHub, arXiv, and Wikipedia, then delivers a synthesized verdict with live reasoning trace.

### The core insight
Most teams will call Wire with hardcoded actions. WebMind exposes the **AI deciding the tool plan** as the primary UX — judges see the agent think, then watch the cards populate. That's the differentiator.

---

## Problem Statement

Developers researching a tool, library, paper, or technology have to manually check GitHub for repo health, Reddit/HN for community sentiment, arXiv for academic backing, and Wikipedia for context — across five tabs, manually synthesizing. There's no single place to ask "is this thing worth my time?" and get a structured, sourced answer in seconds.

---

## Solution

A single search bar. The user types a natural language query. Under the hood:

1. Gemini reads the query and emits a **tool plan** — a JSON list of Wire actions and/or Anakin Scraper URLs to call
2. The backend **executes the plan** (Wire API for structured sources, Anakin Scraper as fallback)
3. Gemini **synthesizes** the collected data into a verdict with per-source summaries
4. The frontend renders a **dashboard of result cards** with an agent reasoning trace visible live

---

## User Stories

- As a developer, I want to type "is LangGraph worth using or is it overhyped?" and get Reddit sentiment, GitHub repo health, HN discussion, and an AI verdict in one place
- As a researcher, I want to type "what are people saying about the attention mechanism alternatives?" and get arXiv papers + Reddit/HN community reaction in one dashboard
- As an open-source contributor, I want to type "how healthy is the Astro framework community?" and get GitHub issues/stars, Reddit posts, HN mentions, and a summary
- As a student, I want to type "explain transformers and show what the community thinks of them" and get Wikipedia context + arXiv papers + HN discussion

---

## Supported Wire Action Categories

### Reddit (`reddit.*`)
- `reddit.search` — search posts by keyword
- `reddit.post` — fetch a specific post + top comments
- `reddit.subreddit` — get subreddit info + top posts

### HackerNews (`hackernews.*`)
- `hackernews.search` — search HN stories/comments
- `hackernews.item` — fetch a story with comments
- `hackernews.top` — top stories (optional, for trending queries)

### GitHub (`github.*`)
- `github.repo` — stars, forks, open issues, language, description, last commit
- `github.issues` — list open issues with labels
- `github.search_repos` — find repos matching a query

### arXiv (`arxiv.*`)
- `arxiv.search` — search papers by keyword, returns title/authors/abstract/date

### Wikipedia (`wikipedia.*`)
- `wikipedia.summary` — get the intro summary of a topic page

### Anakin Universal Scraper (fallback)
- Any URL the agent decides to fetch that Wire doesn't cover
- Output format: Markdown
- Used for: specific blog posts, documentation pages, niche sources

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  React/Vite Frontend                │
│  SearchBar → AgentThinkingCard → ResultCards        │
│                  (Tailwind CSS)                     │
└─────────────────────┬───────────────────────────────┘
                      │ HTTP (streaming SSE)
┌─────────────────────▼───────────────────────────────┐
│                   FastAPI Backend                   │
│                                                     │
│  POST /api/query  ──►  Orchestrator                 │
│  GET  /api/health                                   │
│  GET  /api/wire/catalog  (optional debug)           │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │         Orchestrator Agent                   │   │
│  │   Gemini 2.5 Flash (tool-use / JSON mode)    │   │
│  │                                              │   │
│  │   Step 1: plan_tools(query)                  │   │
│  │     → returns list of Wire actions + params  │   │
│  │       and/or Scraper URLs                    │   │
│  │                                              │   │
│  │   Step 2: execute_plan(tool_plan)            │   │
│  │     → calls Wire API in parallel             │   │
│  │     → calls Anakin Scraper for fallbacks     │   │
│  │                                              │   │
│  │   Step 3: synthesize(query, raw_results)     │   │
│  │     → Gemini writes per-source summaries     │   │
│  │     → Gemini writes final verdict            │   │
│  └──────────────────────────────────────────────┘   │
│                      │           │                  │
│               Wire API     Anakin Scraper           │
│          (structured JSON) (Markdown fallback)      │
└─────────────────────────────────────────────────────┘
```

---

## File Structure

```
webmind-agent/
├── backend/
│   ├── main.py              # FastAPI app, routes
│   ├── agent.py             # Orchestrator: plan → execute → synthesize
│   ├── wire_client.py       # Wire API wrapper
│   ├── scraper_client.py    # Anakin Scraper wrapper
│   ├── prompts.py           # All Gemini prompt templates
│   ├── models.py            # Pydantic request/response models
│   └── requirements.txt
├── frontend/
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── components/
│       │   ├── SearchBar.jsx
│       │   ├── AgentThinkingCard.jsx   # live reasoning trace
│       │   ├── SummaryCard.jsx         # Gemini's final verdict
│       │   ├── ResultCard.jsx          # one per source, reusable
│       │   └── SourceBadge.jsx         # Reddit / GitHub / arXiv tag
│       └── hooks/
│           └── useQuery.js             # SSE streaming hook
├── .env.example
└── README.md
```

---

## API Contracts

### `POST /api/query`

**Request:**
```json
{
  "query": "is LangGraph worth using or is it overhyped?",
  "max_sources": 5
}
```

**Response (streamed SSE events):**
```
event: thinking
data: {"step": "planning", "message": "Deciding which sources to check..."}

event: thinking
data: {"step": "tool_plan", "tools": [
  {"type": "wire", "action": "reddit.search", "params": {"query": "LangGraph", "limit": 5}},
  {"type": "wire", "action": "hackernews.search", "params": {"query": "LangGraph"}},
  {"type": "wire", "action": "github.search_repos", "params": {"query": "LangGraph"}},
  {"type": "wire", "action": "arxiv.search", "params": {"query": "LangGraph agent framework"}}
]}

event: thinking
data: {"step": "fetching", "message": "Calling 4 sources in parallel..."}

event: result
data: {"source": "reddit", "title": "Reddit", "data": {...}, "summary": "..."}

event: result
data: {"source": "hackernews", "title": "HackerNews", "data": {...}, "summary": "..."}

event: result
data: {"source": "github", "title": "GitHub", "data": {...}, "summary": "..."}

event: result
data: {"source": "arxiv", "title": "arXiv", "data": {...}, "summary": "..."}

event: verdict
data: {"verdict": "LangGraph is...", "confidence": "high", "sources_used": 4}

event: done
data: {}
```

### `GET /api/health`
```json
{"status": "ok", "wire": "connected", "scraper": "connected"}
```

---

## Agent Prompts (in `prompts.py`)

### Tool Planning Prompt
```
You are WebMind, a developer intelligence agent.

The user has asked: "{query}"

You have access to these data sources via Wire API:
- reddit.search(query, limit) — Reddit posts and community discussion
- hackernews.search(query) — HackerNews stories and comments  
- github.search_repos(query) — GitHub repository search
- github.repo(owner, repo) — Specific repo health (stars, issues, last commit)
- arxiv.search(query, limit) — Academic papers
- wikipedia.summary(topic) — Wikipedia intro summary

And a fallback scraper: scraper.fetch(url) — scrapes any URL to Markdown.

Return a JSON array of tools to call for this query. 
Choose 3–6 tools maximum. Only pick tools that are genuinely relevant.
If the query is about a specific GitHub repo (e.g. "langchain-ai/langgraph"), 
use github.repo directly. Otherwise use github.search_repos.

Return ONLY valid JSON, no explanation:
[
  {"type": "wire", "action": "...", "params": {...}},
  ...
]
```

### Per-Source Synthesis Prompt
```
You are summarizing data for a developer intelligence dashboard.

Source: {source_name}
User's query: "{query}"
Raw data:
{raw_data}

Write a 2–4 sentence summary of what this source says that's relevant to the query.
Be specific. Mention numbers, names, and dates where they appear in the data.
Do not hedge or waffle. Write like a senior dev briefing a teammate.
```

### Final Verdict Prompt
```
You are WebMind, a developer intelligence agent.

User asked: "{query}"

You queried {n} sources and here are their summaries:
{source_summaries}

Write a final verdict of 3–5 sentences. 
- Lead with the most important finding
- Reconcile any conflicts between sources
- End with a clear recommendation or conclusion
- Do not use bullet points. Prose only.
- Be direct. Developers hate waffle.
```

---

## UI Design

### Visual Direction
- **Background:** `#0A0A0F` (near-black, not pure black)
- **Surface cards:** `#13131A` with `1px solid #1E1E2E` border
- **Accent:** `#7C6AFF` (electric violet — "intelligence" color)
- **Text primary:** `#E8E8F0`
- **Text secondary:** `#6B6B80`
- **Source colors:**
  - Reddit: `#FF4500`
  - HackerNews: `#FF6600`
  - GitHub: `#58A6FF`
  - arXiv: `#B7472A`
  - Wikipedia: `#A0A0B0`
  - Scraper (generic): `#4CAF82`
- **Font:** Inter (system fallback: sans-serif)
- **Border radius:** `8px` on cards, `99px` on badges

### Layout
```
┌────────────────────────────────────────────────────┐
│  ◈ WebMind                              [examples] │  ← header, minimal
├────────────────────────────────────────────────────┤
│                                                    │
│     ┌──────────────────────────────────────────┐   │
│     │  What do you want to know?           [→] │   │  ← search bar, centered
│     └──────────────────────────────────────────┘   │
│                                                    │
│  ┌─────────────────────────────────────────────┐   │
│  │ 🧠 Agent Thinking                           │   │  ← live trace, collapses after
│  │  ✓ Planning tool calls...                   │   │
│  │  ✓ Querying Reddit, HN, GitHub, arXiv       │   │
│  │  ⟳ Synthesizing results...                  │   │
│  └─────────────────────────────────────────────┘   │
│                                                    │
│  ┌─────────────────────────────────────────────┐   │
│  │ ◈ Verdict                                   │   │  ← summary card, accent border
│  │  LangGraph is genuinely useful for...       │   │
│  └─────────────────────────────────────────────┘   │
│                                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐  │
│  │ [Reddit]     │  │ [HackerNews] │  │ [GitHub] │  │  ← result cards grid
│  │ Summary...   │  │ Summary...   │  │ ★ 12.4k  │  │
│  │              │  │              │  │ Issues:82│  │
│  └──────────────┘  └──────────────┘  └──────────┘  │
│  ┌──────────────┐                                  │
│  │ [arXiv]      │                                  │
│  │ 3 papers...  │                                  │
│  └──────────────┘                                  │
└────────────────────────────────────────────────────┘
```

### Component Specs

**SearchBar**
- Full-width input, `height: 56px`, placeholder: `"Ask anything about any tool, library, or topic..."`
- Submit on Enter or click arrow button
- 3 example chips below on empty state: `"Is Bun.js production ready?"` / `"LangGraph vs CrewAI community sentiment"` / `"Latest papers on attention alternatives"`

**AgentThinkingCard**
- Shows steps as they stream in via SSE
- Each step has: icon (✓ done / ⟳ in-progress) + message text
- Auto-collapses to a single line once verdict arrives
- Accent left border `#7C6AFF`

**SummaryCard**
- Slightly larger than ResultCards
- `◈ Verdict` header with accent color
- Prose verdict text
- `n sources consulted` footer badge

**ResultCard**
- Source badge top-left (colored per source)
- Summary text (2–4 sentences from per-source Gemini call)
- Source-specific metadata below the fold:
  - Reddit: top post title + upvote count
  - GitHub: stars / forks / open issues / last commit date
  - HN: story title + points + comment count
  - arXiv: paper titles (up to 3) with dates
  - Wikipedia: first sentence of article

---

## Environment Variables

```env
# backend/.env
GEMINI_API_KEY=your_gemini_key_here
WIRE_API_KEY=your_wire_api_key_here
ANAKIN_SCRAPER_API_KEY=your_anakin_scraper_key_here

# Wire base URL
WIRE_BASE_URL=https://api.anakin.io/v1/wire

# Anakin Scraper base URL  
SCRAPER_BASE_URL=https://api.anakin.io/v1/scrape
```

---

## Backend Implementation Notes

### `wire_client.py`
```python
# Wire API call pattern:
POST https://api.anakin.io/v1/wire/task
Headers: Authorization: Bearer {WIRE_API_KEY}
Body: {
  "action_id": "reddit.search",
  "params": {"query": "LangGraph", "limit": 5}
}
# Returns structured JSON — no parsing needed
```

### `scraper_client.py`
```python
# Anakin Scraper call pattern:
POST https://api.anakin.io/v1/scrape
Headers: Authorization: Bearer {ANAKIN_SCRAPER_API_KEY}
Body: {
  "url": "https://some-blog-post.com/article",
  "format": "markdown"
}
# Returns: { "markdown": "...", "metadata": {...} }
```

### `agent.py` — Three-step orchestration
```python
async def run(query: str):
    # Step 1: Plan
    tool_plan = await gemini_plan_tools(query)
    yield SSEEvent("thinking", {"step": "tool_plan", "tools": tool_plan})

    # Step 2: Execute in parallel
    results = await asyncio.gather(*[
        execute_tool(tool) for tool in tool_plan
    ])
    
    # Step 3: Synthesize per source
    for result in results:
        summary = await gemini_summarize_source(query, result)
        yield SSEEvent("result", {**result, "summary": summary})
    
    # Step 4: Final verdict
    verdict = await gemini_verdict(query, results)
    yield SSEEvent("verdict", {"verdict": verdict})
```

### Parallelism
Use `asyncio.gather()` for all Wire API calls. Target: all sources fetched in under 2 seconds combined.

### Error handling
If a Wire action fails or returns empty, skip that source silently and note it in the thinking trace. Never crash the whole query for one failed source.

---

## Demo Queries (pre-test these before submission)

| Query | Wire Actions Used |
|-------|-----------------|
| `"Is LangGraph worth using or is it overhyped?"` | reddit.search, hackernews.search, github.search_repos, arxiv.search |
| `"What's the community sentiment on Bun.js vs Node.js?"` | reddit.search, hackernews.search, github.repo (oven-sh/bun) |
| `"Latest research on attention mechanism alternatives"` | arxiv.search, reddit.search (r/MachineLearning), hackernews.search |
| `"How healthy is the Astro framework ecosystem?"` | github.repo (withastro/astro), reddit.search, hackernews.search |
| `"Explain diffusion models and what researchers think of them"` | wikipedia.summary, arxiv.search, hackernews.search |

---

## Out of Scope (do not build in 6 hours)

- User accounts / auth
- Query history persistence
- Price comparison features
- Any source outside Reddit, HN, GitHub, arXiv, Wikipedia + Scraper fallback
- Mobile-optimized layout (desktop-first is fine for hackathon demo)
- Rate limiting / API key management UI

---

## Success Criteria

The project wins if a judge can:
1. Type a query and see the agent reasoning trace appear live within 1 second
2. Watch source cards populate as data arrives (streaming, not batch)
3. Read a verdict that clearly synthesizes across sources
4. See that the AI *chose* which sources to query — not a hardcoded list

The technical wow factor is **the agent deciding the tool plan**, visible to the user.
The product wow factor is **getting a researched answer in 10 seconds** instead of 10 browser tabs.

---

## README Quick Start (for judges)

```bash
# Backend
cd backend
pip install -r requirements.txt
cp .env.example .env  # add your API keys
uvicorn main:app --reload

# Frontend
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

---

*Built for Anakin Blitz 2026 — 6 hours, ship something real.*
