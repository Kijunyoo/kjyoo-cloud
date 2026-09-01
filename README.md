# kjyoo.cloud

Senior AI Orchestration Advisor 퍼스널 브랜딩 사이트.

이 저장소 자체가 산출물이자 증거물이다. 사이트는 클로드코드로 만들었고 소스를 공개한다.

- 상위 기획: `internal planning doc (not public)`
- 브랜드 기준: 같은 폴더 `kjyoo_cloud_Brand_Foundation_v0.1.md`

---

## 빌드

의존성이 없다. `npm install` 이 필요 없고 `node_modules` 도 없다.

```
node build.mjs            # dist/ 생성
node build.mjs --serve    # dist/ 생성 후 http://localhost:4173 미리보기
```

출력은 `dist/` 이며 그대로 정적 호스팅에 올리면 된다.

## 구조

```
assets/css/tokens.css   브랜드 토큰. 원천은 SHAKS Design System 파운데이션
assets/css/site.css     사이트 레이아웃. 색/서체/간격을 새로 정의하지 않고 토큰만 참조
content/site.mjs        6개 섹션 x 2개 언어(ko/en) 전체 카피의 단일 정본
build.mjs               무의존성 정적 빌더
dist/                   빌드 산출물. 커밋하지 않는다
```

### 콘텐츠를 고치는 방법

**`dist/` 안의 HTML을 직접 고치지 말 것.** 다음 빌드에서 덮어쓴다.

카피는 전부 `content/site.mjs` 한 곳에 있다. 거기를 고치고 다시 빌드한다.

## 페이지

| 경로 | 섹션 |
|---|---|
| `/` | 브라우저 언어로 `/ko/` 또는 `/en/` 리다이렉트 |
| `/{lang}/` | Home. 포지셔닝과 실측 수치 |
| `/{lang}/cases.html` | Case Studies |
| `/{lang}/system.html` | The System. 실제 운용 스택 공개 |
| `/{lang}/then-now.html` | Then vs Now. 조직 대비 다이어그램 |
| `/{lang}/about.html` | About. 경력과 검증 가능 실측 |
| `/{lang}/advisory.html` | Advisory. 자문 제안과 문의 |

`{lang}` 은 `ko` 또는 `en`.

## 브랜드 규칙

`assets/css/site.css` 에 색상값이나 폰트 사이즈를 새로 쓰지 말 것. 전부 `tokens.css` 의 변수를 참조한다.

- 강조색 단일: `--kj-accent` (라이트 `#E5002B` / 다크 `#EE1D3A`)
- 서체: 나눔고딕, 무게는 Bold 700 / Regular 400 두 단계만
- 라운드 17px 시그니처
- 간격은 4dp 스케일. 중간값 금지
- 라이트/다크 듀얼모드는 필수
- 한국어는 `word-break: keep-all`. 어절 중간에서 줄이 끊기면 안 된다

## 작업 위치 주의

**이 저장소는 로컬(`C:\Users\kj530\dev\kjyoo-cloud`)에만 둔다.**

Google Drive Stream(`H:`) 에서는 Node 의 `cpSync` 가 프로세스를 크래시시킨다(exit `-1073740791`, STATUS_STACK_BUFFER_OVERRUN). 2026-09-01 실측. 기획 문서만 Drive 에 두고 코드는 여기에 둔다.

## 배포

`dist/` 를 Hostinger 로 올린다. 도메인 kjyoo.cloud 는 Hostinger 보유, 만료 2026-11-28, 자동갱신 ON.
