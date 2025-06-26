#!/bin/bash

# =============================================================================
# GCP Cloud SQL to Local MySQL 데이터베이스 복제 스크립트
# macOS 호환성 개선 버전 (bash 3.x 지원)
# 중복 함수 제거, 복원 확인 프롬프트 제거, 자동 백업 파일 정리 추가 버전
# =============================================================================

set -e  # 에러 발생시 스크립트 중단

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로그 함수
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# =============================================================================
# 환경별 설정 변수들
# =============================================================================

# 환경 변수 (staging 또는 prod)
ENVIRONMENT=""

# Staging 환경 설정
STAGING_REMOTE_HOST="34.22.105.118"
STAGING_REMOTE_PORT="53306"
STAGING_REMOTE_USER="root"
STAGING_SSH_USER="greatbooms"
STAGING_SSH_HOST="34.22.105.118"
STAGING_SSH_PORT="22"
STAGING_LOCAL_TUNNEL_PORT="40008"

# Production 환경 설정 (TODO: 프로덕션 정보로 업데이트 필요)
PROD_REMOTE_HOST=""  # TODO: 프로덕션 DB 호스트
PROD_REMOTE_PORT=""  # TODO: 프로덕션 DB 포트
PROD_REMOTE_USER=""  # TODO: 프로덕션 DB 사용자
PROD_SSH_USER=""     # TODO: 프로덕션 SSH 사용자
PROD_SSH_HOST=""     # TODO: 프로덕션 SSH 호스트
PROD_SSH_PORT="22"
PROD_LOCAL_TUNNEL_PORT="40009"  # staging과 다른 포트 사용

# 현재 환경에 따른 설정 변수들
REMOTE_HOST=""
REMOTE_PORT=""
REMOTE_USER=""
REMOTE_PASSWORD=""  # 비워두면 프롬프트에서 입력받음
REMOTE_DB="aip_db"        # 비워두면 모든 데이터베이스, 특정 DB만 복제하려면 DB명 입력

# 로컬 MySQL 설정
LOCAL_HOST="127.0.0.1"
LOCAL_PORT="3306"
LOCAL_USER="root"
LOCAL_PASSWORD="aipqlalfqjsgh123!"   # 비워두면 프롬프트에서 입력받음

# SSH 터널 설정
SSH_USER=""
SSH_HOST=""
SSH_PORT=""
SSH_KEY_PATH="./deploy/keys/bastion-host-key"  # 프로젝트의 실제 SSH 키 경로
LOCAL_TUNNEL_PORT=""

# 백업 파일 설정
BACKUP_DIR=""  # setup_backup_directory()에서 설정됨
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE=""  # 나중에 설정됨
SCRIPT_CREATED_BACKUP_FILE="" # 스크립트가 생성한 백업 파일 경로 (정리용)

# mysqldump 옵션
MYSQLDUMP_OPTIONS="--single-transaction --routines --triggers --events --hex-blob --complete-insert --disable-keys --extended-insert --protocol=TCP --ssl-mode=DISABLED --set-gtid-purged=OFF"

# =============================================================================
# 함수 정의
# =============================================================================

# 환경별 설정 로드
load_environment_config() {
    local env=$1

    case $env in
        "staging")
            log_info "Staging 환경 설정 로드 중..."
            REMOTE_HOST="$STAGING_REMOTE_HOST"
            REMOTE_PORT="$STAGING_REMOTE_PORT"
            REMOTE_USER="$STAGING_REMOTE_USER"
            SSH_USER="$STAGING_SSH_USER"
            SSH_HOST="$STAGING_SSH_HOST"
            SSH_PORT="$STAGING_SSH_PORT"
            LOCAL_TUNNEL_PORT="$STAGING_LOCAL_TUNNEL_PORT"
            ;;
        "prod")
            log_info "Production 환경 설정 로드 중..."

            # 프로덕션 설정이 비어있는지 확인
            if [ -z "$PROD_REMOTE_HOST" ]; then
                log_error "프로덕션 환경 설정이 완료되지 않았습니다"
                log_info "스크립트 상단의 PROD_* 변수들을 설정해주세요"
                return 1
            fi

            REMOTE_HOST="$PROD_REMOTE_HOST"
            REMOTE_PORT="$PROD_REMOTE_PORT"
            REMOTE_USER="$PROD_REMOTE_USER"
            SSH_USER="$PROD_SSH_USER"
            SSH_HOST="$PROD_SSH_HOST"
            SSH_PORT="$PROD_SSH_PORT"
            LOCAL_TUNNEL_PORT="$PROD_LOCAL_TUNNEL_PORT"
            ;;
        *)
            log_error "지원하지 않는 환경: $env"
            log_info "지원되는 환경: staging, prod"
            return 1
            ;;
    esac

    log_success "환경 설정 로드 완료: $env"
    log_info "원격 호스트: $REMOTE_HOST:$REMOTE_PORT"
    log_info "SSH 호스트: $SSH_HOST:$SSH_PORT"
    log_info "로컬 터널 포트: $LOCAL_TUNNEL_PORT"
}

