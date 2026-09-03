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
import { createHash } from 'node:crypto';
import { CONTENT, PAGES, SITE, CASES } from './content/site.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));
const DIST = join(ROOT, 'dist');

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const href = (langDir, page) => `/${langDir}/${page === 'index' ? '' : page + '.html'}`;
const hrefCase = (langDir, slug) => `/${langDir}/cases/${slug}.html`;

// 감사 지적 D-4 (자산 캐시 7일 + 해시 없는 파일명, 2026-09-02) 대응.
// 서버가 /assets/* 를 7일 캐시로 내보내는데 파일명이 고정이면 재방문자가 옛 자산을 최대 7일 본다.
// 파일 내용의 sha256 앞 8자리를 파일명에 넣어, 내용이 바뀌면 URL도 함께 바뀌게 한다.
// 7일 캐시 설정 자체는 그대로 둔다 - 이름이 바뀌므로 안전하다.
// 대상: HTML 이 <link>/<link rel=icon> 으로 "참조"하는 자산만(site.css, tokens.css, favicon.svg).
// diagram-*.svg 는 build.mjs 가 파일 내용을 읽어 HTML 안에 직접 인라인하므로(fetch 되는 URL이 아님)
// 캐시 문제가 성립하지 않아 해시 대상에서 뺐다.
function hashedAsset(relPath) {
  const abs = join(ROOT, 'assets', relPath);
  const buf = readFileSync(abs);
  const hash = createHash('sha256').update(buf).digest('hex').slice(0, 8);
  const dir = dirname(relPath).split('\\').join('/');
  const ext = extname(relPath);
  const base = relPath.split('/').pop().slice(0, -ext.length);
  const outRel = `${dir}/${base}.${hash}${ext}`;
  return { buf, outRel: `assets/${outRel}`, publicPath: `/assets/${outRel}` };
}

const ASSET_SITE_CSS = hashedAsset('css/site.css');
const ASSET_TOKENS_CSS = hashedAsset('css/tokens.css');
const ASSET_FAVICON = hashedAsset('img/favicon.svg');

// 다이어그램 - 인라인 SVG. 정본은 다이어그램_주입지침_v0.1.md.
// data-t 속성은 다국어 치환 지점 표시. KR 페이지는 원본 그대로 넣고,
// EN 페이지는 빌드 시점에 아래 EN_TEXT/EN_A11Y 승인본(도해_영문세트_v0.1.md)으로
// data-t 텍스트 노드와 title/desc 4곳을 치환한다. data-t 속성 자체는 지우지 않는다.
const SVG_THE_SYSTEM = readFileSync(join(ROOT, 'assets/img/diagram-the-system.svg'), 'utf8');
const SVG_THEN_NOW = readFileSync(join(ROOT, 'assets/img/diagram-then-vs-now.svg'), 'utf8');

// title/desc (data-t 없음, id로 매칭)
const EN_A11Y = {
  kjdSysTitle: 'The System - how one instruction becomes one deliverable',
  kjdSysDesc: 'One instruction goes to the Planning HQ, who splits it across six departments. Results pass an audit and come out as one deliverable. Below that, the harness, the skills and n8n automation run as standing infrastructure.',
  kjdTvnTitle: 'Then vs Now - same work, different headcount',
  kjdTvnDesc: 'The left panel is the organization from the February 2021 chart: six roles, fifteen people. Each dot is one person - six in R&D, four in sales and marketing, two overseas, and one each in CEO, business planning and design. The right panel is six department agents doing the same work today, with one person. The converging shape in the middle marks the shift from many to one.',
};

