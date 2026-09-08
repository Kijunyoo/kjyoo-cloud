// ============================================================
// kjyoo.cloud - Notion 왕복 동기화
// v0.2 (2026-09-07) - 편집 환경 재구성 (KJ 지적: 라벨/코드 블록이 화면에 보이면 안 된다.
//   케이스는 노션 데이터베이스 행으로 낸다)
//
// 대상 3가지.
//   1) SITE(도메인/연락처) + CONTENT(ko/en 6섹션, cases 목록 페이지 문안 포함) 문안
//      -> 편집 페이지(NOTION_PAGE_ID) 본문에 "화면 순서 그대로" 제목 블록 + 문단 블록으로 낸다.
//      라벨·코드 블록은 화면에 내지 않는다 (KJ 는 그 페이지를 노션 편집기로 그냥 고친다).
//   2) CASES(케이스 title/tag/summary/body[]) -> 별도 노션 데이터베이스(NOTION_CASES_DB_ID)의
//      행(케이스 x 언어 1건당 1행)으로 낸다. 속성=Title/Slug/Lang/Excerpt/Tag/PublishDate/
//      Status/PublicURL, 본문 12문단은 그 행 페이지의 본문 블록.
//   3) CASES.slug·figure 는 문안이 아니므로 제외한다(사유는 아래 스코프 절 참조. 기존 결정 유지).
//
// 라벨을 화면에서 없앤 대신 로컬 지도 파일로 대응시킨다.
//   notion-sync-backup/blockmap.json - { page: {label: blockId}, cases: {"lang::slug": {pageId, body: [blockId,...]}} }
//   push 때마다 갱신하고 타임스탬프 사본을 같이 남긴다. pull 은 이 지도로만 읽는다.
//
// 스코프. SITE(도메인/연락처), CASES(케이스 title/tag/summary/body[]), CONTENT(6섹션
// x ko/en) 안의 "문자열 리터럴"만 다룬다.
//   - FACTS.* 를 참조하는 계산식(예 FACTS.ictYears + '년')은 라벨을 만들지 않는다.
//     실측 수치는 출처 문서를 먼저 고치는 것이 정책이다(파일 상단 주석). Notion 편집 대상이 아니다.
//   - CASES.slug 는 제외한다. build.mjs 가 URL(/{lang}/cases/<slug>.html)을 여기서
//     만들어 쓴다 - 값이 바뀌면 링크가 깨진다.
//   - CASES.figure 는 제외한다. 문안이 아니라 build.mjs pageCaseDetail 이 도해를 끼워
//     넣을 body 배열의 문단 인덱스(정수)다. 텍스트가 아니므로 편집 대상이 될 수 없다.
//
// 설정은 이 폴더의 notion.env 에서 읽는다(비추적. notion.env.example 참조).
// 토큰 정본은 로컬 자격증명 볼트(Notion API 항)에 있다. 이 저장소에는 두지 않는다.
// NOTION_CASES_DB_ID 는 최초 --push 때 케이스 데이터베이스를 만들고 이 파일에 자동 기록한다.
//
// 안전장치.
//   --pull 은 site.mjs 를 덮어쓰기 전에 site.mjs.bak.<타임스탬프> 로 백업한다.
//   --push 는 다시쓰기 전 현재 상태(도달 가능한 블록의 텍스트)를 label-value 스냅샷으로
//     notion-sync-backup/push-<타임스탬프>.json 에 저장한다.
//   --pull 은 지도(blockmap.json)의 블록/행 ID 가 노션에 하나라도 없으면 갱신을 전면
//     중단하고 무엇이 없는지 목록만 출력한다. 부분 반영 없음.
//   지도에 없는 새 블록(KJ 가 노션에서 직접 추가한 문단 등)은 site.mjs 에 반영하지 않되
//     몇 개가 어느 페이지에 생겼는지 보고한다. 배열 원소 개수는 pull 로 바뀌지 않는다.
//   두 방향 모두 실행 후 무엇이 바뀌었는지 diff 를 콘솔에 찍는다.
// ============================================================

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const SITE_MJS = join(ROOT, 'content', 'site.mjs');
const NOTION_ENV = join(ROOT, 'notion.env');
const BACKUP_DIR = join(ROOT, 'notion-sync-backup');
const BLOCKMAP_FILE = join(BACKUP_DIR, 'blockmap.json');
const NOTION_VERSION = '2026-03-11';
const CASES_DB_TITLE = 'kjyoo.cloud 케이스';

const MODE_PUSH = process.argv.includes('--push');
const MODE_PULL = process.argv.includes('--pull');
const MODE_DRY = process.argv.includes('--dry'); // 네트워크 호출 없이 site.mjs 파싱만 확인 (디버그용)

if (!MODE_DRY && MODE_PUSH === MODE_PULL) {
  console.error('사용법: node sync-notion.mjs --push  또는  node sync-notion.mjs --pull  (둘 중 하나만)');
  console.error('       node sync-notion.mjs --dry    (site.mjs 파싱만 확인, Notion 호출 없음)');
  process.exit(1);
}

function stamp() {
  return new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14); // YYYYMMDDhhmmss (UTC)
}

// ---------- 설정 ----------

