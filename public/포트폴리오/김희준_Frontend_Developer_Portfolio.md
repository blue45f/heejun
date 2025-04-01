# Kim Heejun | Frontend Developer Portfolio

**Web Frontend Team Lead @ Woowa Brothers (배달의민족)**  
18 Years of Frontend Development Experience | React · TypeScript · System Architecture

---

## Professional Summary

주문/장바구니 서비스의 핵심 아키텍처를 설계하고 구현하는 시니어 프론트엔드 개발자입니다. 18년간 Kakao와 SmileGate Stove를 거치며 대규모 서비스의 프론트엔드 아키텍처 설계, 성능 최적화, 팀 표준화를 주도해왔습니다.

2021년 입사 이후 **30개 이상의 주요 프로젝트를 완수**하며 JavaScript 번들 크기 70% 감소, 평균 성능 30% 개선, 개발 생산성 30% 향상을 달성했습니다. 레거시 아키텍처를 React 기반 모던 스택으로 전환하고, 전사 표준 개발 환경을 정립하며, vitest 기반 테스팅 인프라를 구축하는 등 기술 리더십을 발휘하고 있습니다.

**Contact**  
📧 Email: blue45f@gmail.com 
🔗 GitHub: [Your GitHub]

---

## Core Competencies

### Technical Leadership
- 웹 프론트엔드 아키텍처 설계 및 마이그레이션 (레거시 → React 기반 모던 스택)
- 전사 표준 개발 환경 정립 (React Query + Zustand + TypeScript)
- 테스트 인프라 구축 및 품질 문화 정착 (Jest/Vitest/Cypress)
- 성능 최적화 (JavaScript 크기 70% 감소, 렌더링 성능 30% 개선)

### Technical Stack
**Frontend**: React, TypeScript, React Query, Zustand, Redux, Vite, Webpack  
**Testing**: Vitest, Jest, Cypress, Storybook  
**Infrastructure**: AWS (S3, CloudFront, Route53), Node.js, GitLab CI/CD, Serverless  
**Integration**: JavaScript Interface, BI Logging, Error Tracking (Sentry), MMP (Adjust)

### Team & Process
- 10명 규모 팀 리드 및 멘토링
- RFC 프로세스 주도 및 기술 의사결정
- 코드 리뷰 문화 정착 및 프로세스 개선
- 크로스 기능팀 협업 (PM, Design, Backend, QA, Mobile)

---

## Featured Projects

### 🚀 장바구니/주문서 통합 프로젝트 (2025.10 - 2026.01)
**Role**: Frontend Lead  
**Status**: In Progress (Q1 2026 Launch)

#### Problem
배민의 주문 플로우는 4단계(메뉴 선택 → 장바구니 → 주문서 → 주문 완료)로 경쟁사 대비 전환율이 낮고, 장바구니와 주문서에 배달비/금액/혜택 정보가 중복 표시되어 사용자 경험이 비효율적이었습니다.

#### Solution
- 4단계 주문 플로우를 3단계로 단축 (장바구니와 주문서 통합)
- 장바구니 기능을 컴포넌트 단위로 분리하여 주문서 플랫폼에 통합
- 최적 쿠폰 및 배달 옵션 자동 선택으로 사용자 액션 최소화
- Module Federation 도입 검토 및 아키텍처 의사결정 (별도 후속 과제로 분리)

#### Key Responsibilities
- 주문 동선 검토 및 일정 조율
- 디자인 시안 검토 및 개발 방향성 논의
- 프론트엔드 계산 로직 정리 및 UI 컴포넌트 우선순위 검토
- 버전 분기 전략 수립 및 A/B 테스트 설계

#### Expected Impact
- 주문 완료 전환율 증가
- 디바이스당 매출 증가
- 평균 주문 시간 및 클릭 수 감소

#### Tech Stack
React, TypeScript, React Query, Zustand, A/B Testing Platform

---

### 🏗️ 웹프론트엔드 아키텍처 통합 (2021.04 - 2021.09)
**Role**: Technical Lead  
**Duration**: 6 months

