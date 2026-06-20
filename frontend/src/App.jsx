import { useDeferredValue, useState } from "react";
import AgentThinkingCard from "./components/AgentThinkingCard.jsx";
import ResultCard from "./components/ResultCard.jsx";
import SearchBar from "./components/SearchBar.jsx";
import SummaryCard from "./components/SummaryCard.jsx";
import { useQuery } from "./hooks/useQuery.js";

const nav = ["landing", "home", "dashboard"];

export default function App() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState("landing");
  const { thinking, results, verdict, loading, error, run } = useQuery();
  const deferredResults = useDeferredValue(results);

  function submit(nextQuery) {
    setPage("dashboard");
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
        </section>
      )}

      {page === "home" && (
        <section className="page split">
          <div>
            <p className="eyebrow">What it checks</p>
            <h2>Reddit, HN, GitHub, arXiv, Wikipedia.</h2>
          </div>
          <div className="card">
            <p>No accounts, history, or settings yet. The hackathon version focuses on the one thing judges need to see: the AI choosing sources before fetching them.</p>
          </div>
        </section>
      )}

      {page === "dashboard" && (
        <section className="page dashboard">
          <SearchBar value={query} setValue={setQuery} onSubmit={submit} loading={loading} />
          {error && <p className="error">{error}</p>}
          <AgentThinkingCard steps={thinking} collapsed={Boolean(verdict)} />
          <SummaryCard verdict={verdict} />
          <div className="grid">
            {deferredResults.map((result, index) => (
              <ResultCard result={result} key={`${result.source}-${index}`} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
