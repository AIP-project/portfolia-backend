# 🚀 Deployment Guide - Fly.io

Portfolia Backend 배포 가이드입니다.

## 📋 목차

- [현재 인프라](#현재-인프라)
- [일반 배포](#일반-배포)
- [환경변수 변경](#환경변수-변경)
- [로그 및 모니터링](#로그-및-모니터링)
- [롤백](#롤백)
- [트러블슈팅](#트러블슈팅)

---

## 현재 인프라

### 프로덕션 환경
- **호스팅**: Fly.io (무료 티어)
- **데이터베이스**: Neon PostgreSQL (무료 티어)
- **캐시**: Upstash Redis (무료 티어)
- **리전**: San Jose, California (sjc)

### 접속 정보
- **URL**: https://portfolia-backend.fly.dev
- **GraphQL Playground**: https://portfolia-backend.fly.dev/graphql
- **Health Check**: https://portfolia-backend.fly.dev/health

---

## 일반 배포

### 사전 요구사항
```bash
# Fly CLI 설치
brew install flyctl

# 로그인 (처음 한 번만)
flyctl auth login
```

### 배포 프로세스

#### 1. 코드 변경 후 빌드
```bash
# TypeScript 빌드
yarn build

# 린트 체크 (선택사항)
yarn lint

# 테스트 (선택사항)
yarn test
```

#### 2. 배포 실행
```bash
# 현재 상태 확인
flyctl status

# 배포
flyctl deploy

# 배포 후 로그 확인
flyctl logs
```

#### 3. 배포 확인
```bash
# 헬스 체크
curl https://portfolia-backend.fly.dev/health

# 앱 상태 확인
flyctl status

# GraphQL Playground 접속
open https://portfolia-backend.fly.dev/graphql
```

### 빠른 배포 (한 줄)
```bash
yarn build && flyctl deploy && flyctl logs
```

---

## 환경변수 변경

### 현재 Secrets 확인
```bash
flyctl secrets list
```

### 단일 Secret 변경
```bash
flyctl secrets set KEY_NAME="new_value"

# 예: API 키 변경
flyctl secrets set COIN_MARKET_CAP_API_KEY="new-api-key"
```

### 여러 Secrets 동시 변경
```bash
flyctl secrets set \
  KEY1="value1" \
  KEY2="value2" \
  KEY3="value3"
```

### 스크립트로 일괄 변경
```bash
# .env.fly.example을 수정 후
bash deploy/flyio-secrets-setup.sh
```

### Secret 삭제
```bash
flyctl secrets unset KEY_NAME
```

**⚠️ 주의**: Secret 변경 시 자동으로 앱이 재시작됩니다.

---

## 로그 및 모니터링

### 실시간 로그 보기
```bash
# 전체 로그
flyctl logs

# 최근 100줄만
flyctl logs -n 100

# 특정 인스턴스만
flyctl logs --machine <machine-id>
```

### 앱 상태 확인
```bash
# 상태 확인
flyctl status

# 실행 중인 머신 목록
flyctl machines list

# 특정 머신 상세 정보
flyctl machines show <machine-id>
```

### 데이터베이스 연결 확인
```bash
# Neon PostgreSQL 직접 접속
psql "postgresql://neondb_owner:npg_IBWa8niNUmP9@ep-morning-violet-a1mnf2fq-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

# 테이블 확인
\dt

# 레코드 수 확인
SELECT 'user' as table, COUNT(*) FROM "user"
UNION ALL SELECT 'account', COUNT(*) FROM account;
```

### 모니터링 대시보드
- **Fly.io**: https://fly.io/dashboard
- **Neon**: https://console.neon.tech
- **Upstash**: https://console.upstash.com

---

## 롤백

### 이전 버전으로 롤백
```bash
# 배포 히스토리 확인
flyctl releases

# 특정 버전으로 롤백
flyctl releases rollback <version-number>
```

### 긴급 롤백
```bash
# 바로 이전 버전으로
flyctl releases rollback
```

### Git을 통한 롤백
```bash
# 이전 커밋으로 되돌리기
git revert <commit-hash>
git push origin main

# 또는 강제 롤백
git reset --hard <commit-hash>
git push origin main --force

# 다시 배포
flyctl deploy
```

---

## 데이터베이스 마이그레이션

### Prisma 스키마 변경 시

#### 1. 로컬에서 마이그레이션 생성
```bash
# schema.prisma 수정 후
yarn prisma migrate dev --name describe_your_change

# 예: 새 필드 추가
yarn prisma migrate dev --name add_user_avatar_field
```

#### 2. Git에 커밋
```bash
git add prisma/migrations
git commit -m "Add user avatar field migration"
git push origin main
```

#### 3. 배포 (자동으로 migrate deploy 실행됨)
```bash
yarn build
flyctl deploy
```

### 마이그레이션 상태 확인
```bash
# Fly.io SSH 접속
flyctl ssh console

# 마이그레이션 상태 확인
npx prisma migrate status

# 종료
exit
```

---

## 트러블슈팅

### 1. 배포 실패 시

```bash
# 로그 확인
flyctl logs

# 특정 머신 재시작
flyctl machines restart <machine-id>

# 모든 머신 재시작
flyctl machines list
flyctl machines restart <machine-id-1>
flyctl machines restart <machine-id-2>
```

### 2. 데이터베이스 연결 오류

```bash
# DATABASE_URL 확인
flyctl secrets list | grep DATABASE_URL

# Neon 대시보드에서 연결 문자열 확인
# https://console.neon.tech

# Secret 재설정
flyctl secrets set DATABASE_URL="postgresql://..."
```

### 3. Redis 연결 오류

```bash
# Redis secrets 확인
flyctl secrets list | grep REDIS

# Upstash 대시보드에서 연결 정보 확인
# https://console.upstash.com

# Secret 재설정
flyctl secrets set \
  REDIS_HOST="..." \
  REDIS_PORT="6379" \
  REDIS_PASSWORD="..." \
  REDIS_TLS="true"
```

### 4. 빌드 실패

```bash
# 캐시 없이 재배포
flyctl deploy --no-cache

# 로컬에서 빌드 테스트
yarn build

# Docker 빌드 테스트 (로컬)
docker build -f deploy/Dockerfile -t portfolia-backend .
```

### 5. 메모리 부족

```bash
# 머신 스펙 확인
flyctl status

# 더 큰 머신으로 스케일 (유료)
flyctl scale memory 512

# 무료 티어 한도: 256MB
```

---

## 자동 배포 (GitHub Actions)

### 설정 방법

#### 1. Fly.io Deploy Token 생성
```bash
# 토큰 생성 (999999시간 = 영구)
flyctl tokens create deploy -x 999999h
```

#### 2. GitHub Secrets 등록
1. GitHub 저장소 → Settings → Secrets and variables → Actions
2. `New repository secret` 클릭
3. Name: `FLY_API_TOKEN`
4. Value: 위에서 생성한 토큰 붙여넣기

#### 3. GitHub Actions Workflow 확인
- 파일: `.github/workflows/deploy.yml`
- `main` 브랜치에 push하면 자동 배포

### 자동 배포 프로세스
```bash
# 코드 변경 후
git add .
git commit -m "feat: add new feature"
git push origin main

# GitHub Actions가 자동으로:
# 1. 코드 체크아웃
# 2. 의존성 설치
# 3. 빌드
# 4. Fly.io 배포
# 5. 배포 결과 알림
```

### 배포 상태 확인
- GitHub 저장소 → Actions 탭
- 실시간 로그 확인 가능

---

## 비용 관리

### 현재 무료 티어 사용 중
- **Fly.io**: $0/월 (무료 티어)
- **Neon PostgreSQL**: $0/월 (무료 티어, 0.5GB 스토리지)
- **Upstash Redis**: $0/월 (무료 티어, 10,000 명령/일)

### 무료 티어 제한
- **Fly.io**:
  - 최대 3개 shared-cpu-1x 머신
  - 256MB RAM per 머신
  - 3GB persistent volume 스토리지
- **Neon**:
  - 0.5GB 스토리지
  - 컴퓨트 시간 제한
- **Upstash**:
  - 10,000 명령/일
  - 256MB 메모리

### 사용량 모니터링
```bash
# Fly.io 리소스 사용량
flyctl status

# 각 서비스 대시보드에서 확인
```

---

## 추가 명령어

### SSH 접속
```bash
flyctl ssh console
```

### 데이터베이스 백업
```bash
# Neon 대시보드에서 수동 백업
# 또는 pg_dump 사용
pg_dump "postgresql://..." > backup.sql
```

### 앱 삭제 (주의!)
```bash
flyctl apps destroy portfolia-backend
```

---

## 문의 및 지원

- **Fly.io Community**: https://community.fly.io
- **Neon Docs**: https://neon.tech/docs
- **Upstash Docs**: https://docs.upstash.com

---

**마지막 업데이트**: 2025년 10월 27일
