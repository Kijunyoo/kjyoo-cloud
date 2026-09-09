// ============================================================
// kjyoo.cloud - 발행 자동화 (VPS 상주 실행 전용)
// v1.2 (2026-09-09, 2차 감리 지적 8건 시정 - D-1~D-6)
//
// 이 파일은 Hostinger VPS(72.61.151.50) 의 /root/kjyoo-cloud-src 에서만 돈다.
// n8n(같은 서버) 이 10분마다 SSH 로 run.sh 를 호출하고, run.sh 가 이 스크립트를 부른다.
// KJ PC 가 꺼져 있어도 동작한다 - 그것이 이 파일의 존재 이유다.
//
// 흐름: 잠금 획득(D-3) -> git pull(원격 코드 최신화) -> 노션 케이스 DB 에서 Status=게시
//   행 조회 -> 코드(CASES)에 이미 있는 케이스는 문안(제목/태그/발췌/본문)을 site.mjs 에
//   반영, 코드에 없는 케이스는 새 객체를 만들어 CASES.<lang> 끝에 추가(신규 발행 자동화 -
//   Slug 없으면 만들지 않고 건너뛰고 알린다. figure/thenNow 는 코드 전용 값이라 비워둠).
//   PublishDate 비어 있으면 채움(노션+site.mjs 양쪽) -> 변경 없으면 여기서 종료(빌드 생략)
//   -> node build.mjs -> 로컬 릴리스 배포(같은 서버라 scp 불필요, cp + 심볼릭 링크 전환,
//      릴리스 이름에 초+PID 포함 - D-3) -> 라이브 검증(SHA-256 대조 - 감사관 관찰 반영,
//      전체 파일 200+해시 일치) -> 실패 시 심볼릭 링크와 site.mjs 를 되돌리고(rolledBack:true)
//      종료코드 1 -> 성공 시 그 이후(노션 되쓰기/git commit·push/IndexNow/Search Console)는
//      **개별적으로** 실패를 잡는다 - 이미 라이브는 정상이므로 종료코드 1(배포실패)로
//      오분류하지 않고 2(부분실패)로만 기록한다(D-1, D-2).
//
// 종료코드. 0=변경 없음 또는 전체 성공. 1=배포 실패(rolledBack 필드로 실제 롤백 여부 명시,
//   n8n 판정은 이 필드만 보고 문구를 짠다 - 추정 금지, D-2). 2=배포는 성공, 그 이후 단계
//   (노션 되쓰기/git 커밋·푸시/색인 통보/노션 행 스킵) 중 하나 이상 실패(사이트는 정상).
// 마지막 줄에 항상 JSON 한 줄을 찍는다 - 호출부(run.sh/n8n)가 파싱해 알림 본문을 짠다.
// 동시 실행 방지 - publish-logs/auto-publish.lock (PID 기록, 15분 초과 시 이전 실행 크래시로
//   보고 회수). 전체 실행 상한 4분 워치독(D-4) - 이 시간을 넘기면 강제 종료+알림.
// ============================================================

import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, cpSync, unlinkSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createSign, createHash, randomBytes } from 'node:crypto';

const ROOT = dirname(fileURLToPath(import.meta.url));
const SITE_MJS = join(ROOT, 'content', 'site.mjs');
const DIST = join(ROOT, 'dist');
const HEARTBEAT_FILE = join(ROOT, 'publish-logs', 'last-run.json');
const SKIP_DEDUP_FILE = join(ROOT, 'publish-logs', 'skip-dedup.json'); // E-3(3차 감리) - 파일에 남겨 재시작에도 살아남게 한다
const SKIP_ALERT_INTERVAL_MS = 24 * 3600 * 1000; // 같은 사유·같은 행은 하루 1회만
const LOCK_FILE = join(ROOT, 'publish-logs', 'auto-publish.lock');
const LOCK_STALE_MS = 15 * 60 * 1000; // 10분 주기의 1.5배 - 이보다 오래 걸리면 이전 실행 크래시로 본다
const WATCHDOG_MS = 4 * 60 * 1000;    // 전체 실행 상한 (D-4). 정상 실행은 초 단위.
const FETCH_TIMEOUT_MS = 20000;       // 개별 fetch 상한 (D-4)

const DEPLOY_ROOT = '/root/n8n/static';
const DEPLOY_NAME = 'kjyoo-cloud';
const VERIFY_BASE = 'https://kjyoo.cloud';
// Search Console 제출용 SA 키. KJ 가 2026-09-09 Search Console 에서 이 SA 이메일을
// 속성(https://kjyoo.cloud/) 에 전체 사용자로 등록 완료 - 실측 제출 204로 확인됨(더는 미결 아님).
const GCP_SA_KEY = '/root/kjyoo-cloud-src/gcp-sa-searchconsole.json';
const SEARCHCONSOLE_SITE_URL = 'https://kjyoo.cloud/';

const log = [];
function say(line) { log.push(line); console.log(line); }

// ---------- 타임아웃 있는 fetch (D-4) ----------
async function fetchTO(url, options = {}, timeoutMs = FETCH_TIMEOUT_MS) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(new Error(`fetch 타임아웃 ${timeoutMs}ms: ${url}`)), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ---------- 동시 실행 잠금 (D-3) ----------
function acquireLock() {
  mkdirSync(dirname(LOCK_FILE), { recursive: true });
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      writeFileSync(LOCK_FILE, JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }), { flag: 'wx' });
      return true;
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      let age = Infinity;
      try { age = Date.now() - statSync(LOCK_FILE).mtimeMs; } catch { /* 잠금이 방금 사라졌을 수 있다 */ }
      if (age > LOCK_STALE_MS && attempt === 0) {
        say(`   잠금파일이 ${Math.round(age / 60000)}분째 방치됨(이전 실행 크래시로 판단) - 회수하고 재시도`);
        try { unlinkSync(LOCK_FILE); } catch { /* 이미 없으면 무시 */ }
        continue;
      }
      return false; // 다른 실행이 진행 중 - 정상적인 겹침, 조용히 건너뛴다
    }
  }
  return false;
}
function releaseLock() {
  try { unlinkSync(LOCK_FILE); } catch { /* 이미 없으면 무시 */ }
}

