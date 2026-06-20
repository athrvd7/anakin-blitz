import { useState } from "react";

export default function SummaryCard({ verdict, elapsed }) {
  const [copied, setCopied] = useState(false);

  if (!verdict) return null;

  async function copyVerdict() {
    await navigator.clipboard.writeText(verdict.verdict);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  return (
    <section className="card verdict-card">
      <div className="section-title">
        <span>Verdict</span>
        <small>{verdict.sources_used} sources · {elapsed.toFixed(1)}s</small>
      </div>
      <p>{verdict.verdict}</p>
      <button className="copy-button" type="button" onClick={copyVerdict}>
        {copied ? "Copied" : "Copy verdict"}
      </button>
    </section>
  );
}
