import SourceBadge from "./SourceBadge.jsx";

function sourceData(data) {
  return data?.data || data || {};
}

function Meta({ source, data }) {
  const body = sourceData(data);
  const posts = body.posts || body.results || body.items || [];
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

  return (
    <article className="card result-card">
      <SourceBadge source={result.source || "source"} />
      <h3>{title}</h3>
      <p>{summary}</p>
      <Meta source={result.source} data={result.data} />
    </article>
  );
}
