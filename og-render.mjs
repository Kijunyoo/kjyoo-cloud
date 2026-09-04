// ============================================================
// kjyoo.cloud - OG(소셜 공유 카드) 아트보드 -> PNG 마스터 -> WebP 변환기
// v0.1 (2026-09-04, F-4 정정으로 신설)
//
// 규격 정본: 내부 기획 정본 OG_이미지_규격_v0.1.md §7.2
// og-build.mjs 가 이 스크립트를 이어서 호출한다. 직접 실행할 필요는 없다
// (직접 실행해도 assets/img/og/*.svg 가 이미 있으면 동작한다).
//
// 공정 ② ③ 담당
//   ② 헤드리스 크로미움(Playwright)으로 아트보드 SVG 800x420 을 배율 3배 렌더
//      -> PNG 2400x1260 마스터 (OG_PNG_MASTER/ 에 임시 보관, 커밋 대상 아님)
//   ③ 결정적 래퍼 to_webp.py(WebP q85, hero 등급)로 변환
//      -> assets/img/og/*.webp (커밋 대상)
//
// 전제 - Playwright Chromium 이 설치돼 있어야 한다.
//   npx playwright install chromium
// node_modules 가 로컬에 없어도 NODE_PATH 로 전역/npx 캐시의 playwright 를 찾는다.
// ============================================================

import { readdirSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OG_DIR = join(__dirname, 'assets', 'img', 'og');
const MASTER_DIR = join(__dirname, 'OG_PNG_MASTER');

// 헌법 §2.9 결정적 래퍼 경로 - 저장소에 사용자 절대경로를 박지 않는다.
// 환경변수 TO_WEBP 로 지정하거나, 문서화된 기본 규약 ~/.config/image-output/to_webp.py 를 쓴다.
const TO_WEBP = process.env.TO_WEBP || join(homedir(), '.config', 'image-output', 'to_webp.py');
if (!existsSync(TO_WEBP)) {
  console.error(`[og-render] to_webp.py 래퍼를 찾을 수 없습니다: ${TO_WEBP}`);
  console.error('환경변수 TO_WEBP 로 경로를 지정하거나, 헌법 §2.9 결정적 래퍼를 ~/.config/image-output/to_webp.py 에 설치하세요.');
  process.exit(1);
}

function loadPlaywright() {
  const require = createRequire(import.meta.url);
  try {
    return require('playwright');
  } catch {
    // node_modules 가 이 저장소에 없으므로 npx 캐시를 훑는다 (2026-09-04 실측 경로).
    // NODE_PATH 는 런타임 변경이 CJS 로더에 반영되지 않으므로 require.resolve(paths) 로 직접 지정한다.
    const npxCache = join(process.env.LOCALAPPDATA || '', 'npm-cache', '_npx');
    if (existsSync(npxCache)) {
      for (const entry of readdirSync(npxCache)) {
        const candidate = join(npxCache, entry, 'node_modules');
        if (existsSync(join(candidate, 'playwright'))) {
          const resolved = require.resolve('playwright', { paths: [candidate] });
          return require(resolved);
        }
      }
    }
    throw new Error(
      'playwright 모듈을 찾지 못했다. `npx playwright install chromium` 을 먼저 실행할 것.'
    );
  }
}

async function renderAll() {
  const svgFiles = readdirSync(OG_DIR).filter((f) => f.endsWith('.svg'));
  if (svgFiles.length === 0) throw new Error(`${OG_DIR} 에 SVG 가 없다. og-build.mjs 먼저 실행할 것`);

  mkdirSync(MASTER_DIR, { recursive: true });
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 800, height: 420 }, deviceScaleFactor: 3 });

  const pngPaths = [];
  for (const svgFile of svgFiles) {
    const svgPath = join(OG_DIR, svgFile);
    await page.goto(pathToFileURL(svgPath).href, { waitUntil: 'load' });
    const pngPath = join(MASTER_DIR, basename(svgFile, '.svg') + '.png');
    await page.screenshot({ path: pngPath, clip: { x: 0, y: 0, width: 800, height: 420 } });
    pngPaths.push(pngPath);
  }
  await browser.close();
  return pngPaths;
}

function encodeAll(pngPaths) {
  for (const pngPath of pngPaths) {
    execFileSync('python', [TO_WEBP, pngPath, '--class', 'hero', '--out', OG_DIR], { stdio: 'inherit' });
  }
}

const pngPaths = await renderAll();
console.log(`PNG 마스터 ${pngPaths.length}개 렌더 -> ${MASTER_DIR}`);
encodeAll(pngPaths);
console.log(`WebP 변환 ${pngPaths.length}개 -> ${OG_DIR}`);
