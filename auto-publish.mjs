// ============================================================
// kjyoo.cloud - 발행 자동화 (VPS 상주 실행 전용)
// v1.0 (2026-09-09, KJ 결정 2026-09-08/09 "모든 것을 자동화")
//
// 이 파일은 Hostinger VPS(72.61.151.50) 의 /root/kjyoo-cloud-src 에서만 돈다.
// n8n(같은 서버) 이 10분마다 SSH 로 run.sh 를 호출하고, run.sh 가 이 스크립트를 부른다.
// KJ PC 가 꺼져 있어도 동작한다 - 그것이 이 파일의 존재 이유다.
//
// 흐름: git pull(원격 코드 최신화) -> 노션 케이스 DB 에서 Status=게시 행 조회
//   -> 그 행들의 문안(제목/태그/발췌/본문)을 content/site.mjs 에 반영, PublishDate
//      비어 있으면 채움(노션+site.mjs 양쪽) -> 변경 없으면 여기서 종료(빌드 생략)
//   -> node build.mjs -> 로컬 릴리스 배포(같은 서버라 scp 불필요, cp + 심볼릭 링크 전환)
//   -> 라이브 검증(전체 파일 200+바이트 일치) -> 실패 시 심볼릭 링크와 site.mjs 를
//      되돌리고 종료코드 1 -> 성공 시 site.mjs 를 git commit+push, IndexNow 제출,
//      Search Console 사이트맵 재제출.
//
// 종료코드. 0=변경 없음 또는 전체 성공. 1=배포 실패(롤백 완료). 2=배포는 성공,
//   git push 또는 색인 통보 중 하나가 실패(사이트는 정상, 후속 조치만 실패).
// 마지막 줄에 항상 JSON 한 줄을 찍는다 - 호출부(run.sh/n8n)가 파싱해 알림 본문을 짠다.
// ============================================================

import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, cpSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createSign } from 'node:crypto';

const ROOT = dirname(fileURLToPath(import.meta.url));
const SITE_MJS = join(ROOT, 'content', 'site.mjs');
const DIST = join(ROOT, 'dist');
const HEARTBEAT_FILE = join(ROOT, 'publish-logs', 'last-run.json');

const DEPLOY_ROOT = '/root/n8n/static';
const DEPLOY_NAME = 'kjyoo-cloud';
const VERIFY_BASE = 'https://kjyoo.cloud';
// Search Console 제출용 SA 키. KJ 가 Search Console 에서 이 SA 이메일을 속성 사용자로
// 등록해야(1회) 실제 제출이 통과한다 - README 및 보고서의 "미결" 절 참조.
const GCP_SA_KEY = '/root/kjyoo-cloud-src/gcp-sa-searchconsole.json';
const SEARCHCONSOLE_SITE_URL = 'https://kjyoo.cloud/';

const log = [];
function say(line) { log.push(line); console.log(line); }

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

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', ...opts });
  return { status: r.status, stdout: r.stdout || '', stderr: r.stderr || '' };
}
function runOrThrow(cmd, args, opts = {}) {
  const r = run(cmd, args, opts);
  if (r.status !== 0) throw new Error(`실패: ${cmd} ${args.join(' ')} (exit ${r.status})\n${r.stderr}`);
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

// ---------- Notion API ----------

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
async function notionFetch(env, pathname, options = {}) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(`https://api.notion.com/v1${pathname}`, {
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

  for (const row of rows) {
    const lang = row.properties.Lang?.select?.name;
    const slug = plainOfRichTextProp(row.properties.Slug);
    const title = plainOfTitleProp(row.properties.Title);
    const tag = plainOfRichTextProp(row.properties.Tag);
    const excerpt = plainOfRichTextProp(row.properties.Excerpt);
    let publishDate = row.properties.PublishDate?.date?.start || null;
    say(`   - [${lang}] ${slug} (page ${row.id})`);

    if (!lang || !slug) { say(`     스킵 - Lang 또는 Slug 비어있음`); continue; }

    // 현재 site.mjs 를 매 행마다 새로 파싱한다(직전 행의 수정을 이번 행이 반영해서 봐야 한다 -
    // start/end 오프셋이 텍스트 치환마다 바뀌므로 캐시하면 어긋난다).
    const casesNode = findExportValue(src, 'CASES');
    const langProp = casesNode.props.find((p) => p.key === lang);
    if (!langProp || langProp.value.kind !== 'array') { say(`     스킵 - CASES.${lang} 없음(코드에 아직 없는 케이스 - 신규 케이스는 자동생성 대상 아님)`); continue; }
    const caseObj = langProp.value.items.find((item) => {
      if (item.kind !== 'object') return false;
      const sp = item.props.find((p) => p.key === 'slug');
      return sp && sp.value.kind === 'string' && sp.value.value === slug;
    });
    if (!caseObj) { say(`     스킵 - CASES.${lang} 안에 slug="${slug}" 없음(코드에 아직 없는 케이스)`); continue; }

    const props = propMap(caseObj);
    const edits = []; // { start, end, text } - 뒤에서부터 적용
    let rowChanged = false;

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

    // body - 페이지 자식 문단을 순서대로 읽어 배열과 대조
    const children = await listAllChildren(notionEnv, row.id);
    const paragraphs = children.filter((b) => b.type === 'paragraph').map(blockPlainText);
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

    if (edits.length) {
      edits.sort((a, b) => b.start - a.start);
      for (const e of edits) src = src.slice(0, e.start) + e.text + src.slice(e.end);
    }
    if (rowChanged) changedSlugs.push(`${lang}/${slug}`);
  }

  return { newSrc: src, changedSlugs, notionPatches, rows };
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
    return { rel, url, size: statSync(p).size };
  }).sort((a, b) => a.url.localeCompare(b.url));
}

