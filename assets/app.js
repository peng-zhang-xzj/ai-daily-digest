/* AI Daily Digest — dense Chinese scan-reader. Vanilla JS, no deps. */
(() => {
  "use strict";

  const TABS = ["papers", "news", "batch"];
  const LS_READ = "add_read", LS_STAR = "add_star", LS_THEME = "add_theme";

  const store = {
    get(k) { try { return new Set(JSON.parse(localStorage.getItem(k) || "[]")); } catch { return new Set(); } },
    set(k, s) { localStorage.setItem(k, JSON.stringify([...s])); },
  };
  let readSet = store.get(LS_READ);
  let starSet = store.get(LS_STAR);

  const state = { tab: "papers", data: { papers: [], news: [], batch: [] },
                  q: "", unreadOnly: false };

  const el = (s) => document.querySelector(s);
  const esc = (s) => (s || "").replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const idOf = (it) => it.url || it.title || JSON.stringify(it);
  const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };
  const fmtDate = (s) => {
    if (!s) return "";
    const d = new Date(s);
    if (isNaN(d)) return s.length > 16 ? s.slice(0, 16) : s;
    return d.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
  };

  // one compact, scannable row per item
  function row(it, tab) {
    const id = idOf(it);
    const read = readSet.has(id), star = starSet.has(id);
    const title = it.title_zh || it.title || "(无标题)";
    const tldr = it.tldr || it.summary || "";
    const en = it.title_zh ? it.title : "";        // show original EN only if translated

    let tag = "";
    if (tab === "papers") tag = it.upvotes ? `▲${it.upvotes}` : "paper";
    else if (tab === "news") tag = it.source || hostOf(it.url) || "news";
    else tag = it.issue ? `Issue ${it.issue}` : "周刊";

    const links =
      (it.url ? `<a href="${esc(it.url)}" target="_blank" rel="noopener">原文 ↗</a>` : "") +
      (it.arxiv ? `<a href="${esc(it.arxiv)}" target="_blank" rel="noopener">arXiv ↗</a>` : "");
    const authors = (it.authors || []).join(", ");
    const img = (tab === "batch" && it.image)
      ? `<img class="detail-img" src="${esc(it.image)}" alt="" loading="lazy" />` : "";

    return `<article class="row ${read ? "read" : ""}" data-id="${esc(id)}">
      <div class="row-main">
        <span class="dot"></span>
        <div class="row-text">
          <div class="row-title">${esc(title)}<span class="tag">${esc(tag)}</span></div>
          ${tldr ? `<div class="row-tldr">${esc(tldr)}</div>` : ""}
        </div>
        <button class="star ${star ? "on" : ""}" data-star="${esc(id)}" title="收藏">${star ? "★" : "☆"}</button>
      </div>
      <div class="row-detail">
        ${img}
        ${en ? `<div class="detail-en">${esc(en)}</div>` : ""}
        ${it.summary ? `<p class="detail-sum">${esc(it.summary)}</p>` : ""}
        ${authors ? `<div class="detail-meta">作者：${esc(authors)}</div>` : ""}
        ${it.date ? `<div class="detail-meta">${esc(fmtDate(it.date))}</div>` : ""}
        <div class="detail-links">${links}</div>
      </div>
    </article>`;
  }

  function visible(list) {
    const q = state.q.trim().toLowerCase();
    return list.filter((it) => {
      if (state.unreadOnly && readSet.has(idOf(it))) return false;
      if (!q) return true;
      return ((it.title_zh || "") + (it.title || "") + (it.tldr || "") + (it.summary || ""))
        .toLowerCase().includes(q);
    });
  }

  function paint() {
    for (const tab of TABS) {
      const list = visible(state.data[tab]);
      const unread = state.data[tab].filter((it) => !readSet.has(idOf(it))).length;
      el(`#panel-${tab}`).innerHTML = list.length
        ? list.map((it) => row(it, tab)).join("")
        : `<p class="empty">暂无内容</p>`;
      el(`#c-${tab}`).textContent = unread ? unread : "";
      el(`#c-${tab}`).classList.toggle("has", unread > 0);
    }
  }

  function switchTab(tab) {
    state.tab = tab;
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === tab));
    document.querySelectorAll(".panel").forEach((p) => p.classList.toggle("active", p.id === `panel-${tab}`));
  }

  document.addEventListener("click", (e) => {
    const star = e.target.closest("[data-star]");
    if (star) {
      e.stopPropagation();
      const id = star.getAttribute("data-star");
      starSet.has(id) ? starSet.delete(id) : starSet.add(id);
      store.set(LS_STAR, starSet);
      star.classList.toggle("on"); star.textContent = starSet.has(id) ? "★" : "☆";
      return;
    }
    if (e.target.closest(".row-detail a")) return;     // let outbound links work
    const main = e.target.closest(".row-main");
    if (main) {
      const card = main.closest(".row");
      card.classList.toggle("open");
      if (card.classList.contains("open") && !card.classList.contains("read")) {
        readSet.add(card.dataset.id); store.set(LS_READ, readSet);
        card.classList.add("read");
        const tab = state.tab;
        const unread = state.data[tab].filter((it) => !readSet.has(idOf(it))).length;
        el(`#c-${tab}`).textContent = unread ? unread : "";
        el(`#c-${tab}`).classList.toggle("has", unread > 0);
      }
    }
  });

  el("#search").addEventListener("input", (e) => { state.q = e.target.value; paint(); });
  el("#unreadOnly").addEventListener("change", (e) => { state.unreadOnly = e.target.checked; paint(); });
  el("#markAll").addEventListener("click", () => {
    state.data[state.tab].forEach((it) => readSet.add(idOf(it)));
    store.set(LS_READ, readSet); paint();
  });
  document.querySelectorAll(".tab").forEach((t) => t.addEventListener("click", () => switchTab(t.dataset.tab)));

  function applyTheme(mode) {
    document.documentElement.setAttribute("data-theme", mode);
    el("#theme").textContent = mode === "dark" ? "☀️" : "🌙";
    localStorage.setItem(LS_THEME, mode);
  }
  el("#theme").addEventListener("click", () =>
    applyTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark"));
  applyTheme(localStorage.getItem(LS_THEME) ||
    (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));

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
