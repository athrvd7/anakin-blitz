export default function AgentThinkingCard({ steps, collapsed }) {
  if (!steps.length) return null;

  const shown = collapsed ? steps.slice(-1) : steps;

  return (
    <section className="card trace-card">
      <div className="section-title">
        <span>Agent trace</span>
        {collapsed && <small>complete</small>}
      </div>
      {shown.map((step, index) => (
        <div className="trace-row" key={`${step.step}-${index}`}>
          <span>{index === steps.length - 1 && !collapsed ? "..." : "✓"}</span>
          <p>{step.message || step.step}</p>
        </div>
      ))}
    </section>
  );
}