#### Problem
여러 서비스에 분산된 프론트엔드 아키텍처로 인해 코드 중복, 낮은 성능, 일관성 없는 개발 경험이 발생했습니다. 레거시 우아한 프레임워크와 Redux/Mobx 기반 구조는 유지보수가 어렵고 번들 크기가 과도하게 컸습니다.

#### Solution
- **레거시 → React 마이그레이션**: 우아한 프레임워크에서 React 기반 SPA로 전환
- **상태 관리 현대화**: Redux/Mobx → React Query로 비동기 패턴 변경
- **아키텍처 레이어 분리**: API, Service, Store, Component 레이어 명확히 분리
- **통합 플랫폼 구축**: 장바구니, 주문서, 주문내역을 단일 플랫폼으로 통합

#### Key Achievements
- **JavaScript 번들 크기 70% 감소**
- **평균 성능 30% 이상 개선**
- **개발 생산성 30% 이상 향상**
- Socket API 전환, 라우터 설계, Node 서버 개발 환경 구성 완료
- 인증 처리 구조 개선 및 주문 프로세스 비즈니스 로직 재설계

#### Technical Highlights
- 폴더 구조 설계 및 비동기 통신 패턴 정립
- API 인터페이스 개발 및 목 데이터 아키텍처 구축
- JavaScript 인터페이스 유틸리티 개발 (앱 이벤트 실행)
- BI 로그 적용 패턴 정리 및 예외 처리 패턴 적용
- 쿠폰 지갑, 주문내역 상세 페이지 신규 아키텍처 적용
- 성능 측정 데이터 준비 및 QA 범위 산정

#### Impact
입사 첫해에 완수한 이 프로젝트는 배민 주문 서비스의 기술 부채를 해소하고, 향후 5년간 모든 프론트엔드 개발의 기반이 되었습니다.

#### Tech Stack
React, React Query, TypeScript, Node.js, AWS S3/CloudFront, GitLab CI/CD

---

### 📊 표준 개발 환경 개선 TF (2023.05 - 2023.12)
**Role**: Core Member & Technical Lead  
**Duration**: 8 months

#### Problem
팀 내 프로젝트마다 다른 기술 스택, 개발 패턴, 빌드 시스템을 사용하여 코드 일관성이 낮고, 신규 멤버 온보딩이 어려우며, 프로젝트 간 지식 공유가 제한적이었습니다.

#### Solution
- **표준 기술 스택 정의**: React Query + Zustand + React 코어 스택 확정
- **개발 환경 현대화**: Node 버전 업그레이드, Vite 빌드 시스템 도입
- **테스팅 인프라**: Cypress E2E, Jest/Vitest 단위 테스팅 표준 정립
- **아키텍처 가이드**: 애플리케이션 레이어 아키텍처 설계 문서화

#### Key Deliverables
- 표준화 요구사항 문서 작성 및 보일러플레이트 리포지토리 생성
- 브랜치 전략 및 워크플로우 수립 (QA 브랜치 추가)
- food-order-client 신규 리포지토리 구성
- 웹 로그인 통합 환경 구성
- 개발 가이드라인 작성 및 팀 교육

#### Technical Decisions
- **React Query mutation 패턴**: 상황별 mutate/mutateAsync 혼용
- **useQuery 패턴**: 팀별 적합한 방식 사용 후 필요시 통일
- **테스팅**: Jest 안정성 우선, Vitest는 검토 후 점진적 도입
- **에러 처리 패턴**: 메인테이너 피드백 기반 점진적 개선

#### Collaboration
- 기술 책임자 리뷰 (2023.08.09): 캐싱, 프로젝트 설정, Tailwind 도입 피드백 반영
- 결제/주문/서비스/공통팀 피드백 조율 및 합의 도출
- 브랜치 전략 시각화 및 팀 전체 승인 획득

#### Impact
팀 전체의 개발 표준을 정립하여 코드 품질, 개발 속도, 온보딩 효율성을 대폭 향상시켰으며, 이후 모든 신규 프로젝트의 기반이 되었습니다.

