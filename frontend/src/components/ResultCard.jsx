import SourceBadge from "./SourceBadge.jsx";

function sourceData(data) {
  return data?.data || data || {};
}

function resultItems(body) {
  return body.posts || body.results || body.items || body.repositories || body.papers || [];
}

function confidence(data) {
  const body = sourceData(data);
  const items = resultItems(body);
  const count = Array.isArray(items) ? items.length : 0;
  if (count >= 5) return "Strong signal";
  if (count >= 2) return "Weak signal";
  return "Noisy signal";
}

function sourceUrl(data) {
  const body = sourceData(data);
  const items = resultItems(body);
  const first = Array.isArray(items) ? items[0] : null;
  return body.url || body.html_url || first?.url || first?.html_url || first?.permalink || "";
}

function Meta({ source, data }) {
  const body = sourceData(data);
  const posts = resultItems(body);
  const first = Array.isArray(posts) ? posts[0] : null;

  if (source === "github") return <p className="meta">Stars {body.stars ?? body.stargazers_count ?? "n/a"} · Forks {body.forks ?? "n/a"} · Issues {body.issues ?? body.open_issues_count ?? "n/a"}</p>;
  if (source === "reddit") return <p className="meta">{body.top_post || first?.title || "Reddit results"} · {body.upvotes ?? first?.score ?? "n/a"} upvotes</p>;
  if (source === "hackernews") return <p className="meta">{body.story || first?.title || "HN results"} · {body.points ?? first?.points ?? "n/a"} points · {body.comments ?? first?.num_comments ?? "n/a"} comments</p>;
  if (source === "arxiv") return <p className="meta">{(body.papers || posts).slice(0, 3).map((paper) => paper.title || paper).join(" · ") || "arXiv results"}</p>;
  if (source === "wikipedia") return <p className="meta">{body.first_sentence || body.extract || body.summary || "Wikipedia summary"}</p>;
  return <p className="meta">Live source returned.</p>;
}

export default function ResultCard({ result }) {
  const title = result.title || result.source || "Source";
  const summary = result.summary || "Source returned data, but no summary was available.";
  const url = sourceUrl(result.data);

  return (
    <article className="card result-card">
      <div className="result-topline">
        <SourceBadge source={result.source || "source"} />
        <span className="confidence">{confidence(result.data)}</span>
      </div>
      <h3>{title}</h3>
      <p>{summary}</p>
      <Meta source={result.source} data={result.data} />
      {url && <a className="source-link" href={url.startsWith("/") ? `https://www.reddit.com${url}` : url} target="_blank" rel="noreferrer">Open source</a>}
    </article>
  );
}
