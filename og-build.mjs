// ============================================================
// kjyoo.cloud - OG(소셜 공유 카드) 이미지 생성기
// v0.1 (2026-09-04)
//
// 규격 정본: internal spec doc (not public)
// 공정(7.2절) - ① 이 스크립트로 아트보드 SVG 800x420 을 만든다
//              ② 헤드리스 크로미움으로 배율 3배 렌더 -> PNG 2400x1260 마스터 (별도 단계, og-render.mjs)
//              ③ to_webp.py 결정적 래퍼로 변환 (별도 단계)
// 매번 다른 방식으로 만들지 않기 위해 문안과 좌표를 이 파일 하나에 고정한다.
//
// 문안 출처 - 각 페이지 확정 h1(또는 index 는 heroLead/heroAccent)을 그대로 쓰고
// 4.2절 글자수 상한(한글 12자/행, 영문 25자/행)에 맞춰 어절 경계에서 손으로 잘랐다.
// 새 카피를 짓지 않았다. 부제는 desc 앞부분을 30자(영문 62자) 안에서 어절 경계로 잘랐다.
// ============================================================

import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, 'assets', 'img', 'og');

// 다크 정본 색 (OG_이미지_규격_v0.1.md §6.1)
const COLOR = {
  bg: '#121212',
  title: '#FAFAFA',
  sub: '#DAD9D9',
  label: '#A0A0A0',
  markK: '#A0A0A0',
  markJ: '#EE1D3A',
};

const FONT = "'Nanum Gothic','Noto Sans KR',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif";

const PAGES = {
  ko: {
    index:     { title: ['20여 명이 하던 일을', '혼자서 돌립니다'], sub: '한국, 중국, 유럽 20여 명이 하던 개발, 제조,', label: 'KJYOO.CLOUD', file: 'og-ko' },
    system:    { title: ['이 사이트도 이', '시스템이 만들었습니다'], sub: '지금 운용 중인 클로드코드 하네스, 에이전트 조직,', label: 'THE SYSTEM', file: 'og-system-ko' },
    'then-now':{ title: ['대책 칸이 비어 있던', '한 줄'], sub: 'AI 이전에 20여 명이 하던 일이, 지금 어떻게 한', label: 'THEN VS NOW', file: 'og-then-now-ko' },
    about:     { title: ['65세의 도전'], sub: 'BYC 영업사원(1986)에서 시작해 LG 18년,', label: 'ABOUT', file: 'og-about-ko' },
    cases:     { title: ['이렇게 해봤고', '이렇게 됐습니다'], sub: '실제 업무에서 나온 문제와, 그것을 AI', label: 'CASES', file: 'og-cases-ko' },
  },
  en: {
    index:     { title: ['Work of a 20-person team,', 'now run by one, with AI'], sub: 'Work that once took about 20 people across Korea, China and', label: 'KJYOO.CLOUD', file: 'og-en' },
    system:    { title: ['This site was built by', 'the system on this page'], sub: 'The Claude Code harness, agent structure and automation', label: 'THE SYSTEM', file: 'og-system-en' },
    'then-now':{ title: ['The line with an empty', 'box'], sub: 'What about twenty people used to do, and how it became one', label: 'THEN VS NOW', file: 'og-then-now-en' },
    about:     { title: ['A challenge at 65'], sub: 'From a sales job in 1986 through 18 years at LG, two companies', label: 'ABOUT', file: 'og-about-en' },
    cases:     { title: ['This is what I did, and', 'what happened'], sub: 'Real problems from real work, and how each was redesigned as', label: 'CASES', file: 'og-cases-en' },
  },
};

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// 마크 - 로고 A 모노그램 좌표 정본 (internal asset doc (not public) §1)과 동일
function markSvg() {
  return `<svg x="48" y="48" width="24" height="24" viewBox="0 0 64 64">
    <g fill="none" stroke-linecap="square" stroke-linejoin="miter">
      <path d="M17 13 V51" stroke="${COLOR.markK}" stroke-width="10"/>
      <path d="M17 32 L34 13" stroke="${COLOR.markK}" stroke-width="10"/>
      <path d="M17 32 L34 51" stroke="${COLOR.markK}" stroke-width="10"/>
      <path d="M47 13 V40 Q47 51 36 51" stroke="${COLOR.markJ}" stroke-width="10"/>
    </g>
  </svg>`;
}

function buildSvg({ title, sub, label }, lang) {
  const wordmark = lang === 'ko' ? 'kjyoo.cloud' : 'kjyoo.cloud';
  const titleLines = title.map((line, i) => {
    const y = i === 0 ? 180 : 247;
    return `<text x="48" y="${y}" font-family="${FONT}" font-size="56" font-weight="700" letter-spacing="-1.12" fill="${COLOR.title}">${esc(line)}</text>`;
  }).join('\n  ');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 420" width="800" height="420">
  <rect width="800" height="420" fill="${COLOR.bg}"/>
  ${markSvg()}
  <text x="80" y="68" font-family="${FONT}" font-size="23" font-weight="700" letter-spacing="-0.35" fill="${COLOR.title}">${esc(wordmark)}</text>
  ${titleLines}
  <text x="48" y="291" font-family="${FONT}" font-size="23" font-weight="400" fill="${COLOR.sub}">${esc(sub)}</text>
  <text x="48" y="364" font-family="${FONT}" font-size="19" font-weight="700" letter-spacing="2.66" fill="${COLOR.label}">${esc(label)}</text>
</svg>
`;
}

mkdirSync(OUT_DIR, { recursive: true });
const written = [];
for (const lang of Object.keys(PAGES)) {
  for (const key of Object.keys(PAGES[lang])) {
    const data = PAGES[lang][key];
    const svg = buildSvg(data, lang);
    const outPath = join(OUT_DIR, `${data.file}.svg`);
    writeFileSync(outPath, svg, 'utf8');
    written.push(outPath);
  }
}
console.log(`OG 아트보드 ${written.length}개 생성 -> ${OUT_DIR}`);
written.forEach((p) => console.log('  ' + p));