# 환경 설정 유효성 검사
validate_environment_config() {
    local missing_vars=()

    [ -z "$REMOTE_HOST" ] && missing_vars+=("REMOTE_HOST")
    [ -z "$REMOTE_PORT" ] && missing_vars+=("REMOTE_PORT")
    [ -z "$REMOTE_USER" ] && missing_vars+=("REMOTE_USER")
    [ -z "$SSH_USER" ] && missing_vars+=("SSH_USER")
    [ -z "$SSH_HOST" ] && missing_vars+=("SSH_HOST")
    [ -z "$SSH_PORT" ] && missing_vars+=("SSH_PORT")
    [ -z "$LOCAL_TUNNEL_PORT" ] && missing_vars+=("LOCAL_TUNNEL_PORT")

    if [ ${#missing_vars[@]} -ne 0 ]; then
        log_error "다음 설정 값들이 누락되었습니다: ${missing_vars[*]}"
        return 1
    fi

    return 0
}

# 환경별 설정 표시
show_current_config() {
    log_info "현재 환경 설정:"
    echo "  환경: $ENVIRONMENT"
    echo "  원격 DB: $REMOTE_HOST:$REMOTE_PORT"
    echo "  SSH: $SSH_USER@$SSH_HOST:$SSH_PORT"
    echo "  터널 포트: $LOCAL_TUNNEL_PORT"
    echo "  백업 디렉토리: $BACKUP_DIR"
}

# 프로덕션 설정 확인
check_prod_config() {
    log_warning "⚠️  프로덕션 환경 설정 확인 필요 ⚠️"
    echo "현재 프로덕션 설정이 비어있습니다. 다음 정보를 스크립트에 추가해주세요:"
    echo
    echo "PROD_* 변수들:"
    echo "  PROD_REMOTE_HOST: GCP Cloud SQL 프로덕션 IP"
    echo "  PROD_REMOTE_PORT: 프로덕션 MySQL 포트"
    echo "  PROD_REMOTE_USER: 프로덕션 DB 사용자명"
    echo "  PROD_SSH_USER: 프로덕션 SSH 사용자명"
    echo "  PROD_SSH_HOST: 프로덕션 SSH 호스트"
    echo
}

# 환경별 백업 디렉토리 생성
setup_backup_directory() {
    BACKUP_DIR="./db_backups/${ENVIRONMENT}"
    mkdir -p ${BACKUP_DIR}
    log_success "백업 디렉토리 생성: ${BACKUP_DIR}"
}

# SSH 키 파일 존재 여부 확인
check_ssh_key() {
    local key_path="${SSH_KEY_PATH/#\~/$HOME}"  # ~ 경로를 실제 홈 디렉토리로 변환

    log_info "SSH 키 파일 확인: $key_path"

    if [ ! -f "$key_path" ]; then
        log_error "SSH 키 파일을 찾을 수 없습니다: $key_path"
        log_info "SSH 키 생성 방법:"
        log_info "  1. ssh-keygen -t rsa -b 4096 -C \"your_email@example.com\""
        log_info "  2. ssh-copy-id ${SSH_USER}@${SSH_HOST}"
        log_info "또는 기존 SSH 키 경로를 스크립트에서 수정하세요"
        return 1
    fi

    # 키 파일 권한 확인
    local perms=$(stat -c "%a" "$key_path" 2>/dev/null || stat -f "%A" "$key_path" 2>/dev/null)
    if [ "$perms" != "600" ] && [ "$perms" != "400" ]; then
        log_warning "SSH 키 파일 권한이 안전하지 않습니다: $perms"
        log_info "권한 수정: chmod 600 $key_path"
        chmod 600 "$key_path" 2>/dev/null || {
            log_error "SSH 키 파일 권한 수정 실패"
            return 1
        }
        log_success "SSH 키 파일 권한을 600으로 수정했습니다"
    fi

    log_success "SSH 키 파일 확인 완료: $key_path"
    return 0
}

# SSH 연결 테스트
test_ssh_connection() {
    log_info "SSH 연결 테스트 중..."

    local key_path="${SSH_KEY_PATH/#\~/$HOME}"
    local ssh_cmd="ssh -i \"$key_path\" -p ${SSH_PORT} -o ConnectTimeout=10 -o BatchMode=yes -o StrictHostKeyChecking=no ${SSH_USER}@${SSH_HOST} \"echo 'SSH 연결 성공'\""

    log_info "실행 명령어: ssh -i \"$key_path\" -p ${SSH_PORT} -o ConnectTimeout=10 -o BatchMode=yes -o StrictHostKeyChecking=no ${SSH_USER}@${SSH_HOST} \"echo 'SSH 연결 성공'\""

    # SSH 연결 테스트 (짧은 타임아웃으로)
    if ssh -i "$key_path" \
           -p ${SSH_PORT} \
           -o ConnectTimeout=10 \
           -o BatchMode=yes \
           -o StrictHostKeyChecking=no \
           ${SSH_USER}@${SSH_HOST} \
           "echo 'SSH 연결 성공'" 2>/dev/null; then
        log_success "SSH 연결 테스트 성공"
        return 0
    else
        log_error "SSH 연결 테스트 실패"
        log_info "다음 사항을 확인해주세요:"
        log_info "  1. SSH 키가 서버에 등록되어 있는지 확인"
        log_info "  2. 사용자명과 호스트 주소 확인: ${SSH_USER}@${SSH_HOST}"
        log_info "  3. 포트 번호 확인: ${SSH_PORT}"
        log_info "  4. 방화벽 설정 확인"
        return 1
    fi
}

# 시작 전 포트 정리
cleanup_existing_tunnels() {
    log_info "기존 SSH 터널 정리 중..."

    # 환경이 설정되기 전이므로 모든 알려진 포트 확인
    local check_ports=("40008" "40009")

    for port in "${check_ports[@]}"; do
        if nc -z localhost ${port} 2>/dev/null; then
            log_warning "포트 ${port}가 이미 사용 중입니다. 정리합니다."

            # 해당 포트의 SSH 터널 프로세스 찾아서 종료
            local ssh_pids=$(ps aux | grep "ssh.*${port}:" | grep -v grep | awk '{print $2}' 2>/dev/null || true)
            if [ -n "$ssh_pids" ]; then
                echo "$ssh_pids" | xargs kill -TERM 2>/dev/null || true
                sleep 1
                echo "$ssh_pids" | xargs kill -KILL 2>/dev/null || true
            fi

            # 다른 프로세스도 확인
            local other_pids=$(lsof -ti :${port} 2>/dev/null || true)
            if [ -n "$other_pids" ]; then
                log_warning "포트 ${port}를 사용하는 다른 프로세스: $other_pids"
                echo "$other_pids" | xargs kill -TERM 2>/dev/null || true
                sleep 1
            fi
        fi
    done

    sleep 1
    log_success "기존 터널 정리 완료"
}

# SSH 터널 생성
create_ssh_tunnel() {
    log_info "SSH 터널 생성 중..."

    local key_path="${SSH_KEY_PATH/#\~/$HOME}"

    # 해당 포트가 이미 사용 중인지 확인하고 정리
    if nc -z localhost ${LOCAL_TUNNEL_PORT} 2>/dev/null; then
        log_warning "포트 ${LOCAL_TUNNEL_PORT}가 이미 사용 중입니다. 기존 연결을 정리합니다."

        # 해당 포트를 사용하는 SSH 터널 프로세스 종료
        local existing_pids=$(ps aux | grep "ssh.*${LOCAL_TUNNEL_PORT}:" | grep -v grep | awk '{print $2}' 2>/dev/null || true)
        if [ -n "$existing_pids" ]; then
            echo "$existing_pids" | xargs kill -TERM 2>/dev/null || true
            sleep 2
            echo "$existing_pids" | xargs kill -KILL 2>/dev/null || true
        fi

        # 다른 프로세스도 정리
        local other_pids=$(lsof -ti :${LOCAL_TUNNEL_PORT} 2>/dev/null || true)
        if [ -n "$other_pids" ]; then
            echo "$other_pids" | xargs kill -TERM 2>/dev/null || true
            sleep 1
        fi

        # 정리 후 잠시 대기
        sleep 2
    fi

    # SSH 터널 생성 (백그라운드 실행)
    # 중간 컴퓨트 서버(bastion)를 통해 localhost:53306으로 터널링
    log_info "새로운 SSH 터널 생성: localhost:${LOCAL_TUNNEL_PORT} -> localhost:${REMOTE_PORT} (via bastion)"

    local ssh_tunnel_cmd="ssh -f -N -L ${LOCAL_TUNNEL_PORT}:localhost:${REMOTE_PORT} -p ${SSH_PORT} -i \"$key_path\" -o ConnectTimeout=30 -o ServerAliveInterval=60 -o ServerAliveCountMax=3 -o StrictHostKeyChecking=no -o ExitOnForwardFailure=yes ${SSH_USER}@${SSH_HOST}"

    log_info "실행 명령어: ssh -f -N -L ${LOCAL_TUNNEL_PORT}:localhost:${REMOTE_PORT} -p ${SSH_PORT} -i \"$key_path\" [SSH 옵션들] ${SSH_USER}@${SSH_HOST}"

    ssh -f -N -L ${LOCAL_TUNNEL_PORT}:localhost:${REMOTE_PORT} \
        -p ${SSH_PORT} \
        -i "$key_path" \
        -o ConnectTimeout=30 \
        -o ServerAliveInterval=60 \
        -o ServerAliveCountMax=3 \
        -o StrictHostKeyChecking=no \
        -o ExitOnForwardFailure=yes \
        ${SSH_USER}@${SSH_HOST}

    local ssh_exit_code=$?

    if [ $ssh_exit_code -ne 0 ]; then
        log_error "SSH 터널 생성 명령 실패 (exit code: $ssh_exit_code)"
        return 1
    fi

    # 터널 연결 대기 (최대 15초)
    local wait_count=0
    while [ $wait_count -lt 15 ]; do
        if nc -z localhost ${LOCAL_TUNNEL_PORT} 2>/dev/null; then
            log_success "SSH 터널이 성공적으로 생성되었습니다 (localhost:${LOCAL_TUNNEL_PORT})"

            # 터널 프로세스 정보 표시
            local tunnel_pid=$(ps aux | grep "ssh.*${LOCAL_TUNNEL_PORT}:" | grep -v grep | awk '{print $2}' | head -1)
            if [ -n "$tunnel_pid" ]; then
                log_info "터널 프로세스 PID: $tunnel_pid"
            fi

            # MySQL 연결 테스트 (bastion 서버에서 확인된 방식으로)
            log_info "터널을 통한 MySQL 연결 테스트 중..."
            local test_cmd="timeout 5 bash -c '</dev/tcp/localhost/${LOCAL_TUNNEL_PORT}'"
            log_info "실행 명령어: $test_cmd"

            if timeout 5 bash -c "</dev/tcp/localhost/${LOCAL_TUNNEL_PORT}" 2>/dev/null; then
                log_success "SSH 터널을 통한 MySQL 서버 연결 확인"
            else
                log_warning "SSH 터널은 열려있지만 MySQL 서버까지의 연결 확인 실패"
                log_info "bastion 서버의 cloud-sql-proxy 상태를 확인해보세요"
            fi

            return 0
        fi
        sleep 1
        wait_count=$((wait_count + 1))
        log_info "터널 연결 대기 중... ($wait_count/15)"
    done

    log_error "SSH 터널 생성에 실패했습니다 (연결 타임아웃)"
    # 실패한 SSH 프로세스 정리
    local failed_pids=$(ps aux | grep "ssh.*${LOCAL_TUNNEL_PORT}:" | grep -v grep | awk '{print $2}' 2>/dev/null || true)
    if [ -n "$failed_pids" ]; then
        echo "$failed_pids" | xargs kill -KILL 2>/dev/null || true
    fi
    return 1
}

# SSH 터널 종료
close_ssh_tunnel() {
    log_info "SSH 터널 종료 중..."

    # 현재 환경의 터널 포트가 설정되어 있으면 사용, 아니면 기본값들 사용
    local ports_to_check=()

    if [ -n "$LOCAL_TUNNEL_PORT" ]; then
        ports_to_check+=("$LOCAL_TUNNEL_PORT")
    fi

    # 기본 포트들도 확인 (혹시 모를 상황 대비)
    ports_to_check+=("40008" "40009")

    for port in "${ports_to_check[@]}"; do
        # SSH 터널 프로세스 종료
        local ssh_pids=$(ps aux | grep "ssh.*${port}:" | grep -v grep | awk '{print $2}' 2>/dev/null || true)
        if [ -n "$ssh_pids" ]; then
            log_info "포트 ${port}의 SSH 터널 프로세스 종료 중..."
            echo "$ssh_pids" | xargs kill -TERM 2>/dev/null || true
            sleep 1
            # 강제 종료가 필요한 경우
            echo "$ssh_pids" | xargs kill -KILL 2>/dev/null || true
        fi

        # 포트를 사용하는 다른 프로세스도 확인
        local port_pids=$(lsof -ti :${port} 2>/dev/null || true)
        if [ -n "$port_pids" ]; then
            log_warning "포트 ${port}를 사용하는 다른 프로세스 발견: $port_pids"
            log_info "필요시 수동으로 종료하세요: kill $port_pids"
        fi
    done

    # pkill로도 한번 더 정리
    pkill -f "ssh.*40008:" 2>/dev/null || true
    pkill -f "ssh.*40009:" 2>/dev/null || true

    # 포트 해제 확인
    sleep 1
    for port in "${ports_to_check[@]}"; do
        if ! nc -z localhost ${port} 2>/dev/null; then
            log_success "포트 ${port} 해제 완료"
        else
            log_warning "포트 ${port}가 여전히 사용 중입니다"
        fi
    done

    log_success "SSH 터널 종료 완료"
}

# 포트 강제 해제 (독립 함수)
force_cleanup_ports() {
    log_info "모든 SSH 터널 포트 강제 정리 중..."

    # 알려진 터널 포트들
    local all_ports=("40008" "40009")

    for port in "${all_ports[@]}"; do
        log_info "포트 ${port} 정리 중..."

        # 해당 포트를 사용하는 모든 프로세스 찾기
        local pids=$(lsof -ti :${port} 2>/dev/null || true)

        if [ -n "$pids" ]; then
            log_info "포트 ${port}를 사용하는 프로세스: $pids"

            # TERM 신호로 정상 종료 시도
            echo "$pids" | xargs kill -TERM 2>/dev/null || true
            sleep 2

            # 아직 살아있으면 KILL 신호로 강제 종료
            local remaining_pids=$(lsof -ti :${port} 2>/dev/null || true)
            if [ -n "$remaining_pids" ]; then
                log_warning "포트 ${port} 강제 종료: $remaining_pids"
                echo "$remaining_pids" | xargs kill -KILL 2>/dev/null || true
            fi
        fi

        # SSH 터널 관련 프로세스 정리
        pkill -f "ssh.*${port}:" 2>/dev/null || true
    done

    sleep 1
    log_success "포트 정리 완료"
}

# 비밀번호 입력받기
get_passwords() {
    if [ -z "$REMOTE_PASSWORD" ]; then
        echo -n "원격 MySQL 비밀번호를 입력하세요: "
        read -s REMOTE_PASSWORD
        echo
    fi

    # 백업만 수행하는 경우 로컬 비밀번호 생략
    if [ "$BACKUP_ONLY" = "true" ]; then
        log_info "백업만 수행하므로 로컬 MySQL 비밀번호는 생략합니다"
        LOCAL_PASSWORD="dummy"  # 더미 값
        return 0
    fi

    if [ -z "$LOCAL_PASSWORD" ]; then
        echo -n "로컬 MySQL 비밀번호를 입력하세요: "
        read -s LOCAL_PASSWORD
        echo
    fi
}

# 연결 테스트
test_connections() {
    log_info "데이터베이스 연결 테스트 중..."

    # 원격 연결 테스트 (SSH 터널 통해서)
    log_info "원격 데이터베이스 연결 테스트: localhost:${LOCAL_TUNNEL_PORT}"

    # MySQL 연결 명령어
    local mysql_test_cmd_safe="mysql -h localhost -P ${LOCAL_TUNNEL_PORT} -u ${REMOTE_USER} -p*** --protocol=TCP --ssl-mode=DISABLED -e \"SELECT 1 as test_connection;\""

    log_info "실행 명령어: $mysql_test_cmd_safe"

    # 연결 테스트 시 더 상세한 오류 정보 출력
    local mysql_output
    mysql_output=$(mysql -h localhost -P ${LOCAL_TUNNEL_PORT} -u ${REMOTE_USER} -p${REMOTE_PASSWORD} --protocol=TCP --ssl-mode=DISABLED -e "SELECT 1 as test_connection;" 2>&1)
    local mysql_exit_code=$?

    if [ $mysql_exit_code -eq 0 ]; then
        log_success "원격 데이터베이스 연결 성공"
        log_info "연결 결과: $mysql_output"
    else
        log_error "원격 데이터베이스 연결 실패 (exit code: $mysql_exit_code)"
        log_error "오류 메시지: $mysql_output"

        # 추가 진단 정보
        log_info "=== 연결 문제 진단 시작 ==="

        # 1. 터널 포트 상태 재확인
        log_info "1. 터널 포트 상태 재확인:"
        local nc_test_cmd="nc -z localhost ${LOCAL_TUNNEL_PORT}"
        log_info "실행 명령어: $nc_test_cmd"
        if nc -z localhost ${LOCAL_TUNNEL_PORT} 2>/dev/null; then
            log_success "포트 ${LOCAL_TUNNEL_PORT} 열려있음"
        else
            log_error "포트 ${LOCAL_TUNNEL_PORT} 닫혀있음 - SSH 터널 문제"
        fi

        # 2. SSH 터널 프로세스 확인
        log_info "2. SSH 터널 프로세스 확인:"
        local ps_cmd="ps aux | grep \"ssh.*${LOCAL_TUNNEL_PORT}:\" | grep -v grep"
        log_info "실행 명령어: $ps_cmd"
        local tunnel_processes=$(ps aux | grep "ssh.*${LOCAL_TUNNEL_PORT}:" | grep -v grep)
        if [ -n "$tunnel_processes" ]; then
            log_info "터널 프로세스: $tunnel_processes"
        else
            log_error "SSH 터널 프로세스가 없습니다"
        fi

        log_info "=== 연결 문제 진단 완료 ==="

        # 일반적인 연결 실패 원인들 안내
        log_info "연결 실패 원인 확인사항:"
        log_info "  1. 비밀번호가 올바른지 확인"
        log_info "  2. 사용자명이 올바른지 확인 (현재: $REMOTE_USER)"
        log_info "  3. SSH 터널이 정상 작동하는지 확인"
        log_info "  4. bastion 서버의 cloud-sql-proxy가 실행 중인지 확인"
        log_info "  5. MySQL 사용자 권한 확인 (원격 접속 허용 여부)"
        log_info "  6. bastion 서버에서 직접 연결 테스트: mysql -h localhost -P ${REMOTE_PORT} -u ${REMOTE_USER} --protocol=TCP -p"

        return 1
    fi

    # 백업만 수행하는 경우 로컬 연결 테스트 생략
    if [ "$BACKUP_ONLY" = "true" ]; then
        log_info "백업만 수행하므로 로컬 MySQL 연결 테스트를 생략합니다"
        return 0
    fi

    # 로컬 연결 테스트
    log_info "로컬 데이터베이스 연결 테스트: ${LOCAL_HOST}:${LOCAL_PORT}"

    local local_mysql_cmd_safe="mysql -h ${LOCAL_HOST} -P ${LOCAL_PORT} -u ${LOCAL_USER} -p*** --protocol=TCP --ssl-mode=DISABLED -e \"SELECT 1 as test_connection;\""

    log_info "실행 명령어: $local_mysql_cmd_safe"

    local local_mysql_output
    local_mysql_output=$(mysql -h ${LOCAL_HOST} -P ${LOCAL_PORT} -u ${LOCAL_USER} -p${LOCAL_PASSWORD} --protocol=TCP --ssl-mode=DISABLED -e "SELECT 1 as test_connection;" 2>&1)
    local local_mysql_exit_code=$?

    if [ $local_mysql_exit_code -eq 0 ]; then
        log_success "로컬 데이터베이스 연결 성공"
        log_info "연결 결과: $local_mysql_output"
    else
        log_error "로컬 데이터베이스 연결 실패 (exit code: $local_mysql_exit_code)"
        log_error "오류 메시지: $local_mysql_output"
        log_info "로컬 MySQL 서버가 실행 중인지 확인하세요"
        log_info "Docker MySQL 확인: docker ps | grep mysql"
        log_info "설치 방법: brew install mysql && brew services start mysql"
        return 1
    fi
}

# 원격 데이터베이스 백업
backup_remote_db() {
    log_info "원격 데이터베이스 백업 중... (환경: $ENVIRONMENT)"

    # 백업 파일명에 환경 정보 포함
    BACKUP_FILE="${BACKUP_DIR}/${ENVIRONMENT}_db_backup_${TIMESTAMP}.sql"
    SCRIPT_CREATED_BACKUP_FILE="$BACKUP_FILE" # 정리할 파일로 지정

    if [ -z "$REMOTE_DB" ]; then
        # 모든 데이터베이스 백업 (시스템 DB 제외)
        local mysqldump_cmd_safe="mysqldump -h localhost -P ${LOCAL_TUNNEL_PORT} -u ${REMOTE_USER} -p*** ${MYSQLDUMP_OPTIONS} --all-databases [시스템 테이블 제외]"
        log_info "실행 명령어: $mysqldump_cmd_safe > ${BACKUP_FILE}"

        mysqldump -h localhost -P ${LOCAL_TUNNEL_PORT} \
                  -u ${REMOTE_USER} -p${REMOTE_PASSWORD} \
                  ${MYSQLDUMP_OPTIONS} \
                  --all-databases \
                  --ignore-table=mysql.user \
                  --ignore-table=mysql.db \
                  --ignore-table=mysql.tables_priv \
                  --ignore-table=mysql.columns_priv \
                  --ignore-table=mysql.procs_priv \
                  --ignore-table=mysql.proxies_priv > ${BACKUP_FILE}
    else
        # 특정 데이터베이스만 백업 (데이터베이스 생성 구문 포함)
        local mysqldump_cmd_safe="mysqldump -h localhost -P ${LOCAL_TUNNEL_PORT} -u ${REMOTE_USER} -p*** ${MYSQLDUMP_OPTIONS} --databases ${REMOTE_DB}"
        log_info "실행 명령어: $mysqldump_cmd_safe > ${BACKUP_FILE}"

        mysqldump -h localhost -P ${LOCAL_TUNNEL_PORT} \
                  -u ${REMOTE_USER} -p${REMOTE_PASSWORD} \
                  ${MYSQLDUMP_OPTIONS} \
                  --databases ${REMOTE_DB} > ${BACKUP_FILE}
    fi

    local dump_exit_code=$?

    if [ $dump_exit_code -eq 0 ]; then
        log_success "백업 완료: ${BACKUP_FILE}"
        log_info "백업 파일 크기: $(du -h ${BACKUP_FILE} | cut -f1)"

        # 백업 파일에 환경 정보 주석 추가
        local temp_file="${BACKUP_FILE}.tmp"
        {
            echo "-- Database backup from ${ENVIRONMENT} environment"
            echo "-- Backup created at: $(date)"
            echo "-- Source: ${REMOTE_HOST}:${REMOTE_PORT}"
            echo "-- "
            cat "${BACKUP_FILE}"
        } > "$temp_file"

        mv "$temp_file" "${BACKUP_FILE}"
        log_info "백업 파일에 환경 정보 추가 완료"

        # 백업된 데이터베이스 정보 표시
        if [ -n "$REMOTE_DB" ]; then
            log_info "백업된 데이터베이스: ${REMOTE_DB}"
        else
            log_info "전체 데이터베이스 백업 완료"
        fi
    else
        log_error "백업 실패 (exit code: $dump_exit_code)"
        return 1
    fi
}

# 백업된 데이터베이스 자동 감지
detect_backup_database() {
    local backup_file="$1"

    # 백업 파일에서 데이터베이스명 추출
    local db_name=$(grep -m 1 "^USE \`" "$backup_file" 2>/dev/null | sed "s/USE \`//g" | sed "s/\`;//g" || true)

    if [ -z "$db_name" ]; then
        # CREATE DATABASE 구문에서 추출
        db_name=$(grep -m 1 "^CREATE DATABASE" "$backup_file" 2>/dev/null | awk '{print $3}' | sed "s/\`//g" | sed "s/;//g" || true)
    fi

    echo "$db_name"
}

# 로컬 데이터베이스로 복원
restore_to_local() {
    log_info "로컬 데이터베이스 복원 시작: ${BACKUP_FILE}"

    # 백업 파일 분석
    log_info "백업 파일 분석 중..."
    local detected_db=$(detect_backup_database "$BACKUP_FILE")

    if [ -n "$detected_db" ]; then
        log_info "감지된 데이터베이스: $detected_db"

        # 로컬에 데이터베이스가 존재하는지 확인
        log_info "로컬 데이터베이스 존재 여부 확인 중..."
        local db_exists=$(mysql -h ${LOCAL_HOST} -P ${LOCAL_PORT} -u ${LOCAL_USER} -p${LOCAL_PASSWORD} --protocol=TCP --ssl-mode=DISABLED -e "SHOW DATABASES LIKE '${detected_db}';" 2>/dev/null | grep -c "$detected_db" || echo "0")

        if [ "$db_exists" -eq 0 ]; then
            log_warning "데이터베이스 '$detected_db'가 로컬에 존재하지 않습니다. 새로 생성합니다."
            log_info "데이터베이스 생성 중: $detected_db"
            local create_cmd_safe="mysql -h ${LOCAL_HOST} -P ${LOCAL_PORT} -u ${LOCAL_USER} -p*** --protocol=TCP --ssl-mode=DISABLED -e \"CREATE DATABASE IF NOT EXISTS \\\`${detected_db}\\\`;\""
            log_info "실행 명령어: $create_cmd_safe"

            mysql -h ${LOCAL_HOST} -P ${LOCAL_PORT} \
                  -u ${LOCAL_USER} -p${LOCAL_PASSWORD} \
                  --protocol=TCP --ssl-mode=DISABLED \
                  -e "CREATE DATABASE IF NOT EXISTS \`${detected_db}\`;"

            if [ $? -eq 0 ]; then
                log_success "데이터베이스 생성 완료: $detected_db"
            else
                log_error "데이터베이스 생성 실패"
                return 1
            fi
        else
            log_info "데이터베이스 '$detected_db'가 이미 존재합니다. 데이터를 덮어씁니다."
        fi
    else
        log_info "전체 데이터베이스 백업으로 감지됨. 로컬에 복원합니다."
    fi

    local restore_cmd_safe="mysql -h ${LOCAL_HOST} -P ${LOCAL_PORT} -u ${LOCAL_USER} -p*** --protocol=TCP --ssl-mode=DISABLED < ${BACKUP_FILE}"
    log_info "실행 명령어: $restore_cmd_safe"

    # 복원 실행
    mysql -h ${LOCAL_HOST} -P ${LOCAL_PORT} \
          -u ${LOCAL_USER} -p${LOCAL_PASSWORD} \
          --protocol=TCP --ssl-mode=DISABLED < ${BACKUP_FILE}

    local restore_exit_code=$?

    if [ $restore_exit_code -eq 0 ]; then
        log_success "로컬 데이터베이스 복원 완료"

        if [ -n "$detected_db" ]; then
            log_info "복원된 데이터베이스: $detected_db"

            # 테이블 수 확인
            local table_count=$(mysql -h ${LOCAL_HOST} -P ${LOCAL_PORT} -u ${LOCAL_USER} -p${LOCAL_PASSWORD} --protocol=TCP --ssl-mode=DISABLED -e "USE \`${detected_db}\`; SHOW TABLES;" 2>/dev/null | wc -l)
            log_info "복원된 테이블 수: $((table_count - 1))"
        fi
    else
        log_error "로컬 데이터베이스 복원 실패 (exit code: $restore_exit_code)"
        return 1
    fi
}


# 데이터베이스 목록 확인
show_databases() {
    log_info "원격 데이터베이스 목록 (환경: $ENVIRONMENT):"

    local remote_db_cmd_safe="mysql -h localhost -P ${LOCAL_TUNNEL_PORT} -u ${REMOTE_USER} -p*** --protocol=TCP --ssl-mode=DISABLED -e \"SHOW DATABASES;\""
    log_info "실행 명령어: $remote_db_cmd_safe"

    mysql -h localhost -P ${LOCAL_TUNNEL_PORT} \
          -u ${REMOTE_USER} -p${REMOTE_PASSWORD} \
          --protocol=TCP --ssl-mode=DISABLED \
          -e "SHOW DATABASES;" | grep -v "Database\|information_schema\|performance_schema\|mysql\|sys"

    echo
    log_info "로컬 데이터베이스 목록:"

    local local_db_cmd_safe="mysql -h ${LOCAL_HOST} -P ${LOCAL_PORT} -u ${LOCAL_USER} -p*** --protocol=TCP --ssl-mode=DISABLED -e \"SHOW DATABASES;\""
    log_info "실행 명령어: $local_db_cmd_safe"

    mysql -h ${LOCAL_HOST} -P ${LOCAL_PORT} \
          -u ${LOCAL_USER} -p${LOCAL_PASSWORD} \
          --protocol=TCP --ssl-mode=DISABLED \
          -e "SHOW DATABASES;" | grep -v "Database\|information_schema\|performance_schema\|mysql\|sys"
}

# 정리 작업
cleanup() {
    log_info "정리 작업 중..."
    close_ssh_tunnel

    # 추가 안전 정리 (혹시 모를 좀비 프로세스들)
    pkill -f "ssh.*40008:" 2>/dev/null || true
    pkill -f "ssh.*40009:" 2>/dev/null || true

    # 스크립트가 생성한 백업 파일 정리 (백업만 하는 경우가 아니고, 파일이 존재할 경우)
    if [ "$BACKUP_ONLY" != "true" ] && [ -n "$SCRIPT_CREATED_BACKUP_FILE" ] && [ -f "$SCRIPT_CREATED_BACKUP_FILE" ]; then
        log_info "임시 백업 파일 제거: $SCRIPT_CREATED_BACKUP_FILE"
        rm -f "$SCRIPT_CREATED_BACKUP_FILE"
        # .tmp 파일도 혹시 모르니 제거 시도
        rm -f "${SCRIPT_CREATED_BACKUP_FILE}.tmp" 2>/dev/null || true
    elif [ "$BACKUP_ONLY" = "true" ] && [ -n "$SCRIPT_CREATED_BACKUP_FILE" ]; then
         log_info "백업만 수행했으므로 백업 파일을 유지합니다: $SCRIPT_CREATED_BACKUP_FILE"
    fi
}

# 긴급 정리 (SIGINT, SIGTERM 신호 처리)
emergency_cleanup() {
    log_warning "스크립트가 중단되었습니다. 긴급 정리를 수행합니다..."
    force_cleanup_ports
    exit 1
}

# 도움말
show_help() {
    echo "GCP Cloud SQL to Local MySQL 복제 스크립트 (환경별 지원)"
    echo
    echo "사용법: $0 <환경> [옵션]"
    echo
    echo "환경:"
    echo "  staging                 Staging 환경에서 복제"
    echo "  prod                    Production 환경에서 복제"
    echo
    echo "옵션:"
    echo "  -h, --help              이 도움말 표시"
    echo "  -d, --database DB명     특정 데이터베이스만 복제"
    echo "  -l, --list-only         데이터베이스 목록만 확인"
    echo "  -b, --backup-only       백업만 수행 (복원하지 않음, 백업 파일 유지)"
    echo "  -r, --restore FILE      기존 백업 파일로부터 복원 (해당 파일은 삭제하지 않음)"
    echo "  -c, --config            현재 환경 설정 표시"
    echo "  --check-prod            프로덕션 설정 상태 확인"
    echo "  --cleanup               모든 SSH 터널 포트 강제 정리"
    echo
    echo "예시:"
    echo "  $0 staging              # Staging 환경 전체 복제 (백업 파일 자동 삭제)"
    echo "  $0 staging -d myapp_db  # Staging의 myapp_db만 복제 (백업 파일 자동 삭제)"
    echo "  $0 prod -l              # Production 데이터베이스 목록만 확인"
    echo "  $0 staging -b           # Staging 백업만 수행 (백업 파일 유지)"
    echo "  $0 staging -r backup.sql # 기존 백업으로부터 복원 (backup.sql 유지)"
    echo "  $0 staging -c           # Staging 환경 설정 확인"
    echo "  $0 --check-prod         # 프로덕션 설정 상태 확인"
    echo "  $0 --cleanup            # 모든 SSH 터널 포트 강제 정리"
    echo
    echo "환경별 설정:"
    echo "  • Staging: 34.22.105.118:53306 (포트 40008)"
    echo "  • Production: 미설정 (포트 40009)"
    echo
    echo "포트 문제 해결:"
    echo "  터널 포트가 이미 사용 중이면 --cleanup 옵션을 먼저 실행하세요"
}

# =============================================================================
# 메인 실행 부분
# =============================================================================

# 명령행 인수 처리
BACKUP_ONLY="false"
LIST_ONLY="false"
RESTORE_FILE=""
SHOW_CONFIG="false"
CHECK_PROD="false"

# 첫 번째 인수가 환경인지 확인
if [[ $# -eq 0 ]]; then
    log_error "환경을 지정해주세요: staging 또는 prod"
    show_help
    exit 1
fi

# 첫 번째 인수 처리
case $1 in
    staging|prod)
        ENVIRONMENT=$1
        shift
        ;;
    --check-prod)
        check_prod_config
        exit 0
        ;;
    --cleanup)
        force_cleanup_ports
        exit 0
        ;;
    -h|--help)
        show_help
        exit 0
        ;;
    *)
        log_error "첫 번째 인수는 환경(staging/prod) 또는 --check-prod, --cleanup, --help 이어야 합니다"
        show_help
        exit 1
        ;;
