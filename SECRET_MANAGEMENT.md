# 🔐 Fly.io Secrets 관리 가이드

Portfolia Backend의 환경변수 및 시크릿 관리 방법을 안내합니다.

## 📋 목차

- [환경변수 vs Secrets](#환경변수-vs-secrets)
- [Secrets 조회](#secrets-조회)
- [Secrets 추가/수정](#secrets-추가수정)
- [Secrets 삭제](#secrets-삭제)
- [일괄 등록](#일괄-등록)
- [로컬 개발 환경](#로컬-개발-환경)
- [보안 모범 사례](#보안-모범-사례)

---

## 환경변수 vs Secrets

### fly.toml의 환경변수
```toml
[env]
  NODE_ENV = "production"
  APP_PORT = "3100"
```
- **용도**: 민감하지 않은 설정값 (포트, 환경 등)
- **특징**: fly.toml 파일에 평문으로 저장되며 Git에 커밋됨
- **예시**: NODE_ENV, APP_PORT, LOG_LEVEL

### Fly.io Secrets
```bash
flyctl secrets set DATABASE_URL="postgresql://..."
```
- **용도**: 민감한 정보 (비밀번호, API 키, 토큰)
- **특징**: 암호화되어 저장되며 Git에 커밋되지 않음
- **예시**: DATABASE_URL, API 키, JWT 키

⚠️ **중요**: 민감한 정보는 반드시 Secrets로 관리하세요!

---

## Secrets 조회

### 전체 Secrets 목록 확인
```bash
flyctl secrets list
```

출력 예시:
```
NAME                     DIGEST          CREATED AT
DATABASE_URL             a1b2c3d4        2025-10-27T12:00:00Z
REDIS_HOST               e5f6g7h8        2025-10-27T12:00:00Z
REDIS_PASSWORD           i9j0k1l2        2025-10-27T12:00:00Z
JWT_ACCESS_PRIVATE_KEY   m3n4o5p6        2025-10-27T12:00:00Z
```

**참고**: 보안을 위해 실제 값은 표시되지 않고 DIGEST만 표시됩니다.

### 특정 Secret 확인
```bash
# SSH로 접속하여 환경변수 확인
flyctl ssh console -C "printenv DATABASE_URL"
```

---

## Secrets 추가/수정

### 단일 Secret 설정
```bash
# 새로운 Secret 추가 또는 기존 Secret 수정
flyctl secrets set SECRET_NAME="secret_value"

# 예시: API 키 설정
flyctl secrets set COIN_MARKET_CAP_API_KEY="your-api-key-here"
```

⚠️ Secret을 설정하면 **앱이 자동으로 재시작**됩니다.

### 여러 Secrets 동시 설정
```bash
flyctl secrets set \
  KEY1="value1" \
  KEY2="value2" \
  KEY3="value3"
```

**예시**: Redis 설정
```bash
flyctl secrets set \
  REDIS_HOST="your-redis-host.upstash.io" \
  REDIS_PORT="6379" \
  REDIS_PASSWORD="your-redis-password" \
  REDIS_TLS="true"
```

---

## Secrets 삭제

### 단일 Secret 삭제
```bash
flyctl secrets unset SECRET_NAME

# 예시
flyctl secrets unset OLD_API_KEY
```

### 여러 Secrets 동시 삭제
```bash
flyctl secrets unset SECRET_NAME1 SECRET_NAME2 SECRET_NAME3
```

⚠️ Secret을 삭제하면 **앱이 자동으로 재시작**됩니다.

---

## 일괄 등록

현재 프로젝트는 Secrets를 일괄 등록하는 자동화 스크립트를 제공합니다.

### 방법 1: 자동화 스크립트 사용 (권장)

프로젝트에는 **`deploy/flyio-secrets-setup.sh`** 스크립트가 포함되어 있습니다.

#### 특징
- ✅ `.env.fly` 파일에서 자동으로 환경변수를 읽어서 등록
- ✅ Multiline 지원 (JWT 키 같은 여러 줄 값도 처리 가능)
- ✅ 에러 체크 및 확인 프롬프트
- ✅ fly.toml에서 앱 이름 자동 추출

#### 사용 방법

**1단계: .env.fly 파일 생성**
```bash
# .env.fly.example을 복사
cp .env.fly.example .env.fly

# .env.fly 파일을 열어서 실제 값으로 수정
vi .env.fly
# 또는
nano .env.fly
```

**2단계: 스크립트 실행**
```bash
# 실행 권한 부여 (처음 한 번만)
chmod +x deploy/flyio-secrets-setup.sh

# 스크립트 실행
./deploy/flyio-secrets-setup.sh
```

스크립트는 다음을 자동으로 수행합니다:
1. Fly CLI 설치 확인
2. Fly.io 로그인 확인
3. fly.toml에서 앱 이름 확인
4. .env.fly 파일 파싱 (주석 및 빈 줄 제외)
5. Multiline 값 처리 (JWT 키 등)
6. 모든 secrets를 Fly.io에 일괄 등록

**3단계: 확인**
```bash
flyctl secrets list
```

#### .env.fly 파일 예시
```bash
# 데이터베이스
DATABASE_URL='postgresql://user:password@host/database'

# Redis
REDIS_HOST='your-redis-host.upstash.io'
REDIS_PORT='6379'
REDIS_PASSWORD='your-redis-password'
REDIS_TLS='true'

# API Keys
COIN_MARKET_CAP_API_KEY='your-cmc-api-key'
EXCHANGE_RATE_API_KEY='your-exchange-rate-key'

# JWT Keys (multiline 지원)
JWT_ACCESS_PRIVATE_KEY='-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDbxT7Y...
...
-----END PRIVATE KEY-----'

# Crypto
CRYPTO_ALGORITHM='aes-256-cbc'
CRYPTO_SECRET_KEY='your-32-char-secret-key'
CRYPTO_IV='your-16-char-iv'
```

⚠️ **주의**: `.env.fly` 파일은 절대 Git에 커밋하지 마세요! (이미 .gitignore에 포함됨)

### 방법 2: 수동으로 등록
```bash
# 각 secret을 수동으로 등록
flyctl secrets set \
  DATABASE_URL="postgresql://..." \
  REDIS_HOST="..." \
  REDIS_PASSWORD="..."
```

---

## 로컬 개발 환경

### 환경별 파일 구조

프로젝트는 환경별로 구분된 파일을 사용합니다:

| 파일 | 용도 | Git 커밋 여부 |
|------|------|--------------|
| `.env` | 로컬 개발 환경 | ❌ (gitignore) |
| `.env.example` | 로컬 환경 템플릿 | ✅ |
| `.env.fly` | Fly.io 배포용 | ❌ (gitignore) |
| `.env.fly.example` | Fly.io 템플릿 | ✅ |

### 로컬 개발 설정

**1단계: .env 파일 생성**
```bash
cp .env.example .env
```

**2단계: 실제 값으로 수정**
```bash
# .env (로컬 개발용)
NODE_ENV=development
DATABASE_URL=postgresql://localhost:5432/portfolia
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
COIN_MARKET_CAP_API_KEY=your-local-development-key
EXCHANGE_RATE_API_KEY=your-local-exchange-key
```

### 프로덕션 배포 설정

**1단계: .env.fly 파일 생성**
```bash
cp .env.fly.example .env.fly
```

**2단계: 프로덕션 값으로 수정**
```bash
# .env.fly (Fly.io 배포용)
DATABASE_URL='postgresql://prod-user:prod-pass@prod-host/database'
REDIS_HOST='prod-redis.upstash.io'
REDIS_PORT='6379'
REDIS_PASSWORD='prod-redis-password'
REDIS_TLS='true'
COIN_MARKET_CAP_API_KEY='prod-cmc-key'
```

**3단계: Fly.io에 등록**
```bash
./deploy/flyio-secrets-setup.sh
```

---

## 보안 모범 사례

### ✅ 해야 할 것

1. **민감한 정보는 Fly.io Secrets로 관리**
   ```bash
   flyctl secrets set DATABASE_URL="..."
   ```

2. **.env 파일을 .gitignore에 추가**
   ```gitignore
   .env
   .env.local
   .env.*.local
   ```

3. **.env.example 파일 제공**
   - 필요한 환경변수 목록을 명시
   - 실제 값은 비워두기

4. **정기적으로 Secrets 갱신**
   ```bash
   # 6개월마다 API 키 및 비밀번호 갱신 권장
   flyctl secrets set API_KEY="new-key"
   ```

5. **JWT 키는 충분히 강력하게**
   ```bash
   # RSA 2048비트 이상 권장
   openssl genrsa -out private.pem 2048
   openssl rsa -in private.pem -pubout -out public.pem
   ```

### ❌ 하지 말아야 할 것

1. **절대 Git에 커밋하지 않기**
   - `.env` 파일
   - `secrets.txt` 파일
   - 하드코딩된 비밀번호

2. **fly.toml에 민감한 정보 넣지 않기**
   ```toml
   # ❌ 잘못된 예
   [env]
     DATABASE_URL = "postgresql://user:password@..."  # 절대 안됨!

   # ✅ 올바른 예
   [env]
     NODE_ENV = "production"  # 민감하지 않은 정보만
   ```

3. **Secrets를 로그에 출력하지 않기**
   ```typescript
   // ❌ 잘못된 예
   console.log('Database URL:', process.env.DATABASE_URL)

   // ✅ 올바른 예
   console.log('Database connected successfully')
   ```

---

## Secrets 백업

### 현재 Secrets 목록 저장
```bash
# Secrets 이름만 저장 (값은 저장되지 않음)
flyctl secrets list > secrets-backup.txt
```

### 복원 시
값은 수동으로 입력해야 합니다:
```bash
cat secrets-backup.txt
# 각 Secret을 하나씩 설정
flyctl secrets set SECRET_NAME="value"
```

---

## 트러블슈팅

### Secret 변경 후 앱이 시작되지 않음
```bash
# 로그 확인
flyctl logs

# SSH로 접속하여 환경변수 확인
flyctl ssh console -C "printenv"

# 잘못된 Secret 수정
flyctl secrets set PROBLEMATIC_SECRET="correct-value"
```

### Secret이 적용되지 않음
```bash
# 앱 재시작
flyctl apps restart portfolia-backend

# 배포 상태 확인
flyctl status
```

### Secret 값 확인이 필요한 경우
```bash
# SSH 접속
flyctl ssh console

# 환경변수 확인
printenv | grep SECRET_NAME

# 종료
exit
```

---

## 현재 프로젝트의 필수 Secrets

다음 Secrets가 설정되어 있어야 합니다:

### 데이터베이스
- `DATABASE_URL`: Neon PostgreSQL 연결 문자열

### Redis
- `REDIS_HOST`: Upstash Redis 호스트
- `REDIS_PORT`: Redis 포트 (기본 6379)
- `REDIS_PASSWORD`: Redis 비밀번호
- `REDIS_TLS`: TLS 사용 여부 (true)

### API Keys
- `COIN_MARKET_CAP_API_KEY`: CoinMarketCap API 키
- `EXCHANGE_RATE_API_KEY`: 환율 API 키

### JWT
- `JWT_ACCESS_PRIVATE_KEY`: JWT Access Token 개인키
- `JWT_ACCESS_PUBLIC_KEY`: JWT Access Token 공개키
- `JWT_REFRESH_PRIVATE_KEY`: JWT Refresh Token 개인키
- `JWT_REFRESH_PUBLIC_KEY`: JWT Refresh Token 공개키
- `JWT_ACCESS_EXPIRES_IN`: Access Token 만료 시간 (예: "1d")
- `JWT_REFRESH_EXPIRES_IN`: Refresh Token 만료 시간 (예: "7d")

### 암호화
- `CRYPTO_ALGORITHM`: 암호화 알고리즘 (예: "aes-256-cbc")
- `CRYPTO_SECRET_KEY`: 암호화 비밀키
- `CRYPTO_IV`: 암호화 IV

### 확인 방법
```bash
flyctl secrets list
```

---

## 추가 리소스

- **Fly.io Secrets 문서**: https://fly.io/docs/reference/secrets/
- **환경변수 설정**: https://fly.io/docs/reference/configuration/#the-env-variables-section
- **보안 모범 사례**: https://fly.io/docs/reference/security/

---

**마지막 업데이트**: 2025년 10월 28일
