// ============================================================
// kjyoo.cloud - 사이트 콘텐츠 정본
// v0.3 (2026-09-04) - 개편 작업지시 반영
//
// 5개 섹션(index/cases/system/then-now/about) x 2개 언어(ko/en)의 모든 카피가 이 파일 하나에 있다.
// 페이지 HTML을 직접 고치지 말고 여기를 고친 뒤 build.mjs 를 돌린다.
//
// v0.2 -> v0.3 요지
//   - 보고서형 표 4종(system.readRows/stackRows, then-now.evidenceRows 각주, about.factsRows) 및
//     방어형/자기증명 문구 전량 삭제. 감사팀이 아니라 방문자에게 하는 말만 남긴다.
//   - notes(일지) 페이지 폐기, cases로 통합(대문 문장 이관). PAGES 6 -> 5.
//   - about에 40년 기술 연륜 서사(originH/originP), 경력 압축(careerH/careerP) 신설.
//   - system에 실가동 인프라 요약(liveH/liveP/liveStats) 신설.
//   - 조직 편제 명칭은 공개용으로 정리해 SVG 쪽(assets/img/*.svg,
//     build.mjs EN_TEXT)에서 처리. 이 파일에는 조직명 문자열이 없다.
//   - 수량은 전부 대략치(KJ 결정 2026-09-04). 정의/출처/기준일을 화면에 달지 않는다.
// ============================================================

export const SITE = {
  domain: 'kjyoo.cloud',
  linkedin: 'https://www.linkedin.com/in/kjyoo-global/',
  github: 'https://github.com/Kijunyoo',
  email: 'kj@kjyoo.cloud',
};

// 개인 이력 실측 - 출처 KJ_Yoo_Profile.pdf (2026-03).
// v0.3부터 화면 카피는 이 상수를 참조하지 않고 대략치 문장을 직접 쓴다(about.careerP,
// index.stats). 이 상수는 향후 원 출처 대조용으로만 남겨 둔다.
export const FACTS = {
  ictYears: '30+',
  ceoYears: '17',
  patents: '28',
  govRnd: '20',
  govRndAmount: '3.06',
  govRndAmountEok: '30.6',
  euRnd: '2',
  overseasYears: '13+',
};

export const PAGES = ['index', 'cases', 'system', 'then-now', 'about'];

// 결함 5 (케이스 개별 URL 부재, 2026-09-02 감사 지적) 대응. 케이스 1건당 1페이지
// (/{lang}/cases/<slug>.html)를 build.mjs 가 여기서 만든다. 본문은 Phase 3 소관이라
// 여기 있는 표본 1건은 draft: true 로 둔다. build.mjs 는 draft 항목을 목록, 개별 페이지,
// sitemap 세 곳 전부에서 뺀다(3차 감사 W-5 지적, 2026-09-03) - 라이브에는 아무 흔적도
// 남기지 않고, 구조는 코드에 그대로 보존한다. Phase 3 는 draft 를 지우고 실제 항목을 채운다.
export const CASES = {
  ko: [
    {
      slug: 'ws5b-structure-check',
      title: '[구조 검증용 표본] 케이스 개별 페이지',
      tag: '구조 검증',
      summary: '케이스 1건이 개별 URL 하나로 뜨는지 확인하기 위한 표본이다. 실제 발행물이 아니다.',
      body: ['본문 없음. build.mjs 가 content/site.mjs 의 CASES 배열에서 케이스별 페이지를 만들어내는지 확인하는 용도다. 실제 케이스 본문은 Phase 3에서 채운다.'],
      draft: true,
    },
  ],
  en: [
    {
      slug: 'ws5b-structure-check',
      title: '[Structure check sample] Individual case page',
      tag: 'Structure check',
      summary: 'A sample used to confirm one case renders at one URL. Not a real publication.',
      body: ['No content. This confirms build.mjs generates a per-case page from the CASES array in content/site.mjs. Real case content is written in Phase 3.'],
      draft: true,
    },
  ],
};

