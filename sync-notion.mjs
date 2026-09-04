// ============================================================
// kjyoo.cloud - Notion 왕복 동기화
// v0.1 (2026-09-04)
//
// content/site.mjs 의 SITE + CONTENT(ko/en 6섹션) 문안을 Notion 페이지 1개와
// 라벨(예 [ko.nav.index]) 로 1:1 대응시켜 양방향으로 반복 실행 가능하게 만든다.
//
//   node sync-notion.mjs --push   site.mjs -> Notion (페이지 본문을 현재 site.mjs 기준으로 전량 재작성)
//   node sync-notion.mjs --pull   Notion -> site.mjs (라벨별 텍스트를 site.mjs 에 반영)
//
// 스코프. SITE(도메인/연락처)와 CONTENT(6섹션 x ko/en) 안의 "문자열 리터럴"만 다룬다.
//   - FACTS.* 를 참조하는 계산식(예 FACTS.ictYears + '년')은 라벨을 만들지 않는다.
//     실측 수치는 출처 문서를 먼저 고치는 것이 정책이다(파일 상단 주석). Notion 편집 대상이 아니다.
//   - CASES 는 Phase 3 가 채울 구조 검증용 표본(draft)이라 제외한다. 실제 문안이 아니다.
//
// 설정은 이 폴더의 notion.env 에서 읽는다(비추적. notion.env.example 참조).
// 토큰 정본은 로컬 자격증명 볼트(Notion API 항)에 있다. 이 저장소에는 두지 않는다.
//
// 안전장치.
//   --pull 은 site.mjs 를 덮어쓰기 전에 site.mjs.bak.<타임스탬프> 로 백업한다.
//   --push 는 Notion 페이지를 비우기 전에 현재 페이지 내용을 label-value 스냅샷으로
//     notion-sync-backup/push-<타임스탬프>.json 에 저장한다.
//   --pull 은 로컬 site.mjs 의 라벨 집합과 Notion 페이지의 라벨 집합이 정확히 같지 않으면
//     (라벨 누락/추가 어느 쪽이든) 갱신을 전면 중단하고 불일치 목록만 출력한다. 부분 반영 없음.
//   두 방향 모두 실행 후 무엇이 바뀌었는지 diff 를 콘솔에 찍는다.
// ============================================================

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const SITE_MJS = join(ROOT, 'content', 'site.mjs');
const BACKUP_DIR = join(ROOT, 'notion-sync-backup');
const NOTION_VERSION = '2026-03-11';

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
  const file = join(ROOT, 'notion.env');
  if (!existsSync(file)) {
    console.error('notion.env 가 없다. notion.env.example 을 복사해 값을 채운다.');
    process.exit(1);
  }
  const env = {};
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
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

// ---------- 미니 JS 리터럴 파서 ----------
// content/site.mjs 의 export const SITE / CONTENT 는 문자열, 배열, 객체 리터럴로만
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