function loadEnv() {
  if (!existsSync(NOTION_ENV)) {
    console.error('notion.env 가 없다. notion.env.example 을 복사해 값을 채운다.');
    process.exit(1);
  }
  const env = {};
  for (const line of readFileSync(NOTION_ENV, 'utf8').split(/\r?\n/)) {
    const s = line.trim();
    if (!s || s.startsWith('#')) continue;
    const i = s.indexOf('=');
    if (i > 0) env[s.slice(0, i).trim()] = s.slice(i + 1).trim();
  }
  for (const k of ['NOTION_TOKEN', 'NOTION_PAGE_ID']) {
    if (!env[k]) {
      console.error(`notion.env 에 ${k} 가 없다.`);
      process.exit(1);
    }
  }
  return env;
}

// notion.env 에 KEY=VALUE 한 줄을 추가하거나(이미 있으면) 갱신한다. 다른 줄·주석은
// 그대로 둔다. 케이스 데이터베이스를 처음 만든 뒤 NOTION_CASES_DB_ID 를 기록하는 데 쓴다.
function persistEnvValue(key, value) {
  const src = readFileSync(NOTION_ENV, 'utf8');
  const lines = src.split(/\r?\n/);
  let found = false;
  const out = lines.map((line) => {
    const s = line.trim();
    if (!s || s.startsWith('#')) return line;
    const i = s.indexOf('=');
    if (i > 0 && s.slice(0, i).trim() === key) { found = true; return `${key}=${value}`; }
    return line;
  });
  if (!found) {
    if (out.length && out[out.length - 1].trim() === '') out.push(`${key}=${value}`);
    else out.push('', `${key}=${value}`);
  }
  writeFileSync(NOTION_ENV, out.join('\n'), 'utf8');
}

// ---------- 미니 JS 리터럴 파서 ----------
// content/site.mjs 의 export const SITE / CASES / CONTENT 는 문자열, 배열, 객체 리터럴로만
// 구성된다(함수 없음). 이 구조만 다루는 손수 재귀 하강 파서다. 문자열이 아닌 값
// (FACTS.x + '년' 같은 계산식)은 'expr' 로 통째로 건너뛴다 - 편집 대상이 아니다.

function skipWs(src, i) {
  for (;;) {
    const c = src[i];
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') { i++; continue; }
    if (c === '/' && src[i + 1] === '/') { i += 2; while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') { i += 2; while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++; i += 2; continue; }
    break;
  }
  return i;
}

function parseString(src, i) {
  const quote = src[i];
  const start = i;
  i++;
  let value = '';
  const esc = { n: '\n', t: '\t', r: '\r', '\\': '\\', "'": "'", '"': '"', '`': '`' };
  while (i < src.length && src[i] !== quote) {
    if (src[i] === '\\') {
      const nx = src[i + 1];
      value += esc[nx] !== undefined ? esc[nx] : nx;
      i += 2;
      continue;
    }
    value += src[i];
    i++;
  }
  i++; // closing quote
  return { kind: 'string', value, quote, start, end: i };
}

function parseExpr(src, i) {
  // 문자열/배열/객체가 아닌 값(계산식 등)을 콤마/닫는괄호 직전까지 통째로 삼킨다.
  const start = i;
  let depth = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === "'" || c === '"') { i = parseString(src, i).end; continue; }
    if (c === '(' || c === '[' || c === '{') { depth++; i++; continue; }
    if (c === ')' || c === ']' || c === '}') { if (depth === 0) break; depth--; i++; continue; }
    if (c === ',' && depth === 0) break;
    i++;
  }
  return { kind: 'expr', start, end: i, raw: src.slice(start, i) };
}

function parseValue(src, i) {
  i = skipWs(src, i);
  const c = src[i];
  if (c === "'" || c === '"') {
    const s = parseString(src, i);
    // "약 " + FACTS.govRnd + '건' 처럼 문자열로 시작하되 뒤에 + 로 이어지는 계산식은
    // 문자열 하나가 아니다. 닫는 따옴표 다음이 '+' 면 원래 시작 위치부터 다시 expr 로 통째로 삼킨다
    // (그렇지 않으면 앞부분 '약 ' 만 문자열 리프로 오인해 뒤 토큰이 어긋난다 - 2026-09-04 실측 발견).
    if (src[skipWs(src, s.end)] === '+') return parseExpr(src, i);
    return s;
  }
  if (c === '[') return parseArray(src, i);
  if (c === '{') return parseObject(src, i);
  return parseExpr(src, i);
}

function parseArray(src, i) {
  const start = i;
  i++;
  const items = [];
  i = skipWs(src, i);
  while (src[i] !== ']') {
    const v = parseValue(src, i);
    items.push(v);
    i = skipWs(src, v.end);
    if (src[i] === ',') { i++; i = skipWs(src, i); }
  }
  i++;
  return { kind: 'array', items, start, end: i };
}

function parseObject(src, i) {
  const start = i;
  i++;
  const props = [];
  i = skipWs(src, i);
  while (src[i] !== '}') {
    let key;
    if (src[i] === "'" || src[i] === '"') {
      key = parseString(src, i).value;
      i = skipWs(src, parseString(src, i).end);
    } else {
      const ks = i;
      while (/[A-Za-z0-9_$]/.test(src[i])) i++;
      key = src.slice(ks, i);
      i = skipWs(src, i);
    }
    if (src[i] !== ':') throw new Error(`객체 파싱 실패 - ':' 기대, 위치 ${i} 근처: ${src.slice(i, i + 40)}`);
    i = skipWs(src, i + 1);
    const v = parseValue(src, i);
    props.push({ key, value: v });
    i = skipWs(src, v.end);
    if (src[i] === ',') { i++; i = skipWs(src, i); }
  }
  i++;
  return { kind: 'object', props, start, end: i };
}

