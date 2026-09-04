# kjyoo.cloud

KJ Yoo 퍼스널 브랜딩 사이트. 40년 실무를 AI 오케스트레이션으로 옮기며 해본 것과 알게 된 것을 공개한다.

이 저장소 자체가 산출물이자 증거물이다. 사이트는 클로드코드로 만들었고 소스를 공개한다.

- 상위 기획: 내부 기획 정본 `AI_Advisor_Branding_Plan_20260901.md`
- 브랜드 기준: 같은 정본 `kjyoo_cloud_Brand_Foundation_v0.1.md`

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
content/site.mjs        5개 섹션 x 2개 언어(ko/en) 전체 카피의 단일 정본
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
| `/{lang}/about.html` | About. 40년 서사, 경력, 지금 하는 일 |

구 `/{lang}/notes.html`(일지)은 2026-09-04 개편으로 `cases.html`에 통합됐다. 이 URL은 404가
아니라 `cases.html`로 넘어가는 리다이렉트 스텁이다(`sitemap.xml`에는 없음, `build.mjs`가 생성).

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

**이 저장소는 로컬 작업 폴더에만 둔다(Google Drive Stream 밖).**

Google Drive Stream(`H:`) 에서는 Node 의 `cpSync` 가 프로세스를 크래시시킨다(exit `-1073740791`, STATUS_STACK_BUFFER_OVERRUN). 2026-09-01 실측. 기획 문서만 Drive 에 두고 코드는 여기에 둔다.

## 배포

```
node deploy.mjs           # 빌드 -> 업로드 -> 릴리스 전환 -> 라이브 검증
node deploy.mjs --check   # 업로드 없이 라이브 검증만
```

접속 정보는 저장소에 두지 않는다. `deploy.env.example` 을 `deploy.env` 로 복사해 값을 채운다
(`deploy.env` 는 `.gitignore` 대상). 인증은 SSH 키만 쓴다. 비밀번호를 파일에 적지 않는다.

**릴리스는 지우지 않고 쌓는다.** 업로드는 타임스탬프 폴더에 하고, 마지막에 심볼릭 링크 하나만
현재 릴리스로 옮긴다. 웹서버 설정은 링크를 가리키므로 전환이 순간적이고, 되돌리려면 링크를
이전 릴리스로 다시 걸면 된다.

```
<배포루트>/<사이트명>-releases/<YYYYMMDDhhmm>/   실제 파일
<배포루트>/<사이트명>                            현재 릴리스를 가리키는 링크
```

검증은 `dist/` 의 파일 목록을 그대로 URL 로 바꿔 전부 요청하고, 응답 코드 200 과 바이트 수 일치를
확인한다. 하나라도 어긋나면 종료 코드 1 로 끝난다. "배포했다" 는 보고는 이 출력으로만 한다.

도메인 kjyoo.cloud 는 Hostinger 보유, 만료 2026-11-28, 자동갱신 ON. 인증서는 Let's Encrypt 자동 발급이다.
