const posts = [
  {
    title: "Qdrant in Production",
    excerpt:
      "When a dedicated vector database beats general search services, and how to run it without surprises.",
    href: "posts/qdrant-in-production.html",
    dateLabel: "April 2026",
    publishedAt: "2026-04-01",
  },
  {
    title: "RAG Retrieval Architecture",
    excerpt:
      "Hybrid retrieval, chunk strategy, and query understanding techniques that actually move answer quality.",
    href: "posts/rag-retrieval-architecture.html",
    dateLabel: "March 2026",
    publishedAt: "2026-03-01",
  },
];

function getMostRecentPost(items) {
  return [...items].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  )[0];
}

document.addEventListener("DOMContentLoaded", () => {
  const mostRecent = getMostRecentPost(posts);
  if (!mostRecent) return;

  const linkEl = document.querySelector("[data-recent-post-link]");
  const dateEl = document.querySelector("[data-recent-post-date]");
  const titleEl = document.querySelector("[data-recent-post-title]");
  const excerptEl = document.querySelector("[data-recent-post-excerpt]");

  if (linkEl) linkEl.setAttribute("href", mostRecent.href);
  if (dateEl) dateEl.textContent = mostRecent.dateLabel;
  if (titleEl) titleEl.textContent = mostRecent.title;
  if (excerptEl) excerptEl.textContent = mostRecent.excerpt;
});