// data-t 키 -> EN 승인본. 문자열이면 한 줄 치환.
// 넘침 처리(줄바꿈/textLength/글자크기 1단계 축소)는 실측 후 값으로 채운다(3절 순서).
const EN_TEXT = {
  'sys.band1': 'Work Flow',
  'sys.in.title': 'One instruction',
  'sys.in.sub': 'A person gives it',
  'sys.chief.title': 'Chief of Staff',
  'sys.chief.sub': 'Splits and assigns',
  'sys.dept.tech': 'Tech',
  'sys.dept.knowledge': 'Knowledge',
  'sys.dept.creative': 'Creative',
  'sys.dept.marketing': 'Marketing',
  'sys.dept.business': 'Business',
  'sys.dept.intelligence': 'Research',
  'sys.dept.more': '+ Execution, Situation Room, Legal - 3 more',
  'sys.audit.title': 'Audit',
  'sys.audit.sub': 'Pass or fail',
  'sys.out.title': 'One deliverable',
  'sys.out.sub': 'A person checks it last',
  'sys.band2': 'Always on',
  'sys.card1.title': 'Harness',
  'sys.card1.l1': 'Rules in one place',
  'sys.card1.l2': 'Auto-checked at 6 points',
  'sys.card2.title': '38 Skills',
  'sys.card2.l1': 'Procedures for repeated work',
  'sys.card2.l2': 'Never explained twice',
  'sys.card3.title': 'n8n Automation',
  'sys.card3.l1': 'Runs on schedule, no person',
  'sys.card3.l2': 'Reads and writes directly',
  'sys.source': 'Measured as of 2026-09-03. 11 agent definitions and 38 skills, counted directly. Nothing that does not exist was drawn.',

  'tvn.then.era': 'THEN',
  'tvn.then.h1': 'Different People',
  'tvn.then.h2': 'for Each Area',
  'tvn.then.sub': 'Past org chart. Sales and marketing: 4',
  'tvn.then.r1.name': 'R&D',
  'tvn.then.r1.n': '6',
  'tvn.then.r2.name': 'Sales/Marketing',
  'tvn.then.r2.n': '4',
  'tvn.then.r3.name': 'Overseas',
  'tvn.then.r3.n': '2',
  'tvn.then.r4.name': 'CEO',
  'tvn.then.r4.n': '1',
  'tvn.then.r5.name': 'Planning',
  'tvn.then.r5.n': '1',
  'tvn.then.r6.name': 'Design',
  'tvn.then.r6.n': '1',
  'tvn.m1.label': 'Org size',
  'tvn.m1.then': '10 to 17',
  'tvn.m2.label': 'Marketing & sales',
  'tvn.m2.then': '5 to 6',
  'tvn.m3.label': 'Areas',
  'tvn.m3.then': '7 to 9',
  'tvn.now.era': 'NOW',
  'tvn.now.h1': 'Same Areas,',
  'tvn.now.h2': 'One Person',
  'tvn.now.sub': 'Chief of staff splits it, audit verifies',
  'tvn.dept.tech': 'Tech',
  'tvn.dept.tech.n': 'Agent 1',
  'tvn.dept.knowledge': 'Knowledge',
  'tvn.dept.knowledge.n': 'Agent 1',
  'tvn.dept.creative': 'Creative',
  'tvn.dept.creative.n': 'Agent 1',
  'tvn.dept.marketing': 'Marketing',
  'tvn.dept.marketing.n': 'Agent 1',
  'tvn.dept.business': 'Business',
  'tvn.dept.business.n': 'Agent 1',
  'tvn.dept.intelligence': 'Research',
  'tvn.dept.intelligence.n': 'Agent 1',
  'tvn.m1.label.now': 'Org size',
  'tvn.m1.now': '1+11 agents',
  'tvn.m2.label.now': 'Marketing & sales',
  'tvn.m2.now': 'Agent 1',
  'tvn.m3.label.now': 'Areas',
  'tvn.m3.now': '6 depts',
  'tvn.source': 'Source: internal HR and role records across multiple dates. Current figures from agent definition files, counted directly.',
};