export const CONTENT = {
  ko: {
    lang: 'ko',
    dir: 'ko',
    other: { code: 'en', label: 'EN', dir: 'en' },
    selfLabel: 'KO',
    a11y: {
      diagramScroll: '다이어그램. 가로로 스크롤할 수 있다',
    },
    nav: {
      index: '홈',
      cases: '케이스',
      system: '시스템',
      'then-now': '그때와 지금',
      about: '소개',
    },
    foot: {
      tagline: 'KJ Yoo',
      linkedin: 'LinkedIn',
      github: 'GitHub',
      copy: '2026 KJ Yoo / AKSys',
    },
    skip: '본문으로 건너뛰기',

    index: {
      title: 'kjyoo.cloud',
      desc: '한국, 중국, 유럽 20여 명이 하던 개발, 제조, 마케팅, 서비스를 지금은 한 사람과 AI 오케스트레이션으로 돌립니다. 40년 실무 경력 경영자의 AI 전환 실증 기록.',
      heroLead: '한국, 중국, 유럽 20여 명의 조직이 하던',
      heroAccent: '개발, 제조, 마케팅, 서비스, 이제 한 사람과 AI 오케스트레이션으로 돌립니다',
      heroBody: '40년간 개발, 제조, 마케팅, 서비스를 직접 기획하고 실행했습니다. 지금은 여러 AI에게 일을 나눠주고 결과를 확인하는 방식으로, 그 조직이 하던 일을 혼자 돌립니다.',
      ctaPrimary: '케이스 보기',
      stats: [
        { n: '30년 넘게', l: '글로벌 ICT 경력' },
        { n: '17년', l: 'CEO / C-Level' },
        { n: '30건 가까이', l: '특허 등록 및 출원' },
        { n: '20여 건', l: '정부 R&D 총괄' },
      ],
      sections: [
        { key: 'then-now', h: '그때와 지금', p: '분야별로 20여 명이 상주하던 조직이 어떻게 1인과 자동화 파이프라인(공장 컨베이어 벨트처럼 일이 자동으로 이어지는 절차)으로 바뀌었는지, 당시 자료와 나란히 놓고 봅니다.' },
        { key: 'system', h: '실제 돌리는 시스템', p: '말이 아니라 기계를 보여줍니다. 지금 운용 중인 에이전트 구성과 자동화 파이프라인 구성입니다.' },
        { key: 'cases', h: '케이스 스터디', p: '성공 자랑이 아니라 실패를 시스템으로 제압한 과정을 씁니다. 2일에 한 번 발행합니다.' },
      ],
    },

    cases: {
      title: '케이스 스터디',
      desc: '실제 업무에서 나온 문제와, 그것을 AI 오케스트레이션으로 재설계한 과정. 2일에 한 번 발행합니다.',
      h1: '이렇게 해봤고, 이렇게 됐습니다',
      lead: '성공 자랑이 아니라 실패를 시스템으로 제압한 과정을 씁니다. 무엇이 막혔는지 적고, 파이프라인으로 다시 짜고, 결과를 그대로 남깁니다.',
      tags: ['마케팅', '영업', '운영', 'MVP'],
      emptyTitle: '첫 케이스를 준비 중입니다',
      emptyBody: '소재는 매일 업무에서 채굴하고, 발행은 2일에 한 번 합니다. 첫 발행 전까지 이 자리는 비어 있습니다.',
    },

    system: {
      title: '시스템',
      desc: '지금 운용 중인 클로드코드 하네스, 에이전트 조직, 자동화 파이프라인 구성입니다.',
      h1: '이 사이트도 이 시스템이 만들었습니다',
      lead: '말이 아니라 기계를 놓았습니다. 아래 그림은 지금 이 순간 돌아가는 구성이고, 구성이 바뀌면 이 페이지도 바뀝니다.',

      diaH: '일이 도는 길',
      diaP: '지시 한 건이 들어가서 산출물 한 건이 나올 때까지의 길입니다. 회사 조직도를 읽는 방향과 같습니다.',
      diaAlt: '지시 한 건이 총괄 기획실을 거쳐 여섯 개 부문으로 나뉘고, 감사팀을 통과해 산출물 한 건이 되는 흐름도.',

      liveH: '지금 도는 것들',
      liveP: '그림이 아니라 지금 실제로 켜져 있는 것들입니다.',
      liveStats: [
        { n: '3대', l: '서버가 상시 가동 중입니다' },
        { n: '200개 가까운', l: '업무 자동화가 돌아갑니다' },
        { n: '10여 개', l: '에이전트가 부문을 나눠 맡습니다' },
        { n: '40여 종', l: '업무 매뉴얼(스킬)을 직접 만들었습니다' },
      ],
    },

    'then-now': {
      title: '그때와 지금',
      desc: 'AI 이전에 20여 명이 하던 일이, 지금 어떻게 한 사람과 파이프라인으로 바뀌었는가. 당시 조직도와 업무 분장표를 지금과 나란히 놓습니다.',
      h1: '대책 칸이 비어 있던 한 줄',
      lead: '그때 만든 조직도와 업무 분장표를 그대로 놓고 지금과 비교합니다.',

      evidenceH: '그때 남은 자료',
      evidenceP: [
        '직원 20여 명이 여러 해에 걸쳐 있었습니다. 상품기획, 마케팅, 영업배송, 고객서비스, 생산, 품질, 개발까지 갈래마다 담당이 따로 있었습니다.',
        '과제가 몰렸던 넉 달은 몇 명이 나눠 맡았는데, 일한 시간을 적어 둔 칸은 전부 비어 있었습니다.',
        '같은 결재 문서를 금액도 인원도 거의 같은 채로 매달 새로 만들었고, 상세페이지도 같은 것을 몇 번이고 다시 만들었습니다.',
        '그렇게 쌓인 파일이 10만 건 넘습니다. 지금 다시 봐도 그대로입니다.',
      ],

      anchorH: '대책이 없었던 이유',
      anchorP: [
        '2021년에 우리 회사 사람들이 업무가 늦어지는 원인을 여덟 가지로 적었습니다. 그리고 일곱 가지에는 대책을 달았습니다. 담당을 정하고, 늦으면 알림이 가게 하고, 마감 이틀 전에 미리 보고하게 하는 식이었습니다.',
        '여덟 번째 원인에는 대책이 없습니다. 그 원인은 "업무 Loading이 많아서 처리가 지연", 쉽게 말해 일이 너무 많아서 늦는다는 것이었습니다.',
        '대책을 못 적은 이유는 간단합니다. 답이 "사람을 더 뽑는다" 하나뿐이었기 때문입니다. 알림은 늦는다는 것을 알려줄 뿐 일을 대신해 주지 않습니다. 담당을 정해도 그 사람의 하루는 24시간입니다.',
        '그때는 사람을 늘리지 않고 처리량을 늘리는 방법이 없었습니다. 지금 저는 나머지 일곱 가지가 아니라 바로 그 하나에 답하고 있습니다.',
      ],

      closeH: '지금',
      closeP: [
        '같은 일을 지금은 한 사람이 합니다. 사람이 사라진 것이 아니라 자리가 바뀌었습니다. 자료를 모으고 문서를 만들고 초안을 쓰는 일은 기계가 하고, 저는 무엇을 할지 정하고 결과를 확인합니다.',
        '그때 대책 칸이 비어 있던 그 한 줄에, 지금은 적을 것이 생겼습니다.',
      ],
    },

    about: {
      title: '소개',
      desc: 'BYC 영업사원(1986)에서 시작해 LG 18년, 창업 2회, 특허 30건 가까이. 그리고 65세에 시작한 AI 전환의 기록.',
      h1: '65세의 도전',
      lead: '1986년 영업사원으로 시작했습니다. LG에서 18년, 두 번의 창업, 특허 30건 가까이를 지나왔습니다. 지금은 20여 명이 하던 일을 혼자서 AI와 함께 돌려 보려는 새로운 시도를 새롭게 배우면서, 공부하면서 시도하고 있습니다.',

      originH: '40년, 도구만 바뀌었습니다',
      originP: [
        '1989~1990년 회사에 처음 들어온 IBM XT 급 PC로 dBASE III 책을 사서 혼자 익혔습니다. 로터스 1-2-3 스프레드시트로 회사 관리 자료도 만들었습니다.',
        '그때는 아침마다 텔렉스실에 가서 해외 바이어의 전문을 확인했습니다. 텔렉스는 지금의 문자메시지와 같은 통신 수단인데, 글자 수만큼 요금이 나가서 다들 줄임말을 썼습니다. 지금 메신저 줄임말의 원조인 셈입니다.',
        '1992~1993년 팩스가 보급되면서 서류를 그 자리에서 주고받게 됐고, 1996~1998년 이메일이 퍼지면서 일하는 방식이 다시 바뀌었습니다.',
        '텔렉스에서 팩스로, 팩스에서 이메일로, 지금은 AI 에이전트로. 도구는 계속 바뀌었지만 제가 하는 일은 똑같습니다. 무엇을 할지 정하고, 시키고, 결과를 확인하는 것입니다.',
      ],

      careerH: '경력',
      careerP: [
        'LG에서 해외 영업과 기획을 18년 했습니다.',
        '그다음 해외 합작법인과 글로벌 C-Level 자리를 17년 거쳤습니다. 해외에서 10년 넘게 살며 이탈리아, 스페인, 노르웨이, 중국을 오갔습니다.',
        '지금은 AKSys와 SHAKS를 혼자 창업해 운영합니다. 특허 30건 가까이 내고, 정부 과제 20여 건과 EU 과제도 몇 건 이끌었습니다. 그 경험을 지금은 AI 에이전트 조직에 씁니다.',
      ],

      nowH: '지금 하는 일',
      nowP: [
        '지금은 지시를 내리고 결과를 확인하는 일을 합니다. 조사, 문서 작성, 코드 작성, 발행은 에이전트 여러 개가 나눠 맡습니다.',
        '지시를 여섯 개 부문으로 나누고 감사팀을 거치게 하는 구조를 만들어 돌렸습니다. 사람 조직에서 하던 방식을 그대로 옮겼습니다.',
        '정부 R&D, 하드웨어 제품화, 해외 파트너십처럼 사람이 하던 일도 같은 구조 안에 넣어 봤습니다. 전부 되지는 않았습니다. 안 되는 일은 안 된다고 적어 두었고, 판단이 사람에게만 되는 지점은 그대로 사람에게 남겼습니다.',
        '일을 기계에 맡기는 것과 지시하는 방법을 바꾸는 것은 다른 일이었습니다. 40년 동안 사람에게 하던 방식 그대로 기계에 지시하니 더 잘 됐습니다.',
        '속도보다 먼저 걸린 것은 판정 기준이었습니다. 무엇이 통과인지 미리 적어두지 않으면 결과물이 계속 되돌아왔습니다. 이 방식이 저한테는 맞았습니다. 다른 조건, 다른 규모에서는 다를 수 있습니다.',
      ],

      linksH: '연결',
    },
  },

  en: {
    lang: 'en',
    dir: 'en',
    other: { code: 'ko', label: 'KO', dir: 'ko' },
    selfLabel: 'EN',
    a11y: {
      diagramScroll: 'Diagram. Can be scrolled horizontally.',
    },
    nav: {
      index: 'Home',
      cases: 'Cases',
      system: 'System',
      'then-now': 'Then vs Now',
      about: 'About',
    },
    foot: {
      tagline: 'KJ Yoo',
      linkedin: 'LinkedIn',
      github: 'GitHub',
      copy: '2026 KJ Yoo / AKSys',
    },
    skip: 'Skip to content',

    index: {
      title: 'kjyoo.cloud',
      desc: 'Work that once took about 20 people across Korea, China and Europe, covering development, manufacturing, marketing and service, now runs with one person and AI orchestration. A record of a 40 year operator\'s AI transition.',
      heroLead: 'Work that took a 20-person team',
      heroAccent: 'across Korea, China and Europe now runs with one person and AI',
      heroBody: 'For 40 years I planned and ran development, manufacturing, marketing and service myself. Today I hand out the work to a set of AI agents and check what comes back, the way one person now runs what an organization used to run.',
      ctaPrimary: 'Read the cases',
      stats: [
        { n: 'more than 30 years', l: 'Years in global ICT' },
        { n: '17 years', l: 'Years as CEO / C-level' },
        { n: 'nearly 30', l: 'Patents filed and granted' },
        { n: 'about 20', l: 'Government R&D projects led' },
      ],
      sections: [
        { key: 'then-now', h: 'Then vs Now', p: 'How an organization of about twenty specialists became one person and an automated pipeline, work moving on its own like items on a factory conveyor belt, set against the records from that time.' },
        { key: 'system', h: 'The system, in the open', p: 'Not claims, but the machine. The agent structure and automation pipelines currently in operation.' },
        { key: 'cases', h: 'Case studies', p: 'Not victory laps. How a failure was beaten by building a system. Published every second day.' },
      ],
    },

    cases: {
      title: 'Case Studies',
      desc: 'Real problems from real work, and how each was redesigned as an AI orchestration pipeline. Published every second day.',
      h1: 'This is what I did, and what happened',
      lead: 'Not victory laps. Each case writes what got stuck, rebuilds it as a pipeline, and leaves the result as it is.',
      tags: ['Marketing', 'Sales', 'Operations', 'MVP'],
      emptyTitle: 'The first case is in preparation',
      emptyBody: 'Material is mined from daily work; publishing runs every second day. This space stays empty until the first case ships.',
    },

    system: {
      title: 'System',
      desc: 'The Claude Code harness, agent structure and automation pipelines currently in operation.',
      h1: 'This site was built by the system on this page',
      lead: 'Not claims, but the machine. What follows is running right now. When it changes, this page changes.',

      diaH: 'How one instruction becomes one deliverable',
      diaP: 'This is the path from one instruction to one deliverable. It runs left to right, the same direction as an organization chart.',
      diaAlt: 'Flow diagram. One instruction goes to the Planning HQ, is split across six departments, passes an audit team, and comes out as one deliverable.',

      liveH: 'What\'s running right now',
      liveP: 'Not a diagram. What is actually switched on right now.',
      liveStats: [
        { n: '3', l: 'servers running around the clock' },
        { n: 'nearly 200', l: 'automation pipelines running' },
        { n: 'about a dozen', l: 'agents, split across departments' },
        { n: 'about 40', l: 'work manuals (skills), built in house' },
      ],
    },

    'then-now': {
      title: 'Then vs Now',
      desc: 'What about twenty people used to do, and how it became one person and a pipeline. Set against the organization charts and role assignments of that time.',
      h1: 'The line with an empty box',
      lead: 'The organization charts and role assignments from back then, set next to today.',

      evidenceH: 'What is left from back then',
      evidenceP: [
        'About 20 people worked here across several years, each area with its own owner - product planning, marketing, sales and delivery, customer service, production, quality, development.',
        'During four months when tasks piled up, a few people split them, and the column for hours worked was left empty.',
        'The same approval paper was rewritten from scratch every month, same amount, same headcount. The same product page was remade again and again.',
        'Files piled up past 100,000. Still there today.',
      ],

      anchorH: 'Why the box stayed empty',
      anchorP: [
        'In 2021 our own people wrote down eight reasons why work was running late. They put a countermeasure next to seven of them. Assign an owner. Send an alert after one, three and five days. Report two days before the deadline.',
        'The eighth reason has an empty box next to it. That reason was "delay caused by work overload". In plain words, too much work.',
        'The box is empty for a simple reason. The only answer was to hire more people. An alert tells you that you are late. It does not do the work. You can assign an owner, but that person still has 24 hours in a day.',
        'Back then there was no way to raise output without raising headcount. What I do now answers that one line, not the other seven.',
      ],

      closeH: 'Now',
      closeP: [
        'One person does that work today. The people did not disappear. The seat moved. Machines gather the material, write the documents and produce the drafts. Deciding what to do and checking the result is me.',
        'That line with the empty box now has something to write in it.',
      ],
    },

    about: {
      title: 'About',
      desc: 'From a sales job in 1986 through 18 years at LG, two companies founded and close to 30 patents. And an AI transition that started at 65.',
      h1: 'A challenge at 65',
      lead: 'I started as a salesman in 1986. Then 18 years at LG, two companies founded, close to 30 patents. Today I am trying something new - learning as I go, studying as I go, to see if I can run alone, with AI, the work that once took about twenty people.',

      originH: '40 years, only the tools changed',
      originP: [
        'In 1989 to 1990 I bought a dBASE III book and taught myself, using the IBM XT class PC that came into our office. I also built management records with the Lotus 1-2-3 spreadsheet.',
        'Back then I went to the telex room every morning to check messages from overseas buyers. Telex was the text message of its day, and it charged by the character, so everyone used short forms. Today\'s messenger abbreviations come from the same habit.',
        'Fax spread in 1992 to 1993 and let us send documents on the spot. Email spread in 1996 to 1998 and changed how we worked again.',
        'Telex, then fax, then email, and now AI agents. The tools kept changing, but what I do has stayed the same: decide what to do, give the instruction, and check the result.',
      ],

      careerH: 'Career',
      careerP: [
        'I spent 18 years in global sales and planning at LG.',
        'Then 17 years in overseas joint ventures and global C-level roles. I lived overseas for more than 10 years, working across Italy, Spain, Norway and China.',
        'Now I run AKSys and SHAKS, founded and operated alone. Close to 30 patents, about 20 government R&D projects and a few EU projects led. I bring that experience into an AI agent organization.',
      ],

      nowH: 'What I do now',
      nowP: [
        'Now I give instructions and check what comes back. Research, documents, code and publishing are handled by a number of agents.',
        'I built a structure that splits instructions across six departments and puts the result through an audit team. I moved it over the same way a human organization worked.',
        'I put work like government R&D, hardware productization and international partnerships into the same structure. Not all of it worked. What did not work, I wrote down as not working. Where judgment could only be done by a person, I left it with a person.',
        'Handing work to a machine and changing how I give instructions turned out to be two different things. It worked better when I gave the machine the same instructions I gave people for 40 years.',
        'What slowed things down first was not speed. It was the pass criteria. Without writing down what counts as done, the work kept coming back. This worked for me, under my conditions. It may be different at another scale, or in another setting.',
      ],

      linksH: 'Elsewhere',
    },
  },
};