function findExportValue(src, name) {
  const marker = `export const ${name} = `;
  const idx = src.indexOf(marker);
  if (idx === -1) throw new Error(`${name} 을 찾지 못했다`);
  return parseValue(src, idx + marker.length);
}

// label -> leaf({label, node}) 수집. 문자열 리터럴만 리프로 잡는다.
function collectLeaves(node, prefix, out) {
  if (node.kind === 'string') {
    out.push({ label: prefix, node });
  } else if (node.kind === 'array') {
    node.items.forEach((item, idx) => collectLeaves(item, `${prefix}[${idx}]`, out));
  } else if (node.kind === 'object') {
    node.props.forEach(({ key, value }) => collectLeaves(value, prefix ? `${prefix}.${key}` : key, out));
  }
  // 'expr' 은 편집 대상이 아니므로 무시한다.
}

// 라우팅/기술 식별자 - 화면 문안이 아니라 build.mjs 가 URL·hreflang 생성에 쓰는 값이다.
// KJ 가 건드리면 링크가 깨질 수 있어 Notion 편집 대상에서 뺀다.
const NOT_EDITABLE_RE = /^(ko|en)\.(lang|dir|selfLabel|other\.(code|label|dir))$/;

// CASES 전용 수집기. CASES = { ko: [ {slug, title, tag, summary, figure, body:[...]}, ... ], en: [...] }.
// 배열 인덱스가 아니라 slug 로 라벨을 만들어(cases.<lang>.<slug>.<key>) 케이스가 늘어도
// 충돌하지 않게 한다. slug·figure 는 문안이 아니므로 여기서 건너뛴다(파일 상단 스코프 주석 참조).
// fromCase 표식 - CONTENT.cases(목록 페이지) 라벨과 구분해, 편집 페이지가 아니라
// 케이스 데이터베이스로 보낼 항목을 가른다.
function collectCaseLeaves(casesNode, out) {
  if (!casesNode || casesNode.kind !== 'object') return;
  for (const { key: lang, value: arr } of casesNode.props) {
    if (arr.kind !== 'array') continue;
    for (const caseObj of arr.items) {
      if (caseObj.kind !== 'object') continue;
      const slugProp = caseObj.props.find((p) => p.key === 'slug');
      if (!slugProp || slugProp.value.kind !== 'string') {
        throw new Error(`CASES.${lang} 항목에 문자열 slug 가 없다 - 라벨을 만들 수 없다`);
      }
      const slug = slugProp.value.value;
      for (const { key, value } of caseObj.props) {
        if (key === 'slug' || key === 'figure') continue; // 스코프 제외 (상단 주석 참조)
        const before = out.length;
        collectLeaves(value, `${lang}.cases.${slug}.${key}`, out);
        for (let i = before; i < out.length; i++) { out[i].fromCase = true; out[i].caseLang = lang; out[i].caseSlug = slug; }
      }
    }
  }
}

function parseSiteMjs(src) {
  const siteNode = findExportValue(src, 'SITE');
  const casesNode = findExportValue(src, 'CASES');
  const contentNode = findExportValue(src, 'CONTENT');
  const all = [];
  collectLeaves(siteNode, 'site', all);
  collectCaseLeaves(casesNode, all);
  collectLeaves(contentNode, '', all);
  const leaves = all.filter((l) => !NOT_EDITABLE_RE.test(l.label));
  const byLabel = new Map();
  for (const leaf of leaves) {
    if (byLabel.has(leaf.label)) throw new Error(`라벨 충돌: ${leaf.label}`);
    byLabel.set(leaf.label, leaf);
  }
  return { leaves, byLabel };
}

function escapeForLiteral(value, quote) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(new RegExp(quote, 'g'), '\\' + quote)
    .replace(/\r\n/g, '\\n')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\n');
}

