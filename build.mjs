// ============================================================
// kjyoo.cloud - 정적 사이트 빌더
// v0.1 (2026-09-01)
//
// 외부 의존성 없음. Node 표준 모듈만 쓴다.
//   node build.mjs        -> dist/ 생성
//   node build.mjs --serve -> dist/ 생성 후 localhost:4173 로 미리보기
//
// 콘텐츠는 content/site.mjs 하나에서만 읽는다.
// 페이지 HTML을 손으로 고치지 말 것. 다음 빌드에서 덮어쓴다.
// ============================================================

import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { CONTENT, PAGES, SITE } from './content/site.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));
const DIST = join(ROOT, 'dist');

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const href = (langDir, page) => `/${langDir}/${page === 'index' ? '' : page + '.html'}`;

// ---------- shell ----------

function layout({ t, page, body }) {
  const navItems = PAGES.map((p) => {
    const cur = p === page ? ' aria-current="page"' : '';
    return `<a href="${href(t.dir, p)}"${cur}>${esc(t.nav[p])}</a>`;
  }).join('\n          ');

  const pageData = t[page];
  const title = page === 'index'
    ? `${pageData.title} - ${t.foot.tagline}`
    : `${pageData.title} - ${SITE.domain}`;

  return `<!doctype html>
<html lang="${t.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(pageData.desc)}">
<link rel="alternate" hreflang="${t.lang}" href="https://${SITE.domain}${href(t.dir, page)}">
<link rel="alternate" hreflang="${t.other.code}" href="https://${SITE.domain}${href(t.other.dir, page)}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(pageData.desc)}">
<meta property="og:url" content="https://${SITE.domain}${href(t.dir, page)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="/assets/css/tokens.css">
<link rel="stylesheet" href="/assets/css/site.css">
</head>
<body>
<a class="skip" href="#main">${esc(t.skip)}</a>

<header class="site-head">
  <div class="shell">
    <a class="brand" href="${href(t.dir, 'index')}">kjyoo<span>.cloud</span></a>
    <nav class="nav" aria-label="${esc(t.nav.index)}">
          ${navItems}
    </nav>
    <div class="lang">
      <a href="${href(t.dir, page)}" aria-current="true">${t.selfLabel}</a>
      <span>/</span>
      <a href="${href(t.other.dir, page)}">${t.other.label}</a>
    </div>
  </div>
</header>

<main id="main">
${body}
</main>

<footer class="site-foot">
  <div class="shell">
    <a href="${SITE.linkedin}">${esc(t.foot.linkedin)}</a>
    <a href="${SITE.github}">${esc(t.foot.github)}</a>
    <a href="mailto:${SITE.email}">${SITE.email}</a>
    <span class="copy">${esc(t.foot.copy)}</span>
  </div>
</footer>
</body>
</html>
`;
}

// ---------- pages ----------

function pageIndex(t) {
  const d = t.index;
  const stats = d.stats.map((s) =>
    `      <div class="stat"><b>${esc(s.n)}</b><span>${esc(s.l)}</span></div>`).join('\n');
  const cards = d.sections.map((s) =>
    `      <article class="card">
        <h3><a href="${href(t.dir, s.key)}">${esc(s.h)}</a></h3>
        <p>${esc(s.p)}</p>
      </article>`).join('\n');

  return `<section class="hero">
  <div class="shell">
    <h1>${esc(d.heroLead)}<br><em>${esc(d.heroAccent)}</em></h1>
    <p>${esc(d.heroBody)}</p>
    <div class="hero-actions">
      <a class="btn btn--primary" href="${href(t.dir, 'cases')}">${esc(d.ctaPrimary)}</a>
      <a class="btn btn--ghost" href="${href(t.dir, 'advisory')}">${esc(d.ctaGhost)}</a>
    </div>
    <div class="stats">
${stats}
    </div>
  </div>
</section>

<section class="band band--tint">
  <div class="shell">
    <div class="card-grid">
${cards}
    </div>
  </div>
</section>
`;
}

function pageCases(t) {
  const d = t.cases;
  const tags = d.tags.map((x) => `<span class="tag--quiet tag">${esc(x)}</span>`).join('\n        ');
  return `<section class="band">
  <div class="shell">
    <div class="page-head">
      <h1>${esc(d.h1)}</h1>
      <p>${esc(d.lead)}</p>
    </div>
    <div class="card-meta" style="margin-bottom: var(--kj-space-xl)">
        ${tags}
    </div>
    <div class="empty">
      <b>${esc(d.emptyTitle)}</b>
      <p>${esc(d.emptyBody)}</p>
    </div>
  </div>
</section>
`;
}

