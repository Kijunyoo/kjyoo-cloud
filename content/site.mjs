// ============================================================
// kjyoo.cloud - 사이트 콘텐츠 정본
// v0.1 (2026-09-01)
//
// 6개 섹션 x 2개 언어(ko/en)의 모든 카피가 이 파일 하나에 있다.
// 페이지 HTML을 직접 고치지 말고 여기를 고친 뒤 build.mjs 를 돌린다.
// ============================================================

export const SITE = {
  domain: 'kjyoo.cloud',
  linkedin: 'https://www.linkedin.com/in/kjyoo-global/',
  github: 'https://github.com/Kijunyoo',
  email: 'kjyoo@aksys.co.kr',
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

export const PAGES = ['index', 'cases', 'system', 'then-now', 'about', 'advisory'];

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
      advisory: '자문',
    },
    foot: {
      tagline: 'Senior AI Orchestration Advisor',
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
      ctaGhost: '자문 문의',
      stats: [
        { n: FACTS.ictYears + '년', l: '글로벌 ICT 경력' },
        { n: FACTS.ceoYears + '년', l: 'CEO / C-Level' },
        { n: FACTS.patents + '건', l: '특허 등록 및 출원' },
        { n: FACTS.govRnd + '건', l: '정부 R&D 총괄' },
      ],
      sections: [
        { key: 'then-now', h: '그때와 지금', p: '분야별로 10~15명이 상주하던 조직이 어떻게 1인과 파이프라인으로 바뀌었는지, 당시 자료를 근거로 대조합니다.' },
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
      desc: '지금 운용 중인 클로드코드 하네스, 에이전트 조직, 자동화 파이프라인 구성.',
      h1: '실제 돌리는 시스템',
      lead: '말이 아니라 기계를 보여줍니다. 아래는 지금 이 순간 돌아가고 있는 구성이며, 바뀌면 이 페이지도 바뀝니다.',
      pipelineH: '콘텐츠 파이프라인',
      pipelineP: '매일 업무에서 소재를 채굴하고, 형식을 바꿔가며 발행합니다. 사람이 하는 일은 판단과 승인입니다.',
      nodes: [
        { b: 'KJ', s: '판단, 승인, CEO 관점 커멘트 가감' },
        { b: 'case-capture', s: '일일 소재 채굴과 큐 관리' },
        { b: 'case-deep', s: '풀버전 케이스 스터디 생성' },
        { b: 'case-rotate', s: '경량 포맷 로테이션' },
        { b: 'ceo-eli5', s: '50대 눈높이 최종 게이트' },
      ],
      stackH: '운용 스택',
      stackRows: [
        ['오케스트레이션', '클로드코드 하네스 + 서브에이전트 조직'],
        ['업무 자동화', 'n8n 워크플로우'],
        ['문서 정본', 'Google Drive + Obsidian'],
        ['코드', 'GitHub 공개 저장소'],
        ['발행', '정적 사이트 자동 빌드 및 배포'],
      ],
      note: '이 사이트 자체도 클로드코드로 만들었고, 소스는 GitHub에 공개돼 있습니다.',
    },

    'then-now': {
      title: '그때와 지금',
      desc: 'AI 이전 시대에 10~15명이 하던 일이 지금 어떻게 1인과 파이프라인으로 바뀌었는가.',
      h1: '그때와 지금',
      lead: '당시 조직 자료를 근거로 대조합니다. 그때의 업무 분장을 보면 대부분의 경영자가 자기 회사를 떠올립니다.',
      beforeEra: 'Then',
      beforeCount: '마케팅 영업 5~6명',
      beforeSub: '분야별 상주, 전체 10~15명',
      people: ['브랜드 마케팅', '퍼포먼스 광고', '콘텐츠 제작', '국내 영업', '해외 영업', '영업 지원'],
      afterEra: 'Now',
      afterCount: '1인 + 파이프라인',
      afterSub: '클로드코드 오케스트레이션',
      caption: '왼쪽은 사람이 나눠 맡던 기능이고, 오른쪽은 지금 그 기능을 대신하는 파이프라인입니다. 사람이 사라진 것이 아니라 판단만 남았습니다.',
      pendingH: '자료 발굴 진행 중',
      pendingP: '당시 조직 자료 실물을 내부 아카이브에서 발굴하고 있습니다. 발굴이 끝나면 실제 문서를 근거로 이 페이지를 채웁니다.',
    },

    about: {
      title: '소개',
      desc: 'BYC 영업사원에서 시작해 LG 18년, 창업 2회, 특허 28건, 엑싯 1회. 그리고 65세의 AI 전환.',
      h1: '65세의 도전',
      lead: '1986년 영업사원으로 시작해 LG에서 18년, 두 번의 창업, 28건의 특허, 그리고 2025년 한 번의 엑싯을 지나왔습니다. 지금은 과거 열다섯 명이 하던 일을 혼자 AI와 함께 돌립니다.',
      timelineH: '경력',
      timeline: [
        { when: '2025 ~', b: 'CWD (India, BSE 상장)', s: 'Senior EVP, Advisor / Mumbai. 게이밍 디비전 자문' },
        { when: '2013 ~ 2025', b: 'AKSys / SHAKS', s: 'CEO, 단독 창업. 특허 28건, 5개국 이상 OEM, 2025년 엑싯' },
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
        ['CEO / C-Level', FACTS.ceoYears + '년, 창업 2회 (1회 엑싯)'],
        ['특허', FACTS.patents + '건 (등록 13, 출원 15)'],
        ['정부 R&D', '약 ' + FACTS.govRnd + '건, 총 ' + FACTS.govRndAmount + '십억원 (Project Lead)'],
        ['EU R&D', FACTS.euRnd + '건 (Eureka, Horizon)'],
        ['글로벌 파트너십', 'Qualcomm, Google, Deutsche Telekom, TIM'],
        ['해외 주재', FACTS.overseasYears + '년 (이탈리아 9년, 중국 4년)'],
      ],
      linksH: '연결',
    },

    advisory: {
      title: '자문',
      desc: 'AI 오케스트레이션 도입, 마케팅 영업 운영 자동화 설계, MVP 검증. 프랙셔널 자문과 프로젝트 단위 계약.',
      h1: '자문',
      lead: '도구 사용법을 가르치지 않습니다. 사람이 하던 일 중에서 무엇을 기계에 넘기고 무엇을 남길지, 경영자 관점에서 함께 정합니다.',
      offers: [
        {
          h: '프랙셔널 자문',
          p: '월 단위로 붙어 조직의 AI 전환을 함께 설계합니다.',
          li: ['현행 업무 진단과 자동화 우선순위 도출', '파이프라인 설계와 도입 로드맵', '내부 인력 이양 계획'],
        },
        {
          h: '프로젝트 단위',
          p: '범위가 정해진 과제를 끝까지 완주합니다.',
          li: ['마케팅 영업 운영 자동화 1개 라인 구축', 'MVP 데모 제작과 검증', '해외 파트너십과 현지화 실행'],
        },
      ],
      areasH: '다루는 영역',
      areas: [
        ['AI 오케스트레이션', '에이전트 조직 설계, 워크플로우 자동화, 사람과 기계의 역할 분담'],
        ['사업개발', '해외 파트너십, OEM, 기술 수출, 크로스보더 JV'],
        ['정부 R&D', '과제 기획, 평가 대응, 수행과 정산까지 전 주기'],
        ['하드웨어 제품화', '요구사항 정의, 제조 관리, 글로벌 인증'],
      ],
      contactH: '문의',
      contactP: '어떤 문제를 풀고 싶은지 두세 문장이면 충분합니다. 맞지 않는 일이면 그렇다고 말씀드립니다.',
      contactBtn: '메일 보내기',
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
      advisory: 'Advisory',
    },
    foot: {
      tagline: 'Senior AI Orchestration Advisor',
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
      ctaGhost: 'Start a conversation',
      stats: [
        { n: FACTS.ictYears, l: 'Years in global ICT' },
        { n: FACTS.ceoYears, l: 'Years as CEO / C-level' },
        { n: FACTS.patents, l: 'Patents filed and granted' },
        { n: FACTS.govRnd, l: 'Government R&D projects led' },
      ],
      sections: [
        { key: 'then-now', h: 'Then vs Now', p: 'How an organization of ten to fifteen specialists became one person and a pipeline, set against the records from that time.' },
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
      desc: 'The Claude Code harness, agent structure and automation pipelines currently in operation.',
      h1: 'The System',
      lead: 'Not claims, but the machine. What follows is running right now. When it changes, this page changes.',
      pipelineH: 'Content pipeline',
      pipelineP: 'Material is mined from daily work and published in rotating formats. What stays human is judgment and approval.',
      nodes: [
        { b: 'KJ', s: 'Judgment, approval, the operator viewpoint' },
        { b: 'case-capture', s: 'Daily material mining and queue' },
        { b: 'case-deep', s: 'Full-length case study' },
        { b: 'case-rotate', s: 'Rotating short formats' },
        { b: 'ceo-eli5', s: 'Plain-language gate for non-technical readers' },
      ],
      stackH: 'Operating stack',
      stackRows: [
        ['Orchestration', 'Claude Code harness with a subagent structure'],
        ['Workflow automation', 'n8n'],
        ['Document source of truth', 'Google Drive and Obsidian'],
        ['Code', 'Public GitHub repositories'],
        ['Publishing', 'Static site, built and deployed automatically'],
      ],
      note: 'This site was built with Claude Code as well, and its source is public on GitHub.',
    },

    'then-now': {
      title: 'Then vs Now',
      desc: 'What ten to fifteen people used to do, and how it became one person and a pipeline.',
      h1: 'Then vs Now',
      lead: 'Nothing here is invented. The comparison is drawn from the organizational records of the time. Most operators recognize their own company in the left-hand column.',
      beforeEra: 'Then',
      beforeCount: 'Five to six in marketing and sales',
      beforeSub: 'Specialists on staff, ten to fifteen in total',
      people: ['Brand marketing', 'Performance ads', 'Content production', 'Domestic sales', 'International sales', 'Sales support'],
      afterEra: 'Now',
      afterCount: 'One person and a pipeline',
      afterSub: 'Claude Code orchestration',
      caption: 'On the left, functions divided among people. On the right, the pipeline that performs them today. The people did not vanish; what remains of the role is judgment.',
      pendingH: 'Archive research in progress',
      pendingP: 'The original organization charts and role assignments are being recovered from an internal archive. This page will be filled from those documents once the research is complete.',
    },

    about: {
      title: 'About',
      desc: 'From a sales job in 1986 through 18 years at LG, two foundings, 28 patents and one exit. And an AI transition at 65.',
      h1: 'A challenge at 65',
      lead: 'I started as a salesman in 1986, spent 18 years at LG, founded two companies, filed 28 patents, and exited one business in 2025. Today I run alone, with AI, what once took fifteen people.',
      timelineH: 'Career',
      timeline: [
        { when: '2025 -', b: 'CWD (India, BSE listed)', s: 'Senior EVP, Advisor / Mumbai. Gaming division advisory' },
        { when: '2013 - 2025', b: 'AKSys / SHAKS', s: 'CEO, solo founder. 28 patents, OEM across 5+ countries, exited 2025' },
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
        ['CEO / C-level', FACTS.ceoYears + ' years, two companies founded, one exited'],
        ['Patents', FACTS.patents + ' (13 granted, 15 filed)'],
        ['Government R&D', 'About ' + FACTS.govRnd + ' projects, KRW ' + FACTS.govRndAmount + 'B as project lead'],
        ['EU R&D', FACTS.euRnd + ' projects (Eureka, Horizon)'],
        ['Global partnerships', 'Qualcomm, Google, Deutsche Telekom, TIM'],
        ['Overseas assignments', FACTS.overseasYears + ' years (Italy 9, China 4)'],
      ],
      linksH: 'Elsewhere',
    },

    advisory: {
      title: 'Advisory',
      desc: 'AI orchestration adoption, automation design for marketing, sales and operations, MVP validation. Fractional and project-based engagements.',
      h1: 'Advisory',
      lead: 'I do not teach tools. We decide together, from the operator seat, which of the work people do now should move to machines and which should not.',
      offers: [
        {
          h: 'Fractional advisory',
          p: 'A monthly engagement designing the AI transition alongside your team.',
          li: ['Audit of current work and an automation priority order', 'Pipeline design and an adoption roadmap', 'A handover plan to your own people'],
        },
        {
          h: 'Project based',
          p: 'A scoped assignment, carried through to completion.',
          li: ['One automation line built for marketing, sales or operations', 'MVP demo built and validated', 'International partnership and localization execution'],
        },
      ],
      areasH: 'Areas',
      areas: [
        ['AI orchestration', 'Agent structure, workflow automation, dividing work between people and machines'],
        ['Business development', 'International partnerships, OEM, technology export, cross-border JV'],
        ['Government R&D', 'Proposal, evaluation, execution and closure across the full cycle'],
        ['Hardware productization', 'Requirements definition, manufacturing management, global certification'],
      ],
      contactH: 'Get in touch',
      contactP: 'Two or three sentences about the problem you want solved is enough. If it is not a fit, I will say so.',
      contactBtn: 'Send an email',
    },
  },
};
