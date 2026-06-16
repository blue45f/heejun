// Auto-generated resume data file from parse-resume-to-json.mjs
export interface Metric {
  label: string
  value: string
}

export interface ContactInfo {
  type: string
  label: string
  href?: string
}

export interface Competency {
  category: string
  bullets: string[]
}

export interface Achievement {
  title: string
  desc: string
}

export interface Experience {
  company: string
  period: string
  tasks: string[]
  achievements: Achievement[]
  techStack: string
}

export interface Education {
  title: string
  content: string
}

export interface ActionLink {
  href: string
  text: string
}

export interface ProjectCard {
  title: string
  period: string
  bullets: string[]
  techStack?: string
  infraConfig?: string
  publishInfo?: string
  links: ActionLink[]
  image: string | null
}

export interface LeadershipItem {
  title: string
  bullets: string[]
}

export interface PerformanceNumber {
  title: string
  content: string
}

export interface TechStackCategory {
  category: string
  tags: string[]
}

export interface AttachedDocLink {
  category: string
  links: ActionLink[]
}

export interface GuideBookItem {
  id: string
  name: string
  filename: string
  path: string
}

export interface ResumeData {
  personalInfo: {
    name: string
    englishName: string
    jobTitle: string
    title: string
    experienceYears: number
    metrics: Metric[]
    contact: ContactInfo[]
  }
  competencies: Competency[]
  experiences: Experience[]
  education: Education[]
  mainProjects: ProjectCard[]
  personalProjects: ProjectCard[]
  leadership: LeadershipItem[]
  performanceNumbers: PerformanceNumber[]
  techStack: TechStackCategory[]
  activities: string[]
  selfIntroduction: string
  attachedDocs: AttachedDocLink[]
  guides: GuideBookItem[]
}

