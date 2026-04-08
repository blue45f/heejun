# 32. 장애 대응 및 Sentry 표준 (2025-2026 Edition)

| 분류 | 품질 & 성능 | 상태 | Stable |
| :--- | :--- | :--- | :--- |
| **연관 가이드** | [30. 테스팅](./30_테스팅_가이드.md), [41. CI/CD](./41_CICD_파이프라인_표준.md) | **AI 도구** | Sentry AI, Claude Code |
| **핵심 테마** | Error Tracking, AI Post-mortem, Session Replay, Alerting | **Update** | 2025.04 |

---

> **"장애는 예방하는 것이 아니라, 관리하는 것이다. 빠른 탐지와 정확한 분석이 서비스의 신뢰를 만든다."**
> 본 가이드는 Sentry를 활용하여 장애를 모니터링하고, AI와 협업하여 근본 원인을 신속하게 파악하는 표준 프로세스를 다룹니다.

## 1. 에러 트래킹: Sentry SDK v8 최신 설정

프로덕션 환경에서의 에러를 추적하기 위해 소스 맵 연동과 세션 리플레이를 활성화합니다.

### 1.1 SDK 초기화 및 핵심 기능
```typescript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      // 민감한 정보는 자동으로 마스킹합니다.
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  // 성능 샘플링 (프로덕션에서는 낮게 조절)
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0, // 에러 발생 시 리플레이 100% 캡처
  environment: process.env.NODE_ENV,
});
```

### 1.2 소스 맵(Source Map) 업로드
빌드 시 자동으로 소스 맵을 Sentry 서버에 업로드하여 난독화된 코드에서도 원래의 위치를 파악합니다.

---

## 2. AI 기반 장애 분석: AI 포스트모템 (Post-mortem)

Sentry에서 제공하는 AI 도구를 활용하여 에러의 원인과 해결책을 자동으로 도출합니다.

### 2.1 AI 분석 워크플로우
1.  **에러 발생**: Sentry 대시보드에 신규 이슈 등록.
2.  **AI Insight**: Sentry AI가 유사 이슈와 스택 트레이스를 분석하여 해결 방법 제안.
3.  **Claude Code 연동**: 에러 로그를 AI(Claude)에게 전달하여 즉시 수정 코드를 제안받음.

**Prompt 예시:**
> "Sentry에서 발생한 이 에러 로그를 분석해줘. 유입된 데이터의 형식이 API 스펙과 다른 것 같아. Zod를 사용하여 방어 로직을 추가하는 코드를 작성해줘."

---

## 3. 알람 전략: 피로도 감소와 정확도 향상

모든 에러에 알람을 보내면 '알람 피로'로 인해 진짜 중요한 이슈를 놓칩니다.

*   **P0 (Critical)**: 결제 실패, 로그인 불능 등 핵심 기능 장애. Slack 전용 채널 + PagerDuty.
*   **P1 (High)**: 특정 기능 오작동, 간헐적 에러. Slack 전용 채널.
*   **P2 (Normal)**: UI 깨짐, 하위 기능 에러. 주간 리포트로 확인.

---

## 4. 장애 대응 5단계 프로세스

1.  **탐지 (Detection)**: Sentry 알람 수신.
2.  **전파 (Notification)**: 관련 팀원들에게 장애 사실 공유.
3.  **격리 및 복구 (Mitigation)**: 롤백(Rollback) 또는 핫픽스(Hotfix) 배포. (원인 파악보다 복구가 우선)
4.  **분석 (Analysis)**: Sentry 리플레이와 로그를 통한 근본 원인 파악.
5.  **예방 (Prevention)**: 유사 사례 방지를 위한 테스트 코드 추가 및 가이드 업데이트.

---

## ✅ 체크리스트
- [ ] 프로덕션 빌드 시 **소스 맵**이 Sentry에 정상적으로 업로드되나요?
- [ ] 에러 발생 시 사용자의 행동을 재현할 수 있는 **Session Replay**가 켜져 있나요?
- [ ] 에러의 우선순위에 따라 알람 채널이 분리되어 있나요?
- [ ] 장애 복구 후 해당 에러를 재발 방지하기 위한 **테스트 코드**가 추가되었나요?
- [ ] 민감한 사용자 정보가 Sentry 로그에 노출되지 않도록 마스킹 처리가 되었나요?
