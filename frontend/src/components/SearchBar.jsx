const examples = [
  "Is Bun.js production ready?",
  "LangGraph vs CrewAI community sentiment",
  "Latest papers on attention alternatives",
];

export default function SearchBar({ value, setValue, onSubmit, loading }) {
  function submit(event) {
    event.preventDefault();
    if (value.trim()) onSubmit(value.trim());
  }

  return (
    <form className="search-panel" onSubmit={submit}>
      <label htmlFor="query">Developer intelligence query</label>
      <div className="search-row">
        <input
          id="query"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Ask anything about any tool, library, or topic..."
        />
        <button disabled={loading || !value.trim()}>{loading ? "..." : "Ask"}</button>
      </div>
      <div className="chips">
        {examples.map((example) => (
          <button type="button" key={example} onClick={() => setValue(example)}>
            {example}
          </button>
        ))}
      </div>
    </form>
  );
}