#### Tech Stack
React, React Query, Zustand, TypeScript, Vite, Jest, Cypress, GitLab CI/CD

---

### 🧪 vitest 기반 테스팅 인프라 구축 (2025.08)
**Role**: Technical Lead  
**Duration**: 1 month

#### Problem
주문 웹프론트팀에 단위 테스트 문화가 정착되지 않아 코드 품질 검증이 수동 테스트에 의존하고, 리팩토링 시 회귀 버그 리스크가 높았습니다.

#### Solution
- 전국특가 장바구니 도메인에 **vitest 기반 테스팅 환경 최초 구축**
- service-front/hypermarket 프로젝트 vitest 셋업 완성 (이강열 협업)
- **최소 20% 코드 커버리지 확보 목표** 달성
- 테스트 코드 작성 가이드 및 베스트 프랙티스 문서화

#### Key Achievements
- 9월 23일 운영 배포 완료
- 11월 커머스 장바구니 및 대형마트 장바구니 테스트 커버리지 확대
- **약 16% 기준 커버리지 달성**
- 팀 내 다른 도메인으로 테스팅 문화 확산

#### Impact
주문 웹프론트팀 최초의 체계적인 테스팅 인프라를 구축하여 코드 품질 향상과 안정적인 리팩토링의 기반을 마련했습니다.

#### Tech Stack
Vitest, React Testing Library, TypeScript

---

### 🎯 VFD 2.0 주문 대응 - 즉시할인 시스템 대개편 (2025.05 - 2025.07)
**Role**: Frontend Developer  
**Duration**: 3 months

#### Problem
기존 즉시할인 시스템은 프론트엔드에서 할인 계산을 수행하여 서버와 불일치 리스크가 있었고, 할인 영역이 6종으로 과도하게 복잡했습니다.

#### Solution
- **할인 계산 로직 서버 이관**: 프론트 → 서버로 아키텍처 변경
- API 응답 스펙 검토 및 장바구니 할인 영역 간소화 (6종 → 4종)
- 롤링 넘버 인터랙션 개발로 UX 개선
- 김하림과 리소스 분배 및 통합 작업 수행

#### Incident Response
7월 22일 운영 배포 당일 **픽업 주문 시 최소 주문 금액 미충족 문제 발생**
- **5시간 이내 원인 파악 및 해결**: 인센티브 시스템이 픽업 주문에 최소 주문 금액을 잘못 전송하던 이슈
- 2,757명 고객에게 3,000원 쿠폰 보상 (총 약 600만원)
- 신속한 장애 대응 및 고객 보상으로 서비스 신뢰 유지

#### Schedule
- 개발: 2025.05.26 - 06.13
- QA: 2025.06.16 - 07.11
- 스테이징 배포: 2025.07.16
- 운영 배포: 2025.07.22

#### Impact
할인 계산 로직의 서버 이관으로 데이터 일관성을 확보하고, 할인 영역 간소화로 사용자 이해도를 높였습니다.

#### Tech Stack
React, TypeScript, React Query, 인센티브 시스템 API 연동

---

### 👥 함께주문 Phase 1 (2022.06 - 2022.10)
**Role**: Technical Architect & Frontend Developer  
**Duration**: 5 months

#### Problem
여러 사용자가 한 음식점에서 함께 주문할 수 있는 기능이 부재하여 회식, 모임 등 그룹 주문 시나리오에 대응할 수 없었습니다.

#### Solution
- 실시간 동기화 아키텍처 설계 (초기: 폴링 방식, 향후: SSE 전환 계획)
- 다중 사용자 시나리오 지원하는 장바구니 구조 재설계
- 주최자/참여자 닉네임 설정, 공유 장바구니, 멤버 구분 UI 구현
- 앱 버전 체크를 위한 브릿지 페이지 개발 및 WebView 동기화

#### Key Responsibilities
- **기술 아키텍처 기획 및 리스크 평가 주도**
- 박선희와 협업하여 주최자/참여자 플로우 개발
- 함께주문 주문내역 통합
- 주문 페이지 검증 및 알림 구현
- 로깅 시스템 구축