function parseSiteMjs(src) {
  const siteNode = findExportValue(src, 'SITE');
  const contentNode = findExportValue(src, 'CONTENT');
  const all = [];
  collectLeaves(siteNode, 'site', all);
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
    if (!res.ok) throw new Error(`Notion API ${pathname} 실패 (${res.status}): ${JSON.stringify(json).slice(0, 500)}`);
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

async function deleteAllChildren(env, blockId, blocks) {
  for (const b of blocks) {
    await notionFetch(env, `/blocks/${b.id}`, { method: 'DELETE' });
  }
}

async function appendChildrenBatched(env, blockId, children) {
  for (let i = 0; i < children.length; i += 80) {
    const chunk = children.slice(i, i + 80);
    await notionFetch(env, `/blocks/${blockId}/children`, { method: 'PATCH', body: JSON.stringify({ children: chunk }) });
  }
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

const LABEL_RE = /^\[([\w.\-\[\]]+)\]$/;

function labelBlock(label) {
  return { object: 'block', type: 'code', code: { rich_text: richText(`[${label}]`), language: 'plain text' } };
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

function langTitle(lang) {
  if (lang === 'site') return '사이트 공통 (site.*)';
  if (lang === 'ko') return '한국어 (ko)';
  if (lang === 'en') return 'English (en)';
  return lang;
}

function buildBlocksFromLeaves(leaves) {
  const blocks = [
    { object: 'block', type: 'callout', callout: {
      rich_text: richText('대괄호 라벨( 예 [ko.nav.index] )이 붙은 code 블록은 건드리지 마세요. 그 바로 다음 문단의 문장만 고치면 됩니다. 이 페이지는 node sync-notion.mjs --push 를 실행할 때마다 site.mjs 기준으로 전량 재작성됩니다 - push 전에 site.mjs 에 반영하고 싶은 편집은 먼저 --pull 로 가져오세요.'),
      icon: { type: 'emoji', emoji: '✏️' },
    } },
  ];
  let curLang = null;
  let curPage = null;
  for (const leaf of leaves) {
    const parts = leaf.label.split('.');
    const lang = parts[0] === 'site' ? 'site' : parts[0];
    const page = parts[0] === 'site' ? null : parts[1];
    if (lang !== curLang) {
      blocks.push(dividerBlock());
      blocks.push(headingBlock(2, langTitle(lang)));
      curLang = lang;
      curPage = null;
    }
    if (page !== curPage) {
      if (page) blocks.push(headingBlock(3, `${lang}.${page}`));
      curPage = page;
    }
    blocks.push(labelBlock(leaf.label));
    blocks.push(textBlock(leaf.node.value));
  }
  return blocks;
}

// Notion 블록 목록 -> label -> text 맵. 라벨 code 블록을 만나면 다음 라벨(또는 heading)
// 직전까지 나오는 블록 전부를 그 라벨의 값으로 모은다(문단이 여러 개로 쪼개져도 견딘다).
function parseBlocksToLabelMap(blocks) {
  const map = new Map();
  let i = 0;
  while (i < blocks.length) {
    const b = blocks[i];
    const text = blockPlainText(b).trim();
    const m = b.type === 'code' && LABEL_RE.exec(text);
    if (!m) { i++; continue; }
    const label = m[1];
    const parts = [];
    let j = i + 1;
    while (j < blocks.length) {
      const nb = blocks[j];
      const nbText = blockPlainText(nb).trim();
      if (nb.type === 'code' && LABEL_RE.test(nbText)) break;
      if (nb.type.startsWith('heading_') || nb.type === 'divider') break;
      parts.push(blockPlainText(nb));
      j++;
    }
    map.set(label, parts.join('\n\n').trim());
    i = j;
  }
  return map;
}

// ---------- push: site.mjs -> Notion ----------

async function push(env) {
  const src = readFileSync(SITE_MJS, 'utf8');
  const { leaves } = parseSiteMjs(src);
  console.log(`site.mjs 파싱 완료 - 라벨 ${leaves.length}건`);

  console.log('\n1) Notion 현재 페이지 내용 스냅샷(백업)');
  const before = await listAllChildren(env, env.NOTION_PAGE_ID);
  const beforeMap = parseBlocksToLabelMap(before);
  mkdirSync(BACKUP_DIR, { recursive: true });
  const backupFile = join(BACKUP_DIR, `push-${stamp()}.json`);
  writeFileSync(backupFile, JSON.stringify(Object.fromEntries(beforeMap), null, 2), 'utf8');
  console.log(`   백업 -> ${backupFile} (라벨 ${beforeMap.size}건, 블록 ${before.length}개)`);

  console.log('\n2) 기존 블록 삭제');
  await deleteAllChildren(env, env.NOTION_PAGE_ID, before);
  console.log(`   삭제 ${before.length}건`);

  console.log('\n3) site.mjs 기준으로 재작성');
  const blocks = buildBlocksFromLeaves(leaves);
  await appendChildrenBatched(env, env.NOTION_PAGE_ID, blocks);
  console.log(`   블록 ${blocks.length}개 추가 (라벨 ${leaves.length}건)`);

  console.log('\n4) diff (이전 Notion 내용 -> 이번 push 내용)');
  const afterMap = new Map(leaves.map((l) => [l.label, l.node.value]));
  diffMaps(beforeMap, afterMap);
}

// ---------- pull: Notion -> site.mjs ----------

async function pull(env) {
  const src = readFileSync(SITE_MJS, 'utf8');
  const { leaves, byLabel } = parseSiteMjs(src);
  const localLabels = new Set(byLabel.keys());
  console.log(`site.mjs 파싱 완료 - 라벨 ${leaves.length}건`);

  console.log('\n1) Notion 페이지 읽기');
  const blocks = await listAllChildren(env, env.NOTION_PAGE_ID);
  const remoteMap = parseBlocksToLabelMap(blocks);
  console.log(`   블록 ${blocks.length}개 -> 라벨 ${remoteMap.size}건`);

  console.log('\n2) 라벨 집합 대조');
  const remoteLabels = new Set(remoteMap.keys());
  const missingInNotion = [...localLabels].filter((l) => !remoteLabels.has(l));
  const missingInSite = [...remoteLabels].filter((l) => !localLabels.has(l));
  if (missingInNotion.length || missingInSite.length) {
    console.error('\n라벨 불일치 - 갱신을 중단한다. 부분 반영 없음.');
    if (missingInNotion.length) {
      console.error(`  site.mjs 에는 있는데 Notion 에서 사라진 라벨 (${missingInNotion.length}건):`);
      for (const l of missingInNotion) console.error('    - ' + l);
    }
    if (missingInSite.length) {
      console.error(`  Notion 에는 있는데 site.mjs 에 없는 라벨 (${missingInSite.length}건):`);
      for (const l of missingInSite) console.error('    - ' + l);
    }
    console.error('\n먼저 node sync-notion.mjs --push 로 Notion 페이지를 site.mjs 기준으로 재정렬한 뒤 다시 편집하세요.');
    process.exit(1);
  }
  console.log('   일치 - 라벨 누락/추가 없음');

  console.log('\n3) 변경분 계산');
  const changes = [];
  for (const leaf of leaves) {
    const newValue = remoteMap.get(leaf.label) ?? '';
    if (newValue !== leaf.node.value) changes.push({ leaf, oldValue: leaf.node.value, newValue });
  }
  if (changes.length === 0) {
    console.log('   변경 없음 - site.mjs 를 건드리지 않았다');
    return;
  }
  console.log(`   변경 ${changes.length}건`);

  console.log('\n4) 백업');
  const backupPath = `${SITE_MJS}.bak.${stamp()}`;
  writeFileSync(backupPath, src, 'utf8');
  console.log(`   ${backupPath}`);

  console.log('\n5) site.mjs 갱신');
  // 뒤에서부터 치환해야 앞쪽 오프셋이 안 밀린다.
  const sorted = [...changes].sort((a, b) => b.leaf.node.start - a.leaf.node.start);
  let out = src;
  for (const { leaf, newValue } of sorted) {
    const quote = leaf.node.quote;
    const literal = quote + escapeForLiteral(newValue, quote) + quote;
    out = out.slice(0, leaf.node.start) + literal + out.slice(leaf.node.end);
  }
  writeFileSync(SITE_MJS, out, 'utf8');
  console.log(`   ${SITE_MJS} 갱신 완료`);

  console.log('\n6) diff (반영된 변경분만)');
  for (const { leaf, oldValue, newValue } of changes) {
    console.log(`  [${leaf.label}]`);
    console.log(`    - ${truncate(oldValue)}`);
    console.log(`    + ${truncate(newValue)}`);
  }
}

function truncate(s, n = 120) {
  const flat = s.replace(/\n/g, '\\n');
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
  console.log('\n표본 10건:');
  for (const leaf of leaves.slice(0, 10)) console.log(`  [${leaf.label}] = ${truncate(leaf.node.value, 60)}`);
  process.exit(mismatch === 0 ? 0 : 1);
}

const env = loadEnv();
if (MODE_PUSH) await push(env);
else await pull(env);