// ---------- 스킵 경보 하루 1회 억제 (E-3, 3차 감리 - 비서실장 결정 4가지 반영) ----------
// 파일에 저장한다(메모리에만 두지 않는다 - 결정 4번, 재시작에도 살아남아야 한다).
// 키는 "[pageId] 사유" 문자열 그대로(같은 행의 같은 사유만 같은 키가 된다 - KJ 가 그
// 행을 고쳐 사유 문구 자체가 달라지면 새 키가 되어 다시 1회 알린다. 의도된 동작이다 -
// 사유가 바뀌었다는 것은 새로운 정보다).
function loadSkipDedup() {
  if (!existsSync(SKIP_DEDUP_FILE)) return {};
  try { return JSON.parse(readFileSync(SKIP_DEDUP_FILE, 'utf8')); } catch { return {}; }
}
function saveSkipDedup(store) {
  mkdirSync(dirname(SKIP_DEDUP_FILE), { recursive: true });
  writeFileSync(SKIP_DEDUP_FILE, JSON.stringify(store, null, 2), 'utf8');
}
// skipReasons(현재 회차에 실제로 스킵된 행 전부) 를 받아, 하루 안에 이미 알린 것은 걸러낸
// alertableSkips 만 반환한다. 이번에 안 보이는 과거 키(행이 고쳐졌거나 지워짐)는 지운다 -
// 파일이 무한정 자라지 않게 한다. 알린 것은 즉시 타임스탬프를 갱신해 저장한다.
function filterSkipAlerts(skipReasons) {
  const store = loadSkipDedup();
  const now = Date.now();
  const alertable = [];
  for (const s of skipReasons) {
    const last = store[s];
    if (!last || (now - Date.parse(last)) >= SKIP_ALERT_INTERVAL_MS) {
      alertable.push(s);
      store[s] = new Date(now).toISOString();
    }
  }
  for (const k of Object.keys(store)) if (!skipReasons.includes(k)) delete store[k];
  saveSkipDedup(store);
  return alertable;
}

function loadEnvFile(file, need) {
  if (!existsSync(file)) throw new Error(`${file} 가 없다`);
  const raw = {};
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const s = line.trim();
    if (!s || s.startsWith('#')) continue;
    const i = s.indexOf('=');
    if (i > 0) raw[s.slice(0, i).trim()] = s.slice(i + 1).trim();
  }
  const missing = need.filter((k) => !raw[k]);
  if (missing.length) throw new Error(`${file} 에 값이 빠졌다: ${missing.join(', ')}`);
  return raw;
}

// timeout 기본값 60초(D-4) - 개별 호출부에서 opts.timeout 으로 덮어쓸 수 있다.
// spawnSync 는 timeout 초과 시 status 를 null 로 주고 signal 에 'SIGTERM' 을 채운다 -
// 아래 status!==0 검사가 null 도 실패로 잡으므로 별도 분기 없이도 안전하게 걸린다.
function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', timeout: 60000, ...opts });
  const timedOut = r.signal === 'SIGTERM' && r.status === null;
  return { status: r.status, stdout: r.stdout || '', stderr: r.stderr || '', timedOut };
}
function runOrThrow(cmd, args, opts = {}) {
  const r = run(cmd, args, opts);
  if (r.status !== 0) {
    const suffix = r.timedOut ? ' (타임아웃)' : '';
    throw new Error(`실패: ${cmd} ${args.join(' ')} (exit ${r.status}${suffix})\n${r.stderr}`);
  }
  return r;
}