function pageSystem(t) {
  const d = t.system;
  const nodes = d.nodes.map((n, i) =>
    `        <div class="node${i === 0 ? ' node--human' : ''}"><b>${esc(n.b)}</b><small>${esc(n.s)}</small></div>`).join('\n');
  const rows = d.stackRows.map(([k, v]) =>
    `        <tr><td><b>${esc(k)}</b></td><td>${esc(v)}</td></tr>`).join('\n');

  return `<section class="band">
  <div class="shell">
    <div class="page-head">
      <h1>${esc(d.h1)}</h1>
      <p>${esc(d.lead)}</p>
    </div>

    <h2>${esc(d.pipelineH)}</h2>
    <p style="color: var(--kj-text-2); margin: var(--kj-space-md) 0 var(--kj-space-lg); max-width: var(--kj-measure)">${esc(d.pipelineP)}</p>
    <div class="pipeline" style="max-width: 560px">
${nodes}
    </div>

    <h2 style="margin-top: var(--kj-space-3xl)">${esc(d.stackH)}</h2>
    <div class="tablewrap" style="margin-top: var(--kj-space-lg)">
      <table>
        <tbody>
${rows}
        </tbody>
      </table>
    </div>
    <p style="color: var(--kj-text-3); font-size: var(--kj-fs-caption); margin-top: var(--kj-space-md)">${esc(d.note)}</p>
  </div>
</section>
`;
}

function pageThenNow(t) {
  const d = t['then-now'];
  const people = d.people.map((p) =>
    `          <div class="person">${esc(p)}</div>`).join('\n');
  const nodes = t.system.nodes.map((n, i) =>
    `          <div class="node${i === 0 ? ' node--human' : ''}"><b>${esc(n.b)}</b><small>${esc(n.s)}</small></div>`).join('\n');

  return `<section class="band">
  <div class="shell">
    <div class="page-head">
      <h1>${esc(d.h1)}</h1>
      <p>${esc(d.lead)}</p>
    </div>

    <div class="dia">
      <div class="dia-side dia-side--before">
        <div>
          <div class="dia-era">${esc(d.beforeEra)}</div>
          <div class="dia-count">${esc(d.beforeCount)}</div>
          <div class="dia-sub">${esc(d.beforeSub)}</div>
        </div>
        <div class="people">
${people}
        </div>
      </div>

      <div class="dia-arrow" aria-hidden="true">&rarr;</div>

      <div class="dia-side dia-side--after">
        <div>
          <div class="dia-era">${esc(d.afterEra)}</div>
          <div class="dia-count">${esc(d.afterCount)}</div>
          <div class="dia-sub">${esc(d.afterSub)}</div>
        </div>
        <div class="pipeline">
${nodes}
        </div>
      </div>
    </div>

    <p style="color: var(--kj-text-2); font-size: var(--kj-fs-caption); margin-top: var(--kj-space-lg); padding-top: var(--kj-space-md); border-top: 1px solid var(--kj-divider); max-width: var(--kj-measure)">${esc(d.caption)}</p>

    <div class="empty" style="margin-top: var(--kj-space-3xl)">
      <b>${esc(d.pendingH)}</b>
      <p>${esc(d.pendingP)}</p>
    </div>
  </div>
</section>
`;
}

function pageAbout(t) {
  const d = t.about;
  const tl = d.timeline.map((r) =>
    `      <div class="tl-row">
        <div class="tl-when">${esc(r.when)}</div>
        <div class="tl-what"><b>${esc(r.b)}</b><small>${esc(r.s)}</small></div>
      </div>`).join('\n');
  const facts = d.factsRows.map(([k, v]) =>
    `        <tr><td><b>${esc(k)}</b></td><td>${esc(v)}</td></tr>`).join('\n');

  return `<section class="band">
  <div class="shell">
    <div class="page-head">
      <h1>${esc(d.h1)}</h1>
      <p>${esc(d.lead)}</p>
    </div>

    <h2>${esc(d.timelineH)}</h2>
    <div class="timeline" style="margin-top: var(--kj-space-lg)">
${tl}
    </div>

    <h2 style="margin-top: var(--kj-space-3xl)">${esc(d.factsH)}</h2>
    <div class="tablewrap" style="margin-top: var(--kj-space-lg)">
      <table>
        <tbody>
${facts}
        </tbody>
      </table>
    </div>

    <h2 style="margin-top: var(--kj-space-3xl)">${esc(d.linksH)}</h2>
    <div class="hero-actions" style="margin-top: var(--kj-space-lg)">
      <a class="btn btn--ghost" href="${SITE.linkedin}">LinkedIn</a>
      <a class="btn btn--ghost" href="${SITE.github}">GitHub</a>
    </div>
  </div>
</section>
`;
}

