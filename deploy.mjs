// ============================================================
// kjyoo.cloud - 배포기
// v0.1 (2026-09-02)
//
// 외부 의존성 없음. Node 표준 모듈과 시스템 ssh/scp 만 쓴다.
//   node deploy.mjs         -> 빌드 + 업로드 + 전환 + 검증
//   node deploy.mjs --check -> 업로드 없이 라이브 검증만
//
// 접속 정보는 저장소에 두지 않는다. 같은 폴더의 deploy.env 에서 읽는다
// (deploy.env 는 .gitignore 대상. deploy.env.example 참조).
//
// 릴리스는 지우지 않고 쌓는다. 전환은 심볼릭 링크 하나만 바꾼다.
//   <ROOT>/<NAME>-releases/<타임스탬프>/   실제 파일
//   <ROOT>/<NAME>                         현재 릴리스를 가리키는 링크
// 되돌리려면 링크를 이전 릴리스로 다시 걸면 된다.
// ============================================================

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = dirname(fileURLToPath(import.meta.url));
const DIST = join(ROOT, 'dist');
const CHECK_ONLY = process.argv.includes('--check');

// ---------- 설정 ----------

function loadEnv() {
  const file = join(ROOT, 'deploy.env');
  if (!existsSync(file)) {
    console.error('deploy.env 가 없다. deploy.env.example 을 복사해 값을 채운다.');
    process.exit(1);
  }
  const env = {};
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const s = line.trim();
    if (!s || s.startsWith('#')) continue;
    const i = s.indexOf('=');
    if (i > 0) env[s.slice(0, i).trim()] = s.slice(i + 1).trim();
  }
  const need = ['DEPLOY_HOST', 'DEPLOY_USER', 'DEPLOY_ROOT', 'DEPLOY_NAME', 'DEPLOY_KEY', 'VERIFY_BASE'];
  const missing = need.filter((k) => !env[k]);
  if (missing.length) {
    console.error('deploy.env 에 값이 빠졌다: ' + missing.join(', '));
    process.exit(1);
  }
  return env;
}

// ---------- 원격 실행 ----------

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', ...opts });
  if (r.status !== 0) {
    console.error(`실패: ${cmd} ${args.join(' ')} (exit ${r.status})`);
    process.exit(1);
  }
}

function ssh(env, script) {
  run('ssh', ['-i', env.DEPLOY_KEY, '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=accept-new',
    `${env.DEPLOY_USER}@${env.DEPLOY_HOST}`, script]);
}

// ---------- 검증 ----------

function listDist() {
  const out = [];
  (function walk(dir) {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else out.push(p);
    }
  })(DIST);
  return out.map((p) => {
    const rel = relative(DIST, p).split(sep).join('/');
    const url = rel.endsWith('index.html') ? '/' + rel.slice(0, -'index.html'.length) : '/' + rel;
    return { rel, url, size: statSync(p).size };
  }).sort((a, b) => a.url.localeCompare(b.url));
}

async function verify(base, files) {
  console.log(`\n검증 ${base}`);
  let fail = 0;
  for (const f of files) {
    let line;
    try {
      const res = await fetch(base + f.url, { redirect: 'manual' });
      const body = Buffer.from(await res.arrayBuffer());
      const ok = res.status === 200 && body.length === f.size;
      if (!ok) fail++;
      line = `${ok ? 'OK  ' : 'FAIL'} ${f.url.padEnd(26)} ${res.status}  ${body.length}B (로컬 ${f.size}B)`;
    } catch (e) {
      fail++;
      line = `FAIL ${f.url.padEnd(26)} ${e.message}`;
    }
    console.log('  ' + line);
  }
  console.log(fail === 0 ? `\n전부 통과 (${files.length}건)` : `\n실패 ${fail}건 / 총 ${files.length}건`);
  return fail;
}

// ---------- 본체 ----------

const env = loadEnv();

if (!CHECK_ONLY) {
  console.log('1) 빌드');
  run(process.execPath, [join(ROOT, 'build.mjs')], { cwd: ROOT });

  const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12); // YYYYMMDDhhmm (UTC)
  const releases = `${env.DEPLOY_ROOT}/${env.DEPLOY_NAME}-releases`;
  const release = `${releases}/${stamp}`;
  const link = `${env.DEPLOY_ROOT}/${env.DEPLOY_NAME}`;

  console.log(`\n2) 업로드 -> ${release}`);
  ssh(env, `mkdir -p '${release}'`);
  // dist 안의 항목을 하나씩 올린다. 'dist/.' 는 Windows scp 가 dist 폴더째로 만들어 버린다(실측 2026-09-02).
  for (const entry of readdirSync(DIST)) {
    run('scp', ['-i', env.DEPLOY_KEY, '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=accept-new',
      '-r', join(DIST, entry), `${env.DEPLOY_USER}@${env.DEPLOY_HOST}:${release}/`]);
  }

  console.log('\n3) 릴리스 전환');
  ssh(env, `cd '${env.DEPLOY_ROOT}' && ln -sfn '${env.DEPLOY_NAME}-releases/${stamp}' '${env.DEPLOY_NAME}' && ls -l '${env.DEPLOY_NAME}'`);

  if (env.RELOAD_CMD) {
    console.log('\n4) 웹서버 반영');
    ssh(env, env.RELOAD_CMD);
  }
}

const fail = await verify(env.VERIFY_BASE.replace(/\/$/, ''), listDist());
process.exit(fail === 0 ? 0 : 1);