const xmlesc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// EN 넘침 처리. Chromium 151 실제 렌더 실측(measure_diagrams.py, search_treatment*.py)으로
// 확정한 값만 채운다. 순서 - 1)줄바꿈(lines+y+dy) 2)textLength 압축(5% 이내) 3)글자크기 1단계 축소(fontSize).
// 이 SVG 안에 이미 쓰인 값만 쓴다: system 16/19, then-now 16/23.
// y 를 지정하면 <text> 의 원래 y 를 그 값으로 바꾼다(줄바꿈 시 2줄이 들어갈 자리를 만들기 위함).
// 상자 좌표(rect)는 손대지 않았다 - 옮긴 것은 텍스트 자신의 y 뿐이다.
const EN_OVERFLOW = {
  // 상자 안(y108~204). 원래 y=176 그대로, dy=18 두 줄. 실측 bottom 196.02 <= box bottom 204, gap 1.88(안 겹침)
  'sys.out.sub': { lines: ['A person', 'checks it last'], dy: 18 },
  // 상자 없음(캡션). 카드 하단 492 아래, viewBox 하단 532 안쪽으로 y를 511로 올려 2줄 확보.
  // 실측 top 496.89(카드하단+4.89) bottom 531.02(viewBox 532 안) gap 1.88
  'sys.dept.more': { lines: ['+ Execution, Situation Room,', 'Legal - 3 more'], dy: 20 },
  'sys.source': { lines: ['Measured as of 2026-09-03. 11 agent definitions and 38 skills,', 'counted directly. Nothing that does not exist was drawn.'], y: 511, dy: 18 },
  'tvn.now.sub': { lines: ['Chief of staff splits it,', 'audit verifies'], dy: 20 },
  // 패널 하단 520 아래, viewBox 하단 560 안쪽으로 y를 539로 올려 2줄 확보.
  // 실측 top 524.89(패널하단+4.89) bottom 559.02(viewBox 560 안) gap 1.88
  'tvn.source': { lines: ['Source: internal HR and role records across multiple dates,', 'documents (3 dates). Current figures from 11 agent definition files, counted directly.'], y: 539, dy: 18 },
  // tvn.then.r2.name - 해결 (2026-09-03, 감사 지적분 처리). "Sales & Marketing"(폭 133.56,
  // 상자 124 대비 9.56 초과, 7.2%)을 "Sales/Marketing"으로 축약해 줄바꿈이나 압축 없이 해결했다.
  // Chromium 152 헤드리스 렌더 실측(Nanum Gothic 700 16px, 폰트 로드 확인 후 getBBox) - 폭 118.97,
  // 상자 124 대비 여유 5.03(양쪽 2.5), overflow 없음. 별도 EN_OVERFLOW 처리 불필요.
};

function injectEnSvg(raw, a11yMap, textMap, overflowMap) {
  let out = raw;
  out = out.replace(/(<title id="([^"]+)">)([^<]*)(<\/title>)/g, (m, pre, id, _c, post) =>
    a11yMap[id] !== undefined ? pre + xmlesc(a11yMap[id]) + post : m);
  out = out.replace(/(<desc id="([^"]+)">)([^<]*)(<\/desc>)/g, (m, pre, id, _c, post) =>
    a11yMap[id] !== undefined ? pre + xmlesc(a11yMap[id]) + post : m);
  out = out.replace(/<text([^>]*)\sdata-t="([^"]+)">([^<]*)<\/text>/g, (m, attrs, key) => {
    if (textMap[key] === undefined) return m;
    const ov = overflowMap[key];
    if (ov && ov.lines) {
      const xMatch = attrs.match(/\sx="([-\d.]+)"/);
      const x = xMatch ? xMatch[1] : '0';
      // 줄바꿈 시 2줄이 들어갈 자리를 만들기 위해 y를 지정값으로 교체(상자 좌표는 그대로, 텍스트 자신의 y만)
      let outAttrs = attrs;
      if (ov.y !== undefined) outAttrs = outAttrs.replace(/\sy="[-\d.]+"/, ` y="${ov.y}"`);
      const tspans = ov.lines.map((line, i) =>
        i === 0 ? xmlesc(line) : `<tspan x="${x}" dy="${ov.dy}">${xmlesc(line)}</tspan>`).join('');
      return `<text${outAttrs} data-t="${key}">${tspans}</text>`;
    }
    if (ov && ov.textLength) {
      return `<text${attrs} data-t="${key}" textLength="${ov.textLength}" lengthAdjust="spacingAndGlyphs">${xmlesc(textMap[key])}</text>`;
    }
    if (ov && ov.fontSize) {
      return `<text${attrs} data-t="${key}" style="font-size:${ov.fontSize}px">${xmlesc(textMap[key])}</text>`;
    }
    return `<text${attrs} data-t="${key}">${xmlesc(textMap[key])}</text>`;
  });
  return out;
}

const svgForLang = (raw, lang) => (lang === 'en' ? injectEnSvg(raw, EN_A11Y, EN_TEXT, EN_OVERFLOW) : raw);

// ---------- shell ----------