function pageAdvisory(t) {
  const d = t.advisory;
  const offers = d.offers.map((o) =>
    `      <div class="offer">
        <h3>${esc(o.h)}</h3>
        <p style="color: var(--kj-text-2); font-size: var(--kj-fs-caption); margin: 0">${esc(o.p)}</p>
        <ul>
${o.li.map((x) => `          <li>${esc(x)}</li>`).join('\n')}
        </ul>
      </div>`).join('\n');
  const areas = d.areas.map(([k, v]) =>
    `        <tr><td><b>${esc(k)}</b></td><td>${esc(v)}</td></tr>`).join('\n');

  return `<section class="band">
  <div class="shell">
    <div class="page-head">
      <h1>${esc(d.h1)}</h1>
      <p>${esc(d.lead)}</p>
    </div>

    <div class="offer-grid">
${offers}
    </div>

    <h2 style="margin-top: var(--kj-space-3xl)">${esc(d.areasH)}</h2>
    <div class="tablewrap" style="margin-top: var(--kj-space-lg)">
      <table>
        <tbody>
${areas}
        </tbody>
      </table>
    </div>

    <div class="contact" style="margin-top: var(--kj-space-3xl)">
      <h2>${esc(d.contactH)}</h2>
      <p style="color: var(--kj-text-2); margin: 0; max-width: var(--kj-measure)">${esc(d.contactP)}</p>
      <a class="btn btn--primary" href="mailto:${SITE.email}">${esc(d.contactBtn)}</a>
    </div>
  </div>
</section>
`;
}

const RENDER = {
  index: pageIndex,
  cases: pageCases,
  system: pageSystem,
  'then-now': pageThenNow,
  about: pageAbout,
  advisory: pageAdvisory,
};

// ---------- root language redirect ----------

const ROOT_REDIRECT = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<title>${SITE.domain}</title>
<script>
  var target = (navigator.language || 'en').toLowerCase().indexOf('ko') === 0 ? '/ko/' : '/en/';
  location.replace(target);
</script>
<meta http-equiv="refresh" content="0; url=/en/">
</head>
<body>
<p><a href="/ko/">한국어</a> / <a href="/en/">English</a></p>
</body>
</html>
`;

// ---------- build ----------

function build() {
  rmSync(DIST, { recursive: true, force: true });
  mkdirSync(DIST, { recursive: true });

  cpSync(join(ROOT, 'assets'), join(DIST, 'assets'), { recursive: true });

  const written = [];
  for (const langKey of Object.keys(CONTENT)) {
    const t = CONTENT[langKey];
    mkdirSync(join(DIST, t.dir), { recursive: true });
    for (const page of PAGES) {
      const body = RENDER[page](t);
      const html = layout({ t, page, body });
      const file = page === 'index' ? 'index.html' : `${page}.html`;
      const out = join(DIST, t.dir, file);
      writeFileSync(out, html, 'utf8');
      written.push(`${t.dir}/${file}`);
    }
  }

  writeFileSync(join(DIST, 'index.html'), ROOT_REDIRECT, 'utf8');
  written.push('index.html');

  console.log(`built ${written.length} pages -> dist/`);
  for (const w of written) console.log('  ' + w);
}

// ---------- preview server ----------

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon' };

function serve(port = 4173) {
  createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p.endsWith('/')) p += 'index.html';
    const file = join(DIST, p);
    if (!file.startsWith(DIST) || !existsSync(file)) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('404');
      return;
    }
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(readFileSync(file));
  }).listen(port, () => console.log(`preview http://localhost:${port}/`));
}

build();
if (process.argv.includes('--serve')) serve();