// ---------- Notion API ----------

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function notionFetch(env, pathname, options = {}) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(`https://api.notion.com/v1${pathname}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${env.NOTION_TOKEN}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    if (res.status === 429) {
      const wait = Number(res.headers.get('retry-after') || '1');
      await sleep((wait || 1) * 1000);
      continue;
    }
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { const err = new Error(`Notion API ${pathname} 실패 (${res.status}): ${JSON.stringify(json).slice(0, 500)}`); err.status = res.status; throw err; }
    return json;
  }
  throw new Error(`Notion API ${pathname} - 429 재시도 한도 초과`);
}

async function pageExists(env, pageId) {
  try {
    const page = await notionFetch(env, `/pages/${pageId}`, { method: 'GET' });
    return !page.in_trash;
  } catch (e) {
    if (e.status === 404) return false;
    throw e;
  }
}

async function listAllChildren(env, blockId) {
  const blocks = [];
  let cursor;
  do {
    const qs = cursor ? `?start_cursor=${cursor}&page_size=100` : '?page_size=100';
    const page = await notionFetch(env, `/blocks/${blockId}/children${qs}`, { method: 'GET' });
    blocks.push(...page.results);
    cursor = page.has_more ? page.next_cursor : undefined;
  } while (cursor);
  return blocks;
}

async function deleteAllChildren(env, blocks) {
  for (const b of blocks) {
    await notionFetch(env, `/blocks/${b.id}`, { method: 'DELETE' });
  }
}

// children 을 80개씩 잘라 붙이고, 붙인 블록의 id 를 입력과 같은 순서로 반환한다.
// (호출부가 라벨-블록 대응표를 그대로 zip 할 수 있어야 한다.)
async function appendChildrenBatched(env, blockId, children) {
  const created = [];
  for (let i = 0; i < children.length; i += 80) {
    const chunk = children.slice(i, i + 80);
    const res = await notionFetch(env, `/blocks/${blockId}/children`, { method: 'PATCH', body: JSON.stringify({ children: chunk }) });
    created.push(...res.results.map((b) => b.id));
  }
  return created;
}

function blockPlainText(b) {
  const data = b[b.type];
  if (!data || !Array.isArray(data.rich_text)) return '';
  return data.rich_text.map((rt) => rt.plain_text).join('');
}

function richText(content) {
  const chunks = [];
  for (let i = 0; i < content.length; i += 1900) chunks.push(content.slice(i, i + 1900));
  if (chunks.length === 0) chunks.push('');
  return chunks.map((c) => ({ type: 'text', text: { content: c } }));
}

function textBlock(value) {
  return { object: 'block', type: 'paragraph', paragraph: { rich_text: richText(value) } };
}
function headingBlock(level, text) {
  const type = level === 2 ? 'heading_2' : 'heading_3';
  return { object: 'block', type, [type]: { rich_text: richText(text) } };
}
function dividerBlock() {
  return { object: 'block', type: 'divider', divider: {} };
}

// 화면에 낼 사람이 읽는 제목 - 내부 키(nav/foot/a11y 등)를 그대로 보여주지 않는다.
const LANG_TITLE = { site: '사이트 공통 정보', ko: '한국어판', en: 'English version' };
const PAGE_TITLE = {
  a11y: '접근성 문구', nav: '내비게이션', foot: '푸터', skip: '건너뛰기 링크',
  index: '홈', cases: '케이스 목록 페이지', system: '시스템 페이지',
  'then-now': '그때와 지금 페이지', about: '소개 페이지',
};
function langTitle(lang) { return LANG_TITLE[lang] || lang; }
function pageTitle(lang, page) { return PAGE_TITLE[page] || page; }

// ---------- 1) 편집 페이지 (SITE + CONTENT, 케이스 제외) ----------

const MAIN_PAGE_TITLE = 'kjyoo.cloud 사이트 문안';

async function ensureMainPageTitle(env) {
  await notionFetch(env, `/pages/${env.NOTION_PAGE_ID}`, {
    method: 'PATCH',
    body: JSON.stringify({ properties: { Project: { title: richText(MAIN_PAGE_TITLE) } } }),
  });
}

// 화면 순서 그대로 제목 블록 + 문단 블록만 낸다. 라벨·코드 블록 없음.
// 반환값 blocks 와 같은 길이의 labels 배열(헤딩/구분선 자리는 null)을 같이 내려줘
// append 응답의 블록 id 와 라벨을 그 자리에서 바로 zip 할 수 있게 한다.
function buildMainPageBlocks(leaves) {
  const blocks = [];
  const labels = [];
  let curLang = null;
  let curPage = null;
  for (const leaf of leaves) {
    if (leaf.fromCase) continue; // 케이스는 별도 데이터베이스로 (아래 섹션)
    const parts = leaf.label.split('.');
    const lang = parts[0] === 'site' ? 'site' : parts[0];
    const page = parts[0] === 'site' ? null : parts[1];
    if (lang !== curLang) {
      blocks.push(dividerBlock()); labels.push(null);
      blocks.push(headingBlock(2, langTitle(lang))); labels.push(null);
      curLang = lang; curPage = null;
    }
    if (page !== curPage) {
      if (page) { blocks.push(headingBlock(3, pageTitle(lang, page))); labels.push(null); }
      curPage = page;
    }
    blocks.push(textBlock(leaf.node.value));
    labels.push(leaf.label);
  }
  return { blocks, labels };
}

async function pushMainPage(env, leaves) {
  console.log('\n[1/2] 편집 페이지 - SITE + CONTENT (케이스 제외)');
  await ensureMainPageTitle(env);
  console.log(`   제목 -> "${MAIN_PAGE_TITLE}"`);

  const before = await listAllChildren(env, env.NOTION_PAGE_ID);
  const beforeTextById = new Map(before.map((b) => [b.id, blockPlainText(b)]));

  let oldValueByLabel = new Map();
  const oldMap = readBlockmap();
  if (oldMap && oldMap.page) {
    for (const [label, blockId] of Object.entries(oldMap.page)) {
      oldValueByLabel.set(label, beforeTextById.get(blockId) ?? '');
    }
  }

  await deleteAllChildren(env, before);
  console.log(`   기존 블록 삭제 ${before.length}건`);

  const { blocks, labels } = buildMainPageBlocks(leaves);
  const createdIds = await appendChildrenBatched(env, env.NOTION_PAGE_ID, blocks);
  console.log(`   블록 ${blocks.length}개 추가`);

  const pageMap = {};
  const newValueByLabel = new Map();
  for (let i = 0; i < labels.length; i++) {
    if (labels[i]) { pageMap[labels[i]] = createdIds[i]; newValueByLabel.set(labels[i], blocks[i].paragraph.rich_text.map((r) => r.text.content).join('')); }
  }
  console.log(`   라벨 매핑 ${Object.keys(pageMap).length}건`);

  console.log('\n   diff (이전 -> 이번)');
  diffMaps(oldValueByLabel, newValueByLabel);

  return { pageMap, oldValueByLabel: Object.fromEntries(oldValueByLabel) };
}

// ---------- 2) 케이스 데이터베이스 ----------

const CASE_DB_SCHEMA = {
  Title: { title: {} },
  Slug: { rich_text: {} },
  Lang: { select: { options: [{ name: 'ko' }, { name: 'en' }] } },
  Excerpt: { rich_text: {} },
  Tag: { rich_text: {} },
  PublishDate: { date: {} },
  Status: { select: { options: [{ name: '초안' }, { name: '게시' }] } },
  PublicURL: { rich_text: {} },
};

async function ensureCasesDatabase(env) {
  if (env.NOTION_CASES_DB_ID) {
    const db = await notionFetch(env, `/databases/${env.NOTION_CASES_DB_ID}`, { method: 'GET' });
    const dataSourceId = db.data_sources[0].id;
    return { databaseId: env.NOTION_CASES_DB_ID, dataSourceId };
  }
  console.log(`   케이스 데이터베이스 없음 - "${CASES_DB_TITLE}" 신규 생성`);
  // 내부 인테그레이션은 workspace 루트에 데이터베이스를 직접 만들 수 없다(2026-09-07 실측:
  // "Provide a parent.page_id..." 400). page_id 부모가 필요해, 편집 페이지와 같은
  // 프로젝트 데이터베이스 안에 컨테이너 페이지를 하나 만들고 그 밑에 데이터베이스를 건다 -
  // 편집 페이지 옆에서 바로 보이고, push 가 지우는 대상(NOTION_PAGE_ID 의 자식)과도 분리된다.
  const mainPage = await notionFetch(env, `/pages/${env.NOTION_PAGE_ID}`, { method: 'GET' });
  const parentDataSourceId = mainPage.parent.data_source_id;
  const container = await notionFetch(env, '/pages', {
    method: 'POST',
    body: JSON.stringify({
      parent: { type: 'data_source_id', data_source_id: parentDataSourceId },
      properties: { Project: { title: richText(`${CASES_DB_TITLE} (컨테이너)`) } },
    }),
  });
  const db = await notionFetch(env, '/databases', {
    method: 'POST',
    body: JSON.stringify({
      parent: { type: 'page_id', page_id: container.id },
      title: [{ type: 'text', text: { content: CASES_DB_TITLE } }],
      is_inline: false,
      initial_data_source: { properties: CASE_DB_SCHEMA },
    }),
  });
  const dataSourceId = db.data_sources[0].id;
  persistEnvValue('NOTION_CASES_DB_ID', db.id);
  env.NOTION_CASES_DB_ID = db.id;
  console.log(`   컨테이너 페이지 ${container.id} 밑에 생성 완료 - database ${db.id} / data_source ${dataSourceId} (notion.env 에 기록)`);
  return { databaseId: db.id, dataSourceId };
}

function publicUrl(domain, lang, slug) {
  return `https://${domain}/${lang}/cases/${slug}.html`;
}