#### Technical Challenges
- 실시간 다중 사용자 장바구니 동기화
- 네이티브 앱과의 복잡한 WebView 연동
- 주최자/참여자 권한 분리 및 상태 관리

#### Schedule
- 개발: 2022.06 - 09
- QA: 2022.09 - 10
- 운영 배포: 2022.10.04

#### Impact
그룹 주문 시나리오를 지원하여 신규 사용자 확보 및 주문 금액 증대에 기여했습니다. 예상 투입 공수 28+ MD.

#### Tech Stack
React, Redux, Polling/SSE, JavaScript Interface, 실시간 동기화

---

### 💳 애플페이 통합 (2022.08 - 2023.01)
**Role**: Technical Lead & Integration Specialist  
**Duration**: 6 months

#### Problem
배민의 결제 플로우는 인증과 결제 요청 페이지가 분리되어 있는데, 애플페이는 한 페이지에서 인증과 처리를 모두 수행해야 하는 제약이 있었습니다.

#### Solution
- 기술 타당성 검토 및 애플페이 데모 페이지 분석
- **토큰 전달 메커니즘 솔루션 설계**: 분리된 페이지 간 안전한 토큰 전달 구조
- 개발 제약사항 및 리스크 파악
- 디자인 기획 논의 및 결제 플랫폼팀 조율
- 애플 담당자 미팅 참석 및 기술 협의

#### Key Achievements
- 2023년 1월 10일 성공적 배포
- 배민 최초 애플페이 결제 지원
- iOS 사용자 결제 편의성 대폭 향상

#### Technical Highlights
- 페이지 분리 아키텍처에서 애플페이 요구사항 충족하는 토큰 전달 메커니즘
- 결제 플랫폼팀과의 긴밀한 협업
- 애플 공식 가이드라인 준수 및 검수 통과

#### Impact
iOS 사용자의 결제 경험을 혁신하여 전환율 향상 및 프리미엄 결제 수단 제공에 기여했습니다.

#### Tech Stack
React, Apple Pay JS SDK, 결제 플랫폼 API, JavaScript Interface

---

### 📦 장바구니 개편 (2021.09 - 2021.12)
**Role**: Frontend Developer (팀 협업)  
**Duration**: 4 months

#### Problem
클라이언트 사이드 장바구니는 멀티 디바이스 동기화가 어렵고, 레거시 아키텍처로 인해 성능과 유지보수성이 낮았습니다.

#### Solution
- **서버 사이드 장바구니 구현**: 클라이언트 → 서버 기반 아키텍처 전환
- 신규 프론트엔드 아키텍처 적용 (앞서 구축한 통합 아키텍처 활용)
- 멀티 디바이스 장바구니 동기화 논의 및 구현
- 인터랙션과 데이터 처리 플로우 설계

#### Key Responsibilities
- 기획 문서 분석 및 명세 분석
- 공통 코어 컴포넌트 분석 및 도메인/라우터/레이아웃/컴포넌트 구조 설계
- API 목업 및 서버팀 정책 논의
- 메뉴 영역 FE 기능 구현 (삭제, 수량 변경 API 연동)
- 예약 변경 팝업 기능 추가
- 로그 서비스 코드 생성

#### Collaboration
배민근, 박윤서와 협업하여 프론트엔드 개발 완수

#### Schedule
- 개발: 2021.09.28 - 11
- 성능 테스트: 2021.11.15 - 19
- 웹/서버 배포: 2021.11.30
- 게이트웨이 서버 배포: 2021.12.01
- 앱 배포: 2021.12.07

#### Impact
멀티 디바이스 장바구니 동기화를 실현하여 사용자 경험을 개선하고, 신규 아키텍처 적용으로 향후 확장성을 확보했습니다.

#### Tech Stack
React, React Query, Node.js, Server-side API

---

### 🛠️ 푸드 웹지면 개편 - 장바구니 플랫폼 마이그레이션 (2023.08 - 2024.01)
**Role**: Lead Developer (장바구니 페이지)  
**Duration**: 6 months

