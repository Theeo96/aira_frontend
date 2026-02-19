# Azure Static Web Apps CI/CD 설정 가이드

## 문제 해결

이 문서는 Azure Static Web Apps와 GitHub Actions CI/CD 연동 시 발생하는 문제를 해결하는 방법을 설명합니다.

## 에러 원인

```
The content server has rejected the request with: BadRequest
Reason: No matching Static Web App was found or the api key was invalid.
```

이 에러는 다음과 같은 이유로 발생합니다:
1. GitHub Secrets에 Azure Static Web Apps API 토큰이 설정되지 않았거나
2. 설정된 토큰이 현재 Azure Static Web App과 일치하지 않는 경우

## 해결 방법

### 1. Azure Portal에서 API 토큰 확인

1. [Azure Portal](https://portal.azure.com)에 로그인
2. 해당 Static Web App 리소스로 이동
3. 좌측 메뉴에서 "개요(Overview)" 선택
4. "배포 토큰 관리(Manage deployment token)" 클릭
5. 표시되는 토큰 값을 복사

### 2. GitHub Repository에 Secret 설정

1. GitHub 리포지토리 페이지로 이동
2. `Settings` → `Secrets and variables` → `Actions` 메뉴 선택
3. 기존 `AZURE_STATIC_WEB_APPS_API_TOKEN_ICY_GROUND_0066BB800` secret 확인
   - 없으면 "New repository secret" 클릭
   - 있으면 해당 secret을 클릭하여 업데이트
4. Name: `AZURE_STATIC_WEB_APPS_API_TOKEN_ICY_GROUND_0066BB800`
5. Value: Azure Portal에서 복사한 토큰 값 붙여넣기
6. "Add secret" 또는 "Update secret" 클릭

### 3. 워크플로우 재실행

1. GitHub 리포지토리의 `Actions` 탭으로 이동
2. 실패한 워크플로우 실행 선택
3. "Re-run all jobs" 클릭

## 워크플로우 설정 확인사항

현재 워크플로우는 다음과 같이 구성되어 있습니다:

- **Build 방식**: Vite를 사용하여 빌드
- **Output 디렉토리**: `dist`
- **App 위치**: `/dist` (빌드된 파일)
- **Skip app build**: `true` (워크플로우에서 이미 빌드를 수행하므로)

### 빌드 과정

워크플로우는 다음 단계를 수행합니다:

1. 코드 체크아웃
2. OIDC 토큰 획득 (GitHub Actions에서 Azure 간 인증용)
3. `npm ci` - 의존성 설치
4. `npm run build` - Vite로 애플리케이션 빌드 (환경변수 포함)
5. Azure Static Web Apps에 배포 - API 토큰과 OIDC 토큰을 함께 사용하여 `/dist` 디렉토리의 빌드된 파일 업로드

## 환경 변수

빌드 시 다음 환경 변수가 필요합니다:
- `GEMINI_API_KEY`: GitHub Secrets에 설정 필요

## 주의사항

- Fork 한 리포지토리의 원본 API 토큰은 사용할 수 없습니다
- 각 Azure Static Web App은 고유한 배포 토큰을 가집니다
- 토큰은 절대 코드에 하드코딩하지 마세요 (항상 GitHub Secrets 사용)
- PR이 닫힐 때도 Azure Static Web Apps에 알림이 가도록 `close_pull_request_job`이 설정되어 있습니다

## 추가 지원

문제가 계속되면 다음을 확인하세요:
- Azure Static Web App이 정상적으로 생성되었는지
- GitHub Actions에서 사용하는 secret 이름이 워크플로우 파일의 이름과 정확히 일치하는지
- Azure Portal에서 Static Web App의 상태가 정상인지
