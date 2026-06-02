# heejun.store 개인 프로젝트/운영 포털 기준

## 배포 상태 점검 체크리스트 (2026-05-30 기준)

## 1) 현재 상태 요약

- 대상: `PromptMarket`, `offhours`, `orbit-ui`, `pettography`, `react-boilerplates`, `remote-devtools`, `resume`, `rotifolk`, `spa-seo-gateway`, `webtoon-index`, `heejun`, `multi-environment-setting`
- 확인 기준: GitHub Actions 최신 배포 워크플로우 실행 시, 배포 단계(`Deploy*`)가 실제 실행되었는지 여부와 step 결론을 기준으로 집계

| 저장소                    | 배포 플랫폼/워크플로우                         | 최근 실행 상태                                                    | 미완료 원인                                                         | 조치 상태 |
| ------------------------- | ---------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------- | --------- |
| PromptMarket              | Vercel (`Deploy web to Vercel`)                | `Skip deployment when VERCEL_TOKEN is not configured` 후 스킵     | `VERCEL_TOKEN` 미설정                                               | 미완료    |
| offhours                  | Vercel (`Deploy web to Vercel`)                | `Skip deployment when VERCEL_TOKEN is not configured` 후 스킵     | `VERCEL_TOKEN` 미설정                                               | 미완료    |
| orbit-ui                  | Vercel (`Deploy Orbit UI storybook to Vercel`) | `Skip deployment when VERCEL_TOKEN is not configured` 후 스킵     | `VERCEL_TOKEN` 미설정                                               | 미완료    |
| pettography               | Vercel (`Deploy to Vercel`)                    | `Skip deployment when VERCEL_TOKEN is not configured` 후 스킵     | `VERCEL_TOKEN` 미설정                                               | 미완료    |
| react-boilerplates        | Vercel (`Deploy docs to Vercel`)               | `Skip deployment when VERCEL_TOKEN is not configured` 후 스킵     | `VERCEL_TOKEN` 미설정                                               | 미완료    |
| remote-devtools           | Vercel (`Deploy demo to Vercel`)               | `Validate deployment secrets` 실패                                | `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` 중 일부 미설정 | 부분 진행 |
| resume                    | Vercel (`Deploy client to Vercel`)             | `Skip deployment when VERCEL_TOKEN is not configured` 후 스킵     | `VERCEL_TOKEN` 미설정                                               | 미완료    |
| resume                    | GCP (`Deploy to GCP Cloud Run`)                | `Skip deployment when GCP credentials are not configured` 후 스킵 | GCP credentials 미설정                                              | 미완료    |
| rotifolk                  | Vercel (`Deploy web to Vercel`)                | `Skip deployment when VERCEL_TOKEN is not configured` 후 스킵     | `VERCEL_TOKEN` 미설정                                               | 미완료    |
| spa-seo-gateway           | Netlify (`Deploy Admin Demo to Netlify`)       | `Skip deployment when Netlify secrets are not configured` 후 스킵 | `NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID` 미설정                      | 미완료    |
| heejun                    | Netlify (`Deploy to Netlify`)                  | `Skip deployment when Netlify secrets are not configured` 후 스킵 | `NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID` 미설정                      | 미완료    |
| multi-environment-setting | AWS S3/CloudFront (`deploy.yml`)               | `if: vars.DEPLOY_CONFIG != ''` 조건으로 스킵된 흔적 다수          | `DEPLOY_CONFIG`, `SERVICES`, AWS OIDC/변수 미충분                   | 미완료    |

## 2) 바로 반영된 값(공개 메타데이터에서 추출 가능)

다음 값은 공개 메타데이터(`.vercel/project.json`)로 확인 가능한 `VERCEL_ORG_ID/VERCEL_PROJECT_ID`입니다.

- `orbit-ui`
  - `VERCEL_ORG_ID=team_dg5OVFLn94ulQlBfDX0yOHhA`
  - `VERCEL_PROJECT_ID=prj_1nZ11Q8y0tY9kXxnVoML4zMWErBg`

- `remote-devtools`
  - `VERCEL_ORG_ID=team_dg5OVFLn94ulQlBfDX0yOHhA`
  - `VERCEL_PROJECT_ID=prj_eJEwSsHvZacfKcyTiDS85hX5ERds`

- `resume`
  - `VERCEL_ORG_ID=team_dg5OVFLn94ulQlBfDX0yOHhA`
  - `VERCEL_PROJECT_ID=prj_0tJ7JVrSURQfAl3RYnSNga6Payg8`

> 이 값은 이미 각 레포지토리 레벨 시크릿에 반영해두었습니다.

## 3) 남은 체크 항목

### Vercel 공통

1. `VERCEL_TOKEN`(필수) 4개 저장소: `PromptMarket`, `offhours`, `orbit-ui`, `pettography`, `react-boilerplates`, `remote-devtools`, `resume`, `rotifolk`, `webtoon-index`
2. `remote-devtools`는 추가로 현재 workflow가 요구하는 `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`를 사용하며 이미 적용 완료
3. 토큰 발급: https://vercel.com/account/tokens
4. (선택) Vercel 대시보드에서 프로젝트 slug 일치 여부 검증: `resume`, `remote-devtools`, `orbit-ui`

### Netlify 공통

1. `NETLIFY_AUTH_TOKEN` 발급: https://app.netlify.com/user/applications#personal-access-tokens
2. `NETLIFY_SITE_ID`는 배포 대상 사이트의 Site ID
   - `heejun`
   - `spa-seo-gateway`
3. `Deploy to Netlify` / `Deploy Admin Demo to Netlify` 워크플로우에서 `NETLIFY_AUTH_TOKEN/NETLIFY_SITE_ID` 둘 다 비어 있으면 현재 스킵

### GCP (resume)

1. `GOOGLE_APPLICATION_CREDENTIALS`/OIDC 또는 Workload credential 구성
2. workflow 기준: `deploy-gcp.yml`

## 4) 적용 후 검증 루틴(요약)

1. 각 저장소에서 배포 관련 시크릿/변수 값 입력
2. `workflow_dispatch`로 배포 workflow 직접 실행
3. 최근 실행에서 `Deploy*` 단계가 `skipped`가 아닌 `success`인지 확인
4. 배포 대상 URL(https://... ) 핑 검사 + 주요 페이지 기본 로드 확인
