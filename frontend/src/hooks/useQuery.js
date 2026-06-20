import { useState, startTransition } from "react";

const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const initialState = { thinking: [], results: [], verdict: null, loading: false, error: "", elapsed: 0 };

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
    const startedAt = performance.now();

    try {
      if (import.meta.env.PROD && !API_URL) {
        throw new Error("Missing VITE_API_URL on frontend deployment");
      }

      const endpoint = `${API_URL}/api/query`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, max_sources: 5 }),
      });

      if (!response.ok || !response.body) {
        const details = await response.text();
        throw new Error(`Query failed (${response.status}) at ${endpoint}: ${details.slice(0, 160)}`);
      }

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
              if (event === "verdict") return { ...current, verdict: data, elapsed: (performance.now() - startedAt) / 1000 };
              if (event === "done") return { ...current, loading: false, elapsed: (performance.now() - startedAt) / 1000 };
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
