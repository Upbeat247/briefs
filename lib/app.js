(function () {
  'use strict';

  var ALL = window.__BRIEFS__ || [];
  var STREAMS = window.__STREAMS__ || {};
  var READ_KEY = 'briefs-read-v1';
  var THEME_KEY = 'briefs-theme-v1';

  var listEl = document.getElementById('list');
  var articleEl = document.getElementById('article');
  var searchEl = document.getElementById('search');
  var filtersEl = document.getElementById('filters');
  var progressEl = document.getElementById('progress');

  // ---------- storage (a locked-down browser can throw on access) ----------

  function store(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }
  function save(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
      /* private mode / blocked storage — the page still works, it just forgets */
    }
  }

  var read = store(READ_KEY, {});

  // ---------- theme ----------

  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    document.getElementById('theme').textContent = t === 'dark' ? '☀' : '☾';
  }
  var saved = store(THEME_KEY, null);
  var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(saved || (prefersDark ? 'dark' : 'light'));

  document.getElementById('theme').addEventListener('click', function () {
    var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    save(THEME_KEY, next);
  });

  // ---------- helpers ----------

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function fmtDate(iso) {
    var d = new Date(iso + 'T00:00:00');
    if (isNaN(d)) return iso;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  var filter = 'all';
  var query = '';

  function visible() {
    var q = query.trim().toLowerCase();
    return ALL.filter(function (e) {
      if (filter !== 'all' && e.stream !== filter) return false;
      if (!q) return true;
      return e.q.indexOf(q) !== -1 || e.title.toLowerCase().indexOf(q) !== -1;
    });
  }

  // ---------- list ----------

  function cardHtml(e) {
    var s = STREAMS[e.stream] || {};
    var isRead = !!read[e.id];
    return (
      '<button class="card' + (isRead ? ' read' : '') + '" data-id="' + esc(e.id) + '">' +
      '<div class="kicker s-' + esc(e.stream) + '">' +
      '<span class="dot"></span>' + esc(s.label || '') +
      ' <span class="sep">/</span> <span class="meta">#' + e.number + '</span>' +
      ' <span class="sep">/</span> <span class="meta">' + esc(fmtDate(e.date)) + '</span>' +
      ' <span class="sep">/</span> <span class="meta">' + e.minutes + ' min</span>' +
      (isRead ? ' <span class="tick">✓ read</span>' : '') +
      '</div>' +
      '<h2>' + esc(e.title) + '</h2>' +
      (e.summaryHtml ? '<p>' + e.summaryHtml + '</p>' : '') +
      '</button>'
    );
  }

  function renderFilters() {
    var counts = { all: ALL.length };
    ALL.forEach(function (e) { counts[e.stream] = (counts[e.stream] || 0) + 1; });

    var html = '<button class="chip" data-f="all" aria-pressed="' + (filter === 'all') +
      '">All <span class="n">' + counts.all + '</span></button>';

    Object.keys(STREAMS).forEach(function (k) {
      if (!counts[k]) return;
      html += '<button class="chip s-' + k + '" data-f="' + k + '" aria-pressed="' + (filter === k) + '">' +
        '<span class="dot"></span>' + esc(STREAMS[k].label) +
        ' <span class="n">' + counts[k] + '</span></button>';
    });
    filtersEl.innerHTML = html;
  }

  function renderList() {
    var items = visible();
    if (!items.length) {
      listEl.innerHTML = '<div class="empty">Nothing matches that.</div>';
    } else {
      var html = '';
      var year = null;
      items.forEach(function (e) {
        var y = e.date.slice(0, 4);
        if (y !== year) { year = y; html += '<div class="year">' + y + '</div>'; }
        html += cardHtml(e);
      });
      listEl.innerHTML = html;
    }
    renderFilters();
    listEl.hidden = false;
    articleEl.hidden = true;
    progressEl.style.width = '0';
    document.getElementById('chrome').hidden = false;
  }

  // ---------- article ----------

  function renderArticle(e) {
    var s = STREAMS[e.stream] || {};
    var idx = ALL.indexOf(e);
    var newer = ALL[idx - 1];
    var older = ALL[idx + 1];

    var body = e.sections.map(function (sec) {
      return (sec.heading ? '<h2>' + esc(sec.heading) + '</h2>' : '') + sec.html;
    }).join('\n');

    var nav = '';
    if (newer || older) {
      nav = '<div class="nav-more">' +
        (older ? '<button data-id="' + esc(older.id) + '"><span class="lbl">Older</span><span class="ttl">' + esc(older.title) + '</span></button>' : '') +
        (newer ? '<button data-id="' + esc(newer.id) + '"><span class="lbl">Newer</span><span class="ttl">' + esc(newer.title) + '</span></button>' : '') +
        '</div>';
    }

    articleEl.innerHTML =
      '<div class="article">' +
      '<button class="back">← All briefs</button>' +
      '<div class="kicker s-' + esc(e.stream) + '"><span class="dot"></span>' +
      esc(s.label || '') +
      ' <span class="sep">/</span> <span class="meta">#' + e.number + '</span>' +
      ' <span class="sep">/</span> <span class="meta">' + esc(fmtDate(e.date)) + '</span>' +
      ' <span class="sep">/</span> <span class="meta">' + e.minutes + ' min read</span></div>' +
      '<h1>' + esc(e.title) + '</h1>' +
      (e.summaryHtml ? '<p class="lede">' + e.summaryHtml + '</p>' : '') +
      '<hr class="rule">' +
      '<div class="body">' + body + '</div>' +
      (e.action ? '<div class="action"><h4>' + esc(e.action.label) + '</h4>' + e.action.html + '</div>' : '') +
      '<div class="done-row"><button class="btn' + (read[e.id] ? ' ghost' : '') + '" id="mark">' +
      (read[e.id] ? '✓ Read' + (read[e.id] !== true ? ' · ' + esc(fmtDate(String(read[e.id]).slice(0, 10))) : '') : 'Mark as read') +
      '</button></div>' +
      nav +
      '</div>';

    listEl.hidden = true;
    articleEl.hidden = false;
    document.getElementById('chrome').hidden = true;
    window.scrollTo(0, 0);

    document.getElementById('mark').addEventListener('click', function () {
      if (read[e.id]) delete read[e.id];
      else read[e.id] = new Date().toISOString();
      save(READ_KEY, read);
      renderArticle(e);
    });
  }

  // ---------- routing ----------

  function route() {
    var m = location.hash.match(/^#\/b\/(.+)$/);
    if (m) {
      var e = ALL.filter(function (x) { return x.id === decodeURIComponent(m[1]); })[0];
      if (e) { renderArticle(e); return; }
    }
    renderList();
  }

  window.addEventListener('hashchange', route);

  document.addEventListener('click', function (ev) {
    var back = ev.target.closest('.back');
    if (back) { history.length > 1 ? history.back() : (location.hash = ''); return; }

    var chip = ev.target.closest('.chip');
    if (chip) { filter = chip.dataset.f; renderList(); return; }

    var card = ev.target.closest('[data-id]');
    if (card) { location.hash = '#/b/' + encodeURIComponent(card.dataset.id); }
  });

  searchEl.addEventListener('input', function () { query = searchEl.value; renderList(); });

  document.addEventListener('keydown', function (ev) {
    if (ev.key === '/' && document.activeElement !== searchEl) {
      ev.preventDefault();
      if (!articleEl.hidden) location.hash = '';
      searchEl.focus();
    } else if (ev.key === 'Escape') {
      if (document.activeElement === searchEl) { searchEl.value = ''; query = ''; renderList(); searchEl.blur(); }
      else if (!articleEl.hidden) location.hash = '';
    }
  });

  window.addEventListener('scroll', function () {
    if (articleEl.hidden) return;
    var h = document.documentElement.scrollHeight - window.innerHeight;
    progressEl.style.width = (h > 0 ? Math.min(100, (window.scrollY / h) * 100) : 0) + '%';
  }, { passive: true });

  route();
})();
