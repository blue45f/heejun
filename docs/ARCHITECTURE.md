# Heejun Site Architecture

이 저장소는 정적 HTML 사이트와 개발 가이드 문서를 관리합니다. 별도 패키지 매니저 런타임 없이 Node.js 검증 스크립트로 문서 구조와 추천 항목을 점검합니다.

> 비유: **도서관**과 비슷합니다 — `public/`은 책장(콘텐츠), `scripts/`는 사서(검증), `index.html`은 입구 안내판, GitHub Actions는 야간 자동 점검 직원입니다.

## 설계 원칙

1. **정적 배포 우선** - `index.html`과 `public/` 아래 문서를 그대로 배포 가능한 형태로 유지합니다.
2. **문서 검증 자동화** - 개발 가이드와 추천 템플릿은 `scripts/`의 Node.js 검증기로 구조를 확인합니다.
3. **콘텐츠와 검증 분리** - 실제 문서는 `public/`에 두고, 검증 로직은 `scripts/`에만 둡니다.
4. **CI 표준화** - GitHub Actions의 `CI`와 `Verify` 워크플로우는 Node.js 설정 후 검증 스크립트를 실행합니다.

### 시스템 데이터 흐름

```mermaid
flowchart LR
  Author["문서 작성자"] -->|"마크다운 작성"| Public["public/개발가이드/*.md"]
  Public -->|"읽기"| Static["index.html"]
  Static -->|"호스팅"| Users["방문자"]

  Public -->|"검증 대상"| Scripts["scripts/validate-*.mjs"]
  Scripts --> CI["GitHub Actions CI/Verify"]
  CI -->|"통과"| Merge["main 브랜치 머지"]
  CI -->|"실패"| Block["PR 머지 차단"]

  style Public fill:#e8f5e9,stroke:#2e7d32
  style Scripts fill:#fff3e0,stroke:#f57c00
  style CI fill:#e3f2fd,stroke:#1565c0
```

## 구조

```text
.
├── index.html
├── README.md
├── public/
│   ├── 개발가이드/
│   ├── 경력증명서/
│   ├── 연봉 협의/
│   ├── 자격증/
│   └── 졸업증명서/
└── scripts/
    ├── validate-dev-guides.mjs
    └── validate-recommendation-templates.mjs
```

### 디렉토리 책임 분리

```mermaid
flowchart TD
  Root["저장소 루트"]
  Root --> Index["index.html<br/>(진입점)"]
  Root --> Public["public/<br/>(콘텐츠)"]
  Root --> Scripts["scripts/<br/>(검증 로직)"]
  Root --> Docs["docs/<br/>(메타 문서)"]
  Root --> GH[".github/<br/>(CI/CD)"]

  Public --> Guide["개발가이드/"]
  Public --> Cert["자격증/"]
  Public --> Career["경력증명서/"]

  Scripts --> V1["validate-dev-guides.mjs"]
  Scripts --> V2["validate-recommendation-templates.mjs"]

  GH --> WF["workflows/<br/>(CI, Verify)"]

  style Public fill:#e8f5e9
  style Scripts fill:#fff3e0
  style GH fill:#e3f2fd
```

## 품질 게이트

| 명령 | 목적 |
| --- | --- |
| `node --check scripts/validate-dev-guides.mjs` | 개발 가이드 검증기 문법 확인 |
| `node scripts/validate-dev-guides.mjs` | 개발 가이드 구조와 링크 검증 |
| `node --check scripts/validate-recommendation-templates.mjs` | 추천 템플릿 검증기 문법 확인 |
| `node scripts/validate-recommendation-templates.mjs` | 추천 템플릿 구조 검증 |

### 검증 파이프라인 흐름

```mermaid
sequenceDiagram
  participant Dev as 개발자
  participant Git as GitHub
  participant CI as GitHub Actions
  participant Verify as Node 검증 스크립트

  Dev->>Git: PR 생성
  Git->>CI: workflow 트리거
  CI->>CI: Node.js 설정
  CI->>Verify: node --check (문법)
  alt 문법 OK
    Verify-->>CI: pass
    CI->>Verify: node validate-*.mjs (구조)
    alt 구조 OK
      Verify-->>CI: pass
      CI-->>Git: 머지 가능
      Git-->>Dev: 리뷰 요청 진행
    else 구조 실패
      Verify-->>CI: fail (오류 상세)
      CI-->>Dev: PR에 실패 코멘트
    end
  else 문법 실패
    Verify-->>CI: SyntaxError
    CI-->>Dev: 스크립트 수정 필요
  end
```

## 확장 규칙

새 문서 카테고리는 `public/<category>/` 아래에 추가합니다. 문서 구조나 링크 규칙을 바꿀 때는 `scripts/validate-dev-guides.mjs`를 함께 갱신하고, 추천 템플릿 형식이 바뀌면 `scripts/validate-recommendation-templates.mjs`를 갱신합니다.

### 새 문서 추가 결정 트리

```mermaid
flowchart TD
  Start{"어떤 문서를 추가하나?"}
  Start -->|"개발 가이드"| G1["public/개발가이드/NN_제목.md"]
  Start -->|"증명/이력"| G2["public/<카테고리>/"]
  Start -->|"새 카테고리"| G3["public/<신규>/ 생성"]

  G1 --> V{"검증 규칙 변경 필요?"}
  G2 --> V
  G3 --> Update["scripts/validate-dev-guides.mjs 갱신"]
  V -->|"예"| Update
  V -->|"아니오"| Done["PR 생성"]
  Update --> Done
```