// leaves 에서 fromCase 인 것만 모아 (lang, slug) 단위로 재구성한다.
function buildCaseGroups(leaves) {
  const groups = new Map(); // key = `${lang}::${slug}`
  for (const leaf of leaves) {
    if (!leaf.fromCase) continue;
    const key = `${leaf.caseLang}::${leaf.caseSlug}`;
    if (!groups.has(key)) groups.set(key, { lang: leaf.caseLang, slug: leaf.caseSlug, titleLeaf: null, tagLeaf: null, summaryLeaf: null, bodyLeaves: [] });
    const g = groups.get(key);
    const m = /\.body\[(\d+)\]$/.exec(leaf.label);
    if (m) { g.bodyLeaves[Number(m[1])] = leaf; }
    else if (leaf.label.endsWith('.title')) g.titleLeaf = leaf;
    else if (leaf.label.endsWith('.tag')) g.tagLeaf = leaf;
    else if (leaf.label.endsWith('.summary')) g.summaryLeaf = leaf;
  }
  return [...groups.values()];
}

async function findExistingCaseRow(env, dataSourceId, lang, slug) {
  const res = await notionFetch(env, `/data_sources/${dataSourceId}/query`, {
    method: 'POST',
    body: JSON.stringify({ filter: { and: [{ property: 'Slug', rich_text: { equals: slug } }, { property: 'Lang', select: { equals: lang } }] } }),
  });
  return res.results[0] || null;
}

