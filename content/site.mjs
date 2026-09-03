// ============================================================
// kjyoo.cloud - 사이트 콘텐츠 정본
// v0.2 (2026-09-03) - Phase 2 카피 주입
//
// 6개 섹션 x 2개 언어(ko/en)의 모든 카피가 이 파일 하나에 있다.
// 페이지 HTML을 직접 고치지 말고 여기를 고친 뒤 build.mjs 를 돌린다.
//
// v0.1 -> v0.2 요지 (Phase2_페이지카피_v0.2.md 근거)
//   - 목표를 프랙셔널 자문 수주에서 경험 전수로 전환 (KJ 결정 2026-09-03)
//   - Advisory 페이지를 "일지 / Notes" 로 개편, 상품 구성/문의 절차/전환 버튼 전부 삭제
//   - Home 자문 문의 버튼 삭제, 바닥글 메일과 직함 변경
//   - 수치 10~15명 -> 10명에서 17명, About CWD 행 삭제, 엑싯 표현 제거
// ============================================================

export const SITE = {
  domain: 'kjyoo.cloud',
  linkedin: 'https://www.linkedin.com/in/kjyoo-global/',
  github: 'https://github.com/Kijunyoo',
  email: 'kj@kjyoo.cloud',
};

// 검증 가능 실측 - 출처 KJ_Yoo_Profile.pdf (2026-03)
// 숫자를 바꿀 때는 출처 문서를 먼저 고친다.
export const FACTS = {
  ictYears: '30+',
  ceoYears: '17',
  patents: '28',
  govRnd: '20',
  govRndAmount: '3.06',
  euRnd: '2',
  overseasYears: '13+',
};

export const PAGES = ['index', 'cases', 'system', 'then-now', 'about', 'notes'];

