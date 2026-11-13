/* AI Daily Digest — tabbed static reader. Vanilla JS, no deps. */
(() => {
  "use strict";

  const TABS = ["papers", "news", "batch"];
  const LS_READ = "add_read";    // set of read ids
  const LS_STAR = "add_star";    // set of starred ids
  const LS_THEME = "add_theme";

  const store = {
    get(k) { try { return new Set(JSON.parse(localStorage.getItem(k) || "[]")); } catch { return new Set(); } },
    set(k, s) { localStorage.setItem(k, JSON.stringify([...s])); },
  };
  let readSet = store.get(LS_READ);
  let starSet = store.get(LS_STAR);

  const state = { tab: "papers", data: { papers: [], news: [], batch: [] },
                  q: "", unreadOnly: false };

  const el = (sel) => document.querySelector(sel);
  const esc = (s) => (s || "").replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function idOf(item) { return item.url || item.title || JSON.stringify(item); }

  function hostOf(url) { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; } }

  function fmtDate(s) {
    if (!s) return "";
    const d = new Date(s);
    if (isNaN(d)) return s.length > 16 ? s.slice(0, 16) : s;
    return d.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
  }

  /* ---------------- rendering ---------------- */
  function cardPaper(it) {
    const id = idOf(it);
    const read = readSet.has(id), star = starSet.has(id);
    const authors = (it.authors || []).join(", ");
    return `<article class="card ${read ? "read" : ""}" data-id="${esc(id)}">
      <div class="card-head"><span class="dot"></span>
        <h3 class="card-title"><a href="${esc(it.url)}" target="_blank" rel="noopener">${esc(it.title)}</a></h3>
      </div>
      <div class="meta">
        ${it.upvotes ? `<span class="badge">▲ ${it.upvotes}</span>` : ""}
        ${authors ? `<span>${esc(authors)}</span>` : ""}
        ${it.date ? `<span>· ${esc(it.date)}</span>` : ""}
      </div>
      ${it.summary ? `<p class="summary">${esc(it.summary)}</p>` : ""}
      <div class="actions">
        <a href="${esc(it.url)}" target="_blank" rel="noopener">HF ↗</a>
        ${it.arxiv ? `<a href="${esc(it.arxiv)}" target="_blank" rel="noopener">arXiv ↗</a>` : ""}
        <button class="star ${star ? "on" : ""}" data-star="${esc(id)}">${star ? "★ 已存" : "☆ 收藏"}</button>
      </div>
    </article>`;
  }

  function cardNews(it) {
    const id = idOf(it);
    const read = readSet.has(id), star = starSet.has(id);
    return `<article class="card ${read ? "read" : ""}" data-id="${esc(id)}">
      <div class="card-head"><span class="dot"></span>
        <h3 class="card-title"><a href="${esc(it.url)}" target="_blank" rel="noopener">${esc(it.title)}</a></h3>
      </div>
      <div class="meta">
        <span class="badge">${esc(hostOf(it.url) || "news")}</span>
        ${it.date ? `<span>· ${esc(fmtDate(it.date))}</span>` : ""}
      </div>
      ${it.summary ? `<p class="summary">${esc(it.summary)}</p>` : ""}
      <div class="actions">
        <a href="${esc(it.url)}" target="_blank" rel="noopener">原文 ↗</a>
        <button class="star ${star ? "on" : ""}" data-star="${esc(id)}">${star ? "★ 已存" : "☆ 收藏"}</button>
      </div>
    </article>`;
  }

  function cardBatch(it) {
    const id = idOf(it);
    const read = readSet.has(id), star = starSet.has(id);
    const img = it.image ? `<img src="${esc(it.image)}" alt="" loading="lazy" />` : "";
    return `<article class="card batch-card ${read ? "read" : ""}" data-id="${esc(id)}">
      ${img}
      <div class="batch-body">
        <div class="card-head"><span class="dot"></span>
          <h3 class="card-title"><a href="${esc(it.url)}" target="_blank" rel="noopener">${esc(it.title)}</a></h3>
        </div>
        <div class="meta">${it.issue ? `<span class="badge">Issue ${it.issue}</span>` : ""}</div>
        ${it.summary ? `<p class="summary">${esc(it.summary)}</p>` : ""}
        <div class="actions">
          <a href="${esc(it.url)}" target="_blank" rel="noopener">阅读本期 ↗</a>
          <button class="star ${star ? "on" : ""}" data-star="${esc(id)}">${star ? "★ 已存" : "☆ 收藏"}</button>
        </div>
      </div>
    </article>`;
  }

  const RENDER = { papers: cardPaper, news: cardNews, batch: cardBatch };

  function visible(list) {
    const q = state.q.trim().toLowerCase();
    return list.filter((it) => {
      if (state.unreadOnly && readSet.has(idOf(it))) return false;
      if (!q) return true;
      return ((it.title || "") + " " + (it.summary || "")).toLowerCase().includes(q);
    });
  }

  function paint() {
    for (const tab of TABS) {
      const list = visible(state.data[tab]);
      const panel = el(`#panel-${tab}`);
      panel.innerHTML = list.length
        ? list.map(RENDER[tab]).join("")
        : `<p class="empty">暂无内容</p>`;
      el(`#c-${tab}`).textContent = state.data[tab].length || "";
    }
  }

  /* ---------------- interactions ---------------- */
  function switchTab(tab) {
    state.tab = tab;
    document.querySelectorAll(".tab").forEach((t) =>
      t.classList.toggle("active", t.dataset.tab === tab));
    document.querySelectorAll(".panel").forEach((p) =>
      p.classList.toggle("active", p.id === `panel-${tab}`));
  }

  // mark read when a title link is opened
  document.addEventListener("click", (e) => {
    const star = e.target.closest("[data-star]");
    if (star) {
      const id = star.getAttribute("data-star");
      if (starSet.has(id)) starSet.delete(id); else starSet.add(id);
      store.set(LS_STAR, starSet);
      paint();
      return;
    }
    const link = e.target.closest(".card-title a, .actions a");
    if (link) {
      const card = e.target.closest(".card");
      if (card) {
        readSet.add(card.dataset.id);
        store.set(LS_READ, readSet);
        card.classList.add("read");
      }
    }
  });

  el("#search").addEventListener("input", (e) => { state.q = e.target.value; paint(); });
  el("#unreadOnly").addEventListener("change", (e) => { state.unreadOnly = e.target.checked; paint(); });
  el("#markAll").addEventListener("click", () => {
    state.data[state.tab].forEach((it) => readSet.add(idOf(it)));
    store.set(LS_READ, readSet);
    paint();
  });
  document.querySelectorAll(".tab").forEach((t) =>
    t.addEventListener("click", () => switchTab(t.dataset.tab)));

  // theme
  function applyTheme(mode) {
    document.documentElement.setAttribute("data-theme", mode);
    el("#theme").textContent = mode === "dark" ? "☀️" : "🌙";
    localStorage.setItem(LS_THEME, mode);
  }
  el("#theme").addEventListener("click", () =>
    applyTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark"));
  applyTheme(localStorage.getItem(LS_THEME) ||
    (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));

  /* ---------------- load data ---------------- */
  async function load() {
    const grab = async (n) => {
      try { const r = await fetch(`data/${n}.json`, { cache: "no-store" }); return r.ok ? await r.json() : []; }
      catch { return []; }
    };
    const [papers, news, batch, meta] = await Promise.all(
      [grab("papers"), grab("news"), grab("batch"), grab("meta")]);
    state.data = { papers, news, batch };
    if (meta && meta.updated_at) {
      const d = new Date(meta.updated_at);
      el("#updated").textContent = "更新于 " + (isNaN(d) ? meta.updated_at
        : d.toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }));
    }
    paint();
  }

  load();
})();