async function pushCases(env, dataSourceId, groups, siteDomain) {
  console.log('\n[2/2] 케이스 데이터베이스');
  const casesMap = {};
  const oldValues = {};
  for (const g of groups) {
    const key = `${g.lang}::${g.slug}`;
    const url = publicUrl(siteDomain, g.lang, g.slug);
    const existing = await findExistingCaseRow(env, dataSourceId, g.lang, g.slug);

    let before = [];
    const oldMap = readBlockmap();
    const oldCase = oldMap && oldMap.cases && oldMap.cases[key];
    if (existing) before = await listAllChildren(env, existing.id);
    if (oldCase) {
      const textById = new Map(before.map((b) => [b.id, blockPlainText(b)]));
      oldValues[`${g.lang}.cases.${g.slug}.title`] = existing ? plainOfTitleProp(existing.properties.Title) : '';
      oldValues[`${g.lang}.cases.${g.slug}.tag`] = existing ? plainOfRichTextProp(existing.properties.Tag) : '';
      oldValues[`${g.lang}.cases.${g.slug}.summary`] = existing ? plainOfRichTextProp(existing.properties.Excerpt) : '';
      (oldCase.body || []).forEach((blockId, i) => { oldValues[`${g.lang}.cases.${g.slug}.body[${i}]`] = textById.get(blockId) ?? ''; });
    }

    // Status 는 push 가 임의로 바꾸지 않는다. 기존 행이 있으면 그 값을 유지하고(예:
    // 이미 '게시'로 KJ 가 승인한 행을 다시 '초안'으로 되돌리지 않는다), 신규 행은
    // '초안'으로 시작한다. 승인은 KJ 가 노션에서 직접 한다(2026-09-08 MAT-0001 v2).
    const existingStatus = existing && existing.properties.Status && existing.properties.Status.select
      ? existing.properties.Status.select.name : null;
    const properties = {
      Title: { title: richText(g.titleLeaf.node.value) },
      Slug: { rich_text: richText(g.slug) },
      Lang: { select: { name: g.lang } },
      Excerpt: { rich_text: richText(g.summaryLeaf.node.value) },
      Tag: { rich_text: richText(g.tagLeaf.node.value) },
      Status: { select: { name: existingStatus || '초안' } },
      PublicURL: { rich_text: richText(url) },
    };

    let pageId;
    if (existing) {
      pageId = existing.id;
      await notionFetch(env, `/pages/${pageId}`, { method: 'PATCH', body: JSON.stringify({ properties }) });
      if (before.length) await deleteAllChildren(env, before);
    } else {
      const page = await notionFetch(env, '/pages', {
        method: 'POST',
        body: JSON.stringify({ parent: { type: 'data_source_id', data_source_id: dataSourceId }, properties }),
      });
      pageId = page.id;
    }

    const bodyBlocks = g.bodyLeaves.map((leaf) => textBlock(leaf.node.value));
    const bodyIds = await appendChildrenBatched(env, pageId, bodyBlocks);
    casesMap[key] = { pageId, body: bodyIds };
    console.log(`   [${g.lang}] ${g.slug} -> page ${pageId} (본문 문단 ${bodyIds.length}개, ${existing ? '갱신' : '신규'})`);
  }

  console.log('\n   diff (이전 -> 이번, 케이스)');
  const newValues = new Map();
  for (const g of groups) {
    newValues.set(`${g.lang}.cases.${g.slug}.title`, g.titleLeaf.node.value);
    newValues.set(`${g.lang}.cases.${g.slug}.tag`, g.tagLeaf.node.value);
    newValues.set(`${g.lang}.cases.${g.slug}.summary`, g.summaryLeaf.node.value);
    g.bodyLeaves.forEach((leaf, i) => newValues.set(`${g.lang}.cases.${g.slug}.body[${i}]`, leaf.node.value));
  }
  diffMaps(new Map(Object.entries(oldValues)), newValues);

  return { casesMap, oldValues };
}

function plainOfTitleProp(prop) { return (prop?.title || []).map((t) => t.plain_text).join(''); }
function plainOfRichTextProp(prop) { return (prop?.rich_text || []).map((t) => t.plain_text).join(''); }

// ---------- 블록맵 ----------

function readBlockmap() {
  if (!existsSync(BLOCKMAP_FILE)) return null;
  return JSON.parse(readFileSync(BLOCKMAP_FILE, 'utf8'));
}

function writeBlockmap(map) {
  mkdirSync(BACKUP_DIR, { recursive: true });
  const json = JSON.stringify(map, null, 2);
  writeFileSync(BLOCKMAP_FILE, json, 'utf8');
  writeFileSync(join(BACKUP_DIR, `blockmap-${stamp()}.json`), json, 'utf8');
}

// ---------- push: site.mjs -> Notion ----------

async function push(env) {
  const src = readFileSync(SITE_MJS, 'utf8');
  const { leaves, byLabel } = parseSiteMjs(src);
  console.log(`site.mjs 파싱 완료 - 라벨 ${leaves.length}건`);

  const siteDomain = byLabel.get('site.domain').node.value;

  const { pageMap, oldValueByLabel: oldMain } = await pushMainPage(env, leaves);
  const { dataSourceId } = await ensureCasesDatabase(env);
  const groups = buildCaseGroups(leaves);
  const { casesMap, oldValues: oldCases } = await pushCases(env, dataSourceId, groups, siteDomain);

  writeBlockmap({ generatedAt: new Date().toISOString(), page: pageMap, cases: casesMap });
  console.log(`\n블록맵 저장 -> ${BLOCKMAP_FILE}`);

  mkdirSync(BACKUP_DIR, { recursive: true });
  const backupFile = join(BACKUP_DIR, `push-${stamp()}.json`);
  writeFileSync(backupFile, JSON.stringify({ page: oldMain, cases: oldCases }, null, 2), 'utf8');
  console.log(`백업(이전 상태) -> ${backupFile}`);

  await verifyPush(env, pageMap, casesMap, byLabel);
}

