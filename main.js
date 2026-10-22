/* Renders every post list on the site from window.POSTS
   (posts/posts-data.js). Adding a post only means adding an
   entry there. Each render function is a no-op on pages that
   don't have its root element. */

function getPosts() {
  if (!Array.isArray(window.POSTS)) return [];
  return [...window.POSTS].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function createTags(tags) {
  const tagList = Array.isArray(tags) ? tags : [];
  return tagList
    .map((tag) => `<span class="card-tag">${escapeHtml(tag)}</span>`)
    .join("");
}

function createPills(tags) {
  const tagList = Array.isArray(tags) ? tags : [];
  return tagList
    .map((tag) => `<li class="pill">${escapeHtml(tag)}</li>`)
    .join("");
}

function renderFeaturedProjects(posts) {
  const root = document.querySelector("[data-featured-projects]");
  if (!root) return;

  const featured = posts
    .filter((post) => post.type === "project" && post.featured)
    .sort((a, b) => a.featured - b.featured);

  root.innerHTML = featured
    .map(
      (post) => `
        <a class="project-card" href="${escapeHtml(post.href)}">
          <div class="project-media">
            ${
              post.cardImage
                ? `<img src="${escapeHtml(post.cardImage)}" alt="${escapeHtml(post.cardAlt || post.title)}" loading="lazy" />`
                : ""
            }
          </div>
          <div class="project-body">
            <p class="project-meta">${escapeHtml(post.dateLabel)}</p>
            <h3 class="project-title">${escapeHtml(post.title)}</h3>
            <p class="project-excerpt">${escapeHtml(post.excerpt)}</p>
            <ul class="pill-row" aria-label="Technologies">${createPills(post.tags)}</ul>
            <span class="project-link">Read the full write-up <span aria-hidden="true">&rarr;</span></span>
          </div>
        </a>
      `
    )
    .join("");
}

function renderCompactCards(root, posts, linkLabel) {
  root.innerHTML = posts
    .map(
      (post) => `
        <a class="mini-card" href="${escapeHtml(post.href)}">
          <p class="mini-meta">${escapeHtml(post.dateLabel)}</p>
          <h3 class="mini-title">${escapeHtml(post.title)}</h3>
          <p class="mini-excerpt">${escapeHtml(post.excerpt)}</p>
          <ul class="pill-row pill-row--sm" aria-label="Topics">${createPills(post.tags)}</ul>
          <span class="mini-link">${linkLabel} <span aria-hidden="true">&rarr;</span></span>
        </a>
      `
    )
    .join("");
}

function renderMoreProjects(posts) {
  const root = document.querySelector("[data-more-projects]");
  if (!root) return;

  const rest = posts.filter((post) => post.type === "project" && !post.featured);
  renderCompactCards(root, rest, "Read more");
}

function renderWriting(posts) {
  const root = document.querySelector("[data-writing-posts]");
  if (!root) return;

  const articles = posts.filter((post) => post.type === "article").slice(0, 3);
  renderCompactCards(root, articles, "Read");
}

function renderArchive(posts) {
  const archiveRoot = document.querySelector("[data-archive-posts]");
  if (!archiveRoot) return;

  archiveRoot.innerHTML = posts
    .map((post, index) => {
      const position = String(index + 1).padStart(2, "0");
      const title = post.archiveTitle || post.title;
      const excerpt = post.archiveExcerpt || post.excerpt;

      return `
        <a class="post-card" href="${escapeHtml(post.href)}">
          <p class="card-meta">${position} / ${escapeHtml(post.dateLabel)}</p>
          <h2 class="card-title">${escapeHtml(title)}</h2>
          <p class="card-excerpt">${escapeHtml(excerpt)}</p>
          <div class="card-tags">${createTags(post.tags)}</div>
        </a>
      `;
    })
    .join("");
}

/* Mobile nav: a single toggle button opens the link list as a
   dropdown under the bar. Closes on link click and on Escape. */
function initNavToggle() {
  const toggle = document.querySelector("[data-nav-toggle]");
  const nav = document.querySelector(".site-nav");
  if (!toggle || !nav) return;

  const setOpen = (open) => {
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
  };

  toggle.addEventListener("click", () => {
    setOpen(!nav.classList.contains("is-open"));
  });

  nav.querySelectorAll(".nav-links a").forEach((link) => {
    link.addEventListener("click", () => setOpen(false));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setOpen(false);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initNavToggle();

  const posts = getPosts();
  if (!posts.length) return;

  renderFeaturedProjects(posts);
  renderMoreProjects(posts);
  renderWriting(posts);
  renderArchive(posts);
});
