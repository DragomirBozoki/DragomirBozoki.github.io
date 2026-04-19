function normalizePostHref(href) {
  if (!href || typeof href !== "string") return "";

  const cleaned = href.split("?")[0].split("#")[0].replace(/\\/g, "/");
  const withoutDot = cleaned.replace(/^\.\//, "");

  if (withoutDot.startsWith("posts/")) return withoutDot;
  if (withoutDot.startsWith("/posts/")) return withoutDot.slice(1);
  return `posts/${withoutDot}`;
}

function parseDateToISO(dateLabel) {
  const raw = (dateLabel || "").trim();
  if (!raw) return "1970-01-01";

  const direct = new Date(raw);
  if (!Number.isNaN(direct.getTime())) {
    return direct.toISOString().slice(0, 10);
  }

  const monthOnly = /^([A-Za-z]+)\s+(\d{4})$/;
  const match = raw.match(monthOnly);
  if (match) {
    const parsed = new Date(`${match[1]} 1, ${match[2]}`);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
  }

  return "1970-01-01";
}

function sortPosts(items) {
  return [...items].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}

function getFallbackPosts() {
  if (!Array.isArray(window.POSTS)) return [];
  return sortPosts(window.POSTS);
}

async function discoverPostFiles() {
  const response = await fetch("posts/");
  if (!response.ok) return [];

  const html = await response.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const links = [...doc.querySelectorAll("a[href]")]
    .map((el) => el.getAttribute("href") || "")
    .map((href) => href.trim())
    .filter((href) => href.endsWith(".html"))
    .filter((href) => !href.startsWith("_"))
    .filter((href) => !href.includes("/"))
    .map((href) => normalizePostHref(href));

  return [...new Set(links)];
}

async function loadPostFromFile(href) {
  const response = await fetch(href);
  if (!response.ok) return null;

  const html = await response.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const title =
    doc.querySelector(".post-title")?.textContent?.trim() ||
    doc.title.replace(" - mindloop", "").trim();

  const excerpt =
    doc.querySelector(".post-subtitle")?.textContent?.trim() ||
    doc.querySelector(".post-body p")?.textContent?.trim() ||
    "";

  const dateLabel =
    doc.querySelector(".post-meta span")?.textContent?.trim() || "";

  const tags = [...doc.querySelectorAll(".post-meta a")]
    .map((el) => el.textContent?.trim())
    .filter(Boolean);

  return {
    title,
    archiveTitle: title,
    excerpt,
    archiveExcerpt: excerpt,
    href,
    dateLabel,
    publishedAt: parseDateToISO(dateLabel),
    tags,
  };
}

async function loadPostsFromDirectory() {
  try {
    const files = await discoverPostFiles();
    if (!files.length) return [];

    const loaded = await Promise.all(files.map((href) => loadPostFromFile(href)));
    return sortPosts(loaded.filter(Boolean));
  } catch {
    return [];
  }
}

function renderRecent(posts) {
  const mostRecent = posts[0];
  if (!mostRecent) return;

  const linkEl = document.querySelector("[data-recent-post-link]");
  const dateEl = document.querySelector("[data-recent-post-date]");
  const titleEl = document.querySelector("[data-recent-post-title]");
  const excerptEl = document.querySelector("[data-recent-post-excerpt]");

  if (linkEl) linkEl.setAttribute("href", mostRecent.href);
  if (dateEl) dateEl.textContent = mostRecent.dateLabel;
  if (titleEl) titleEl.textContent = mostRecent.title;
  if (excerptEl) excerptEl.textContent = mostRecent.excerpt;
}

function createTags(tags) {
  const tagList = Array.isArray(tags) ? tags : [];
  return tagList
    .map((tag) => `<span class="card-tag">${tag}</span>`)
    .join("");
}

function renderFeatured(posts) {
  const featuredRoot = document.querySelector("[data-featured-posts]");
  if (!featuredRoot) return;

  const featuredPosts = posts.slice(0, 2);
  featuredRoot.innerHTML = featuredPosts
    .map(
      (post) => `
        <a class="post-card" href="${post.href}">
          <p class="card-meta">${post.dateLabel}</p>
          <h3 class="card-title">${post.title}</h3>
          <p class="card-excerpt">${post.excerpt}</p>
          <div class="card-tags">${createTags(post.tags)}</div>
        </a>
      `
    )
    .join("");
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
        <a class="post-card" href="${post.href}">
          <p class="card-meta">${position} / ${post.dateLabel}</p>
          <h2 class="card-title">${title}</h2>
          <p class="card-excerpt">${excerpt}</p>
          <div class="card-tags">${createTags(post.tags)}</div>
        </a>
      `;
    })
    .join("");
}

document.addEventListener("DOMContentLoaded", async () => {
  const discoveredPosts = await loadPostsFromDirectory();
  const posts = discoveredPosts.length ? discoveredPosts : getFallbackPosts();
  if (!posts.length) return;

  renderRecent(posts);
  renderFeatured(posts);
  renderArchive(posts);
});