export const CONTENT = {
  ko: {
    lang: 'ko',
    dir: 'ko',
    other: { code: 'en', label: 'EN', dir: 'en' },
    selfLabel: 'KO',
    nav: {
      index: '홈',
      cases: '케이스',
      system: '시스템',
      'then-now': '그때와 지금',
      about: '소개',
      notes: '일지',
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
      desc: '마케팅 영업 5~6명이 하던 일을, 지금은 한 사람과 AI 오케스트레이션으로 돌립니다. 40년 ICT 경력 임원의 AI 전환 실증 기록.',
      heroLead: '마케팅과 영업만 5~6명이 하던 일을',
      heroAccent: '지금은 한 사람과 AI가 돌립니다',
      heroBody: '40년간 개발, 제조, 영업, 마케팅을 직접 기획하고 실행했습니다. 지금은 그 조직이 하던 일을 클로드코드 오케스트레이션으로 대신합니다. 이 사이트는 그 과정을 있는 그대로 공개하는 기록입니다.',
      ctaPrimary: '케이스 보기',
      stats: [
        { n: FACTS.ictYears + '년', l: '글로벌 ICT 경력' },
        { n: FACTS.ceoYears + '년', l: 'CEO / C-Level' },
        { n: FACTS.patents + '건', l: '특허 등록 및 출원' },
        { n: FACTS.govRnd + '건', l: '정부 R&D 총괄' },
      ],
      sections: [
        { key: 'then-now', h: '그때와 지금', p: '분야별로 10명에서 17명이 상주하던 조직이 어떻게 1인과 파이프라인으로 바뀌었는지, 당시 자료를 근거로 대조합니다.' },
        { key: 'system', h: '실제 돌리는 시스템', p: '말이 아니라 기계를 보여줍니다. 지금 운용 중인 에이전트 구성과 자동화 파이프라인을 그대로 공개합니다.' },
        { key: 'cases', h: '케이스 스터디', p: '성공 자랑이 아니라 실패를 시스템으로 제압한 과정을 씁니다. 2일에 한 번 발행합니다.' },
      ],
    },

    cases: {
      title: '케이스 스터디',
      desc: '실제 업무에서 나온 문제와, 그것을 AI 오케스트레이션으로 재설계한 과정. 2일에 한 번 발행합니다.',
      h1: '케이스 스터디',
      lead: '성공 자랑이 아니라 실패를 시스템으로 제압한 과정을 씁니다. 문제를 진단하고, 파이프라인으로 재설계하고, 제언 한 줄로 닫습니다.',
      tags: ['마케팅', '영업', '운영', 'MVP'],
      emptyTitle: '첫 케이스를 준비 중입니다',
      emptyBody: '소재는 매일 업무에서 채굴하고, 발행은 2일에 한 번 합니다. 첫 발행 전까지 이 자리는 비어 있습니다.',
    },

    system: {
      title: '실제 돌리는 시스템',
      desc: '지금 운용 중인 클로드코드 하네스, 에이전트 조직, 자동화 파이프라인 구성. 실측 2026-09-02 기준.',
      h1: '이 사이트도 이 시스템이 만들었습니다',
      lead: '말이 아니라 기계를 놓았습니다. 아래 그림은 지금 이 순간 돌아가는 구성이고, 구성이 바뀌면 이 페이지도 바뀝니다.',

      diaH: '일이 도는 길',
      diaP: '지시 한 건이 들어가서 산출물 한 건이 나올 때까지의 길입니다. 회사 조직도를 읽는 방향과 같습니다.',
      diaAlt: '지시 한 건이 총괄 기획실을 거쳐 여섯 개 부문으로 나뉘고, 감사를 통과해 산출물 한 건이 되는 흐름도. 아래에 하네스, 스킬, 자동화 세 가지 상시 설비.',
      diaCaption: '실측 2026-09-02 기준. 에이전트 정의 11종과 스킬 38종(2026-09-03 기준)을 직접 세어 그렸고, 없는 구성요소는 넣지 않았습니다.',

      readH: '그림 읽는 법',
      readRows: [
        ['지시 1건', '사람이 내립니다. 무엇을 언제까지 어떤 형태로 낼지 여섯 칸을 채워 넘깁니다'],
        ['총괄 기획실', '지시를 쪼개 담당에게 나눠줍니다. 실무자들을 관리하는 반장 자리입니다'],
        ['부문 여섯', '기술, 지식, 창작, 마케팅, 사업, 조사. 사람 조직의 부서와 같은 자리입니다'],
        ['감사', '나온 결과를 합격 또는 불합격으로만 판정합니다. 만든 쪽이 스스로 합격을 주지 못합니다'],
        ['산출물 1건', '사람이 최종 확인합니다. 여기서 사람이 빠지지 않습니다'],
      ],

      pipelineH: '콘텐츠 파이프라인',
      pipelineP: '이 사이트에 글이 올라오는 길입니다. 매일 업무에서 소재를 건지고, 형식을 바꿔가며 내보냅니다. 사람이 하는 일은 판단과 승인입니다.',
      nodes: [
        { b: 'KJ', s: '판단과 승인. 경영자 관점의 코멘트를 더하고 뺍니다' },
        { b: 'case-capture', s: '그날 업무에서 소재를 서너 줄로 건져 대기 목록에 쌓습니다' },
        { b: 'case-deep', s: '소재 한 건을 풀버전 사례로 늘립니다. 그림 한 장이 반드시 붙습니다' },
        { b: 'case-rotate', s: '같은 소재를 매번 다른 형식으로 짧게 냅니다' },
        { b: 'ceo-eli5', s: '경영자가 두 번 읽지 않고 이해하는지 마지막에 겁니다' },
      ],

      stackH: '항상 켜져 있는 설비',
      stackRows: [
        ['하네스', '지켜야 할 규칙을 한 곳에 모은 사규집입니다. 작업 도중 여섯 개 시점에서 자동으로 걸립니다'],
        ['스킬 38종 (2026-09-03 기준)', '반복 업무를 굳혀 둔 표준 작업 매뉴얼입니다. 같은 설명을 매번 다시 하지 않습니다'],
        ['업무 자동화', '정해진 시각에 사람 없이 도는 컨베이어 벨트입니다. 외부 시스템에 직접 읽고 씁니다'],
        ['문서 정본', '구글 드라이브와 옵시디언. 문서고를 한 곳만 정답으로 둡니다'],
        ['코드와 발행', '깃허브 공개 저장소. 이 사이트는 명령 한 줄로 조립해서 내보냅니다'],
      ],
      note: '이 사이트도 이 구성으로 만들었고, 소스는 깃허브에 공개돼 있습니다. 화면에 보이는 것과 저장소에 있는 것이 같습니다.',
    },

    'then-now': {
      title: '그때와 지금',
      desc: 'AI 이전에 10명에서 17명이 하던 일이, 지금 어떻게 한 사람과 파이프라인으로 바뀌었는가. 당시 조직도와 업무 분장표를 근거로 대조합니다.',
      h1: '대책 칸이 비어 있던 한 줄',
      lead: '그때 만든 조직도와 업무 분장표를 그대로 놓고 지금과 비교합니다.',

      evidenceH: '그때 남은 자료가 곧 증거입니다',
      evidenceRows: [
        ['직원 10명에서 17명', '여러 시점의 내부 인사 기록에 남아 있습니다. 우리가 만든 자료가 아닙니다'],
        ['마케팅과 영업 5~6명', '2021년 조직도로 5명, 2023년 과제 대장으로 6명이 이름을 걸고 있었습니다'],
        ['업무 갈래 7개에서 9개', '상품기획, 마케팅, 영업배송, 고객서비스, 생산, 품질, 개발. 갈래마다 담당이 따로 있었습니다'],
        ['과제 106건을 6명이 넉 달에', '한 사람이 평균 열여덟 건입니다. 그 대장의 소요시간 칸은 106줄 전부 비어 있습니다.'],
        ['같은 결재 문서를 12개월 연속', '금액도 인원도 거의 같은 서류를 매달 새로 만들었습니다.'],
        ['상세페이지 11번째 버전', '같은 페이지가 버전 11(V0.11)까지 갔습니다.'],
        ['파일 103,348건', '사내 아카이브 정리 종합요약(2026-07-14)과 2026-09-03 재실측에서 나온 숫자입니다.'],
      ],

      anchorH: '대책 칸이 비어 있던 한 줄',
      anchorP: [
        '2021년에 우리 회사 사람들이 업무가 늦어지는 원인을 여덟 가지로 적었습니다. 그리고 일곱 가지에는 대책을 달았습니다. 담당을 정하고, 늦으면 알림이 가게 하고, 마감 이틀 전에 미리 보고하게 하는 식이었습니다.',
        '여덟 번째 원인에는 대책이 없습니다. 그 원인은 "업무 Loading 과다로 인한 지연", 쉽게 말해 일이 너무 많아서 늦는다는 것이었습니다.',
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
      desc: 'BYC 영업사원(1986)에서 시작해 LG 18년, 창업 2회, 특허 28건. 그리고 65세에 시작한 AI 전환의 기록.',
      h1: '65세의 도전',
      lead: '1986년 영업사원으로 시작했습니다. LG에서 18년, 두 번의 창업, 28건의 특허를 지나왔습니다. 지금은 열 명에서 열일곱 명이 하던 일을 혼자서 AI와 함께 돌립니다.',
      timelineH: '경력',
      timeline: [
        { when: '2013 ~', b: 'AKSys / SHAKS', s: 'CEO, 단독 창업. 특허 28건, 5개국 이상 OEM' },
        { when: '2013 ~ 2017', b: 'Innoplay', s: 'EVP / Shenzhen. 중국 EMS 제조, IoT, 스마트홈' },
        { when: '2008 ~ 2013', b: 'Avantis', s: 'CEO, COO, 공동 창업. 이탈리아 스페인 노르웨이 한국 4개국 JV' },
        { when: '2003 ~ 2008', b: 'LG-Nortel', s: 'Head of European Sales / Milan' },
        { when: '1999 ~ 2003', b: 'LG전자', s: 'GM, European Sales / Milan. 휴대폰 유럽 시장 확대' },
        { when: '1990 ~ 1999', b: 'LG정보통신', s: '영업, 기획, 전략' },
        { when: '1986 ~ 1990', b: 'BYC', s: '영업, 기획' },
      ],
      factsH: '검증 가능한 실측',
      factsRows: [
        ['글로벌 ICT 경력', FACTS.ictYears + '년 (LG 18년 포함)'],
        ['CEO / C-Level', FACTS.ceoYears + '년, 창업 2회'],
        ['특허', FACTS.patents + '건 (등록 13, 출원 15)'],
        ['정부 R&D', '약 ' + FACTS.govRnd + '건, 총 ' + FACTS.govRndAmount + '십억원 (Project Lead)'],
        ['EU R&D', FACTS.euRnd + '건 (Eureka, Horizon)'],
        ['글로벌 파트너십', 'Qualcomm, Google, Deutsche Telekom, TIM'],
        ['해외 주재', FACTS.overseasYears + '년 (이탈리아 9년, 중국 4년)'],
      ],

      nowH: '지금 하는 일',
      nowP: [
        '실무를 직접 합니다. 하루 업무는 대부분 지시를 내리고 결과를 확인하는 일입니다.',
        '자료 조사, 문서 작성, 코드 작성, 발행은 AI 에이전트가 맡습니다. 맡은 일이 정해진 실무 담당자를 여럿 두는 것과 같습니다. 제가 하는 일은 판단과 승인입니다.',
        '40년 동안 사람에게 시키던 방식 그대로 기계에 시킵니다. 바뀐 것은 지시를 받는 쪽이지 지시하는 방법이 아닙니다.',
      ],

      linksH: '연결',
    },

    notes: {
      title: '일지',
      desc: '40년 실무를 AI 오케스트레이션으로 옮기며 해본 것과 알게 된 것을 적습니다.',
      h1: '이렇게 해봤고, 이렇게 됐습니다',
      lead: '1986년부터 지금까지 제 일을 직접 기획하고 실행했습니다. 지금은 그 일의 상당 부분을 AI 오케스트레이션으로 옮기고 있습니다. 여기에는 그 과정에서 해본 것과 알게 된 것을 적습니다.',

      didH: '해본 일',
      didP: [
        '지시를 여섯 개 부문으로 나누고 감사를 거치게 하는 구조를 만들어 돌렸습니다. 사람 조직에서 하던 방식을 그대로 옮겼습니다.',
        '정부 R&D, 하드웨어 제품화, 해외 파트너십처럼 사람이 하던 일도 같은 구조 안에 넣어 봤습니다. 전부 되지는 않았습니다.',
        '안 되는 일은 안 된다고 적어 두었습니다. 판단이 사람에게만 되는 지점은 그대로 사람에게 남겼습니다.',
      ],

      learnedH: '알게 된 것',
      learnedP: [
        '일을 기계에 맡기는 것과 지시하는 방법을 바꾸는 것은 다른 일이었습니다. 40년 동안 사람에게 하던 방식 그대로 기계에 지시하니 더 잘 됐습니다.',
        '속도보다 먼저 걸린 것은 판정 기준이었습니다. 무엇이 통과인지 미리 적어두지 않으면 결과물이 계속 되돌아왔습니다.',
        '이 방식이 저한테는 맞았습니다. 다른 조건, 다른 규모에서는 다를 수 있습니다.',
      ],

      areasH: '해본 영역',
      areas: [
        ['AI 오케스트레이션', '지시를 나누고 감사를 붙이는 구조를 실제로 돌렸습니다'],
        ['사업개발', '해외 파트너십과 위탁생산을 국경 너머로 조율했습니다'],
        ['정부 R&D', '기획부터 정산까지 전 주기를 직접 겪었습니다'],
        ['하드웨어 제품화', '요구사항 정의부터 인증까지 실무로 했습니다'],
      ],

      linksH: '연결',
    },
  },

  en: {
    lang: 'en',
    dir: 'en',
    other: { code: 'ko', label: 'KO', dir: 'ko' },
    selfLabel: 'EN',
    nav: {
      index: 'Home',
      cases: 'Cases',
      system: 'System',
      'then-now': 'Then vs Now',
      about: 'About',
      notes: 'Notes',
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
      desc: 'Work that took a team of five to six in marketing and sales now runs with one person and AI orchestration. A record of one executive turning 40 years of ICT experience into an AI operation.',
      heroLead: 'Work that took five to six people',
      heroAccent: 'now runs with one person and AI',
      heroBody: 'For 40 years I planned and ran development, manufacturing, sales and marketing myself. Today an orchestration of AI agents does what that organization used to do. This site is the record, published as it happens.',
      ctaPrimary: 'Read the cases',
      stats: [
        { n: FACTS.ictYears, l: 'Years in global ICT' },
        { n: FACTS.ceoYears, l: 'Years as CEO / C-level' },
        { n: FACTS.patents, l: 'Patents filed and granted' },
        { n: FACTS.govRnd, l: 'Government R&D projects led' },
      ],
      sections: [
        { key: 'then-now', h: 'Then vs Now', p: 'How an organization of ten to seventeen specialists became one person and a pipeline, set against the records from that time.' },
        { key: 'system', h: 'The system, in the open', p: 'Not claims, but the machine. The agent structure and automation pipelines currently in operation, published as they are.' },
        { key: 'cases', h: 'Case studies', p: 'Not victory laps. How a failure was beaten by building a system. Published every second day.' },
      ],
    },

    cases: {
      title: 'Case Studies',
      desc: 'Real problems from real work, and how each was redesigned as an AI orchestration pipeline. Published every second day.',
      h1: 'Case Studies',
      lead: 'Not victory laps. Each case diagnoses a real failure, rebuilds it as a pipeline, and closes with the one line only a senior operator can offer.',
      tags: ['Marketing', 'Sales', 'Operations', 'MVP'],
      emptyTitle: 'The first case is in preparation',
      emptyBody: 'Material is mined from daily work; publishing runs every second day. This space stays empty until the first case ships.',
    },

    system: {
      title: 'The System',
      desc: 'The Claude Code harness, agent structure and automation pipelines currently in operation. Measured 2026-09-02.',
      h1: 'This site was built by the system on this page.',
      lead: 'Not claims, but the machine. What follows is running right now. When it changes, this page changes.',

      diaH: 'How one instruction becomes one deliverable',
      diaP: 'This is the path from one instruction to one deliverable. It runs left to right, the same direction as an organization chart.',
      diaAlt: 'Flow diagram. One instruction goes to a Planning HQ, is split across six departments, passes an audit, and comes out as one deliverable. Below it, three standing facilities: the harness, the skills, and the automation.',
      diaCaption: 'Measured 2026-09-02. Eleven agent definitions and 38 skills (as of 2026-09-03), counted directly. Nothing that does not exist was drawn.',

      readH: 'How to read it',
      readRows: [
        ['One instruction', 'A person gives it. Six fields: what, by when, in what form, with what inputs'],
        ['Chief of staff', 'Splits the instruction and hands the parts out. The floor manager of the team'],
        ['Six departments', 'Tech, knowledge, creative, marketing, business, research. The same seats a company has'],
        ['Audit', 'Pass or fail only. The one who made it cannot pass it'],
        ['One deliverable', 'A person checks it last. The person is never removed at this step'],
      ],

      pipelineH: 'Content pipeline',
      pipelineP: 'This is how writing gets onto this site. Material is pulled from daily work and published in rotating formats. What stays human is judgment and approval.',
      nodes: [
        { b: 'KJ', s: 'Judgment and approval. The operator viewpoint, added or cut' },
        { b: 'case-capture', s: 'Pulls three to five lines out of the day and stacks them in a queue' },
        { b: 'case-deep', s: 'Grows one item into a full case study. One diagram is mandatory' },
        { b: 'case-rotate', s: 'Publishes the same item in a different short format each time' },
        { b: 'ceo-eli5', s: 'The last gate. Can a non technical reader understand it in one pass' },
      ],

      stackH: 'Always on',
      stackRows: [
        ['Harness', 'One place for the rules to follow. It fires automatically at six points during a job'],
        ['38 skills (as of 2026-09-03)', 'Standard operating procedures for repeated work. The same briefing is never given twice'],
        ['Workflow automation', 'A conveyor belt that runs on schedule without a person. It reads and writes to outside systems directly'],
        ['Document source of truth', 'Google Drive and Obsidian. One place is the answer, not three'],
        ['Code and publishing', 'Public GitHub repositories. This site is assembled and shipped with one command'],
      ],
      note: 'This site was built with the same setup, and its source is public on GitHub. What you see here is what is in the repository.',
    },

    'then-now': {
      title: 'Then vs Now',
      desc: 'What ten to seventeen people used to do, and how it became one person and a pipeline. Set against the organization charts and role assignments of that time.',
      h1: 'The line with an empty box',
      lead: 'Nothing here is invented. The comparison is drawn from the organization charts and role assignments written at the time.',

      evidenceH: 'The records from that time are the evidence',
      evidenceRows: [
        ['10 to 17 employees', 'Recorded across multiple points in internal HR records, not a file we created ourselves'],
        ['5 to 6 in marketing and sales', 'Five by the 2021 organization chart. Six by name on the 2023 task list'],
        ['7 to 9 functions', 'Product, marketing, sales and logistics, customer service, production, quality, development. Each had its own owner'],
        ['106 tasks, 6 people, 4 months', 'About eighteen tasks each. The "hours needed" column is empty on all 106 rows.'],
        ['The same approval paper, 12 months running', 'Same amount, same headcount, rewritten from scratch every month.'],
        ['Version 11 of one product page', 'The same page reached version 11 (V0.11).'],
        ['103,348 files', 'The figure comes from the 2026-07-14 archive summary and the 2026-09-03 recount.'],
      ],

      anchorH: 'The line with an empty box',
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
      desc: 'From a sales job in 1986 through 18 years at LG, two companies founded and 28 patents. And an AI transition that started at 65.',
      h1: 'A challenge at 65',
      lead: 'I started as a salesman in 1986. Then 18 years at LG, two companies founded, 28 patents. Today I run alone, with AI, the work that once took ten to seventeen people.',
      timelineH: 'Career',
      timeline: [
        { when: '2013 -', b: 'AKSys / SHAKS', s: 'CEO, solo founder. 28 patents, OEM across 5+ countries' },
        { when: '2013 - 2017', b: 'Innoplay', s: 'EVP / Shenzhen. China EMS manufacturing, IoT, smart home' },
        { when: '2008 - 2013', b: 'Avantis', s: 'CEO and COO, co-founder. Four-nation JV across Italy, Spain, Norway and Korea' },
        { when: '2003 - 2008', b: 'LG-Nortel', s: 'Head of European Sales / Milan' },
        { when: '1999 - 2003', b: 'LG Electronics', s: 'GM, European Sales / Milan. Mobile handset expansion in Europe' },
        { when: '1990 - 1999', b: 'LG Information and Communications', s: 'Sales, planning, strategy' },
        { when: '1986 - 1990', b: 'BYC', s: 'Sales, planning' },
      ],
      factsH: 'Verifiable record',
      factsRows: [
        ['Global ICT experience', FACTS.ictYears + ' years, including 18 at LG'],
        ['CEO / C-level', FACTS.ceoYears + ' years, two companies founded'],
        ['Patents', FACTS.patents + ' (13 granted, 15 filed)'],
        ['Government R&D', 'About ' + FACTS.govRnd + ' projects, KRW ' + FACTS.govRndAmount + 'B as project lead'],
        ['EU R&D', FACTS.euRnd + ' projects (Eureka, Horizon)'],
        ['Global partnerships', 'Qualcomm, Google, Deutsche Telekom, TIM'],
        ['Overseas assignments', FACTS.overseasYears + ' years (Italy 9, China 4)'],
      ],

      nowH: 'What I do now',
      nowP: [
        'I do the work myself. Most of my day is giving instructions and checking what comes back.',
        'Research, documents, code and publishing are handled by AI agents. Think of them as staff with fixed job descriptions. What I keep doing is judgment and approval.',
        'I direct machines the same way I directed people for 40 years. What changed is who receives the instruction, not how it is given.',
      ],

      linksH: 'Elsewhere',
    },

    notes: {
      title: 'Notes',
      desc: 'What I did, and what I learned, moving 40 years of hands on work into AI orchestration.',
      h1: 'This is what I did, and what happened',
      lead: 'I have planned and run my own work since 1986. Now I am moving a large part of it into AI orchestration. This is what I did in that process, and what I learned.',

      didH: 'What I did',
      didP: [
        'I built a structure that splits instructions across six departments and puts the result through an audit. I moved it over the same way a human organization worked.',
        'I put work like government R&D, hardware productization and international partnerships into the same structure. Not all of it worked.',
        'What did not work, I wrote down as not working. Where judgment could only be done by a person, I left it with a person.',
      ],

      learnedH: 'What I learned',
      learnedP: [
        'Handing work to a machine and changing how I give instructions turned out to be two different things. It worked better when I gave the machine the same instructions I gave people for 40 years.',
        'What slowed things down first was not speed. It was the pass criteria. Without writing down what counts as done, the work kept coming back.',
        'This worked for me, under my conditions. It may be different at another scale, or in another setting.',
      ],

      areasH: 'Areas I worked in',
      areas: [
        ['AI orchestration', 'Ran a structure that splits instructions and checks results, in practice'],
        ['Business development', 'Coordinated international partnerships and OEM manufacturing across borders'],
        ['Government R&D', 'Went through the full cycle, from proposal to closing'],
        ['Hardware productization', 'Did requirements definition through certification myself'],
      ],

      linksH: 'Elsewhere',
    },
  },
};
