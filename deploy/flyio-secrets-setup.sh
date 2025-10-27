#!/bin/bash

# ===================================================
# Fly.io Secrets 자동 설정 스크립트
# .env.fly 파일의 환경변수를 Fly.io에 등록합니다
# ===================================================

set -e  # 에러 발생 시 즉시 중단

echo "==================================="
echo "Fly.io Secrets 설정"
echo "==================================="
echo ""

# .env.fly 파일 존재 확인
if [ ! -f ".env.fly" ]; then
  echo "ERROR: .env.fly 파일이 없습니다."
  echo "먼저 .env.fly 파일을 생성해주세요."
  exit 1
fi

# Fly CLI 설치 확인
if ! command -v flyctl &> /dev/null; then
  echo "ERROR: flyctl이 설치되어 있지 않습니다."
  echo ""
  echo "설치 방법:"
  echo "  macOS: brew install flyctl"
  echo "  Linux: curl -L https://fly.io/install.sh | sh"
  exit 1
fi

# Fly.io 로그인 확인
if ! flyctl auth whoami &> /dev/null; then
  echo "ERROR: Fly.io에 로그인되어 있지 않습니다."
  echo "먼저 로그인해주세요: flyctl auth login"
  exit 1
fi

echo "✓ Fly CLI 확인 완료"
echo ""

# 앱 이름 확인
if [ ! -f "fly.toml" ]; then
  echo "ERROR: fly.toml 파일이 없습니다."
  echo "먼저 'flyctl launch --no-deploy'를 실행해주세요."
  exit 1
fi

APP_NAME=$(grep -E "^app = " fly.toml | sed 's/app = "\(.*\)"/\1/')
if [ -z "$APP_NAME" ]; then
  echo "ERROR: fly.toml에서 앱 이름을 찾을 수 없습니다."
  exit 1
fi

echo "앱 이름: $APP_NAME"
echo ""

# 주의 메시지
echo "⚠️  주의: 이 스크립트는 .env.fly의 모든 환경변수를 Fly.io secrets로 등록합니다."
echo "기존 secrets는 덮어쓰여질 수 있습니다."
echo ""
read -p "계속하시겠습니까? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "취소되었습니다."
  exit 0
fi

echo ""
echo "Secrets 등록 시작..."
echo ""

# .env.fly 파일 읽기 및 secrets 등록
# 주석과 빈 줄 제외, multiline 처리
SECRET_ARGS=""
CURRENT_KEY=""
CURRENT_VALUE=""
IN_MULTILINE=false

while IFS= read -r line || [ -n "$line" ]; do
  # 주석이나 빈 줄 건너뛰기
  if [[ "$line" =~ ^[[:space:]]*# ]] || [[ -z "${line// }" ]]; then
    continue
  fi

  # 새로운 키=값 시작
  if [[ "$line" =~ ^([A-Z_][A-Z0-9_]*)= ]]; then
    # 이전 키가 있다면 추가
    if [ -n "$CURRENT_KEY" ]; then
      # 마지막 따옴표 제거
      if [[ "$CURRENT_VALUE" =~ ^\'.*\'$ ]]; then
        CURRENT_VALUE="${CURRENT_VALUE:1:-1}"  # 앞뒤 따옴표 제거
      fi
      SECRET_ARGS="${SECRET_ARGS} ${CURRENT_KEY}=${CURRENT_VALUE}"
      echo "  ✓ ${CURRENT_KEY}"
    fi

    # 새 키-값 파싱
    CURRENT_KEY=$(echo "$line" | cut -d'=' -f1)
    CURRENT_VALUE=$(echo "$line" | cut -d'=' -f2-)

    # multiline 체크 (따옴표로 시작하지만 끝나지 않음)
    if [[ "$CURRENT_VALUE" =~ ^\' ]] && [[ ! "$CURRENT_VALUE" =~ \'$ ]]; then
      IN_MULTILINE=true
    else
      IN_MULTILINE=false
    fi
  elif [ "$IN_MULTILINE" = true ]; then
    # multiline 계속
    CURRENT_VALUE="${CURRENT_VALUE}
${line}"

    # multiline 종료 체크
    if [[ "$line" =~ \'$ ]]; then
      IN_MULTILINE=false
    fi
  fi
done < .env.fly

# 마지막 키-값 추가
if [ -n "$CURRENT_KEY" ]; then
  if [[ "$CURRENT_VALUE" =~ ^\'.*\'$ ]]; then
    CURRENT_VALUE="${CURRENT_VALUE:1:-1}"
  fi
  SECRET_ARGS="${SECRET_ARGS} ${CURRENT_KEY}=${CURRENT_VALUE}"
  echo "  ✓ ${CURRENT_KEY}"
fi

echo ""
echo "Fly.io에 secrets 등록 중..."

# flyctl secrets set 실행
# secrets는 한 번에 등록하는 것이 효율적
eval "flyctl secrets set${SECRET_ARGS}"

echo ""
echo "==================================="
echo "✓ Secrets 등록 완료!"
echo "==================================="
echo ""
echo "확인:"
echo "  flyctl secrets list"
echo ""
echo "다음 단계:"
echo "1. 앱 빌드 및 배포: flyctl deploy"
echo "2. 로그 확인: flyctl logs"
echo "3. 상태 확인: flyctl status"