// ---------- 미니 JS 리터럴 파서 (sync-notion.mjs 와 동일 로직의 독립 사본 - VPS 단독 실행,
// 외부 파일 의존 없이 이 파일 하나로 끝나야 한다) ----------

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
  const start = i; i++;
  let value = '';
  const esc = { n: '\n', t: '\t', r: '\r', '\\': '\\', "'": "'", '"': '"', '`': '`' };
  while (i < src.length && src[i] !== quote) {
    if (src[i] === '\\') { const nx = src[i + 1]; value += esc[nx] !== undefined ? esc[nx] : nx; i += 2; continue; }
    value += src[i]; i++;
  }
  i++;
  return { kind: 'string', value, quote, start, end: i };
}
function parseExpr(src, i) {
  const start = i; let depth = 0;
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
    if (src[skipWs(src, s.end)] === '+') return parseExpr(src, i);
    return s;
  }
  if (c === '[') return parseArray(src, i);
  if (c === '{') return parseObject(src, i);
  return parseExpr(src, i);
}
function parseArray(src, i) {
  const start = i; i++;
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
  const start = i; i++;
  const props = [];
  i = skipWs(src, i);
  while (src[i] !== '}') {
    const propStart = i;
    let key;
    if (src[i] === "'" || src[i] === '"') { key = parseString(src, i).value; i = skipWs(src, parseString(src, i).end); }
    else { const ks = i; while (/[A-Za-z0-9_$]/.test(src[i])) i++; key = src.slice(ks, i); i = skipWs(src, i); }
    if (src[i] !== ':') throw new Error(`객체 파싱 실패 - ':' 기대, 위치 ${i} 근처: ${src.slice(i, i + 40)}`);
    i = skipWs(src, i + 1);
    const v = parseValue(src, i);
    let propEnd = v.end;
    i = skipWs(src, v.end);
    if (src[i] === ',') { i++; propEnd = i; i = skipWs(src, i); }
    props.push({ key, value: v, propStart, propEnd });
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
function escapeForLiteral(value, quote) {
  return value.replace(/\\/g, '\\\\').replace(new RegExp(quote, 'g'), '\\' + quote)
    .replace(/\r\n/g, '\\n').replace(/\n/g, '\\n').replace(/\r/g, '\\n');
}
function literalOf(node, quote, value) { return quote + escapeForLiteral(value, quote) + quote; }

// caseObj(object 노드)에서 key -> {value node, propStart, propEnd} 맵 구성
function propMap(caseObj) {
  const m = new Map();
  for (const p of caseObj.props) m.set(p.key, p);
  return m;
}

// ---------- 신규 케이스 삽입 (코드에 없는 slug - 2026-09-09 신설) ----------
// figure·thenNow 는 문안이 아니라 코드 전용 값(도해 삽입 위치·대비표)이므로 여기서
// 채우지 않고 비운 채로 만든다(과업 지시). build.mjs 는 두 키 모두 선택값으로 다뤄
// undefined 여도 정상 렌더링한다(pageCaseDetail c.figure/c.thenNow 미정 분기).
function buildCaseObjectText(fields) {
  const q = "'";
  const lit = (v) => q + escapeForLiteral(v || '', q) + q;
  const bodyLines = fields.body.map((p) => `        ${lit(p)},`).join('\n');
  return [
    '    {',
    `      slug: ${lit(fields.slug)},`,
    `      title: ${lit(fields.title)},`,
    `      tag: ${lit(fields.tag)},`,
    `      date: ${lit(fields.date)},`,
    `      summary: ${lit(fields.summary)},`,
    '      body: [',
    bodyLines,
    '      ],',
    '    }',
  ].join('\n');
}

// arrayNode(langProp.value, CASES.ko 또는 CASES.en 배열 노드)의 끝에 새 케이스 객체를
// 삽입하는 { start, end, text } 편집을 만든다. start===end 로 두면 순수 삽입이 된다
// (호출부의 공통 edits 적용 루프 - src.slice(0,start)+text+src.slice(end) - 를 그대로 재사용).
function buildCaseInsertion(arrayNode, fields) {
  const objectText = buildCaseObjectText(fields);
  if (arrayNode.items.length) {
    const last = arrayNode.items[arrayNode.items.length - 1];
    // 마지막 항목의 닫는 '}' 바로 뒤(원본의 트레일링 콤마 앞)에 삽입한다.
    // 삽입문 앞의 ',\n' 이 마지막 항목과 새 항목을 구분하고, 원본에 이미 있던
    // 트레일링 콤마는 그대로 새 항목의 트레일링 콤마가 된다.
    return { start: last.end, end: last.end, text: ',\n' + objectText };
  }
  // 빈 배열('[]' 또는 '[\n  ]') - '[' 바로 뒤에 삽입한다.
  return { start: arrayNode.start + 1, end: arrayNode.start + 1, text: '\n' + objectText + ',\n  ' };
}

// ---------- Notion API ----------

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
async function notionFetch(env, pathname, options = {}) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetchTO(`https://api.notion.com/v1${pathname}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${env.NOTION_TOKEN}`,
        'Notion-Version': '2026-03-11',
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    if (res.status === 429) { const wait = Number(res.headers.get('retry-after') || '1'); await sleep((wait || 1) * 1000); continue; }
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { const err = new Error(`Notion API ${pathname} 실패 (${res.status}): ${JSON.stringify(json).slice(0, 500)}`); err.status = res.status; throw err; }
    return json;
  }
  throw new Error(`Notion API ${pathname} - 429 재시도 한도 초과`);
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
function blockPlainText(b) {
  const data = b[b.type];
  if (!data || !Array.isArray(data.rich_text)) return '';
  return data.rich_text.map((rt) => rt.plain_text).join('');
}
function plainOfTitleProp(prop) { return (prop?.title || []).map((t) => t.plain_text).join(''); }
function plainOfRichTextProp(prop) { return (prop?.rich_text || []).map((t) => t.plain_text).join(''); }

function kstDateToday() {
  const kst = new Date(Date.now() + 9 * 3600 * 1000);
  return kst.toISOString().slice(0, 10);
}

// ---------- 1) 노션 -> site.mjs 반영 (Status=게시 행만) ----------

async function syncPublishedCases(notionEnv) {
  say('\n[1] 노션 게시(Status=게시) 행 조회');
  const db = await notionFetch(notionEnv, `/databases/${notionEnv.NOTION_CASES_DB_ID}`, { method: 'GET' });
  const dataSourceId = db.data_sources[0].id;
  const q = await notionFetch(notionEnv, `/data_sources/${dataSourceId}/query`, {
    method: 'POST',
    body: JSON.stringify({ filter: { property: 'Status', select: { equals: '게시' } } }),
  });
  const rows = q.results;
  say(`   게시 행 ${rows.length}건`);

  let src = readFileSync(SITE_MJS, 'utf8');
  const changedSlugs = [];
  const notionPatches = []; // { pageId, publishDate }
  // 스킵/경고 사유 - 감사관 지적(같이 볼 것 3번): 노션 행 스킵에 알림이 없었다.
  // 이제 하나라도 쌓이면 main() 이 softFail 로 승격해 알림에 담는다.
  const skipReasons = [];
  const skip = (row, reason) => { const line = `[${row.id}] ${reason}`; say(`     스킵 - ${reason}`); skipReasons.push(line); };

  for (const row of rows) {
    const lang = row.properties.Lang?.select?.name;
    const slug = plainOfRichTextProp(row.properties.Slug);
    const title = plainOfTitleProp(row.properties.Title);
    const tag = plainOfRichTextProp(row.properties.Tag);
    const excerpt = plainOfRichTextProp(row.properties.Excerpt);
    let publishDate = row.properties.PublishDate?.date?.start || null;
    say(`   - [${lang}] ${slug} (page ${row.id})`);

    if (!lang || !slug) { skip(row, 'Lang 또는 Slug 비어있음(주소를 기계가 짓지 않는다 - 수동 확인 필요)'); continue; }

    // 현재 site.mjs 를 매 행마다 새로 파싱한다(직전 행의 수정을 이번 행이 반영해서 봐야 한다 -
    // start/end 오프셋이 텍스트 치환마다 바뀌므로 캐시하면 어긋난다).
    const casesNode = findExportValue(src, 'CASES');
    const langProp = casesNode.props.find((p) => p.key === lang);
    if (!langProp || langProp.value.kind !== 'array') { skip(row, `CASES.${lang} 배열이 코드에 없음(구조 이상 - 수동 확인 필요)`); continue; }
    const caseObj = langProp.value.items.find((item) => {
      if (item.kind !== 'object') return false;
      const sp = item.props.find((p) => p.key === 'slug');
      return sp && sp.value.kind === 'string' && sp.value.value === slug;
    });

    const edits = []; // { start, end, text } - 뒤에서부터 적용
    let rowChanged = false;

    if (!caseObj) {
      // ---- 신규 케이스 (코드에 아직 없음) - 새 객체를 만들어 CASES.<lang> 끝에 붙인다.
      // slug 는 이미 확인됨(위 스킵 조건). title 이 비어 있으면 화면에 낼 것이 없어 만들지 않는다.
      if (!title) { skip(row, 'Title 비어있음(신규 케이스 생성 불가 - 수동 확인 필요)'); continue; }
      const children = await listAllChildren(notionEnv, row.id);
      const paragraphs = children.filter((b) => b.type === 'paragraph').map(blockPlainText).filter((p) => p.trim());
      if (!paragraphs.length) { skip(row, '본문 문단 없음(신규 케이스 생성 불가 - 수동 확인 필요)'); continue; }
      if (!tag) say(`     경고 - Tag 비어있음(빈 값으로 생성)`);
      if (!excerpt) say(`     경고 - Excerpt 비어있음(빈 값으로 생성)`);
      if (!publishDate) {
        publishDate = kstDateToday();
        notionPatches.push({ pageId: row.id, publishDate });
        say(`     PublishDate 비어있음 -> ${publishDate} 로 채움(노션에 되쓴다)`);
      }
      edits.push(buildCaseInsertion(langProp.value, { slug, title, tag, date: publishDate, summary: excerpt, body: paragraphs }));
      rowChanged = true;
      say(`     신규 케이스 생성 - 본문 문단 ${paragraphs.length}개 (figure/thenNow 는 비움 - 필요시 사람이 나중에 채움)`);
    } else {
      const props = propMap(caseObj);

      // title / tag / summary(=Excerpt) - 문자열 리프 치환
      const stringFieldMap = [['title', title], ['tag', tag], ['summary', excerpt]];
      for (const [key, notionValue] of stringFieldMap) {
        const p = props.get(key);
        if (!p || p.value.kind !== 'string') { say(`     경고 - CASES.${lang}[${slug}].${key} 없음(스킵, 수동 확인 필요)`); continue; }
        if (p.value.value !== notionValue) {
          edits.push({ start: p.value.start, end: p.value.end, text: literalOf(p.value, p.value.quote, notionValue) });
          rowChanged = true;
        }
      }

      // body - 페이지 자식 문단을 순서대로 읽어 배열과 대조.
      // 빈 문단은 버린다(D-6) - 신규 생성 경로(위 300행 부근)와 동일 규칙으로 맞췄다.
      // 노션에서 빈 줄을 남기는 편집은 흔하고, 다르게 처리하면 다음 회차가 "문단 수 변경"으로
      // 오판해 불필요한 재배포·재커밋을 반복한다(실측 재현 - 2차 감리 D-6).
      const children = await listAllChildren(notionEnv, row.id);
      const paragraphs = children.filter((b) => b.type === 'paragraph').map(blockPlainText).filter((p) => p.trim());
      const bodyProp = props.get('body');
      if (bodyProp && bodyProp.value.kind === 'array') {
        const oldItems = bodyProp.value.items;
        const sameLength = oldItems.length === paragraphs.length;
        const allString = oldItems.every((it) => it.kind === 'string');
        if (sameLength && allString) {
          for (let i = 0; i < oldItems.length; i++) {
            if (oldItems[i].value !== paragraphs[i]) {
              edits.push({ start: oldItems[i].start, end: oldItems[i].end, text: literalOf(oldItems[i], oldItems[i].quote, paragraphs[i]) });
              rowChanged = true;
            }
          }
        } else {
          // 문단 개수가 바뀌었다 - 배열 리터럴 전체를 다시 짠다(들여쓰기 표준 8칸으로 재작성).
          const rebuilt = '[\n' + paragraphs.map((p) => `        ${literalOf(null, "'", p)},`).join('\n') + '\n      ]';
          edits.push({ start: bodyProp.value.start, end: bodyProp.value.end, text: rebuilt });
          rowChanged = true;
          say(`     본문 문단 수 변경 ${oldItems.length} -> ${paragraphs.length} - 배열 전체 재작성`);
        }
      } else {
        say(`     경고 - CASES.${lang}[${slug}].body 없음(스킵)`);
      }

      // draft 제거 (게시 행이므로 더는 초안이 아니다)
      const draftProp = props.get('draft');
      if (draftProp) {
        edits.push({ start: draftProp.propStart, end: draftProp.propEnd, text: '' });
        rowChanged = true;
        say(`     draft 플래그 제거`);
      }

      // date(PublishDate) - site.mjs 에 없으면 채운다. 노션 PublishDate 도 비어 있으면
      // 오늘(KST) 로 채우고 두 곳(노션+site.mjs) 에 같은 값을 쓴다.
      const dateProp = props.get('date');
      if (!publishDate) {
        publishDate = kstDateToday();
        notionPatches.push({ pageId: row.id, publishDate });
        say(`     PublishDate 비어있음 -> ${publishDate} 로 채움(노션에 되쓴다)`);
      }
      if (dateProp && dateProp.value.kind === 'string') {
        if (dateProp.value.value !== publishDate) {
          edits.push({ start: dateProp.value.start, end: dateProp.value.end, text: literalOf(dateProp.value, dateProp.value.quote, publishDate) });
          rowChanged = true;
        }
      } else {
        say(`     경고 - CASES.${lang}[${slug}].date 없음(신규 필드 삽입은 자동화 범위 밖 - 수동 확인 필요)`);
      }
    }

    if (edits.length) {
      edits.sort((a, b) => b.start - a.start);
      for (const e of edits) src = src.slice(0, e.start) + e.text + src.slice(e.end);
    }
    if (rowChanged) changedSlugs.push(`${lang}/${slug}`);
  }

  return { newSrc: src, changedSlugs, notionPatches, rows, skipReasons };
}

async function patchNotionPublishDate(notionEnv, patches) {
  for (const p of patches) {
    await notionFetch(notionEnv, `/pages/${p.pageId}`, {
      method: 'PATCH',
      body: JSON.stringify({ properties: { PublishDate: { date: { start: p.publishDate } } } }),
    });
  }
}

// ---------- 2) 빌드 + 배포(로컬, 같은 서버라 scp 불필요) + 검증 ----------

function sha256(buf) { return createHash('sha256').update(buf).digest('hex'); }

function listDist() {
  const out = [];
  (function walk(dir) {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p); else out.push(p);
    }
  })(DIST);
  return out.map((p) => {
    const rel = relative(DIST, p).split(sep).join('/');
    const url = rel.endsWith('index.html') ? '/' + rel.slice(0, -'index.html'.length) : '/' + rel;
    const buf = readFileSync(p);
    return { rel, url, size: buf.length, hash: sha256(buf) };
  }).sort((a, b) => a.url.localeCompare(b.url));
}