#### Problem
레거시 장바구니를 표준 개발 환경으로 마이그레이션하여 일관된 코드베이스와 개선된 성능을 확보해야 했습니다.

#### Solution
- **레이아웃 디자인 및 구현** (2023.10)
- 기본 레이아웃 구조 및 메인 컨테이너 데이터 페칭 아키텍처 구축
- **API 레이어 전환**: React Query 패턴으로 재구성
- 배달팁 서비스 통합
- 일반 장바구니, 함께주문 장바구니 (주최자/참여자 뷰) 구현
- 빈 장바구니, 에러 페이지, 추천 영역, 옵션 수정, 예약 팝업 개발
- CTA 버튼 기능, 쿠폰 다운로드 연동, 로깅 구현

#### Technical Highlights
- 컨테이너별 데이터 페칭 아키텍처 설계
- 장바구니 비즈니스 로직을 표준 환경에 맞게 재설계
- 서버 시간 공통 스토리지 로직 및 옵션 변경 플로우 구축
- **AWS S3 & CloudFront 인프라, Simploy 서버리스 배포, GitLab CI/CD, Remote config 연동** 등 전체 인프라 스택 새로 구축

#### Quality Assurance
- 인수테스트 3회 완료 (1차: 12.11, 2차: 12.12, 3차: 12.19)
- 웹 접근성 요구사항 대응
- 2024년 1월 점진적 배포 완료

#### Impact
표준 개발 환경으로 마이그레이션하여 코드 품질, 성능, 유지보수성을 대폭 향상시켰습니다.

#### Tech Stack
React, React Query, Zustand, TypeScript, Vite, AWS S3/CloudFront, Simploy, GitLab CI/CD

---

## Infrastructure & DevOps Projects

### 🔧 장애 포카요케 2건 (2025.08)

#### 1. 배포 상태 인지 프로세스 강화
**Problem**: 배포 후 모니터링 누락으로 장애 인지가 지연되는 사례 발생

**Solution**:
- 배포 모니터링 자동화 구현
- 1시간 후 자동 배포 완료 처리 로직 추가
- JIRA: POSTMORTEM-3643

**Impact**: 배포 장애 조기 발견 및 대응 시간 단축

#### 2. 운영/스테이징 인프라 환경 구조 통일
**Problem**: 스테이징과 운영 환경 불일치로 예측 불가능한 장애 발생

**Solution**:
- 스테이징/운영 인프라 구조 완전 통일
- 환경별 배포/롤백 절차 표준화
- 푸드 장바구니, 주문서플랫폼, 주문내역플랫폼에 적용
- JIRA: POSTMORTEM-3780

**Testing**:
- 스테이징 배포/롤백 테스트
- 운영 배포/롤백 테스트
- 배포 완료 처리 테스트
- 1시간 후 자동 배포 완료 처리 테스트

**Impact**: 환경 불일치로 인한 장애 사전 방지 체계 구축, 팀 내 전체 프로덕트 표준 적용

#### Tech Stack
GitLab CI/CD, AWS Infrastructure, Monitoring Tools

---

## Additional Projects

### 배달/픽업 가격 이원화 (2025.09)
프랜차이즈 업체의 배달/픽업 메뉴 가격 별도 운영 지원. API 스펙 검토, 푸드 장바구니/MFO/주문내역 화면 대응, 퀵결제 화면 개발. 9월 30일 배포 시점 3개 가게 적용.

### 장바구니 배달옵션 추천방식 고도화 (2025.09)
고객의 직전 주문 이력 기반 배달 방식 자동 선택 로직 구현. 9월 9일 배포 후 로그 미수집 이슈 발견, 디폴트 선택 로직과 뷰로그 전송 시점 간 타이밍 문제 해결하는 핫픽스 적용.

### 푸드주문 고객서비스 경험 개선 (2024.03 - 2024.06)
문의하기 프리셋 기능, 주문 취소 요청 기능, 채팅 운영시간 검증 제거, 실험 플랫폼 연동, 웹 로깅 구현. **96% TC 실행률에 90% 패스율** 달성.