function layout({ t, page, body, pageData: pageDataOverride, pathOverride, altPathOverride, robotsNoindex }) {
  const navItems = PAGES.map((p) => {
    const cur = p === page ? ' aria-current="page"' : '';
    return `<a href="${href(t.dir, p)}"${cur}>${esc(t.nav[p])}</a>`;
  }).join('\n          ');

  const pageData = pageDataOverride || t[page];
  const selfPath = pathOverride || href(t.dir, page);
  const altPath = altPathOverride || href(t.other.dir, page);
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
${robotsNoindex ? '<meta name="robots" content="noindex">\n' : ''}<link rel="alternate" hreflang="${t.lang}" href="https://${SITE.domain}${selfPath}">
<link rel="alternate" hreflang="${t.other.code}" href="https://${SITE.domain}${altPath}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(pageData.desc)}">
<meta property="og:url" content="https://${SITE.domain}${selfPath}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="icon" href="${ASSET_FAVICON.publicPath}" type="image/svg+xml">
<link rel="stylesheet" href="${ASSET_TOKENS_CSS.publicPath}">
<link rel="stylesheet" href="${ASSET_SITE_CSS.publicPath}">
</head>
<body>
<a class="skip" href="#main">${esc(t.skip)}</a>

<header class="site-head">
  <div class="shell">
    <a class="brand" href="${href(t.dir, 'index')}" aria-label="kjyoo.cloud">
      <svg class="mark" viewBox="0 0 64 48" width="28" height="21" aria-hidden="true" focusable="false">
        <g fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 8 H22 Q30 8 30 16 V24" stroke="var(--kj-text-3)" stroke-width="5"/>
          <path d="M4 24 H30" stroke="var(--kj-text-3)" stroke-width="5"/>
          <path d="M4 40 H22 Q30 40 30 32 V24" stroke="var(--kj-text-3)" stroke-width="5"/>
          <path d="M30 24 H60" stroke="var(--kj-accent)" stroke-width="7"/>
        </g>
      </svg>
      <span class="brand-text">kjyoo.cloud</span>
    </a>
    <nav class="nav" aria-label="${esc(t.nav.index)}">
          ${navItems}
    </nav>
    <div class="lang">
      <a href="${selfPath}" aria-current="true">${t.selfLabel}</a>
      <span>/</span>
      <a href="${altPath}">${t.other.label}</a>
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

function pageCases(t, langKey) {
  const d = t.cases;
  const tags = d.tags.map((x) => `<span class="tag--quiet tag">${esc(x)}</span>`).join('\n        ');
  const list = (CASES[langKey] || []).filter((c) => !c.draft);
  // 결함 5 (케이스 개별 URL 부재, 2026-09-02 감사 지적) 대응. 발행된 케이스가 있으면 목록 카드로,
  // 없으면 기존 "준비 중" 빈 상태를 그대로 낸다. draft(구조 검증용 표본)는 이 목록에 올리지 않는다 -
  // 실제 발행물처럼 보이면 안 되기 때문이다.
  const body = list.length
    ? `<div class="card-grid">
${list.map((c) => `      <article class="card">
        <h3><a href="${hrefCase(t.dir, c.slug)}">${esc(c.title)}</a></h3>
        <p>${esc(c.summary)}</p>
      </article>`).join('\n')}
    </div>`
    : `<div class="empty">
      <b>${esc(d.emptyTitle)}</b>
      <p>${esc(d.emptyBody)}</p>
    </div>`;
  return `<section class="band">
  <div class="shell">
    <div class="page-head">
      <h1>${esc(d.h1)}</h1>
      <p>${esc(d.lead)}</p>
    </div>
    <div class="card-meta" style="margin-bottom: var(--kj-space-xl)">
        ${tags}
    </div>
    ${body}
  </div>
</section>
`;
}

// 결함 5 - 케이스 1건당 1페이지. 본문은 Phase 3 소관이므로 여기서는 CASES 배열이 있는 그대로
// 렌더링만 한다. 문구를 새로 짓지 않는다.
function pageCaseDetail(t, c) {
  const bodyP = c.body.map((p) => `      <p>${esc(p)}</p>`).join('\n');
  const backLabel = t.lang === 'ko' ? '목록으로' : 'Back to list';
  return `<section class="band">
  <div class="shell">
    <div class="page-head">
      <span class="tag--quiet tag">${esc(c.tag)}</span>
      <h1>${esc(c.title)}</h1>
      <p>${esc(c.summary)}</p>
    </div>
    <div class="prose" style="margin-top: var(--kj-space-lg)">
${bodyP}
    </div>
    <div class="hero-actions" style="margin-top: var(--kj-space-xl)">
      <a class="btn btn--ghost" href="${href(t.dir, 'cases')}">${esc(backLabel)}</a>
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
  const readRows = d.readRows.map(([k, v]) =>
    `        <tr><td><b>${esc(k)}</b></td><td>${esc(v)}</td></tr>`).join('\n');

  return `<section class="band">
  <div class="shell">
    <div class="page-head">
      <h1>${esc(d.h1)}</h1>
      <p>${esc(d.lead)}</p>
    </div>

    <h2>${esc(d.diaH)}</h2>
    <p style="color: var(--kj-text-2); margin: var(--kj-space-md) 0 var(--kj-space-lg); max-width: var(--kj-measure)">${esc(d.diaP)}</p>
    <div class="kjd-wrap" role="group" tabindex="0" aria-label="다이어그램. 가로로 스크롤할 수 있다">
${svgForLang(SVG_THE_SYSTEM, t.lang)}
    </div>
    <p class="sr-only">${esc(d.diaAlt)}</p>
    <p style="color: var(--kj-text-3); font-size: var(--kj-fs-caption); margin-top: var(--kj-space-md)">${esc(d.diaCaption)}</p>

    <h2 style="margin-top: var(--kj-space-3xl)">${esc(d.readH)}</h2>
    <div class="tablewrap" style="margin-top: var(--kj-space-lg)">
      <table>
        <tbody>
${readRows}
        </tbody>
      </table>
    </div>

    <h2 style="margin-top: var(--kj-space-3xl)">${esc(d.pipelineH)}</h2>
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
  const evidenceRows = d.evidenceRows.map(([k, v]) =>
    `        <tr><td><b>${esc(k)}</b></td><td>${esc(v)}</td></tr>`).join('\n');
  const anchorP = d.anchorP.map((p) => `    <p>${esc(p)}</p>`).join('\n');
  const closeP = d.closeP.map((p) => `    <p>${esc(p)}</p>`).join('\n');

  return `<section class="band">
  <div class="shell">
    <div class="page-head">
      <h1>${esc(d.h1)}</h1>
      <p>${esc(d.lead)}</p>
    </div>

    <div class="kjd-wrap" role="group" tabindex="0" aria-label="다이어그램. 가로로 스크롤할 수 있다">
${svgForLang(SVG_THEN_NOW, t.lang)}
    </div>

    <h2 style="margin-top: var(--kj-space-3xl)">${esc(d.evidenceH)}</h2>
    <div class="tablewrap" style="margin-top: var(--kj-space-lg)">
      <table>
        <tbody>
${evidenceRows}
        </tbody>
      </table>
    </div>

    <h2 style="margin-top: var(--kj-space-3xl)">${esc(d.anchorH)}</h2>
    <div class="prose" style="margin-top: var(--kj-space-lg)">
${anchorP}
    </div>

    <h2 style="margin-top: var(--kj-space-3xl)">${esc(d.closeH)}</h2>
    <div class="prose" style="margin-top: var(--kj-space-lg)">
${closeP}
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

function pageNotes(t) {
  const d = t.notes;
  const didP = d.didP.map((p) => `      <p>${esc(p)}</p>`).join('\n');
  const learnedP = d.learnedP.map((p) => `      <p>${esc(p)}</p>`).join('\n');
  const areas = d.areas.map(([k, v]) =>
    `        <tr><td><b>${esc(k)}</b></td><td>${esc(v)}</td></tr>`).join('\n');

  return `<section class="band">
  <div class="shell">
    <div class="page-head">
      <h1>${esc(d.h1)}</h1>
      <p>${esc(d.lead)}</p>
    </div>

    <h2>${esc(d.didH)}</h2>
    <div class="prose" style="margin-top: var(--kj-space-lg)">
${didP}
    </div>

    <h2 style="margin-top: var(--kj-space-3xl)">${esc(d.learnedH)}</h2>
    <div class="prose" style="margin-top: var(--kj-space-lg)">
${learnedP}
    </div>

    <h2 style="margin-top: var(--kj-space-3xl)">${esc(d.areasH)}</h2>
    <div class="tablewrap" style="margin-top: var(--kj-space-lg)">
      <table>
        <tbody>
${areas}
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

const RENDER = {
  index: pageIndex,
  cases: pageCases,
  system: pageSystem,
  'then-now': pageThenNow,
  about: pageAbout,
  notes: pageNotes,
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

// ---------- robots.txt / sitemap.xml (W-3, 2026-09-02 감사 지적) ----------

const ROBOTS_TXT = `User-agent: *
Allow: /

Sitemap: https://${SITE.domain}/sitemap.xml
`;

// 13개 경로 - PAGES(6) x 언어(2) = 12 + 루트 언어 리다이렉트 1. 케이스 개별 페이지는
// draft(구조 검증용 표본)뿐이라 아직 색인 대상에 넣지 않는다. 실제 케이스가 발행되면 여기 추가한다.
function buildSitemap() {
  const langKeys = Object.keys(CONTENT);
  const urls = [];
  for (const page of PAGES) {
    for (const langKey of langKeys) {
      const t = CONTENT[langKey];
      const loc = `https://${SITE.domain}${href(t.dir, page)}`;
      const alt = langKeys.map((lk) => {
        const tt = CONTENT[lk];
        return `    <xhtml:link rel="alternate" hreflang="${tt.lang}" href="https://${SITE.domain}${href(tt.dir, page)}"/>`;
      }).join('\n');
      urls.push(`  <url>\n    <loc>${loc}</loc>\n${alt}\n  </url>`);
    }
  }
  urls.push(`  <url>\n    <loc>https://${SITE.domain}/</loc>\n  </url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`;
}

// ---------- build ----------

function build() {
  rmSync(DIST, { recursive: true, force: true });
  mkdirSync(DIST, { recursive: true });

  cpSync(join(ROOT, 'assets'), join(DIST, 'assets'), { recursive: true });

  // D-4 - 해시 없는 이름으로 복사된 site.css / tokens.css / favicon.svg 를 해시 이름으로 교체한다.
  // HTML 은 layout() 이 ASSET_*.publicPath 로 참조하므로 이 세 파일의 옛 이름은 dist 에 남기지 않는다.
  rmSync(join(DIST, 'assets/css/site.css'), { force: true });
  rmSync(join(DIST, 'assets/css/tokens.css'), { force: true });
  rmSync(join(DIST, 'assets/img/favicon.svg'), { force: true });
  writeFileSync(join(DIST, ASSET_SITE_CSS.outRel), ASSET_SITE_CSS.buf);
  writeFileSync(join(DIST, ASSET_TOKENS_CSS.outRel), ASSET_TOKENS_CSS.buf);
  writeFileSync(join(DIST, ASSET_FAVICON.outRel), ASSET_FAVICON.buf);

  const written = [];
  for (const langKey of Object.keys(CONTENT)) {
    const t = CONTENT[langKey];
    mkdirSync(join(DIST, t.dir), { recursive: true });
    for (const page of PAGES) {
      const body = RENDER[page](t, langKey);
      const html = layout({ t, page, body });
      const file = page === 'index' ? 'index.html' : `${page}.html`;
      const out = join(DIST, t.dir, file);
      writeFileSync(out, html, 'utf8');
      written.push(`${t.dir}/${file}`);
    }

    // 결함 5 - 케이스 개별 URL. 목록(cases.html)과 별개로 케이스마다 1페이지를 낸다.
    const cases = CASES[langKey] || [];
    if (cases.length) mkdirSync(join(DIST, t.dir, 'cases'), { recursive: true });
    for (const c of cases) {
      const body = pageCaseDetail(t, c);
      const html = layout({
        t, page: 'cases', body,
        pageData: { title: c.title, desc: c.summary },
        pathOverride: hrefCase(t.dir, c.slug),
        altPathOverride: hrefCase(t.other.dir, c.slug),
        robotsNoindex: !!c.draft,
      });
      const out = join(DIST, t.dir, 'cases', `${c.slug}.html`);
      writeFileSync(out, html, 'utf8');
      written.push(`${t.dir}/cases/${c.slug}.html`);
    }
  }

  writeFileSync(join(DIST, 'index.html'), ROOT_REDIRECT, 'utf8');
  written.push('index.html');

  writeFileSync(join(DIST, 'robots.txt'), ROBOTS_TXT, 'utf8');
  written.push('robots.txt');
  writeFileSync(join(DIST, 'sitemap.xml'), buildSitemap(), 'utf8');
  written.push('sitemap.xml');

  console.log(`built ${written.length} pages -> dist/`);
  for (const w of written) console.log('  ' + w);
  console.log(`hashed assets: ${ASSET_SITE_CSS.publicPath}  ${ASSET_TOKENS_CSS.publicPath}  ${ASSET_FAVICON.publicPath}`);
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