// 감사관 관찰 반영 - 바이트 길이만 비교하면 길이가 같고 내용이 다른 손상을 통과시킨다.
// SHA-256 전체 대조로 바꿨다(길이 비교보다 느리지 않다 - 어차피 body 전체를 받는다).
async function verify(files) {
  say(`\n[검증] ${VERIFY_BASE}`);
  let fail = 0;
  for (const f of files) {
    let line;
    try {
      const res = await fetchTO(VERIFY_BASE + f.url, { redirect: 'manual' });
      const body = Buffer.from(await res.arrayBuffer());
      const remoteHash = sha256(body);
      const ok = res.status === 200 && remoteHash === f.hash;
      if (!ok) fail++;
      line = `${ok ? 'OK  ' : 'FAIL'} ${f.url.padEnd(30)} ${res.status}  ${body.length}B sha256:${remoteHash.slice(0, 8)} (로컬 ${f.size}B sha256:${f.hash.slice(0, 8)})`;
    } catch (e) { fail++; line = `FAIL ${f.url.padEnd(30)} ${e.message}`; }
    say('  ' + line);
  }
  say(fail === 0 ? `전부 통과 (${files.length}건)` : `실패 ${fail}건 / 총 ${files.length}건`);
  return fail;
}

function currentReleaseTarget() {
  const link = join(DEPLOY_ROOT, DEPLOY_NAME);
  const r = run('readlink', [link]);
  return r.status === 0 ? r.stdout.trim() : null;
}