### 푸드 가게통합 프로젝트 (2024.12 - 2025.02)
BAEMIN과 BAERA를 단일 FOOD 서비스 타입으로 통합. 장바구니, 주문서, 주문내역, 함께주문 온보딩, 문의하기 화면에서 서비스 타입 FOOD 구현. 2025년 2월 17일 FD 론칭 성공.

### 배달 옵션 안내 강화 (2023.05 - 2023.07)
표준 배달과 알뜰 배달의 차이 명확화를 위한 UI/UX 개선. Phase 1-3로 진행하며 긍정적 언어 채택, 배달 옵션 설명 업데이트, 토스트 팝업 메시지 개선. 예상 투입 공수 3MD.

### 장바구니 모아보기 (2023.05 - 2023.07)
여러 음식점의 장바구니를 한 곳에서 관리하는 기능. 네이티브 헤더 및 탭 통합, JavaScript 인터페이스를 통한 동기화, 빈 장바구니 상태 디자인 변경. 7월 24일 08:00 운영 배포.

### 디자인 시스템 TF (2022.08 - 2022.12)
재사용 가능한 UI 컴포넌트 라이브러리 개발. Modal/Dialog 컴포넌트, Checkbox 타입 다이얼로그 구현. Storybook을 이용한 컴포넌트 문서화 및 Figma 통합. 30% 완료.

---

## Leadership & Knowledge Sharing

### 전사 웹표준 개발환경 RFC (2025.08 - 현재)
**Role**: 핵심 참여자

전사 웹 프론트엔드 개발 표준 정립 RFC의 핵심 참여자로서 7차 RFC 논의 (2025.11.11) 참석 및 11월 13일부터 시작될 아레나 논의 준비. 8월 3명의 참여자 모집, 9월 첫째 주 킥오프 계획. 전사 표준 정립에 지속적으로 기여 중.

### 테크 밋업 연사 (2025.09.19)
**주제**: 장바구니 CloudFront 장애 대응 및 웹 프론트엔드 개발자가 알아야 할 인프라 지식

팀 문서 기반 프레젠테이션 및 예제 준비, 내부 교육 세션 (25하반기-내부교육세션-연사자) 연사 초청. 장애 대응 경험과 인프라 개념을 프론트엔드 개발자들에게 전파하는 지식 공유 활동.

### 코드 리뷰 프로세스 개선 (2025.08 - 2025.09)
코드 리뷰 회고 (8월 6일, 9월 3일) 2회 참석 및 적극적 의견 제시:
- 정기 리뷰 시간 슬롯 반대 (현재 방식이 더 효율적)
- MR 분할 지지
- **MR 완료 일정을 리뷰 메타데이터에 추가** 제안
- **QA 시작일을 MR에 추가해 가시성 향상** 제안
- 명확한 액션 아이템과 오너십을 갖춘 프로세스 개선 주도

### API 평가 및 아키텍처 리뷰 (2025.08)
장바구니 빈 화면 추천 API 평가에서 상세한 기술 분석 제공:
- API 구조의 복잡성 이슈 (깊은 중첩 구조)
- 클라이언트 파싱 복잡도 및 유지보수 어려움
- 웹 성능 우려 (불필요한 대용량 응답)
- 아키텍처 우려 (프레젠테이션 레이어와 데이터 레이어 혼재)
- **데이터만 전달하고 뷰 프레젠테이션은 프론트엔드가 처리하는 접근 권장**

---

## Work Experience

### 우아한형제들 (배달의민족) | Web Frontend Team Lead
**2021.01 - Present (4+ years)**

- 10명 규모 웹 프론트엔드 팀 리드
- 주문/장바구니 서비스 핵심 아키텍처 설계 및 구현
- 30개 이상 주요 프로젝트 완수
- JavaScript 번들 크기 70% 감소, 성능 30% 개선 달성
- 전사 표준 개발 환경 정립 TF 핵심 멤버
- vitest 기반 테스팅 인프라 최초 구축
- 전사 웹표준 개발환경 RFC 핵심 참여자
- 테크 밋업 연사 및 내부 교육 세션 리더