esac

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -d|--database)
            REMOTE_DB="$2"
            shift 2
            ;;
        -l|--list-only)
            LIST_ONLY="true"
            shift
            ;;
        -b|--backup-only)
            BACKUP_ONLY="true"
            shift
            ;;
        -r|--restore)
            RESTORE_FILE="$2"
            shift 2
            ;;
        -c|--config)
            SHOW_CONFIG="true"
            shift
            ;;
        *)
            log_error "알 수 없는 옵션: $1"
            show_help
            exit 1
            ;;
    esac
done

# 메인 실행
main() {
    log_info "=== GCP Cloud SQL to Local MySQL 복제 시작 (환경: $ENVIRONMENT) ==="

    # 시작 전 기존 터널 정리
    cleanup_existing_tunnels

    # 환경별 설정 로드
    if ! load_environment_config "$ENVIRONMENT"; then
        exit 1
    fi

    # 설정 유효성 검사
    if ! validate_environment_config; then
        exit 1
    fi

    # SSH 키 파일 확인
    if ! check_ssh_key; then
        exit 1
    fi

    # SSH 연결 테스트
    if ! test_ssh_connection; then
        exit 1
    fi

    # 백업 디렉토리 설정
    setup_backup_directory

    # 설정 표시 옵션
    if [ "$SHOW_CONFIG" = "true" ]; then
        show_current_config
        exit 0
    fi

    # SSH 터널 생성
    if ! create_ssh_tunnel; then
        exit 1
    fi

    # 비밀번호 입력
    get_passwords

    # 연결 테스트
    if ! test_connections; then
        exit 1
    fi

    # 옵션에 따른 실행
    if [ "$LIST_ONLY" = "true" ]; then
        show_databases
        exit 0 # 목록 확인 후에는 백업/복원/정리 불필요
    fi

    if [ -n "$RESTORE_FILE" ]; then
        if [ ! -f "$RESTORE_FILE" ]; then
            log_error "백업 파일을 찾을 수 없습니다: $RESTORE_FILE"
            exit 1
        fi
        BACKUP_FILE="$RESTORE_FILE"
        # -r 옵션 사용시에는 SCRIPT_CREATED_BACKUP_FILE을 설정하지 않아
        # cleanup에서 사용자가 제공한 파일을 삭제하지 않도록 함
        restore_to_local
        exit 0 # -r 옵션 사용 시 복원 후 종료 (파일 삭제 안 함)
    fi

    # 백업 수행
    if ! backup_remote_db; then
        exit 1
    fi

    # 백업만 수행하는 경우
    if [ "$BACKUP_ONLY" = "true" ]; then
        log_success "백업만 완료되었습니다 (환경: $ENVIRONMENT). 백업 파일은 유지됩니다."
        exit 0 # 백업만 하는 경우, cleanup에서 파일을 삭제하지 않도록 함
    fi

    # 로컬로 복원
    if ! restore_to_local; then
        exit 1
    fi

    log_success "=== 데이터베이스 복제가 완료되었습니다 (환경: $ENVIRONMENT) ==="

    # 최종 확인
    echo
    log_info "복제 후 데이터베이스 상태:"
    show_databases
}

# 필수 도구 확인
check_requirements() {
    local missing_tools=()

    for tool in mysql mysqldump ssh nc lsof; do
        if ! command -v $tool &> /dev/null; then
            missing_tools+=($tool)
        fi
    done

    if [ ${#missing_tools[@]} -ne 0 ]; then
        log_error "다음 도구들이 설치되어 있지 않습니다: ${missing_tools[*]}"
        log_info "macOS: brew install mysql-client openssh"
        log_info "Ubuntu/Debian: sudo apt-get install mysql-client openssh-client netcat lsof"
        exit 1
    fi
}

# 트랩 설정 (스크립트 종료시 정리)
trap cleanup EXIT
trap emergency_cleanup INT TERM

# 필수 도구 확인 후 메인 실행
check_requirements
main