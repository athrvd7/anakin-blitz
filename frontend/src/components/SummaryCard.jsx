export default function SummaryCard({ verdict }) {
  if (!verdict) return null;

  return (
    <section className="card verdict-card">
      <div className="section-title">
        <span>Verdict</span>
        <small>{verdict.sources_used} sources consulted</small>
      </div>
      <p>{verdict.verdict}</p>
    </section>
  );
}