### Kakao | Frontend Developer
**Year - 2021 (Approx 10+ years)**

대규모 서비스 프론트엔드 개발 및 아키텍처 설계

### SmileGate Stove | Frontend Developer
**Year - Year**

게임 플랫폼 웹 프론트엔드 개발

**Total Experience**: 18 years in Frontend Development

---

## Education

**Degree & University**  
[Your Degree] in [Your Major]  
[University Name], [Graduation Year]

---

## Technical Writing & Documentation

### 지속적인 주간 상태 리포트 (2021 - 2025)
250개 이상의 주간 문서 작성 ("김희준(YYYY-MM-DD)" 형식)
- 이번 주 작업
- 다음 주 작업
- 프로젝트 타임라인
- 기술적 블로커 및 결정사항
- VOC 이슈 대응

일관된 문서화 습관을 통해 지식 공유와 협업 촉진

### 프로젝트 문서화
- 프로젝트 계획 문서
- 아키텍처 의사결정 기록 (ADR)
- 팀 회의록
- 기술 세션 발표 자료
- 개발 가이드라인

---

## Key Strengths

### 1. 대규모 아키텍처 설계 및 마이그레이션
레거시 시스템을 모던 스택으로 전환하며 성능과 개발 생산성을 동시에 개선하는 능력. JavaScript 크기 70% 감소, 성능 30% 개선 등 정량적 성과 달성.

### 2. 표준화 및 기술 리더십
팀 전체의 개발 표준을 정립하고, RFC 프로세스를 주도하며, 전사 기술 방향에 영향을 미치는 리더십. 표준 개발 환경 TF, 전사 웹표준 RFC 핵심 참여.

### 3. 품질 중심 개발 문화 정착
테스팅 인프라 구축 (vitest, Jest, Cypress), 코드 리뷰 프로세스 개선, 20% 이상 테스트 커버리지 확보 등 품질 향상 이니셔티브 주도.

### 4. 크로스 기능팀 협업
PM, 디자인, 백엔드, QA, 모바일 팀과 긴밀히 협업하며 프로젝트를 성공적으로 완수하는 커뮤니케이션 능력.

### 5. 빠른 장애 대응 및 문제 해결
VFD 2.0 배포 당일 5시간 이내 장애 원인 파악 및 해결, 장애 포카요케 구축 등 신속하고 체계적인 장애 대응 능력.

### 6. 지속적인 학습 및 지식 공유
테크 밋업 연사, 내부 교육 세션 리더, 4년간 250개 이상의 주간 문서 작성 등 지속적인 학습과 지식 공유 활동.

---

## Quantifiable Achievements

- ✅ **30개 이상** 주요 프로젝트 완수 (2021-2025)
- ✅ JavaScript 번들 크기 **70% 감소**
- ✅ 평균 성능 **30% 이상 개선**
- ✅ 개발 생산성 **30% 이상 향상**
- ✅ 테스트 커버리지 **0% → 16% 달성** (vitest 인프라 구축)
- ✅ **250개 이상** 주간 상태 리포트 작성 (4년간)
- ✅ 고객서비스 개선 프로젝트 **96% TC 실행률, 90% 패스율**
- ✅ VFD 2.0 장애 대응 **5시간 이내 해결**
- ✅ 장애 포카요케 **2건 구축** (배포 프로세스 표준화)
- ✅ 표준 개발 환경 TF **8개월 완수** (React Query + Zustand + TypeScript 스택 정립)

---

## Contact & Links

📧 **Email**: [Your Email]  
💼 **LinkedIn**: [Your LinkedIn URL]  
🔗 **GitHub**: [Your GitHub URL]  
📝 **Blog**: [Your Blog URL] (optional)  
🐦 **Twitter**: [Your Twitter] (optional)

---

*Last Updated: November 2025*  
*This portfolio showcases 5 years of experience at Woowa Brothers (2021-2025)*