// 검증 - 되읽어서 code 블록 0건, 깨짐 문자(U+FFFD) 0건, 제목 일치를 확인한다.
async function verifyPush(env, pageMap, casesMap, byLabel) {
  console.log('\n[검증] 되읽기');
  const page = await notionFetch(env, `/pages/${env.NOTION_PAGE_ID}`, { method: 'GET' });
  const title = plainOfTitleProp(page.properties.Project);
  console.log(`   제목 = "${title}" (기대값 "${MAIN_PAGE_TITLE}") -> ${title === MAIN_PAGE_TITLE ? 'PASS' : 'FAIL'}`);

  const mainChildren = await listAllChildren(env, env.NOTION_PAGE_ID);
  const codeBlocks = mainChildren.filter((b) => b.type === 'code');
  console.log(`   편집 페이지 code 블록 = ${codeBlocks.length}건 -> ${codeBlocks.length === 0 ? 'PASS' : 'FAIL'}`);

  let fffd = 0;
  const scanTexts = [title, ...mainChildren.map(blockPlainText)];
  for (const [key, entry] of Object.entries(casesMap)) {
    const p = await notionFetch(env, `/pages/${entry.pageId}`, { method: 'GET' });
    scanTexts.push(plainOfTitleProp(p.properties.Title), plainOfRichTextProp(p.properties.Tag), plainOfRichTextProp(p.properties.Excerpt), plainOfRichTextProp(p.properties.PublicURL));
    const children = await listAllChildren(env, entry.pageId);
    for (const c of children) scanTexts.push(blockPlainText(c));
  }
  for (const t of scanTexts) if (t.includes('�')) fffd++;
  console.log(`   깨짐 문자(U+FFFD) = ${fffd}건 -> ${fffd === 0 ? 'PASS' : 'FAIL'}`);

  console.log('\n   케이스 표본 (제목/본문 첫 문단/본문 마지막 문단)');
  for (const [key, entry] of Object.entries(casesMap)) {
    const [lang, slug] = key.split('::');
    const p = await notionFetch(env, `/pages/${entry.pageId}`, { method: 'GET' });
    const children = await listAllChildren(env, entry.pageId);
    const byId = new Map(children.map((b) => [b.id, blockPlainText(b)]));
    const first = byId.get(entry.body[0]) ?? '';
    const last = byId.get(entry.body[entry.body.length - 1]) ?? '';
    console.log(`   [${lang}] ${slug}`);
    console.log(`     title = ${plainOfTitleProp(p.properties.Title)}`);
    console.log(`     body[0]  = ${truncate(first, 80)}`);
    console.log(`     body[${entry.body.length - 1}] = ${truncate(last, 80)}`);
  }
}

// ---------- pull: Notion -> site.mjs ----------

async function pull(env) {
  const src = readFileSync(SITE_MJS, 'utf8');
  const { leaves, byLabel } = parseSiteMjs(src);
  console.log(`site.mjs 파싱 완료 - 라벨 ${leaves.length}건`);

  const map = readBlockmap();
  if (!map) {
    console.error('블록맵(notion-sync-backup/blockmap.json)이 없다. 먼저 node sync-notion.mjs --push 를 실행한다.');
    process.exit(1);
  }

  console.log('\n1) 블록맵 대상 존재 확인');
  const missing = [];

  const mainChildren = await listAllChildren(env, env.NOTION_PAGE_ID);
  const mainIdSet = new Set(mainChildren.map((b) => b.id));
  const mainTextById = new Map(mainChildren.map((b) => [b.id, blockPlainText(b)]));
  for (const [label, blockId] of Object.entries(map.page || {})) {
    if (!mainIdSet.has(blockId)) missing.push(`편집 페이지 [${label}] (block ${blockId})`);
  }

  const caseChildrenById = new Map(); // pageId -> children[]
  for (const [key, entry] of Object.entries(map.cases || {})) {
    const exists = await pageExists(env, entry.pageId);
    if (!exists) { missing.push(`케이스 [${key}] (page ${entry.pageId})`); continue; }
    const children = await listAllChildren(env, entry.pageId);
    caseChildrenById.set(entry.pageId, children);
    const idSet = new Set(children.map((b) => b.id));
    (entry.body || []).forEach((blockId, i) => {
      if (!idSet.has(blockId)) missing.push(`케이스 [${key}].body[${i}] (block ${blockId})`);
    });
  }

  if (missing.length) {
    console.error(`\n블록맵에 있는데 노션에서 사라진 대상 (${missing.length}건) - 갱신을 전면 중단한다. 부분 반영 없음.`);
    for (const m of missing) console.error('  - ' + m);
    process.exit(1);
  }
  console.log('   전건 존재 확인');

  console.log('\n2) 지도에 없는 새 블록(추가분) 보고 - site.mjs 에는 반영하지 않는다');
  const mappedMainIds = new Set(Object.values(map.page || {}));
  const extraMain = mainChildren.filter((b) => !mappedMainIds.has(b.id) && b.type !== 'divider' && !b.type.startsWith('heading_'));
  console.log(`   편집 페이지 - 매핑 안 된 블록 ${extraMain.length}건`);
  for (const b of extraMain.slice(0, 10)) console.log(`     - (${b.type}) ${truncate(blockPlainText(b), 60)}`);
  for (const [key, entry] of Object.entries(map.cases || {})) {
    const children = caseChildrenById.get(entry.pageId) || [];
    const mappedIds = new Set(entry.body || []);
    const extra = children.filter((b) => !mappedIds.has(b.id));
    if (extra.length) {
      console.log(`   케이스 [${key}] - 매핑 안 된 블록 ${extra.length}건`);
      for (const b of extra.slice(0, 10)) console.log(`     - (${b.type}) ${truncate(blockPlainText(b), 60)}`);
    }
  }

  console.log('\n3) 원격 값 수집');
  const remoteByLabel = new Map();
  for (const [label, blockId] of Object.entries(map.page || {})) {
    remoteByLabel.set(label, mainTextById.get(blockId) ?? '');
  }
  for (const [key, entry] of Object.entries(map.cases || {})) {
    const [lang, slug] = key.split('::');
    const p = await notionFetch(env, `/pages/${entry.pageId}`, { method: 'GET' });
    remoteByLabel.set(`${lang}.cases.${slug}.title`, plainOfTitleProp(p.properties.Title));
    remoteByLabel.set(`${lang}.cases.${slug}.tag`, plainOfRichTextProp(p.properties.Tag));
    remoteByLabel.set(`${lang}.cases.${slug}.summary`, plainOfRichTextProp(p.properties.Excerpt));
    const children = caseChildrenById.get(entry.pageId) || [];
    const textById = new Map(children.map((b) => [b.id, blockPlainText(b)]));
    (entry.body || []).forEach((blockId, i) => remoteByLabel.set(`${lang}.cases.${slug}.body[${i}]`, textById.get(blockId) ?? ''));
  }

  console.log('\n4) 변경분 계산');
  const changes = [];
  for (const leaf of leaves) {
    if (!remoteByLabel.has(leaf.label)) continue; // 블록맵에 없는 라벨(예: 새 케이스 아직 push 안 함)은 건너뛴다
    const newValue = remoteByLabel.get(leaf.label);
    if (newValue !== leaf.node.value) changes.push({ leaf, oldValue: leaf.node.value, newValue });
  }
  if (changes.length === 0) {
    console.log('   변경 없음 - site.mjs 를 건드리지 않았다');
    return;
  }
  console.log(`   변경 ${changes.length}건`);

  console.log('\n5) 백업');
  const backupPath = `${SITE_MJS}.bak.${stamp()}`;
  writeFileSync(backupPath, src, 'utf8');
  console.log(`   ${backupPath}`);

  console.log('\n6) site.mjs 갱신');
  const sorted = [...changes].sort((a, b) => b.leaf.node.start - a.leaf.node.start);
  let out = src;
  for (const { leaf, newValue } of sorted) {
    const quote = leaf.node.quote;
    const literal = quote + escapeForLiteral(newValue, quote) + quote;
    out = out.slice(0, leaf.node.start) + literal + out.slice(leaf.node.end);
  }
  writeFileSync(SITE_MJS, out, 'utf8');
  console.log(`   ${SITE_MJS} 갱신 완료`);

  console.log('\n7) diff (반영된 변경분만)');
  for (const { leaf, oldValue, newValue } of changes) {
    console.log(`  [${leaf.label}]`);
    console.log(`    - ${truncate(oldValue)}`);
    console.log(`    + ${truncate(newValue)}`);
  }
}