export const resumeData: ResumeData = {
  personalInfo: {
    name: '김희준',
    englishName: 'Heejun Kim',
    jobTitle: 'Senior Frontend Engineer',
    title: '주문·결제, 장바구니, 웹 표준화를 제품 임팩트로 연결하는 프론트엔드 시니어',
    experienceYears: 18,
    metrics: [
      {
        label: '웹 프론트엔드 구축과 운영 경험',
        value: '18년',
      },
      {
        label: '2021-2025 주요 프로젝트 완수',
        value: '30+',
      },
      {
        label: '레거시 전환 후 번들 크기 감소',
        value: '70%',
      },
      {
        label: '배송 경로 이상 VOC 감소',
        value: '69%',
      },
    ],
    contact: [
      {
        type: 'email',
        label: 'blue45f@gmail.com',
        href: 'mailto:blue45f@gmail.com',
      },
      {
        type: 'phone',
        label: '010-3873-4197',
        href: 'tel:+821038734197',
      },
      {
        type: 'github',
        label: 'github.com/blue45f',
        href: 'https://github.com/blue45f',
      },
      {
        type: 'study',
        label: 'develuv/study',
        href: 'https://github.com/develuv/study',
      },
      {
        type: 'location',
        label: '1981년 · 서울 송파구 방이동',
      },
    ],
  },
  competencies: [
    {
      category: '기술 전문성',
      bullets: [
        '18년 경력의 웹프론트엔드 개발 전문가로 대규모 서비스 구축 및 운영 경험',
        '보유',
        'React, TypeScript, React Query + Zustand 기반 모던 프론트엔드 아키텍처',
        '설계 및 구현',
        '레거시 → React 기반 모던 스택 마이그레이션으로',
        'JavaScript 번들 크기 70% 감소, 성능 30% 개선',
        '30개 이상의 주요 프로젝트 완수 (2021-2025), 개발 생산성 30% 이상 향상',
        '달성',
        '서버리스 아키텍처(S3 + CloudFront) 도입으로 시스템 안정성 및 성능',
        '개선',
        'vitest 기반 테스팅 인프라 최초 구축 및 품질 문화 정착 (Jest/Vitest/Cypress)',
      ],
    },
    {
      category: '리더십 & 조직 기여',
      bullets: [
        '전사 웹표준 개발환경 RFC 핵심 참여자 (2025.08 - 현재)',
        '팀 표준 개발 환경 구축 TF장으로 스캐폴딩 및 개발 패턴 표준화 주도',
        'RFC 프로세스 주도 및 기술 의사결정, 코드 리뷰 문화 정착 및 프로세스 개선',
        '테크 밋업 연사 (CloudFront 장애 대응 및 인프라 지식 공유)',
        '다수의 신입/경력 개발자 기술 면접 참여',
        '사내 디자인 시스템 TF 참여 및 기술 출판물 검수 활동',
        '커머스 FE 개발자 온보딩 멘토링 및 기술 지원',
        '크로스 기능팀 협업 (PM, Design, Backend, QA, Mobile)',
      ],
    },
    {
      category: '비즈니스 임팩트',
      bullets: [
        '대규모 커머스 앱 핵심 서비스(장바구니, 주문·결제) 개편으로 사용자 경험 개선',
        '배송 경로 이상 신고 기능으로 VOC 69% 감소 (339건→105건), 고객센터',
        '리소스 30% 절감',
        '국내 최초 애플페이 결제 연동으로 결제 편의성 혁신 (2023.01 성공적 배포)',
        'VFD 2.0 배포 당일 장애 5시간 이내 원인 파악 및 해결',
        '고객서비스 개선 프로젝트 96% TC 실행률, 90% 패스율 달성',
        '스마일게이트 STOVE 플랫폼 글로벌 런칭 성공적 완수',
        '커머스 서비스 옵션 안내 강화로 특화 배송 서비스 활성화 기여',
        '장애 포카요케 2건 구축으로 배포 프로세스 표준화',
      ],
    },
  ],
  experiences: [
    {
      company: '자비스앤빌런즈 | Tax그룹 FE 챕터 chapter lead',
      period: '2025.12.08 - 2026.02.24 (약 3개월)',
      tasks: ['삼쩜삼 서비스 운영 및 웹프론트엔드 고도화', '삼쩜삼 후결제 개편 프로젝트 참여'],
      achievements: [],
      techStack: '',
    },
    {
      company: '우아한형제들 | 주문웹프론트개발팀',
      period: '2021.01.25 - 2025.12.05 (4년 10개월)',
      tasks: [
        '주문·결제 및 장바구니 서비스 핵심 아키텍처 설계 및 구현',
        '대규모 커머스 앱 내 장바구니, 주문·결제, 주문내역 등 핵심 웹뷰 서비스 개발 총괄',
        '레거시 아키텍처를 React 기반 모던 스택으로 전환 (Redux/Mobx → React Query)',
        '전사 표준 개발 환경 정립 TF 핵심 멤버 (React Query + Zustand + TypeScript)',
        'vitest 기반 테스팅 인프라 최초 구축 및 품질 문화 정착',
        '전사 웹표준 개발환경 RFC 핵심 참여자',
        '테크 밋업 연사 및 내부 교육 세션 리더',
        '커머스 FE 개발자 온보딩 및 기술 멘토링',
      ],
      achievements: [
        {
          title: '아키텍처 통합',
          desc: '레거시 → React 마이그레이션으로 JavaScript 번들 크기 70%\n          감소, 성능 30% 개선',
        },
        {
          title: '웹 장바구니 신규 구축',
          desc: 'S3 + CloudFront 기반 서버리스 아키텍처로 안정성\n          향상',
        },
        {
          title: '성능 최적화',
          desc: '평균 렌더링 시간 1초 → 700ms 개선 (30% 성능 향상)',
        },
        {
          title: '개발 표준화',
          desc: 'React Query + Zustand + TypeScript 코어 스택 확정 및 팀 전체\n          적용',
        },
        {
          title: '테스팅 인프라',
          desc: 'vitest 기반 테스팅 환경 최초 구축, 테스트 커버리지 0% →\n          16% 달성',
        },
        {
          title: '애플페이 연동',
          desc: '국내 최초 애플페이 결제 연동 성공적 오픈 (기술 검토 및\n          설계 주도)',
        },
        {
          title: 'VFD 2.0 즉시할인 대개편',
          desc: '할인 계산 로직 서버 이관, 할인 영역 6종→4종\n          간소화',
        },
        {
          title: '공동 주문 서비스',
          desc: '실시간 다중 사용자 장바구니 동기화 아키텍처 설계 및\n          구현',
        },
        {
          title: '배송 경로 이상 신고 기능',
          desc: 'VOC 69% 감소 (339건→105건), 고객센터 리소스 30%\n          절감',
        },
        {
          title: '장애 포카요케',
          desc: '배포 모니터링 자동화 및 스테이징/운영 인프라 구조 통일',
        },
        {
          title: '점진적 배포 환경 구축',
          desc: '장바구니 개편 시 배포 리스크 최소화 및 안정성 확보',
        },
        {
          title: '운영 안정화',
          desc: '2024년 상반기 VOC 대응 및 운영 과제 50건+ 처리',
        },
      ],
      techStack: '',
    },
    {
      company: '스마일게이트스토브 | 플랫폼개발본부 프론트기술담당 웹서비스개발4팀 팀장(차장)',
      period: '2016.10.25 - 2020.12.31 (4년 2개월)',
      tasks: [
        'STOVE 게임 플랫폼(www.onstove.com) 신규 개발 및 운영 총괄',
        '10명 규모 개발팀 리딩 및 프로젝트 관리',
        '글로벌 서비스 런칭 및 모바일 대응',
        '플랫폼개발본부 프론트기술담당 웹서비스개발4팀 팀장 역임',
      ],
      achievements: [
        {
          title: '글로벌 플랫폼 구축',
          desc: '멀티 디바이스 지원 원소스 멀티유즈 아키텍처 설계',
        },
        {
          title: 'SEO 최적화',
          desc: 'Headless Browser 기반 Pre-rendering 시스템 구축으로 검색엔진\n          노출 개선',
        },
        {
          title: '개발 생산성',
          desc: 'Vue.js + TypeScript + RxJS 기반 프레임워크 Seed 개발 및\n          표준화',
        },
        {
          title: '플랫폼 확장',
          desc: 'TimeLine 개인화 소셜 플랫폼 및 창작 플랫폼(툰스푼, 더\n          뮤지션) 개발',
        },
      ],
      techStack: 'Vue.js, TypeScript, RxJS, Webpack, Node.js, SEO',
    },
    {
      company: '엔씨소프트 | 모바일퍼블리싱플랫폼실 팀원',
      period: '2016.08.25 - 2016.10.24 (2개월)',
      tasks: [
        '블레이드앤소울 모바일 가이드앱 개발',
        '웹뷰 기반 웹앱 개발',
        '프레임워크 미사용, ES6 기반 자체 성능 경량화',
      ],
      achievements: [],
      techStack: '',
    },
    {
      company: '카카오 | 메일파트 사원',
      period: '2014.09.16 - 2015.11.30 (1년 3개월)',
      tasks: [
        '다음 메일 PC 메인 웹프론트엔드 개발자로 근무',
        '모바일 웹메일, 쪽지, 캘린더 유지보수 및 개발',
        '메일 보안 향상을 위한 XSS 필터 자바스크립트 독자 개발',
        '화면단 및 자바 미들웨어 담당',
        '기술 스택: JavaScript, HTML5, CSS3, Java',
      ],
      achievements: [],
      techStack: 'JavaScript, HTML5, CSS3, Java',
    },
    {
      company: '미래아이엔텍 | SI 사업부 대리',
      period: '2012.06.21 - 2012.12.31 (약 6개월)',
      tasks: [
        'LG CNS 금융플랫폼팀 소속으로 SmartUI(웹접근성 준수 JS UI 프레임워크) 개발 및 프로젝트',
        '수행',
        'LIG 투자증권 웹접근성 개선 프로젝트 - 프레임워크 아키텍처 업무 수행',
        '교보생명 차세대 프로젝트 - UI 프레임워크 지원 업무 수행',
      ],
      achievements: [],
      techStack: '시스템설계',
    },
    {
      company: '솔루피아 | 계약직',
      period: '2012.03.21 - 2012.06.20 (약 3개월)',
      tasks: [
        '한국 야쿠르트 모바일 CRM 개발',
        '삼성 샘프 프레임워크 기반 하이브리드 앱 프론트 단 설계 및 구현',
        '하이브리드앱 최초 NFC 결제시스템 구축',
      ],
      achievements: [],
      techStack: '',
    },
    {
      company: '네트빌 | 사업수행실 대리',
      period: '2007.01.01 - 2012.03.09 (5년 2개월)',
      tasks: ['웹, 모바일 개발 및 운영 (16건 프로젝트 수행)'],
      achievements: [],
      techStack: '',
    },
  ],
  education: [
    {
      title: '학력',
      content:
        '• 대진대학교 공과대학 컴퓨터공학과 졸업 (1999.03 - 2007.02.23) | 컴퓨터공학/공학사 | 학점\n          3.4/4.5\n\n          • 서울중앙고등학교 졸업 (1996.03.02 - 1999.02.10) | 인문계',
    },
    {
      title: '병역사항',
      content: '• 군필 | 육군 병장 만기전역 (2001.10.16 - 2003.12.08)',
    },
    {
      title: '자격증',
      content:
        '• 정보처리기사 | 취득일: 2006.08.21 | 자격번호: 06202230369Q | 발행처:\n          한국산업인력공단 | 등급: 기사\n\n          • SCJP (Sun Certified Programmer for the Java Platform, SE 5.0) | 취득일:\n          2006.09.30 | 자격번호: 24060391SCPJSE5P | 발행처: Sun Microsystems\n\n          • MOS (Microsoft Office Specialist - Microsoft PowerPoint version 2002) |\n          취득일: 2005.06.06 | 자격번호: BUP4-kTSk | 발행처: Microsoft',
    },
  ],
  mainProjects: [
    {
      title: '장바구니 및 주문·결제 프로세스 통합 프로젝트',
      period: '우아한형제들 | 2025.10 - 2026.01 | Frontend Lead',
      bullets: [
        '4단계 주문 플로우를 3단계로 단축 (장바구니와 주문·결제 프로세스 통합)',
        '장바구니 기능을 컴포넌트 단위로 분리하여 주문·결제 플랫폼에 통합',
        '최적 쿠폰 및 커머스 서비스 옵션 자동 선택으로 사용자 액션 최소화',
        'Module Federation 도입 검토 및 아키텍처 의사결정',
        '주문 완료 전환율 증가, 디바이스당 매출 증가, 평균 주문 시간 및 클릭 수 감소 기대',
      ],
      techStack: 'React, TypeScript, React Query, Zustand, Module Federation (MFE)',
      infraConfig: 'Webview Bridge, GitLab CI/CD, AWS CloudFront CDN',
      publishInfo: '',
      links: [],
      image: null,
    },
    {
      title: 'vitest 기반 테스팅 인프라 구축',
      period: '우아한형제들 | 2025.08 | Technical Lead',
      bullets: [
        '주문·결제 웹프론트팀 최초의 체계적인 vitest 기반 테스팅 환경 구축',
        '최소 20% 코드 커버리지 확보 목표, 약 16% 기준 커버리지 달성',
        '테스트 코드 작성 가이드 및 베스트 프랙티스 문서화',
        '팀 내 다른 도메인으로 테스팅 문화 확산',
      ],
      techStack: 'Vitest, Jest, Cypress, React Testing Library, MSW (Mock Service Worker)',
      infraConfig: 'GitLab CI Test Automation Gate (Pre-push & PR pipeline checks)',
      publishInfo: '',
      links: [],
      image: null,
    },
    {
      title: '장애 포카요케 구축',
      period: '우아한형제들 | 2025.08 | Infrastructure',
      bullets: [
        '배포 모니터링 자동화 구현, 1시간 후 자동 배포 완료 처리 로직 추가',
        '스테이징/운영 인프라 구조 완전 통일 및 환경별 배포/롤백 절차 표준화',
        '메인 커머스 장바구니, 주문·결제 플랫폼, 주문 내역 플랫폼에 적용',
        '환경 불일치로 인한 장애 사전 방지 체계 구축',
      ],
      techStack: 'Bash Script, Sentry, GitLab CI/CD, AWS CloudWatch Alerts',
      infraConfig: '',
      publishInfo: '',
      links: [],
      image: null,
    },
    {
      title: 'VFD 2.0 즉시할인 시스템 대개편',
      period: '우아한형제들 | 2025.05 - 2025.07 | Frontend Developer',
      bullets: [
        '할인 계산 로직 프론트 → 서버 이관으로 데이터 일관성 확보',
        '할인 영역 6종 → 4종 간소화로 사용자 이해도 향상',
        '롤링 넘버 인터랙션 개발로 UX 개선',
        '배포 당일 장애 5시간 이내 원인 파악 및 해결 (2,757명 고객 보상 처리)',
      ],
      techStack: 'React, TypeScript, CSS Rolling Number Animation, Server Pricing Schema',
      infraConfig: 'GitLab CI/CD, Incident Response Logging System',
      publishInfo: '',
      links: [],
      image: null,
    },
    {
      title: '서비스 도메인 통합 프로젝트',
      period: '우아한형제들 | 2024.12 - 2025.02',
      bullets: [
        '메인 서비스와 현장 물류 서비스를 단일 FOOD 서비스 타입으로 통합',
        '장바구니, 주문·결제, 주문내역, 공동 주문 서비스 온보딩, 문의하기 화면에서 서비스 타입',
        'FOOD 구현',
        '2025년 2월 17일 FD 론칭 성공',
      ],
      techStack: '',
      infraConfig: '',
      publishInfo: '',
      links: [],
      image: null,
    },
    {
      title: '주문내역 플랫폼 프로젝트',
      period: '우아한형제들 | 2024',
      bullets: [
        '초기 아키텍처 설계 및 구축 리드',
        '개발 가이드 문서화 및 커머스 FE 개발자 온보딩 지원',
        '비회원 주문내역 처리 및 레거시 버전 대응 설계',
        '점진적 배포 전략 수립 및 구현',
      ],
      techStack: '',
      infraConfig: '',
      publishInfo: '',
      links: [],
      image: null,
    },
    {
      title: '공통 대기열 서비스 구축',
      period: '우아한형제들 | 2024',
      bullets: [
        '주문·결제 공통 대기열 서비스 아키텍처 설계',
        'FE 지면 개발 및 사용자 경험 최적화',
        '대용량 트래픽 처리를 위한 시스템 안정성 확보',
      ],
      techStack: '',
      infraConfig: '',
      publishInfo: '',
      links: [],
      image: null,
    },
    {
      title: '배송 경로 이상 신고 기능',
      period: '우아한형제들 | 2024',
      bullets: [
        '문의하기 내 프리셋 신고 기능 개발',
        'VOC 69% 감소 달성 (월평균 339건 → 105건)',
        '고객센터 리소스 30% 절감 효과',
        '상담사 업무 효율성 대폭 개선',
      ],
      techStack: '',
      infraConfig: '',
      publishInfo: '',
      links: [],
      image: null,
    },
    {
      title: '커머스 주문 고객서비스 경험 개선',
      period: '우아한형제들 | 2024.03 - 2024.06',
      bullets: [
        '문의하기 프리셋 기능, 주문 취소 요청 기능, 실험 플랫폼 연동',
        '채팅 운영시간 검증 제거, 웹 로깅 구현',
        '96% TC 실행률에 90% 패스율 달성',
      ],
      techStack: '',
      infraConfig: '',
      publishInfo: '',
      links: [],
      image: null,
    },
    {
      title: '푸드 웹지면 개편 - 장바구니 플랫폼 마이그레이션',
      period: '우아한형제들 | 2023.08 - 2024.01 | Lead Developer',
      bullets: [
        '레거시 장바구니를 표준 개발 환경으로 마이그레이션',
        'React Query 패턴으로 API 레이어 전환, 배송비 서비스 통합',
        'AWS S3 & CloudFront 인프라, Simple Deploy (서버리스 배포 도구) 서버리스 배포, GitLab',
        'CI/CD 전체 인프라 스택 신규 구축',
        '인수테스트 3회 완료, 웹 접근성 대응, 2024년 1월 점진적 배포 완료',
      ],
      techStack: 'React, TypeScript, React Query, Zustand, Web Accessibility (WCAG/a11y)',
      infraConfig: '',
      publishInfo: '',
      links: [],
      image: null,
    },
    {
      title: '표준 개발 환경 개선 TF',
      period: '우아한형제들 | 2023.05 - 2023.12 | TF장 & Technical Lead',
      bullets: [
        '표준 기술 스택 정의: React Query + Zustand + React 코어 스택 확정',
        '개발 환경 현대화: Node 버전 업그레이드, Vite 빌드 시스템 도입',
        '테스팅 인프라: Cypress E2E, Jest/Vitest 단위 테스팅 표준 정립',
        '아키텍처 레이어 설계 문서화, 보일러플레이트 리포지토리 생성',
        '팀 전체의 개발 표준 정립으로 코드 품질, 개발 속도, 온보딩 효율성 대폭 향상',
      ],
      techStack: 'React, React Query, Zustand, Vite, Node Upgrade, Jest, Vitest, Cypress',
      infraConfig: 'Boilerplate Scaffolding Registry, Monorepo Template Structure',
      publishInfo: '',
      links: [],
      image: null,
    },
    {
      title: '커머스 서비스 옵션 안내 강화 프로젝트',
      period: '우아한형제들 | 2023.05 - 2023.07',
      bullets: [
        '특화 배송 서비스 활성화를 위한 Phase 1-3 단계별 커머스 서비스 옵션 안내 강화',
        '긍정적 언어 채택, 커머스 서비스 옵션 설명 업데이트, 토스트 팝업 메시지 개선',
        '사용자 선택률 개선으로 비즈니스 임팩트 창출',
      ],
      techStack: '',
      infraConfig: '',
      publishInfo: '',
      links: [],
      image: null,
    },
    {
      title: '장바구니 모아보기',
      period: '우아한형제들 | 2023.05 - 2023.07',
      bullets: [
        '여러 음식점의 장바구니를 한 곳에서 관리하는 기능 개발',
        '네이티브 헤더 및 탭 통합, JavaScript 인터페이스를 통한 동기화',
        '빈 장바구니 상태 디자인 변경',
      ],
      techStack: '',
      infraConfig: '',
      publishInfo: '',
      links: [],
      image: null,
    },
    {
      title: '애플페이 결제 통합',
      period: '우아한형제들 | 2022.08 - 2023.01 | Technical Lead',
      bullets: [
        '국내 최초 애플페이 결제 수단 연동 기술 검토 및 설계',
        '분리된 페이지 간 안전한 토큰 전달 메커니즘 솔루션 설계',
        '애플 담당자 미팅 참석 및 기술 협의, 결제 플랫폼팀 조율',
        '2023년 1월 10일 성공적 배포, iOS 사용자 결제 편의성 대폭 향상',
      ],
      techStack: 'TypeScript, Secure Token Web Bridge, Multi-WebView Communication',
      infraConfig: '',
      publishInfo: '',
      links: [],
      image: null,
    },
    {
      title: '디자인 시스템 TF',
      period: '우아한형제들 | 2022.08 - 2022.12',
      bullets: [
        '재사용 가능한 UI 컴포넌트 라이브러리 개발',
        'Modal/Dialog, Checkbox 타입 다이얼로그 컴포넌트 구현',
        'Storybook을 이용한 컴포넌트 문서화 및 Figma 통합',
      ],
      techStack: '',
      infraConfig: '',
      publishInfo: '',
      links: [],
      image: null,
    },
    {
      title: '공동 주문 서비스 Phase 1',
      period: '우아한형제들 | 2022.06 - 2022.10 | Technical Architect',
      bullets: [
        '실시간 다중 사용자 장바구니 동기화 아키텍처 설계 (폴링 → SSE 전환 계획)',
        '주최자/참여자 닉네임 설정, 공유 장바구니, 멤버 구분 UI 구현',
        '네이티브 앱과의 WebView 연동 및 앱 버전 체크 브릿지 페이지 개발',
        '그룹 주문 시나리오 지원으로 신규 사용자 확보 및 주문 금액 증대 기여',
      ],
      techStack: 'TypeScript, SSE (Server-Sent Events), WebView Javascript Bridge',
      infraConfig: 'Real-Time SSE Gateway, Native App Version Verification Router',
      publishInfo: '',
      links: [],
      image: null,
    },
    {
      title: '장바구니 개편 (서버 사이드 전환)',
      period: '우아한형제들 | 2021.09 - 2021.12 | Frontend Developer',
      bullets: [
        '클라이언트 → 서버 기반 장바구니 아키텍처 전환',
        '멀티 디바이스 장바구니 동기화 구현',
        '신규 프론트엔드 아키텍처 적용 및 인터랙션/데이터 처리 플로우 설계',
        '성능 테스트 및 점진적 배포 완료',
      ],
      techStack: '',
      infraConfig: '',
      publishInfo: '',
      links: [],
      image: null,
    },
    {
      title: '웹프론트엔드 아키텍처 통합',
      period: '우아한형제들 | 2021.04 - 2021.09 | Technical Lead',
      bullets: [
        '레거시 자체 프레임워크에서 React 기반 SPA로 전환',
        '상태 관리 현대화: Redux/Mobx → React Query로 비동기 패턴 변경',
        'API, Service, Store, Component 레이어 명확히 분리',
        'JavaScript 번들 크기 70% 감소, 평균 성능 30% 이상 개선, 개발 생산성 30% 이상',
        '향상',
        '입사 첫해에 완수하여 향후 5년간 모든 프론트엔드 개발의 기반이 됨',
      ],
      techStack: 'React, TypeScript, React Query, Zustand, MobX, Redux, Webpack',
      infraConfig: 'Static Asset CDN Hosting, GitLab CI/CD Pipeline',
      publishInfo: '',
      links: [],
      image: null,
    },
    {
      title: 'STOVE 글로벌 게임 플랫폼 개발',
      period: '스마일게이트스토브 | 2016 - 2020',
      bullets: [
        'Vue.js 기반 SPA 라이브러리 개발',
        '멀티 디바이스 대응 및 SEO 최적화 (Headless Browser Pre-rendering)',
        '입점사 제공 라이브러리(GNB & Footer) 개발',
        'TimeLine 개인화 소셜 플랫폼 및 창작 플랫폼(툰스푼, 더 뮤지션) 개발',
      ],
      techStack: 'Vue.js, TypeScript, RxJS, Webpack, Node.js',
      infraConfig: 'Headless Browser Pre-rendering System (SEO), Global Multi-Device CDN',
      publishInfo: '',
      links: [],
      image: null,
    },
    {
      title: 'SmartUI 웹접근성 프레임워크 개발',
      period: '미래아이엔텍 | 2012.05 - 2014.02',
      bullets: [
        '웹접근성 준수 JavaScript UI 프레임워크 개발',
        'LG CNS 금융플랫폼 소속 프로젝트 지원 (교보생명, LIG 투자증권)',
        'LIG 투자증권 웹접근성 인증마크 획득 기여',
        '교보생명 차세대 프로젝트 성공적 오픈',
        'n스크린 지원(PC, 모바일, 태블릿) 반응형 UI 구현',
      ],
      techStack: 'JavaScript (ES5), CSS, HTML4/5 Semantic Markup, Responsive Grid Engine',
      infraConfig: 'n-Screen cross-browser compilation & layout engines',
      publishInfo: '',
      links: [],
      image: null,
    },
  ],
  personalProjects: [
    {
      title: 'web-config-preset · 공유 Config 패키지 발행 & 전 저장소 일관성 정렬',
      period: 'Personal Project | Public repo: blue45f/web-config-preset | npm: @heejun/*',
      bullets: [
        '여러 저장소가 공유하는 프론트엔드 표준 설정을 npm에 발행한 모노레포입니다. 한 곳에서',
        '관리해 전 프로젝트의 ESLint·Prettier·TypeScript·Tailwind·Vite 설정 드리프트를',
        '제거합니다.',
        '발행 패키지: @heejun/eslint-config(ESLint flat config —',
        'typescript-eslint + React 19 + React Compiler + 계층 경계 eslint-plugin-boundaries),',
        '@heejun/prettier-config, @heejun/typescript-config(base/react/node),',
        '@heejun/tailwind-config(Tailwind v4 CSS-first @theme), @heejun/vite-config(Vite 8 +',
        'React Compiler).',
        '배포 파이프라인: pnpm workspace 모노레포 + Changesets로 패키지별',
        '버전 관리·발행, tsup(ESM+d.ts) 빌드, 루트 flat config가 프리셋을 self-dogfooding 하여',
        '표준을 스스로 검증합니다.',
        '전 저장소 일관성 정렬: 발행한 프리셋을 사이드 프로젝트 전반에',
        '적용하고, 검증(class-validator → zod·nestjs-zod), HTTP 클라이언트(axios·fetch → ky),',
        '포맷·린트(공유 Prettier·ESLint), 폴더 아키텍처(domains/ 계층 +',
        'eslint-plugin-boundaries 경계 강제)까지 단일 표준으로 통일했습니다. 저장소별 verify',
        '게이트(타입체크·테스트·빌드 통과)로 안전성을 확인한 뒤 스택형 PR로 단계적으로 반영해,',
        '설정·라이브러리·아키텍처 드리프트를 제거했습니다.',
      ],
      techStack: '',
      infraConfig: '',
      publishInfo: '',
      links: [
        { href: 'https://www.npmjs.com/package/@heejun/eslint-config', text: 'npm' },
        { href: 'https://github.com/blue45f/web-config-preset', text: 'GitHub' },
      ],
      image: null,
    },
    {
      title: 'PromptMarket · 프롬프트·스킬·에이전트 마켓플레이스',
      period: 'Personal Project | Public repo: blue45f/PromptMarket',
      bullets: [
        'AI 모델용 프롬프트, Custom Skill, MCP 서버 및 Agent 자산을 카탈로그화한',
        '마켓플레이스입니다.',
        '아키텍처 & 설계 원칙: pnpm workspaces 기반 모노레포 구조로',
        'client(React 19 SPA)와 server(NestJS 11 monolith)를 분리하고, shared 패키지로 Zod',
        '스키마 및 공통 타입을 공유합니다. React Router 7 Data Router 객체 라우팅과 route-level',
        'dynamic lazy loading으로 로딩 지연을 최소화했습니다.',
        '상태 관리: 비동기 서버 상태는 TanStack Query 5(React Query)를',
        '사용해 SWR 패턴 및 캐싱을 적용했으며, 클라이언트 전역 상태(인증 토큰, 다국어, 테마)는',
        'Zustand 5를 사용해 가볍게 분담했습니다.',
        '데이터 레이어: Prisma 7 ORM과 better-sqlite3 드라이버 어댑터를',
        '탑재하여 SQL 수준의 타입 안정성을 확보함과 동시에 SQLite 파일 기반의 가벼운 persistent',
        '스택을 운용합니다.',
      ],
      techStack: '',
      infraConfig: '',
      publishInfo: '',
      links: [
        { href: 'https://promptmarket-web.vercel.app', text: 'Live Demo' },
        { href: 'https://github.com/blue45f/PromptMarket', text: 'GitHub' },
      ],
      image: '/project-snapshots/promptmarket.jpg',
    },
    {
      title: 'ProtoLive · 바이브코딩 웹앱 공유 플랫폼',
      period: 'Personal Project | Public repo: blue45f/proto-live',
      bullets: [
        'AI 코딩 도구를 통해 생성된 프로토타입 웹앱들을 살아있는 URL 기준으로 수집하고 실시간',
        '피드백을 중개하는 공유 플랫폼입니다.',
        '아키텍처 원리: React SPA 프론트엔드와 NestJS 백엔드 API 레이어로',
        '구성되며, 사용자가 등록한 사이트의 생존 상태(Liveness) 판별을 백엔드 비동기 작업 큐로',
        '격리하여 프론트엔드의 화면 반응성을 극대화했습니다.',
        '주요 라이브러리: Tailwind CSS로 반응형 컴포넌트를 설계하고, Axios',
        '인터셉터를 활용해 인증 헤더(JWT)를 자동으로 처리합니다.',
        '인프라 & 데이터: DB 서버 구축 비용을 제로화하기 위해 백엔드 로컬',
        '파일 시스템에 원자적으로 읽고 쓰는 가벼운 JSON 파일 스토어 엔진을 설계했습니다.',
        'Render/Fly.io의 컨테이너 환경에서 운영되며, `/api/health` 헬스체크로 가동률을',
        '모니터링합니다.',
      ],
      techStack: '',
      infraConfig: '',
      publishInfo: '',
      links: [
        { href: 'https://proto-live.vercel.app', text: 'Live Demo' },
        { href: 'https://github.com/blue45f/proto-live', text: 'GitHub' },
      ],
      image: '/project-snapshots/proto-live.jpg',
    },
    {
      title: 'Multi-env Lab · 멀티 개발환경 레퍼런스',
      period: 'Personal Project | Public repo: blue45f/multi-environment-setting',
      bullets: [
        '동일한 Next.js 빌드 결과물을 빌드 타임 환경변수 변경 없이 런타임에 클라이언트가',
        '`env.json`을 요청하여 주입받게 설계한 "Build Once, Deploy Many" 원칙의 구현',
        '레퍼런스입니다.',
        '아키텍처 & 인프라: AWS S3와 CloudFront CDN을 결합하여 무중단 글로벌',
        '캐시 배포를 수행하고, Terraform IaC와 Makefile로 환경별 인프라 사양을 선언적으로',
        '코딩하여 상태 관리(state)를 제어합니다.',
        'CI/CD 파이프라인: IAM Key 저장 대신 GitHub Actions OIDC',
        'WIF(Workload Identity Federation) Role 매핑 방식을 적용하여 클라우드 크레덴셜 탈취',
        '위험을 원천 차단하고 PR 병합 시 preview 격리 환경을 자동으로 생성하고 파괴하는',
        '수명주기(cleanup)를 구성했습니다.',
      ],
      techStack: '',
      infraConfig: '',
      publishInfo: '',
      links: [
        { href: 'https://multi-beta-guide.vercel.app/', text: 'Live Demo' },
        { href: 'https://github.com/blue45f/multi-environment-setting', text: 'GitHub' },
      ],
      image: '/project-snapshots/multi-beta-guide.jpg',
    },
    {
      title: 'ToonSpectrum · 웹툰·웹소설 통합 인덱스',
      period: 'Personal Project | Public repo: blue45f/toonspectrum',
      bullets: [
        '네이버, 카카오 등 다양한 플랫폼에 분산된 웹툰/웹소설의 랭킹, 리뷰 및 메타데이터를',
        '통합 탐색 및 추천하는 포털 서비스입니다.',
        '아키텍처 원리 (분산 스크래핑 & ORM): 대용량 메타데이터 동기화를',
        '위한 비동기 크롤러 데몬(Node.js Puppeteer/Cheerio)을 NestJS 스케줄러(Cron)와 분리',
        '구동하고, DB 접근 레이어에는 Drizzle ORM을 도입하여 Type-safe한 쿼리 작성과 빌드 타임',
        '스키마 마이그레이션 안전성을 확보했습니다.',
        '서버리스 DB 운용: 트래픽에 맞춰 실시간 오토스케일링되는 Neon',
        'Serverless PostgreSQL을 도입하여 DB 인프라 운영 비용을 제로화하는 서버리스 최적화를',
        '완수했습니다.',
      ],
      techStack: '',
      infraConfig: '',
      publishInfo: '',
      links: [
        { href: 'https://webtoon-index.vercel.app', text: 'Live Demo' },
        { href: 'https://github.com/blue45f/toonspectrum', text: 'GitHub' },
      ],
      image: '/project-snapshots/toonspectrum.jpg',
    },
    {
      title: '이력서공방',
      period: 'Personal Project | Public repo: blue45f/resume',
      bullets: [
        'AI 기술을 결합하여 개인 구직자, 헤드헌터, 기업 HR, 이력서 코치 등 4개 권한군에',
        '최적화된 맞춤형 문항 제안 및 이력서 품질 분석을 제공하는 풀스택 SaaS입니다.',
        '모노레포 & 아키텍처: pnpm workspace 기반 client(React 19 SPA)와',
        'server(NestJS 11 monolith) 분리 아키텍처를 도입하고, shared 패키지로 Zod 스키마 및',
        '공통 타입을 공유합니다. FSD(Feature-Sliced Design) 아키텍처와 25개 검사 서브 모듈로',
        '분할된 2,800라인 규모의 한국어 텍스트 분석 엔진(koreanChecker)을 탑재했습니다.',
        'AI Fallback & 실시간 기능: Gemini 2.0 Flash → Groq Llama 3.3 →',
        'Claude Opus 4.7로 이어지는 Multi-LLM Fallback 체인을 구현해 API 오류 및 한도 초과에',
        '유연히 대응합니다. WebRTC P2P 기반 화상 커피챗 기능은 1초 폴링 시그널링 큐를 통해',
        '별도의 서버 중계 비용 없이 운용됩니다.',
      ],
      techStack: '',
      infraConfig: '',
      publishInfo: '',
      links: [
        { href: 'https://resume-gongbang.vercel.app/', text: 'Live Demo' },
        { href: 'https://github.com/blue45f/resume', text: 'GitHub' },
      ],
      image: '/project-snapshots/resume-gongbang.jpg',
    },
    {
      title: 'Family Care Platform',
      period: 'Personal Project | Public repo: blue45f/family-care-platform',
      bullets: [
        '가족 구성원 간의 공유 일정, 건강 상태, 알림 및 투약 스케줄을 공동 관리하는 패밀리',
        '케어 태스크 허브입니다.',
        '아키텍처: React 19 SPA 프론트엔드와 NestJS 백엔드로 분리된 모노레포',
        '구조를 취하며, 민감한 개인 생활 데이터를 안전하게 보존하고 즉시성 있게 동기화하기 위한',
        '폼 상태 제어와 Optimistic Update를 구현했습니다.',
        '데이터 & 로컬 표준: 영속 데이터 레이어는 로컬 JSON 파일 스토어',
        '엔진으로 파일 입출력을 처리해 유지 비용을 극대화하여 절감했습니다. Docker Compose를',
        '구성해 web, api, mock 스토리지를 로컬에서 원클릭으로 구동할 수 있습니다.',
      ],
      techStack: '',
      infraConfig: '',
      publishInfo: '',
      links: [
        { href: 'https://family-care-platform.vercel.app', text: 'Live Demo' },
        { href: 'https://github.com/blue45f/family-care-platform', text: 'GitHub' },
      ],
      image: '/project-snapshots/family-care-platform.jpg',
    },
    {
      title: 'RotiFolk · 로테이션 파티앱',
      period: 'Personal Project | Public repo: blue45f/rotifolk',
      bullets: [
        '오프라인 행사 현장의 참여자 로테이션 순서 및 순번 대기열을 실시간 조율하는 파티',
        '매니저 플랫폼입니다.',
        '아키텍처 원리 (레이스 컨디션 방지): 현장에서 여러 사용자가 동시에',
        '대기열 순서나 턴 교대를 조작할 때 발생하는 상태 레이스 컨디션을 최소화하기 위해,',
        'Zustand 기반 상태 머신과 낙관적 락(Optimistic Lock) 개념을 차용해 API 요청 락(Request',
        'Lock) 및 터치 디바운싱을 내장했습니다.',
        '데이터 영속성: 독립적인 DB 없이 최소 비용으로 구동하기 위해 NestJS',
        '백엔드 내에 파일 스트림 읽기/쓰기를 직렬화하는 원자적 JSON 데이터 모듈(File-based',
        'State Storage)을 고안해 동시성 안전(Concurrency-safe) 처리를 완료했습니다.',
      ],
      techStack: 'TypeScript, React, Zustand, NestJS, JSON File Locking, Debouncing Engine',
      infraConfig: '',
      publishInfo: '',
      links: [
        { href: 'https://rotifolk.vercel.app', text: 'Live Demo' },
        { href: 'https://github.com/blue45f/rotifolk', text: 'GitHub' },
      ],
      image: '/project-snapshots/rotifolk.jpg',
    },
    {
      title: 'Pettography',
      period: 'Personal Project | Public repo: blue45f/pettography',
      bullets: [
        '희귀 반려동물 돌봄 정보, 특수 동물병원, 용품점 및 커뮤니티를 연계한 웰니스 디렉터리',
        '포털입니다.',
        '아키텍처 원리 (3원 상태 동기화): 수십 개의 상세 필터 조합(지역,',
        '동물종, 진료 항목 등)을 결합하여 탐색하는 UX 요구사항에 따라, URL Query',
        'Parameter(공유성), Zustand 전역 상태(인터랙션 피드백), TanStack Query SWR 캐시(서버',
        '데이터)를 유기적으로 연결하는 동기화 컨트롤러를 구현했습니다. 검색 조건 변경이',
        '히스토리 백/포워드 시에도 완벽히 복원됩니다.',
        '네트워크 및 예외 처리: Axios HTTP 클라이언트에 글로벌 인터셉터를',
        '장착하고 백엔드 API 에러 응답(4xx/5xx)을 표준화하여 통일된 토스트 피드백으로 사용자',
        '경험을 보호합니다.',
      ],
      techStack: 'TypeScript, React, Zustand, TanStack Query, Axios, NestJS Monolith',
      infraConfig: '',
      publishInfo: '',
      links: [
        { href: 'https://pettography.vercel.app', text: 'Live Demo' },
        { href: 'https://github.com/blue45f/pettography', text: 'GitHub' },
      ],
      image: '/project-snapshots/pettography.jpg',
    },
    {
      title: 'TermsDesk',
      period: 'Personal Project | Public repo: blue45f/termsdesk',
      bullets: [
        '서비스 이용약관 및 개인정보 처리방침의 버전 히스토리 통제, 법적 변조 방지 게시, 감사',
        '동의 영수증 발급 SaaS입니다.',
        '아키텍처 원리 (법적 증적 감사): 약관 개정 시점과 내용의 일치성을',
        '검증하기 위해 NestJS Audit Trail 미들웨어를 구축하고, 사용자 동의 시 약관 내용의',
        'SHA-256 해시값과 클라이언트 브라우저 핑거프린트 서명을 결합해 복호화가 불가능한',
        '암호학적 증적 영수증(Verification Receipt)을 UI에서 조회하고 인쇄할 수 있는 렌더링',
        '파이프라인을 설계했습니다.',
        'Diff 시각화: jsdiff 엔진을 기반으로 수정한 약관의 추가/삭제 영역을',
        '클라이언트 사이드에서 즉각 문장/단어 수준으로 다차원 시각화해 주는 Diff 뷰어',
        '컴포넌트를 직접 내장했습니다.',
      ],
      techStack: '',
      infraConfig: '',
      publishInfo: '',
      links: [
        { href: 'https://termsdesk.vercel.app', text: 'Live Demo' },
        { href: 'https://github.com/blue45f/termsdesk', text: 'GitHub' },
      ],
      image: '/project-snapshots/termsdesk.jpg',
    },
    {
      title: 'Quote Match',
      period: 'Personal Project | Public repo: blue45f/quote-match',
      bullets: [
        '서비스 공급자와 수요자 매칭을 위해 설계된 조건부 다차원 견적 매칭 시스템의',
        '프론트엔드 레퍼런스입니다.',
        '아키텍처 원리 (다단계 폼 캐시): 견적서 작성에 필요한 30개 이상의',
        '복잡한 인풋 입력 장벽을 허물기 위해 Multi-step 폼 위젯 아키텍처를 적용했습니다. 특히',
        '예기치 못한 탭 종료나 브라우저 크래시가 나더라도 기존 데이터를 보장하기 위해 Zustand',
        '상태 변경을 관찰하여 LocalStorage/IndexedDB에 안전하게 동기화하고 복원하는 UI Form',
        'Cache 엔진을 구현했습니다.',
        '타입 검증: 입력 양식의 단계별 무결성 검증을 위해 Zod 스키마 검증',
        '엔진을 통합하여 클라이언트 단계에서 불완전한 상태 전이를 엄격하게 방지합니다.',
      ],
      techStack: '',
      infraConfig: '',
      publishInfo: '',
      links: [
        { href: 'https://quote-match.vercel.app', text: 'Live Demo' },
        { href: 'https://github.com/blue45f/quote-match', text: 'GitHub' },
      ],
      image: '/project-snapshots/quote-match.jpg',
    },
    {
      title: 'Orbit UI',
      period: 'Personal Project | Public repo: blue45f/orbit-ui (MIT)',
      bullets: [
        'React 기반 3계층 헤드리스 아키텍처로 컴포넌트를 설계하여 상태 로직, 스타일, 브랜딩을',
        '분리한 타입 안전 디자인 시스템 패키지 라이브러리입니다.',
        '아키텍처 원리 (3계층 격리): 마크업 구조 및 상태 로직(Primitives),',
        '테일윈드/CSS 기반 스타일(Core), 디자인 토큰 기반 브랜딩(Theme)을 물리적 모듈 단위로',
        '격리했습니다. WAI-ARIA 표준 명세 및 키보드 접근성(포커스 트랩, 스크린 리더 친화적',
        '포커싱)을 디자인 시스템 코어 레이어에 자체적으로 탑재했습니다.',
        '컴파일 및 배포: SWC 컴파일러 및 Rollup 번들러 환경을 튜닝하여 트리',
        '쉐이킹(Tree Shaking) 효율을 극대화한 Dual-format(ESM/CJS) 컴포넌트 라이브러리를',
        '빌드합니다.',
      ],
      techStack: '',
      infraConfig: '',
      publishInfo: '',
      links: [
        { href: 'https://orbit-ui-pink.vercel.app/', text: 'Demo' },
        { href: 'https://github.com/blue45f/orbit-ui', text: 'GitHub' },
      ],
      image: '/project-snapshots/orbit-ui.jpg',
    },
    {
      title: 'Remote DevTools',
      period: 'Personal Project | Public repo: blue45f/remote-devtools (MIT)',
      bullets: [
        '외부 모바일 웹뷰 및 스마트 TV 브라우저의 실행 환경을 원격으로 실시간',
        '진단/감시/제어하는 오픈소스 디버깅 플랫폼입니다.',
        '아키텍처 원리 (실시간 터널링): 크로스 플랫폼 타겟 브라우저에',
        '임베드되는 경량 에이전트 SDK가 WebSocket을 통해 디버깅 서버와 채널을 유지합니다.',
        'Chrome DevTools Protocol(CDP) 메시지를 터널링하여 타겟 디바이스의 DOM 트리 상태 복원,',
        'Javascript 원격 콘솔 명령 즉각 실행, 네트워크 호출 모니터링을 완벽하게 재현합니다.',
        '초저지연 화면 미러링: 서버의 네트워크 트래픽 중계 비용을 배제하기',
        '위해 WebRTC Peer-to-Peer 시그널링 채널을 통과하는 경량 이미지/프레임 캡처 스트림 전송',
        '로직을 설계하고, 원격 세션 녹화 및 타임라인 재생(Playback) 엔진을 구현했습니다.',
      ],
      techStack: '',
      infraConfig: '',
      publishInfo: '',
      links: [
        { href: 'https://remote-devtools.vercel.app/', text: 'Live Demo' },
        { href: 'https://github.com/blue45f/remote-devtools', text: 'GitHub' },
        {
          href: 'https://github.com/blue45f/remote-devtools/blob/main/docs/DEPLOY_DEMO.md',
          text: 'Deploy Guide',
        },
      ],
      image: '/project-snapshots/remote-devtools.jpg',
    },
    {
      title: 'SPA SEO Gateway',
      period: 'Personal Project | Public repo: blue45f/spa-seo-gateway',
      bullets: [
        '일반 사용자의 SPA 진입 속도를 침해하지 않고, 검색 크롤링 봇에게만 완벽히 사전',
        '렌더링된 고성능 HTML을 제공하는 Dynamic Rendering 프록시 솔루션입니다.',
        '아키텍처 원리 (User-Agent 라우팅): Reverse Proxy 레이어에서',
        '구글/네이버/카카오 등의 검색 크롤러 봇 트래픽을 감지하여 Puppeteer Headless 브라우저',
        '렌더러 큐로 분기합니다. 렌더러가 클라이언트 CSR 사이트를 구동하여 획득한 정적 마크업',
        '스냅샷을 봇에게 즉시 반환하여 검색 순위 및 SEO 지표를 향상시킵니다.',
        '캐시 및 배포 효율화: Puppeteer 재구동 오버헤드를 제어하기 위해 LRU',
        'Memory Cache 레이어를 구성하고, 코어 모듈을 독립',
        '패키지(@heejun/spa-seo-gateway-core)로 분리하여 다수 서비스에 미들웨어 형태로 즉각',
        '통합될 수 있도록 고안했습니다.',
      ],
      techStack: '',
      infraConfig: '',
      publishInfo: '',
      links: [
        { href: 'https://spa-seo-gateway.vercel.app', text: 'Live Demo' },
        { href: 'https://github.com/blue45f/spa-seo-gateway', text: 'GitHub' },
        { href: 'https://www.npmjs.com/package/@heejun/spa-seo-gateway-core', text: 'npm' },
      ],
      image: '/project-snapshots/spa-seo-gateway.jpg',
    },
  ],
  leadership: [
    {
      title: '전사 웹표준 개발환경 RFC',
      bullets: [
        '2025.08부터 전사 웹 프론트엔드 개발 표준 정립 RFC의 핵심 참여자',
        '7차 RFC 논의 참석 및 아레나 논의 준비',
        '전사 표준 정립에 지속적으로 기여 중',
      ],
    },
    {
      title: '테크 밋업 연사 (2025.09)',
      bullets: [
        '주제: 장바구니 CloudFront 장애 대응 및 웹 프론트엔드 개발자가 알아야 할 인프라 지식',
        '내부 교육 세션 연사 초청, 장애 대응 경험과 인프라 개념 전파',
      ],
    },
    {
      title: '코드 리뷰 프로세스 개선',
      bullets: [
        '코드 리뷰 회고 2회 참석 및 적극적 의견 제시',
        'MR 분할 지지, MR 완료 일정 및 QA 시작일을 메타데이터에 추가 제안',
        '명확한 액션 아이템과 오너십을 갖춘 프로세스 개선 주도',
      ],
    },
    {
      title: 'API 평가 및 아키텍처 리뷰',
      bullets: [
        '장바구니 빈 화면 추천 API 평가에서 상세한 기술 분석 제공',
        'API 구조 복잡성, 클라이언트 파싱 복잡도, 웹 성능 우려 지적',
        '데이터만 전달하고 뷰 프레젠테이션은 프론트엔드가 처리하는 접근 권장',
      ],
    },
    {
      title: '기술 문서화',
      bullets: [
        '4년간 250개 이상의 주간 상태 리포트 작성',
        '프로젝트 계획, 아키텍처 의사결정 기록(ADR), 개발 가이드라인 문서화',
        '일관된 문서화 습관을 통한 지식 공유와 협업 촉진',
      ],
    },
  ],
  performanceNumbers: [
    {
      title: '아키텍처 · 성능',
      content:
        '레거시를 React 기반 모던 스택으로 전환하며 JavaScript 번들 크기를\n          70% 줄이고, 평균 성능을 30% 이상 끌어올렸으며, 그 결과\n          팀 전체의 개발 생산성을 30% 이상 높였습니다.',
    },
    {
      title: '품질 · 안정성',
      content:
        'vitest 기반 테스팅 인프라를 처음 세워 커버리지를 0%에서 16%로 끌어올리고,\n          고객서비스 개선 프로젝트에서 96% TC 실행률과 90% 패스율을 달성했습니다.\n          VFD 2.0 배포 장애는 5시간 안에 원인을 파악해 해결했고, 장애 포카요케\n          2건으로 배포 프로세스를 표준화했습니다. 배송 경로 이상 신고 기능은 VOC를\n          69% 줄였습니다.',
    },
    {
      title: '조직 · 기록',
      content:
        '표준 개발 환경 TF를 8개월 만에 마무리하며 React Query + Zustand +\n          TypeScript 코어 스택을 정립했고, 4년간 250개 이상의 주간 상태 리포트를\n          남기며 기록의 문화를 이어왔습니다.',
    },
  ],
  techStack: [
    {
      category: 'Frontend',
      tags: [
        'JavaScript(ES6+)',
        'TypeScript',
        'HTML5',
        'CSS3/SCSS',
        'React',
        'Vue.js',
        'Angular',
        'React Query',
        'Zustand',
        'MobX',
        'Redux',
        'RxJS',
        'Webpack',
        'Vite',
        'Rollup',
        'Vitest',
        'Jest',
        'React Testing Library',
        'Cypress',
        'Storybook',
      ],
    },
    {
      category: 'Backend & Tools',
      tags: [
        'Java',
        'Node.js',
        'AWS S3',
        'CloudFront',
        'Route53',
        'Git',
        'GitLab CI/CD',
        'GitHub',
        'Jenkins',
        'GitHub Actions',
        'Docker',
        'Sentry',
        'Figma',
      ],
    },
  ],
  activities: [
    '개인 프로젝트는 본문의 "개인 프로젝트" 섹션을 참고',
    '(PromptMarket, ProtoLive, Multi-env Lab, ToonSpectrum, 이력서공방, Family Care Platform,',
    'RotiFolk, Pettography, TermsDesk, Quote Match, Orbit UI, Remote DevTools, SPA SEO',
    'Gateway)',
    'GitHub Study Group:',
    'https://github.com/develuv/study',
    '사내 디자인 시스템 TF 참여',
    '사내 기술 출판물 검수 활동',
    'FSD(Feature-Sliced Design) 아키텍처 검토 및 팀 내 공유',
    '모바일 테스트 방안 연구 및 가이드 제공',
    '테스트 리포팅 대시보드 구축으로 품질 관리 체계화',
    '스테이지 환경 구축 주도 및 유관부서 공유',
  ],
  selfIntroduction:
    '주문·결제 및 장바구니 서비스의 핵심 아키텍처를 설계하고 구현하는 시니어 프론트엔드\n          개발자입니다. 18년간 Kakao와 SmileGate Stove를 거치며 대규모 서비스의 프론트엔드 아키텍처\n          설계, 성능 최적화, 팀 표준화를 주도해왔습니다.\n\n\n\n          2021년 입사 이후 30개 이상의 주요 프로젝트를 완수하며 JavaScript 번들\n          크기 70% 감소, 평균 성능 30% 개선, 개발 생산성 30% 향상을 달성했습니다. 레거시 아키텍처를\n          React 기반 모던 스택으로 전환하고, 전사 표준 개발 환경을 정립하며, vitest 기반 테스팅\n          인프라를 구축하는 등 기술 리더십을 발휘하고 있습니다.\n\n\n\n          특히 국내 최초 애플페이 결제 연동, 공동 주문 서비스 실시간 동기화 아키텍처, 장바구니 및\n          주문·결제 프로세스 통합 프로젝트 리드 등 난이도 높은 기술 과제를 성공적으로 수행하며 팀의\n          핵심 개발자로서 기술력과 리더십을 인정받고 있습니다.\n\n\n\n          대규모 트래픽을 처리하는 서비스에서의 성능 최적화, RFC 프로세스 주도, 코드 리뷰 문화 정착,\n          그리고 테크 밋업 연사 활동과 주니어 개발자 멘토링을 통해 조직 전체의 기술 역량 향상에\n          기여하고 있습니다. 앞으로도 기술적 탁월함과 팀워크를 바탕으로 더 나은 사용자 경험을\n          만들어가고자 합니다.',
  attachedDocs: [
    {
      category: '경력증명서',
      links: [],
    },
    {
      category: '졸업증명서',
      links: [],
    },
    {
      category: '자격증',
      links: [],
    },
    {
      category: '국민연금 가입증명',
      links: [],
    },
    {
      category: '개발 가이드 (실무형 최신 기준)',
      links: [],
    },
  ],
  guides: [
    {
      id: '00',
      name: '종합 가이드 목차',
      filename: '00_종합_가이드_목차.html',
      path: '/개발가이드/00_종합_가이드_목차.html',
    },
    {
      id: '01',
      name: 'TypeScript 심화 가이드',
      filename: '01_TypeScript_심화_가이드.html',
      path: '/개발가이드/01_TypeScript_심화_가이드.html',
    },
    {
      id: '02',
      name: 'React19 실무 가이드',
      filename: '02_React19_실무_가이드.html',
      path: '/개발가이드/02_React19_실무_가이드.html',
    },
    {
      id: '03',
      name: '상태관리 패턴 가이드',
      filename: '03_상태관리_패턴_가이드.html',
      path: '/개발가이드/03_상태관리_패턴_가이드.html',
    },
    {
      id: '04',
      name: '아키텍처 설계 패턴',
      filename: '04_아키텍처_설계_패턴.html',
      path: '/개발가이드/04_아키텍처_설계_패턴.html',
    },
    {
      id: '05',
      name: 'API 통신 및 모킹 가이드',
      filename: '05_API_통신_및_모킹_가이드.html',
      path: '/개발가이드/05_API_통신_및_모킹_가이드.html',
    },
    {
      id: '06',
      name: '웹 보안 심화 가이드',
      filename: '06_웹_보안_심화_가이드.html',
      path: '/개발가이드/06_웹_보안_심화_가이드.html',
    },
    {
      id: '07',
      name: '테스팅 가이드',
      filename: '07_테스팅_가이드.html',
      path: '/개발가이드/07_테스팅_가이드.html',
    },
    {
      id: '08',
      name: '성능 최적화 가이드',
      filename: '08_성능_최적화_가이드.html',
      path: '/개발가이드/08_성능_최적화_가이드.html',
    },
    {
      id: '09',
      name: '장애 대응 및 관측성 표준',
      filename: '09_장애_대응_및_관측성_표준.html',
      path: '/개발가이드/09_장애_대응_및_관측성_표준.html',
    },
    {
      id: '10',
      name: '인프라 IaC 가이드',
      filename: '10_인프라_IaC_가이드.html',
      path: '/개발가이드/10_인프라_IaC_가이드.html',
    },
    {
      id: '11',
      name: 'CICD 파이프라인 표준',
      filename: '11_CICD_파이프라인_표준.html',
      path: '/개발가이드/11_CICD_파이프라인_표준.html',
    },
    {
      id: '12',
      name: 'CDN 캐시 전략',
      filename: '12_CDN_캐시_전략.html',
      path: '/개발가이드/12_CDN_캐시_전략.html',
    },
    {
      id: '13',
      name: '브라우저 호환성 가이드',
      filename: '13_브라우저_호환성_가이드.html',
      path: '/개발가이드/13_브라우저_호환성_가이드.html',
    },
    {
      id: '14',
      name: '배포 프로세스 체크리스트',
      filename: '14_배포_프로세스_체크리스트.html',
      path: '/개발가이드/14_배포_프로세스_체크리스트.html',
    },
    {
      id: '15',
      name: 'RFC 의사결정 프로세스',
      filename: '15_RFC_의사결정_프로세스.html',
      path: '/개발가이드/15_RFC_의사결정_프로세스.html',
    },
    {
      id: '16',
      name: 'AI 협업 코드리뷰 가이드',
      filename: '16_AI_협업_코드리뷰_가이드.html',
      path: '/개발가이드/16_AI_협업_코드리뷰_가이드.html',
    },
    {
      id: '17',
      name: '신규 입사자 온보딩 가이드',
      filename: '17_신규_입사자_온보딩_가이드.html',
      path: '/개발가이드/17_신규_입사자_온보딩_가이드.html',
    },
    {
      id: '18',
      name: 'AI 개발 워크플로우 종합',
      filename: '18_AI_개발_워크플로우_종합.html',
      path: '/개발가이드/18_AI_개발_워크플로우_종합.html',
    },
    {
      id: '19',
      name: '웹 접근성 가이드',
      filename: '19_웹_접근성_가이드.html',
      path: '/개발가이드/19_웹_접근성_가이드.html',
    },
    {
      id: '20',
      name: '디자인 시스템 가이드',
      filename: '20_디자인_시스템_가이드.html',
      path: '/개발가이드/20_디자인_시스템_가이드.html',
    },
    {
      id: '21',
      name: '마이크로 프론트엔드 가이드',
      filename: '21_마이크로_프론트엔드_가이드.html',
      path: '/개발가이드/21_마이크로_프론트엔드_가이드.html',
    },
    {
      id: '22',
      name: '모노레포 운영 가이드',
      filename: '22_모노레포_운영_가이드.html',
      path: '/개발가이드/22_모노레포_운영_가이드.html',
    },
    {
      id: '23',
      name: '국제화 가이드',
      filename: '23_국제화_가이드.html',
      path: '/개발가이드/23_국제화_가이드.html',
    },
    {
      id: '24',
      name: 'SEO 메타데이터 가이드',
      filename: '24_SEO_메타데이터_가이드.html',
      path: '/개발가이드/24_SEO_메타데이터_가이드.html',
    },
    {
      id: '25',
      name: '웹 애니메이션 모션 가이드',
      filename: '25_웹_애니메이션_모션_가이드.html',
      path: '/개발가이드/25_웹_애니메이션_모션_가이드.html',
    },
    {
      id: '26',
      name: 'PWA 오프라인 전략 가이드',
      filename: '26_PWA_오프라인_전략_가이드.html',
      path: '/개발가이드/26_PWA_오프라인_전략_가이드.html',
    },
    {
      id: '27',
      name: '다중 개발 서버 구축 가이드',
      filename: '27_다중_개발_서버_구축_가이드.html',
      path: '/개발가이드/27_다중_개발_서버_구축_가이드.html',
    },
    {
      id: '28',
      name: 'Sentry 모니터링 활용 가이드',
      filename: '28_Sentry_모니터링_활용_가이드.html',
      path: '/개발가이드/28_Sentry_모니터링_활용_가이드.html',
    },
    {
      id: '29',
      name: '표준 라이브러리 스택 가이드',
      filename: '29_표준_라이브러리_스택_가이드.html',
      path: '/개발가이드/29_표준_라이브러리_스택_가이드.html',
    },
    {
      id: '30',
      name: '사례 전저장소 일관성 정렬 회고',
      filename: '30_사례_전저장소_일관성_정렬_회고.html',
      path: '/개발가이드/30_사례_전저장소_일관성_정렬_회고.html',
    },
  ],
}