function deployAndVerify() {
  say('\n[2] 빌드');
  runOrThrow(process.execPath, [join(ROOT, 'build.mjs')], { cwd: ROOT, timeout: 120000 });

  // 릴리스 이름 충돌 방지(D-3) - 잠금으로 동시 실행 자체는 막지만, 이름 자체도 분 단위
  // 충돌 가능성이 없도록 초 단위 + PID + 4자리 난수를 덧붙인다(이중 방어).
  const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const uniq = `${stamp}-${process.pid}-${randomBytes(2).toString('hex')}`;
  const releaseName = `${DEPLOY_NAME}-releases/${uniq}`;
  const releaseDir = join(DEPLOY_ROOT, releaseName);
  const previousTarget = currentReleaseTarget();

  say(`\n[3] 로컬 배포 -> ${releaseDir}`);
  mkdirSync(releaseDir, { recursive: true });
  for (const entry of readdirSync(DIST)) cpSync(join(DIST, entry), join(releaseDir, entry), { recursive: true });

  say('\n[4] 릴리스 전환');
  runOrThrow('ln', ['-sfn', releaseName, join(DEPLOY_ROOT, DEPLOY_NAME)]);

  return { previousTarget, releaseName };
}

// 반환값 - 실제로 롤백을 시도했는지(rolledBack). previousTarget 이 없으면 되돌릴 곳이
// 없다는 뜻이라 false 를 반환한다 - 이 값을 결과 JSON 에 그대로 실어 n8n 판정이 추정 없이
// 쓰게 한다(D-2, 감사관 지적 - "추정으로 제목을 달지 마라").
function rollback(previousTarget) {
  if (!previousTarget) { say('   롤백 대상 없음 - 이전 릴리스를 찾지 못함(수동 확인 필요)'); return false; }
  say(`\n[롤백] ${previousTarget} 로 되돌린다`);
  const r = run('ln', ['-sfn', previousTarget, join(DEPLOY_ROOT, DEPLOY_NAME)]);
  return r.status === 0;
}