function truncate(s, n = 120) {
  const flat = (s || '').replace(/\n/g, '\\n');
  return flat.length > n ? flat.slice(0, n) + '...' : flat;
}

function diffMaps(oldMap, newMap) {
  const oldKeys = new Set(oldMap.keys());
  const newKeys = new Set(newMap.keys());
  const added = [...newKeys].filter((k) => !oldKeys.has(k));
  const removed = [...oldKeys].filter((k) => !newKeys.has(k));
  const changed = [...newKeys].filter((k) => oldKeys.has(k) && (oldMap.get(k) || '') !== (newMap.get(k) || ''));
  console.log(`   추가 ${added.length}건 / 삭제 ${removed.length}건 / 변경 ${changed.length}건 / 총 ${newKeys.size}건`);
  for (const k of changed.slice(0, 30)) {
    console.log(`  [${k}]`);
    console.log(`    - ${truncate(oldMap.get(k) || '')}`);
    console.log(`    + ${truncate(newMap.get(k) || '')}`);
  }
  if (changed.length > 30) console.log(`  ... 외 ${changed.length - 30}건 생략`);
}

// ---------- 본체 ----------

if (MODE_DRY) {
  const src = readFileSync(SITE_MJS, 'utf8');
  const { leaves } = parseSiteMjs(src);
  console.log(`파싱 성공 - 라벨 ${leaves.length}건`);
  // 왕복 안전성 확인 - 각 리프의 [start,end) 슬라이스가 quote+value 로 재구성한 리터럴과
  // 바이트 단위로 같은지 검사한다(다르면 파서 버그로 원본을 훼손할 수 있다는 뜻).
  let mismatch = 0;
  for (const leaf of leaves) {
    const raw = src.slice(leaf.node.start, leaf.node.end);
    const rebuilt = leaf.node.quote + escapeForLiteral(leaf.node.value, leaf.node.quote) + leaf.node.quote;
    if (raw !== rebuilt) { mismatch++; console.log(`  왕복 불일치 [${leaf.label}]\n    raw:      ${raw}\n    rebuilt:  ${rebuilt}`); }
  }
  console.log(mismatch === 0 ? '왕복 재구성 전건 일치 (0건 불일치)' : `왕복 불일치 ${mismatch}건`);
  const koCaseItems = leaves.filter((l) => l.fromCase && l.label.startsWith('ko.'));
  const enCaseItems = leaves.filter((l) => l.fromCase && l.label.startsWith('en.'));
  console.log(`\nCASES(케이스 본문) 라벨 - ko ${koCaseItems.length}건 / en ${enCaseItems.length}건`);
  console.log('\n표본 10건:');
  for (const leaf of leaves.slice(0, 10)) console.log(`  [${leaf.label}] = ${truncate(leaf.node.value, 60)}`);
  process.exit(mismatch === 0 ? 0 : 1);
}

const env = loadEnv();
if (MODE_PUSH) await push(env);
else await pull(env);
