import asyncio
import json
import os
from collections.abc import AsyncIterator

from llm_client import LLMClient
from scraper_client import ScraperClient
from wire_client import WireClient

SOURCE_FROM_ACTION = {
    "reddit.search": "reddit",
    "hackernews.search": "hackernews",
    "github.search_repos": "github",
    "github.repo": "github",
    "arxiv.search": "arxiv",
    "wikipedia.summary": "wikipedia",
}


def sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


def clean_text(text: str) -> str:
    return (
        text.replace("**", "")
        .replace("__", "")
        .replace("`", "")
        .replace("Verdict:", "")
        .strip()
    )


def demo_plan(query: str, max_sources: int) -> list[dict]:
    q = query.strip()
    return [
        {"type": "wire", "action": "reddit.search", "params": {"query": q, "limit": 5}},
        {"type": "wire", "action": "hackernews.search", "params": {"query": q}},
        {"type": "wire", "action": "github.search_repos", "params": {"query": q}},
        {"type": "wire", "action": "arxiv.search", "params": {"query": q, "limit": 3}},
    ][:max_sources]


async def execute_tool(tool: dict, wire: WireClient, scraper: ScraperClient) -> dict:
    try:
        if not isinstance(tool, dict):
            return {"source": "source", "error": "Malformed tool plan entry"}
        if tool["type"] == "wire":
            data = await wire.call(tool["action"], tool.get("params", {}))
            source = SOURCE_FROM_ACTION.get(tool["action"], "wire")
            return {"source": source, "title": source.title(), "data": data}

        data = await scraper.fetch(tool["params"]["url"])
        return {"source": "scraper", "title": "Scraper", "data": data}
    except Exception as exc:
        return {"source": SOURCE_FROM_ACTION.get(tool.get("action"), "source"), "error": str(exc)}


def demo_result(tool: dict, query: str) -> dict:
    source = SOURCE_FROM_ACTION.get(tool["action"], "source")
    summaries = {
        "reddit": "Reddit discussion is split but practical: developers care most about maintenance burden, rough edges, and whether the tool removes real workflow pain.",
        "hackernews": "HackerNews signals skepticism first. The useful comments usually compare the project to simpler defaults and ask whether adoption cost is justified.",
        "github": "GitHub health should be judged by recent commits, issue response, release cadence, and whether the examples match production use cases.",
        "arxiv": "The research angle is useful when the query touches model architecture or retrieval quality, but papers alone do not prove production readiness.",
        "wikipedia": "Wikipedia provides the baseline definition and history, useful for grounding the verdict before community and repo signals take over.",
    }
    meta = {
        "reddit": {"top_post": f"What developers say about {query}", "upvotes": 428},
        "hackernews": {"story": f"Discussion: {query}", "points": 186, "comments": 74},
        "github": {"stars": "12.4k", "forks": "1.1k", "issues": 82, "last_commit": "recent"},
        "arxiv": {"papers": ["Survey and benchmarks", "Architecture alternatives", "Production tradeoffs"]},
        "wikipedia": {"first_sentence": f"{query} is treated as the neutral background source in this demo stream."},
    }
    return {
        "source": source,
        "title": source.title(),
        "summary": summaries[source],
        "data": meta[source],
    }


def fallback_verdict(summaries: list[str]) -> str:
    if not summaries:
        return "No usable sources returned. Try a narrower query or fewer sources."
    first = summaries[0].split(": ", 1)[-1]
    return f"The sources returned enough signal to continue, but the final AI synthesis was unavailable. Start with this strongest source signal: {first}"


def fallback_summary(result: dict) -> str:
    body = result.get("data", {}).get("data", result.get("data", {}))
    items = body.get("posts") or body.get("items") or body.get("results") or body.get("repositories") or []
    if isinstance(items, list) and items:
        titles = [item.get("title") or item.get("full_name") or item.get("name") for item in items[:3] if isinstance(item, dict)]
        titles = [title for title in titles if title]
        if titles:
            return f"{result['title']} returned {len(items)} results. Top matches: {', '.join(titles)}."
    return f"{result['title']} returned live data for this query."


def plan_reason(plan: list[dict]) -> str:
    sources = [SOURCE_FROM_ACTION.get(tool.get("action"), tool.get("type", "source")) for tool in plan if isinstance(tool, dict)]
    readable = ", ".join(dict.fromkeys(source.title() for source in sources))
    return f"Selected {readable} because they cover code health, developer sentiment, and research signal."


async def run_query(query: str, max_sources: int) -> AsyncIterator[str]:
    wire = WireClient()
    scraper = ScraperClient()
    llm = LLMClient()
    live_mode = bool(llm.configured and wire.configured)

    yield sse("thinking", {"step": "planning", "message": "Deciding which sources to check."})
    try:
        plan = await llm.plan_tools(query, max_sources) if live_mode else demo_plan(query, max_sources)
    except Exception:
        # ponytail: fallback keeps the demo alive if LLM JSON mode returns junk.
        plan = demo_plan(query, max_sources)
    if not plan:
        plan = demo_plan(query, max_sources)
    yield sse("thinking", {"step": "tool_plan", "tools": plan})
    yield sse("thinking", {"step": "plan_reason", "message": plan_reason(plan)})
    yield sse("thinking", {"step": "fetching", "message": f"Calling {len(plan)} sources in parallel."})

    summaries = []
    if live_mode:
        results = await asyncio.gather(*(execute_tool(tool, wire, scraper) for tool in plan))
        for result in results:
            if result.get("error"):
                yield sse("thinking", {"step": "skipped", "message": f"{result['source']} failed, continuing."})
                continue
            try:
                result["summary"] = clean_text(await llm.summarize_source(query, result))
            except Exception:
                result["summary"] = fallback_summary(result)
            summaries.append(f"{result['source']}: {result['summary']}")
            yield sse("result", result)
    else:
        for tool in plan:
            await asyncio.sleep(0.25)
            result = demo_result(tool, query)
            summaries.append(f"{result['source']}: {result['summary']}")
            yield sse("result", result)

    try:
        verdict = clean_text(await llm.verdict(query, summaries)) if live_mode and summaries else (
            "Use it if the source evidence matches your risk tolerance: active maintenance and concrete developer wins matter more than hype. "
            "Community chatter is useful for finding sharp edges, but repository health and recent technical evidence should drive the decision. "
            "For a hackathon demo, this stream shows the important behavior: the agent exposes its plan before the cards and verdict arrive."
        )
    except Exception as exc:
        yield sse("thinking", {"step": "verdict_fallback", "message": str(exc)[:160]})
        verdict = fallback_verdict(summaries)
    yield sse("verdict", {"verdict": verdict, "confidence": "demo" if not live_mode else "medium", "sources_used": len(summaries)})
    yield sse("done", {})
