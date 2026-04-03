# 40. 인프라 및 AWS CDK 가이드 (2025-2026 Edition)

| 분류 | 인프라 & CI/CD | 상태 | Stable |
| :--- | :--- | :--- | :--- |
| **연관 가이드** | [41. CI/CD](./41_CICD_파이프라인_표준.md), [31. 성능](./31_성능_최적화_가이드.md) | **AI 도구** | AWS CDK, Claude Code |
| **핵심 테마** | PR별 Preview 환경, CloudFront OAC, GitHub OIDC, FinOps | **Update** | 2025.04 |

---

> **"인프라는 더 이상 고정된 자산이 아니라, 코드를 통해 유동적으로 생성되고 소멸되는 소프트웨어의 일부다."**
> 본 가이드는 AWS CDK v2를 활용하여 프론트엔드 배포를 자동화하고, PR별 독립적인 Preview 환경을 구축하는 방법을 다룹니다.

## 1. 현대적 배포 아키텍처: PR별 Preview

2026년 프론트엔드 팀의 필수 인프라는 **"모든 PR(Pull Request)이 각자 독립적인 URL을 갖는 것"**입니다. 이를 통해 배포 전 실제 환경에서 검증할 수 있습니다.

### 1.1 핵심 흐름
1.  **PR 생성**: GitHub Actions 워크플로우가 트리거됩니다.
2.  **CDK Deploy**: 해당 PR 번호를 이름으로 갖는 독립적인 S3 버킷과 CloudFront 환경이 생성됩니다.
3.  **PR 주석**: 생성된 고유 URL(예: `pr-123.preview.example.com`)이 PR의 댓글로 자동 등록됩니다.
4.  **PR 머지/닫힘**: 사용이 끝난 인프라가 자동으로 삭제(CDK Destroy)되어 비용을 절감합니다.

---

## 2. 보안 표준: CloudFront OAC

기존의 OAI(Origin Access Identity)는 이제 레거시입니다. AWS는 더 강력한 보안과 기능(S3 POST 요청 등)을 제공하는 **OAC(Origin Access Control)**를 권장합니다.

```typescript
// CDK v2 OAC 설정 예시
const bucket = new s3.Bucket(this, 'PreviewBucket', {
  removalPolicy: cdk.RemovalPolicy.DESTROY,
  autoDeleteObjects: true,
});

const oac = new cloudfront.CfnOriginAccessControl(this, 'OAC', {
  originAccessControlConfig: {
    name: 'OAC-Preview',
    originAccessControlOriginType: 's3',
    signingBehavior: 'always',
    signingProtocol: 'sigv4',
  },
});

const distribution = new cloudfront.Distribution(this, 'PreviewDist', {
  defaultBehavior: {
    origin: new origins.S3Origin(bucket),
    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
  },
});

// L1 설정을 통한 OAC 적용
const cfnDist = distribution.node.defaultChild as cloudfront.CfnDistribution;
cfnDist.addPropertyOverride('DistributionConfig.Origins.0.OriginAccessControlId', oac.attrId);
```

---

## 3. GitHub Actions 연동: OIDC 보안

더 이상 IAM 사용자의 `AWS_ACCESS_KEY_ID`를 GitHub Secrets에 저장하지 마세요. **OIDC(OpenID Connect)**를 통해 임시 자격 증명을 사용하는 것이 보안 표준입니다.

### 3.1 GitHub Actions 설정
```yaml
permissions:
  id-token: write # OIDC를 위해 필수
  contents: read

steps:
  - name: Configure AWS credentials
    uses: aws-actions/configure-aws-credentials@v4
    with:
      role-to-arn: arn:aws:iam::123456789:role/GitHubActionsRole
      aws-region: us-east-1
```

---

## 4. FinOps: 비용 가드레일 (Cost Guardrail)

Preview 환경은 기하급수적으로 늘어날 수 있습니다. 자동 삭제 로직은 필수입니다.

*   **CDK Removal Policy**: 모든 Preview 리소스는 `RemovalPolicy.DESTROY`를 적용합니다.
*   **GitHub Webhook**: PR이 닫히거나 머지될 때 `cdk destroy`가 실행되도록 워크플로우를 구성합니다.
*   **스케줄링 정리**: 가끔 삭제되지 않고 남은 리소스를 위해 매일 새벽 3시에 유휴 리소스를 일괄 삭제하는 람다 함수를 운영합니다.

---

## 💡 AI 기반 인프라 설계 워크플로우

AI(Claude Code)에게 인프라 코드를 요청할 때 다음과 같은 맥락을 제공하세요.

> **Prompt**: "React 19 앱을 위한 AWS CDK v2 코드를 작성해줘. S3와 CloudFront를 사용하고, 보안을 위해 OAC를 적용해야 해. 특히 PR 번호를 받아서 동적으로 버킷 이름을 생성하고, PR이 닫힐 때 리소스가 완전히 삭제되도록 RemovalPolicy를 설정해줘."

## ✅ 체크리스트
- [ ] IAM Access Key 대신 OIDC 역할을 사용 중인가요?
- [ ] CloudFront에 OAI 대신 **OAC**를 적용했나요?
- [ ] 모든 Preview 리소스에 `removalPolicy: cdk.RemovalPolicy.DESTROY`가 설정되었나요?
- [ ] PR URL이 자동으로 댓글에 남겨지도록 구성되었나요?
- [ ] WAF를 통해 Preview 환경에 IP 제한이나 Basic Auth가 적용되어 있나요?
