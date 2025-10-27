# GitHub Actions 자동 배포 설정 가이드

이 문서는 GitHub Actions를 통한 자동 배포를 설정하는 방법을 안내합니다.

## 📋 사전 요구사항

- GitHub 저장소 접근 권한 (Settings > Secrets)
- Fly.io CLI 설치 및 로그인

## 🔑 1단계: Fly.io Deploy Token 생성

### 토큰 생성
```bash
flyctl tokens create deploy -x 999999h
```

출력 예시:
```
FlyV1 fm2_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

⚠️ **중요**: 이 토큰은 다시 확인할 수 없으니 안전한 곳에 복사해두세요!

## 🔐 2단계: GitHub Secrets 등록

### GitHub 저장소 설정
1. GitHub 저장소로 이동
2. **Settings** 탭 클릭
3. 왼쪽 메뉴에서 **Secrets and variables** → **Actions** 클릭
4. **New repository secret** 버튼 클릭
5. Secret 추가:
   - **Name**: `FLY_API_TOKEN`
   - **Value**: 위에서 생성한 토큰 전체 붙여넣기
6. **Add secret** 클릭

## ✅ 3단계: 자동 배포 확인

### Workflow 파일 확인
`.github/workflows/deploy.yml` 파일이 이미 생성되어 있습니다.

### 자동 배포 테스트
```bash
# 1. 코드 변경
echo "# Test" >> README.md

# 2. 커밋 및 푸시
git add .
git commit -m "test: GitHub Actions auto deploy"
git push origin main

# 3. GitHub Actions 확인
# GitHub 저장소 → Actions 탭에서 실행 상태 확인
```

## 🚀 작동 방식

### 트리거
- `main` 브랜치에 push할 때마다 자동 실행
- 수동 실행도 가능 (Actions 탭에서 "Run workflow")

### 배포 프로세스
1. 코드 체크아웃
2. Node.js 20 설정
3. 의존성 설치 (yarn)
4. Prisma 클라이언트 생성
5. TypeScript 빌드
6. Fly.io CLI 설정
7. Fly.io 배포
8. 배포 상태 확인
9. 성공 알림

### 소요 시간
- 평균 5-10분

## 📊 배포 모니터링

### GitHub Actions
- **URL**: `https://github.com/<username>/<repo>/actions`
- 실시간 로그 확인 가능
- 실패 시 이메일 알림

### Fly.io
```bash
# 배포 히스토리
flyctl releases

# 현재 상태
flyctl status

# 로그 확인
flyctl logs
```

## 🔧 트러블슈팅

### 배포 실패 시

#### 1. Token 오류
```
Error: authentication failed
```
**해결**: GitHub Secrets의 `FLY_API_TOKEN` 확인

#### 2. 빌드 오류
```
Error: yarn build failed
```
**해결**: 로컬에서 `yarn build` 테스트 후 수정

#### 3. 권한 오류
```
Error: insufficient permissions
```
**해결**: Fly.io 계정에서 앱 접근 권한 확인

### 로그 확인
```bash
# GitHub Actions 로그
# GitHub 저장소 → Actions → 실패한 workflow 클릭

# Fly.io 로그
flyctl logs
```

## 🛡️ 보안

### Token 관리
- ✅ GitHub Secrets에 저장 (암호화됨)
- ✅ 절대 코드에 하드코딩하지 않기
- ✅ 주기적으로 토큰 재생성 권장 (6개월마다)

### Token 재생성
```bash
# 1. 새 토큰 생성
flyctl tokens create deploy -x 999999h

# 2. GitHub Secrets 업데이트
# Settings → Secrets and variables → Actions
# FLY_API_TOKEN 편집

# 3. 이전 토큰 삭제
flyctl tokens list
flyctl tokens revoke <token-id>
```

## 💡 추가 기능

### 배포 전 테스트 추가
`.github/workflows/deploy.yml`에 추가:
```yaml
      - name: Run tests
        run: yarn test

      - name: Run linter
        run: yarn lint
```

### Slack 알림 추가
```yaml
      - name: Notify Slack
        if: always()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### 환경별 배포 (staging/production)
```yaml
on:
  push:
    branches:
      - main      # production
      - develop   # staging
```

## 📝 수동 배포

자동 배포를 건너뛰고 수동 배포하려면:

```bash
# 로컬에서 배포
yarn build
flyctl deploy
```

또는 GitHub Actions를 일시 중단:

1. `.github/workflows/deploy.yml` 파일 이름 변경
2. 또는 파일 삭제

## ✅ 설정 완료 체크리스트

- [ ] Fly.io deploy token 생성
- [ ] GitHub Secrets에 `FLY_API_TOKEN` 등록
- [ ] `.github/workflows/deploy.yml` 파일 확인
- [ ] `main` 브랜치에 push하여 테스트
- [ ] GitHub Actions 탭에서 성공 확인
- [ ] https://portfolia-backend.fly.dev 접속 확인

---

**도움이 필요하신가요?**
- GitHub Actions 문서: https://docs.github.com/en/actions
- Fly.io 문서: https://fly.io/docs