// ---------- 3) IndexNow ----------

async function submitIndexNow(changedSlugs) {
  const keyFile = join(ROOT, 'indexnow.key');
  if (!existsSync(keyFile)) return { skipped: true, reason: 'indexnow.key 없음' };
  const key = readFileSync(keyFile, 'utf8').trim();
  const keyLocation = `https://kjyoo.cloud/${key}.txt`;

  // 감사관 관찰 - IndexNow 는 키가 틀려도 200/202 를 돌려주는 경우가 있어 응답 코드만으로
  // "성공"을 믿을 수 없다. 제출 전에 라이브에 걸린 키 파일 내용이 실제로 이 키와
  // 일치하는지 자체 대조한다(자기 자신에 대한 신뢰성 검사 - 제출 응답과 무관하게 수행).
  let keySelfCheck = 'unchecked';
  try {
    const kc = await fetchTO(keyLocation, {}, 10000);
    const kt = (await kc.text()).trim();
    keySelfCheck = (kc.status === 200 && kt === key) ? 'ok' : `mismatch(status=${kc.status}, body=${kt.slice(0, 40)})`;
  } catch (e) { keySelfCheck = `check_failed(${e.message})`; }
  if (keySelfCheck !== 'ok') {
    return { skipped: true, reason: `키 파일 자체검증 실패 - ${keySelfCheck} (제출 생략, 응답코드만으로는 오탐 가능)` };
  }

  const host = 'kjyoo.cloud';
  const urlList = ['https://kjyoo.cloud/sitemap.xml'];
  for (const s of changedSlugs) {
    const [lang, slug] = s.split('/');
    urlList.push(`https://kjyoo.cloud/${lang}/cases/${slug}.html`);
  }
  const res = await fetchTO('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host, key, keyLocation, urlList }),
  });
  const text = await res.text().catch(() => '');
  return { skipped: false, status: res.status, body: text.slice(0, 300), urlCount: urlList.length, keySelfCheck };
}

// ---------- 4) Search Console 사이트맵 재제출 ----------