async function verify(files) {
  say(`\n[검증] ${VERIFY_BASE}`);
  let fail = 0;
  for (const f of files) {
    let line;
    try {
      const res = await fetch(VERIFY_BASE + f.url, { redirect: 'manual' });
      const body = Buffer.from(await res.arrayBuffer());
      const ok = res.status === 200 && body.length === f.size;
      if (!ok) fail++;
      line = `${ok ? 'OK  ' : 'FAIL'} ${f.url.padEnd(30)} ${res.status}  ${body.length}B (로컬 ${f.size}B)`;
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
  runOrThrow(process.execPath, [join(ROOT, 'build.mjs')], { cwd: ROOT });

  const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);
  const releaseName = `${DEPLOY_NAME}-releases/${stamp}`;
  const releaseDir = join(DEPLOY_ROOT, releaseName);
  const previousTarget = currentReleaseTarget();

  say(`\n[3] 로컬 배포 -> ${releaseDir}`);
  mkdirSync(releaseDir, { recursive: true });
  for (const entry of readdirSync(DIST)) cpSync(join(DIST, entry), join(releaseDir, entry), { recursive: true });

  say('\n[4] 릴리스 전환');
  runOrThrow('ln', ['-sfn', releaseName, join(DEPLOY_ROOT, DEPLOY_NAME)]);

  return { previousTarget, releaseName };
}

function rollback(previousTarget) {
  if (!previousTarget) { say('   롤백 대상 없음 - 이전 릴리스를 찾지 못함(수동 확인 필요)'); return; }
  say(`\n[롤백] ${previousTarget} 로 되돌린다`);
  run('ln', ['-sfn', previousTarget, join(DEPLOY_ROOT, DEPLOY_NAME)]);
}

// ---------- 3) IndexNow ----------

async function submitIndexNow(changedSlugs) {
  const keyFile = join(ROOT, 'indexnow.key');
  if (!existsSync(keyFile)) return { skipped: true, reason: 'indexnow.key 없음' };
  const key = readFileSync(keyFile, 'utf8').trim();
  const host = 'kjyoo.cloud';
  const urlList = ['https://kjyoo.cloud/sitemap.xml'];
  for (const s of changedSlugs) {
    const [lang, slug] = s.split('/');
    urlList.push(`https://kjyoo.cloud/${lang}/cases/${slug}.html`);
  }
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host, key, keyLocation: `https://kjyoo.cloud/${key}.txt`, urlList }),
  });
  const text = await res.text().catch(() => '');
  return { skipped: false, status: res.status, body: text.slice(0, 300), urlCount: urlList.length };
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
  const res = await fetch(sa.token_uri, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }) });
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
  const res = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${siteUrl}/sitemaps/${feedpath}`, {
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

async function main() {
  say(`=== auto-publish 시작 ${new Date().toISOString()} ===`);

  say('\n[0] git pull');
  const localDiff = run('git', ['status', '--porcelain'], { cwd: ROOT });
  if (localDiff.stdout.trim()) {
    throw new Error(`git 작업 트리에 커밋 안 된 변경이 있다(직전 실행이 실패로 끝났을 수 있다) - 자동 중단:\n${localDiff.stdout}`);
  }
  const pull = run('git', ['pull', '--ff-only'], { cwd: ROOT });
  say(pull.stdout || pull.stderr);
  if (pull.status !== 0) throw new Error(`git pull 실패:\n${pull.stderr}`);

  const notionEnv = loadEnvFile(join(ROOT, 'notion.env'), ['NOTION_TOKEN', 'NOTION_CASES_DB_ID']);
  const { newSrc, changedSlugs, notionPatches, rows } = await syncPublishedCases(notionEnv);

  if (!changedSlugs.length) {
    say('\n변경 없음 - 빌드/배포 생략');
    if (notionPatches.length) await patchNotionPublishDate(notionEnv, notionPatches);
    const result = { exitCode: 0, changed: false, publishedRows: rows.length, log };
    writeHeartbeat(result);
    console.log('RESULT_JSON ' + JSON.stringify(result));
    process.exit(0);
  }

  say(`\n변경된 케이스: ${changedSlugs.join(', ')}`);
  const backup = readFileSync(SITE_MJS, 'utf8');
  writeFileSync(SITE_MJS, newSrc, 'utf8');

  let deployInfo;
  try {
    deployInfo = deployAndVerify();
  } catch (e) {
    writeFileSync(SITE_MJS, backup, 'utf8');
    const result = { exitCode: 1, changed: true, stage: 'build_or_deploy', error: String(e.message || e), log };
    writeHeartbeat(result);
    console.log('RESULT_JSON ' + JSON.stringify(result));
    process.exit(1);
  }

  const failCount = await verify(listDist());
  if (failCount > 0) {
    rollback(deployInfo.previousTarget);
    writeFileSync(SITE_MJS, backup, 'utf8');
    const result = { exitCode: 1, changed: true, stage: 'verify', failCount, rolledBackTo: deployInfo.previousTarget, log };
    writeHeartbeat(result);
    console.log('RESULT_JSON ' + JSON.stringify(result));
    process.exit(1);
  }

  say('\n검증 통과 - 라이브 반영 완료');
  if (notionPatches.length) {
    say('\n[5] 노션 PublishDate 되쓰기');
    await patchNotionPublishDate(notionEnv, notionPatches);
  }

  let softFail = false;
  const softFailures = [];

  say('\n[6] git commit + push (site.mjs)');
  runOrThrow('git', ['add', 'content/site.mjs'], { cwd: ROOT });
  const commit = run('git', ['commit', '-m', `auto-publish: ${changedSlugs.join(', ')} (${new Date().toISOString()})`], { cwd: ROOT });
  say(commit.stdout || commit.stderr);
  if (commit.status === 0) {
    const push = run('git', ['push'], { cwd: ROOT });
    say(push.stdout || push.stderr);
    if (push.status !== 0) { softFail = true; softFailures.push(`git push 실패: ${push.stderr.slice(0, 300)}`); }
  }

  say('\n[7] IndexNow 제출');
  try {
    const inResult = await submitIndexNow(changedSlugs);
    say(JSON.stringify(inResult));
    if (!inResult.skipped && inResult.status >= 300) { softFail = true; softFailures.push(`IndexNow 실패 status=${inResult.status}: ${inResult.body}`); }
  } catch (e) { softFail = true; softFailures.push(`IndexNow 예외: ${e.message}`); }

  say('\n[8] Search Console 사이트맵 재제출');
  try {
    const gscResult = await submitSearchConsoleSitemap();
    say(JSON.stringify(gscResult));
    if (!gscResult.skipped && gscResult.status >= 300) { softFail = true; softFailures.push(`Search Console 실패 status=${gscResult.status}: ${gscResult.body}`); }
  } catch (e) { softFail = true; softFailures.push(`Search Console 예외: ${e.message}`); }

  const result = { exitCode: softFail ? 2 : 0, changed: true, changedSlugs, softFailures, log };
  writeHeartbeat(result);
  console.log('RESULT_JSON ' + JSON.stringify(result));
  process.exit(softFail ? 2 : 0);
}

main().catch((e) => {
  const result = { exitCode: 1, stage: 'unhandled', error: String(e && e.stack || e), log };
  try { writeHeartbeat(result); } catch {}
  console.log('RESULT_JSON ' + JSON.stringify(result));
  console.error(e);
  process.exit(1);
});
