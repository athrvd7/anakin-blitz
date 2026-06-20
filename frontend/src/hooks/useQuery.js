import { useState, startTransition } from "react";

const initialState = { thinking: [], results: [], verdict: null, loading: false, error: "" };

function parseSse(text, onEvent) {
  for (const block of text.split("\n\n")) {
    const event = block.match(/^event: (.+)$/m)?.[1];
    const data = block.match(/^data: (.+)$/m)?.[1];
    if (!event || !data) continue;
    try {
      onEvent(event, JSON.parse(data));
    } catch {
      onEvent("error", { message: "Bad stream chunk skipped" });
    }
  }
}

export function useQuery() {
  const [state, setState] = useState(initialState);

  async function run(query) {
    setState({ ...initialState, loading: true });

    try {
      const response = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, max_sources: 5 }),
      });

      if (!response.ok || !response.body) throw new Error("Query failed");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() || "";

        startTransition(() => {
          parseSse(chunks.join("\n\n"), (event, data) => {
            setState((current) => {
              if (event === "thinking") return { ...current, thinking: [...current.thinking, data] };
              if (event === "result") return { ...current, results: [...current.results, data] };
              if (event === "verdict") return { ...current, verdict: data };
              if (event === "done") return { ...current, loading: false };
              if (event === "error") return { ...current, error: data.message };
              return current;
            });
          });
        });
      }
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error.message }));
    }
  }

  return { ...state, run };
}
