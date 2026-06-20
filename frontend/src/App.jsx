import { useDeferredValue, useState } from "react";
import AgentThinkingCard from "./components/AgentThinkingCard.jsx";
import ResultCard from "./components/ResultCard.jsx";
import SearchBar from "./components/SearchBar.jsx";
import SummaryCard from "./components/SummaryCard.jsx";
import { useQuery } from "./hooks/useQuery.js";

const nav = ["landing", "dashboard"];
const filters = ["all", "github", "reddit", "hackernews", "arxiv"];

function exportReport(query, verdict, results) {
  const lines = [
    "# WebMind Research Report",
    "",
    `Question: ${query || "Untitled query"}`,
    "",
    "## Verdict",
    verdict?.verdict || "No verdict available.",
    "",
    "## Sources",
    ...results.flatMap((result) => [
      "",
      `### ${result.title || result.source}`,
      result.summary || "No summary available.",
    ]),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "webmind-report.md";
  link.click();
  URL.revokeObjectURL(url);
}

function queryHint(query) {
  const words = query.trim().split(/\s+/).filter(Boolean);
  return words.length > 0 && words.length < 3;
}

export default function App() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState("landing");
  const [filter, setFilter] = useState("all");
  const { thinking, results, verdict, loading, error, elapsed, run } = useQuery();
  const deferredResults = useDeferredValue(results);
  const visibleResults = filter === "all" ? deferredResults : deferredResults.filter((result) => result.source === filter);

  function submit(nextQuery) {
    setPage("dashboard");
    setFilter("all");
    run(nextQuery);
  }

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#landing" onClick={() => setPage("landing")}>WebMind</a>
        <nav>
          {nav.map((item) => (
            <button className={page === item ? "active" : ""} key={item} onClick={() => setPage(item)}>
              {item}
            </button>
          ))}
        </nav>
      </header>

      {page === "landing" && (
        <section className="page hero">
          <p className="eyebrow">Agent-planned developer research</p>
          <h1>Ask once. Watch the sources assemble themselves.</h1>
          <p className="lede">WebMind turns one plain-English question into a visible tool plan, live source cards, and a direct verdict.</p>
          <SearchBar value={query} setValue={setQuery} onSubmit={submit} loading={loading} />

          <div className="source-strip" aria-label="Available research sources">
            {["GitHub", "Reddit", "Hacker News", "arXiv"].map((source) => (
              <span key={source}>{source}</span>
            ))}
          </div>

          <section className="mock-output card" aria-label="Example research output">
            <div>
              <p className="mock-label">Question</p>
              <h2>Is Bun.js production ready?</h2>
            </div>
            <div>
              <p className="mock-label">Plan</p>
              <ul>
                <li>✓ Search GitHub repositories</li>
                <li>✓ Analyze Reddit discussions</li>
                <li>✓ Check Hacker News sentiment</li>
                <li>✓ Find recent arXiv papers</li>
              </ul>
            </div>
            <div>
              <p className="mock-label">Verdict</p>
              <p>Ready for many production workloads, but ecosystem maturity still trails Node.js.</p>
            </div>
          </section>

          <section className="thinking-preview" aria-label="How the agent thinks">
            {[
              ["Plan", "The agent decides which sources matter."],
              ["Collect", "Data is gathered from live sources."],
              ["Verdict", "Evidence is summarized into one answer."],
            ].map(([title, copy]) => (
              <article className="card mini-card" key={title}>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </section>
        </section>
      )}

      {page === "dashboard" && (
        <section className="page dashboard">
          <SearchBar value={query} setValue={setQuery} onSubmit={submit} loading={loading} />
          {queryHint(query) && <p className="query-hint">Try naming a specific library, repo, or paper topic for sharper results.</p>}
          {error && <p className="error">{error}</p>}
          <AgentThinkingCard steps={thinking} collapsed={Boolean(verdict)} />
          {!loading && thinking.length > 0 && deferredResults.length === 0 && (
            <section className="card empty-state">
              <h3>No usable sources returned.</h3>
              <p>Try a narrower query, or use one of the presets above.</p>
            </section>
          )}
          <SummaryCard verdict={verdict} elapsed={elapsed} />
          {deferredResults.length > 0 && (
            <div className="result-toolbar">
              <div className="filter-row">
                {filters.map((item) => (
                  <button className={filter === item ? "active" : ""} type="button" key={item} onClick={() => setFilter(item)}>
                    {item === "all" ? "All" : item}
                  </button>
                ))}
              </div>
              <button className="export-button" type="button" onClick={() => exportReport(query, verdict, visibleResults)}>
                Export report
              </button>
            </div>
          )}
          <div className="grid">
            {visibleResults.map((result, index) => (
              <ResultCard result={result} key={`${result.source}-${index}`} />
            ))}
          </div>
        </section>
      )}

      {page === "landing" && (
        <footer className="footer">
          <span>WebMind Agent</span>
          <span>Built for Anakin Blitz 2026</span>
        </footer>
      )}
    </main>
  );
}