function b64url(input) { return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
async function gcpSaToken(sa, scope) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = { iss: sa.client_email, scope, aud: sa.token_uri, iat: now, exp: now + 3600 };
  const unsigned = b64url(JSON.stringify(header)) + '.' + b64url(JSON.stringify(claim));
  const signer = createSign('RSA-SHA256'); signer.update(unsigned);
  const sig = signer.sign(sa.private_key).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const jwt = unsigned + '.' + sig;
  const res = await fetchTO(sa.token_uri, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }) });
  const json = await res.json();
  if (!res.ok) throw new Error(`GCP 토큰 발급 실패: ${JSON.stringify(json)}`);
  return json.access_token;
}
async function submitSearchConsoleSitemap() {
  if (!existsSync(GCP_SA_KEY)) return { skipped: true, reason: `${GCP_SA_KEY} 없음` };
  const sa = JSON.parse(readFileSync(GCP_SA_KEY, 'utf8'));
  const token = await gcpSaToken(sa, 'https://www.googleapis.com/auth/webmasters');
  const feedpath = encodeURIComponent('https://kjyoo.cloud/sitemap.xml');
  const siteUrl = encodeURIComponent(SEARCHCONSOLE_SITE_URL);
  const res = await fetchTO(`https://www.googleapis.com/webmasters/v3/sites/${siteUrl}/sitemaps/${feedpath}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await res.text().catch(() => '');
  return { skipped: false, status: res.status, body: text.slice(0, 300) };
}

// ---------- 본체 ----------

function writeHeartbeat(result) {
  mkdirSync(dirname(HEARTBEAT_FILE), { recursive: true });
  writeFileSync(HEARTBEAT_FILE, JSON.stringify({ ranAt: new Date().toISOString(), ...result }, null, 2), 'utf8');
}

// site.mjs 작업 트리 상태 추적 (E-1, 3차 감리) - 모듈 전역이다. main() 안의 지역 변수로는
// 워치독(setTimeout 콜백, main() 스코프 밖)이 백업 내용에 접근할 수 없어서다.
// siteMjsDirty=true 인 동안은 디스크의 content/site.mjs 가 아직 커밋되지 않은 새 내용이다 -
// 어떤 경로로 끝나든(soft-fail exitCode 2, 워치독 강제종료 포함) 종료 직전 반드시 되돌린다.
let siteMjsBackup = null;
let siteMjsDirty = false;

// git 작업 트리를 마지막으로 읽은 site.mjs 백업 상태로 되돌린다(add 스테이징 해제 포함).
// 검증 실패/빌드 실패 경로가 이미 쓰던 것과 같은 처리를 재사용한다(감사관 지적 - 새로
// 만들지 말고 있는 것을 쓴다). 이미 깨끗하면(siteMjsDirty=false) 아무 것도 하지 않는다.
function revertSiteMjsIfDirty() {
  if (!siteMjsDirty) return false;
  say('\n[정리] content/site.mjs 를 마지막 커밋 상태로 되돌린다(다음 회차 차단 방지)');
  run('git', ['reset'], { cwd: ROOT }); // 스테이징 해제. 스테이징된 것이 없어도 무해하다.
  if (siteMjsBackup !== null) writeFileSync(SITE_MJS, siteMjsBackup, 'utf8');
  siteMjsDirty = false;
  return true;
}

// 유일한 종료 경로(D-3 잠금 해제를 모든 exit 지점에서 빠짐없이 하기 위해). exitCode 0 은
// 항상 rolledBack:false 다. 그 외에는 호출부가 rolledBack 값을 명시적으로 넣어야 한다 -
// 기본값을 두지 않는다(D-2: 추정으로 채우지 않는다. 명시 안 하면 아래에서 즉시 던진다).
// E-1(3차 감리) - exitCode 0 이 아닌 모든 종료 직전에 site.mjs 작업 트리 정리를 강제한다.
// 호출부가 개별적으로 기억해서 부르게 하지 않는다 - 잊어버리는 경로가 계속 나왔기 때문이다.
function finish(exitCode, fields) {
  if (exitCode !== 0 && typeof fields.rolledBack !== 'boolean') {
    throw new Error(`내부 오류 - finish(${exitCode}) 호출에 rolledBack 이 명시되지 않았다: ${JSON.stringify(fields)}`);
  }
  const siteMjsReverted = exitCode !== 0 ? revertSiteMjsIfDirty() : false;
  const result = { exitCode, rolledBack: exitCode === 0 ? false : fields.rolledBack, siteMjsReverted, ...fields, log };
  writeHeartbeat(result);
  console.log('RESULT_JSON ' + JSON.stringify(result));
  releaseLock();
  process.exit(exitCode);
}

async function main() {
  say(`=== auto-publish 시작 ${new Date().toISOString()} (pid ${process.pid}) ===`);

  say('\n[0] git pull');
  const localDiff = run('git', ['status', '--porcelain'], { cwd: ROOT });
  if (localDiff.stdout.trim()) {
    throw new Error(`git 작업 트리에 커밋 안 된 변경이 있다(직전 실행이 실패로 끝났을 수 있다) - 자동 중단:\n${localDiff.stdout}`);
  }
  const pull = run('git', ['pull', '--ff-only'], { cwd: ROOT });
  say(pull.stdout || pull.stderr);
  if (pull.status !== 0) throw new Error(`git pull 실패:\n${pull.stderr}`);

  const notionEnv = loadEnvFile(join(ROOT, 'notion.env'), ['NOTION_TOKEN', 'NOTION_CASES_DB_ID']);
  const { newSrc, changedSlugs, notionPatches, rows, skipReasons } = await syncPublishedCases(notionEnv);
  // E-3(3차 감리, 비서실장 결정) - 스킵 경보는 같은 사유·같은 행에 하루 1회만.
  // 회차마다 무조건 알리지 않는다 - filterSkipAlerts 가 파일 기반 억제를 적용한다.
  // skipReasons 가 비어도 항상 호출한다 - filterSkipAlerts 안의 정리(prune) 로직이
  // 이번 회차에 더는 보이지 않는 과거 키(행이 고쳐졌거나 지워짐)를 지운다. 길이로
  // 조건을 걸면 "스킵이 전부 사라진 회차"에는 정리가 영영 안 돈다(자체 발견, 3차 감리 중).
  const skipAlerts = filterSkipAlerts(skipReasons);
  if (skipReasons.length) say(`\n   노션 행 스킵 ${skipReasons.length}건 (오늘 처음 알리는 것 ${skipAlerts.length}건, 나머지는 24시간 억제 중)`);

  if (!changedSlugs.length) {
    say('\n변경 없음 - 빌드/배포 생략');
    if (notionPatches.length) await patchNotionPublishDate(notionEnv, notionPatches);
    // E-3 결정 3번 - 스킵만 있고 다른 실패가 없으면 exitCode 2(배포 실패군)로 묶지 않고
    // 별도 등급 3(정보성 - 확인 요망, 발행 자체는 정상)으로 낸다. 억제로 알릴 게 없으면 0.
    if (skipAlerts.length) {
      finish(3, { changed: false, publishedRows: rows.length, skipAlerts, rolledBack: false });
      return;
    }
    finish(0, { changed: false, publishedRows: rows.length, skippedTotal: skipReasons.length });
    return;
  }

  say(`\n변경된 케이스: ${changedSlugs.join(', ')}`);
  const backup = readFileSync(SITE_MJS, 'utf8');
  writeFileSync(SITE_MJS, newSrc, 'utf8');
  // E-1(3차 감리) - 여기서부터 디스크의 site.mjs 가 아직 커밋되지 않은 새 내용이다.
  // finish() 가 exitCode!==0 이면 자동으로 되돌린다(어떤 실패 경로로 끝나든 예외 없이).
  siteMjsBackup = backup;
  siteMjsDirty = true;

  let deployInfo;
  try {
    deployInfo = deployAndVerify();
  } catch (e) {
    // 빌드 또는 배포 단계에서 실패 - 아직 심볼릭 링크를 바꾸지 않았거나(빌드 실패) 바꿨어도
    // 검증 전이라 "롤백"이라 부를 상태가 아직 없다. rolledBack:false 로 명시한다.
    // site.mjs 원복은 finish() 가 siteMjsDirty 를 보고 자동으로 한다.
    finish(1, { changed: true, stage: 'build_or_deploy', error: String(e.message || e), rolledBack: false });
    return;
  }

  const failCount = await verify(listDist());
  if (failCount > 0) {
    const rolledBack = rollback(deployInfo.previousTarget);
    finish(1, { changed: true, stage: 'verify', failCount, rolledBackTo: deployInfo.previousTarget, rolledBack });
    return;
  }

  say('\n검증 통과 - 라이브 반영 완료');
  // ---- 여기부터는 라이브가 이미 정상이다(D-2). 이 아래 어떤 단계가 실패해도 배포
  // 실패가 아니고, exitCode 1(롤백)로 격상하지 않는다 - 전부 softFailures 로만 기록해
  // exitCode 2 로 보고한다. 각 단계를 개별 try/catch 로 감싸 한 단계의 실패가 다음 단계를
  // 막지 않게 한다(D-1: git commit 실패를 삼키던 문제의 근본 원인 - 실패해도 계속 진행해야
  // 하는데 예외가 나면 통째로 unhandled 로 떨어져 exitCode 오분류가 났었다).
  // E-1(3차 감리) - "커밋 실패했으니 스테이징만 해제하면 된다"는 착각이 1차 시정의 결함이었다.
  // 여기서는 커밋 성공 시에만 siteMjsDirty=false 로 내린다 - 나머지는 finish() 가 되돌린다.
  let softFail = false;
  const softFailures = [];
  const fail = (label, detail) => { softFail = true; softFailures.push(`${label}: ${detail}`); say(`   [경고] ${label}: ${detail}`); };

  if (notionPatches.length) {
    say('\n[5] 노션 PublishDate 되쓰기');
    try { await patchNotionPublishDate(notionEnv, notionPatches); }
    catch (e) { fail('노션 PublishDate 되쓰기 실패', e.message); }
  }

  say('\n[6] git commit + push (site.mjs)');
  try {
    runOrThrow('git', ['add', 'content/site.mjs'], { cwd: ROOT });
    const commit = run('git', ['commit', '-m', `auto-publish: ${changedSlugs.join(', ')} (${new Date().toISOString()})`], { cwd: ROOT });
    say(commit.stdout || commit.stderr);
    if (commit.status !== 0) {
      fail('git commit 실패', (commit.stderr || '(메시지 없음)').slice(0, 300));
      // siteMjsDirty 는 그대로 true 로 둔다 - finish() 가 종료 직전에 되돌린다(E-1).
    } else {
      siteMjsDirty = false; // 커밋 성공 - 작업 트리가 이제 HEAD 와 같다. 되돌릴 것이 없다.
      const push = run('git', ['push'], { cwd: ROOT });
      say(push.stdout || push.stderr);
      if (push.status !== 0) fail('git push 실패', push.stderr.slice(0, 300));
    }
  } catch (e) { fail('git add 실패', e.message); }

  say('\n[7] IndexNow 제출');
  try {
    const inResult = await submitIndexNow(changedSlugs);
    say(JSON.stringify(inResult));
    if (!inResult.skipped && inResult.status >= 300) fail('IndexNow 실패', `status=${inResult.status}: ${inResult.body}`);
    if (inResult.skipped && inResult.reason && inResult.reason.startsWith('키 파일 자체검증 실패')) fail('IndexNow', inResult.reason);
  } catch (e) { fail('IndexNow 예외', e.message); }

  say('\n[8] Search Console 사이트맵 재제출');
  try {
    const gscResult = await submitSearchConsoleSitemap();
    say(JSON.stringify(gscResult));
    if (!gscResult.skipped && gscResult.status >= 300) fail('Search Console 실패', `status=${gscResult.status}: ${gscResult.body}`);
  } catch (e) { fail('Search Console 예외', e.message); }

  // E-3 결정 3번 - 스킵 알림은 softFailures(배포/후속단계 실패)와 별도 필드로 낸다.
  // softFail 이 이미 true(다른 진짜 실패가 있다)면 exitCode 는 2 그대로 간다 - 스킵은
  // 부가정보로만 얹는다. softFail 이 false 인데 스킵 알림만 있으면 exitCode 3.
  const exitCode = softFail ? 2 : (skipAlerts.length ? 3 : 0);
  finish(exitCode, { changed: true, changedSlugs, softFailures, skipAlerts, rolledBack: false });
}

const watchdog = setTimeout(() => {
  // D-4 - 전체 실행 상한. 개별 fetch/child_process 타임아웃을 다 걸어도 예상 못한 지점에서
  // 붙들릴 가능성은 남는다 - 여기서 무조건 끝낸다. rolledBack:false 로 명시(이 시점까지 온다는
  // 것은 아직 정상 흐름 어딘가에 있다는 뜻이라 임의로 롤백을 시도하지 않는다 - 상태를
  // 모른 채 링크를 건드리는 것이 더 위험하다. 수동 확인을 알림 본문에 요청한다).
  say(`\nTIMEOUT - 전체 실행 상한 ${WATCHDOG_MS / 1000}초 초과, 강제 종료`);
  finish(1, { stage: 'timeout', error: `전체 실행이 ${WATCHDOG_MS / 1000}초를 넘었다 - 수동으로 서버 상태 확인 필요`, rolledBack: false });
}, WATCHDOG_MS);
watchdog.unref?.();

if (!acquireLock()) {
  say('다른 실행이 진행 중(잠금 보유) - 이번 주기는 건너뛴다');
  clearTimeout(watchdog);
  console.log('RESULT_JSON ' + JSON.stringify({ exitCode: 0, skipped: 'locked', rolledBack: false, log }));
  process.exit(0);
} else {
  main()
    .then(() => clearTimeout(watchdog))
    .catch((e) => {
      clearTimeout(watchdog);
      finish(1, { stage: 'unhandled', error: String(e && e.stack || e), rolledBack: false });
    });
}
