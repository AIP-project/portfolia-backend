#!/bin/bash

# =============================================================================
# GCP Cloud SQL to Local MySQL 데이터베이스 복제 스크립트
# macOS 호환성 개선 버전 (bash 3.x 지원)
# 중복 함수 제거, 복원 확인 프롬프트 제거, 자동 백업 파일 정리 추가 버전
# SSL 설정 수정: GCP Cloud SQL은 SSL 연결 필수
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

# 소스 및 타겟 환경 변수
SOURCE_ENV=""
TARGET_ENV=""

# Staging 환경 설정 (QA 환경으로 변경)
STAGING_HOST="34.64.164.212"
STAGING_PORT="3306"
STAGING_USER="root"
STAGING_PASSWORD=""  # 프롬프트에서 입력받음

# Production 환경 설정
PROD_HOST="34.64.34.58"
PROD_PORT="3306"
PROD_USER="root"
PROD_PASSWORD=""  # 프롬프트에서 입력받음

# Local 환경 설정
LOCAL_HOST="127.0.0.1"
LOCAL_PORT="3306"
LOCAL_USER="root"
LOCAL_PASSWORD="aipqlalfqjsgh123!"

# 소스 환경 설정 변수들
SOURCE_HOST=""
SOURCE_PORT=""
SOURCE_USER=""
SOURCE_PASSWORD=""

# 타겟 환경 설정 변수들
TARGET_HOST=""
TARGET_PORT=""
TARGET_USER=""
TARGET_PASSWORD=""

# 데이터베이스 설정
REMOTE_DB="aip_db"        # 비워두면 모든 데이터베이스, 특정 DB만 복제하려면 DB명 입력

# 백업 파일 설정
BACKUP_DIR=""  # setup_backup_directory()에서 설정됨
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE=""  # 나중에 설정됨
SCRIPT_CREATED_BACKUP_FILE="" # 스크립트가 생성한 백업 파일 경로 (정리용)

# mysqldump 옵션 - GCP Cloud SQL은 SSL 연결 필수
MYSQLDUMP_OPTIONS="--single-transaction --routines --triggers --events --hex-blob --complete-insert --disable-keys --extended-insert --protocol=TCP --ssl-mode=REQUIRED --set-gtid-purged=OFF"

# MySQL 연결 옵션 - GCP Cloud SQL은 SSL 연결 필수
MYSQL_CONNECTION_OPTIONS="--protocol=TCP --ssl-mode=REQUIRED"

# =============================================================================
# 함수 정의
# =============================================================================

# 환경별 설정 로드
load_environment_config() {
    local env=$1
    local config_type=$2  # "source" 또는 "target"
    
    local host=""
    local port=""
    local user=""
    local password=""

    case $env in
        "staging")
            host="$STAGING_HOST"
            port="$STAGING_PORT"
            user="$STAGING_USER"
            password="$STAGING_PASSWORD"
            ;;
        "prod")
            host="$PROD_HOST"
            port="$PROD_PORT"
            user="$PROD_USER"
            password="$PROD_PASSWORD"
            ;;
        "local")
            host="$LOCAL_HOST"
            port="$LOCAL_PORT"
            user="$LOCAL_USER"
            password="$LOCAL_PASSWORD"
            ;;
        *)
            log_error "지원하지 않는 환경: $env"
            log_info "지원되는 환경: staging, prod, local"
            return 1
            ;;
    esac

    # 설정 변수에 값 할당
    if [ "$config_type" = "source" ]; then
        SOURCE_HOST="$host"
        SOURCE_PORT="$port"
        SOURCE_USER="$user"
        SOURCE_PASSWORD="$password"
        log_success "소스 환경 설정 로드 완료: $env"
        log_info "소스 호스트: $SOURCE_HOST:$SOURCE_PORT"
    elif [ "$config_type" = "target" ]; then
        TARGET_HOST="$host"
        TARGET_PORT="$port"
        TARGET_USER="$user"
        TARGET_PASSWORD="$password"
        log_success "타겟 환경 설정 로드 완료: $env"
        log_info "타겟 호스트: $TARGET_HOST:$TARGET_PORT"
    fi
}

# 타겟이 프로덕션인지 검사
validate_target_environment() {
    if [ "$TARGET_ENV" = "prod" ]; then
        log_error "❌ 보안상의 이유로 프로덕션을 타겟으로 사용할 수 없습니다!"
        log_error "프로덕션 데이터베이스에 데이터를 덮어쓰는 것은 위험합니다."
        log_info "허용되는 타겟 환경: staging, local"
        return 1
    fi
    return 0
}

# 환경 설정 유효성 검사
validate_environment_config() {
    local missing_vars=()

    [ -z "$SOURCE_HOST" ] && missing_vars+=("SOURCE_HOST")
    [ -z "$SOURCE_PORT" ] && missing_vars+=("SOURCE_PORT")
    [ -z "$SOURCE_USER" ] && missing_vars+=("SOURCE_USER")
    
    [ -z "$TARGET_HOST" ] && missing_vars+=("TARGET_HOST")
    [ -z "$TARGET_PORT" ] && missing_vars+=("TARGET_PORT")
    [ -z "$TARGET_USER" ] && missing_vars+=("TARGET_USER")

    if [ ${#missing_vars[@]} -ne 0 ]; then
        log_error "다음 설정 값들이 누락되었습니다: ${missing_vars[*]}"
        return 1
    fi

    return 0
}

# 환경별 설정 표시
show_current_config() {
    log_info "현재 환경 설정:"
    echo "  소스 환경: $SOURCE_ENV ($SOURCE_HOST:$SOURCE_PORT)"
    echo "  타겟 환경: $TARGET_ENV ($TARGET_HOST:$TARGET_PORT)"
    echo "  SSL 모드: $([ "$SOURCE_ENV" = "local" ] || [ "$TARGET_ENV" = "local" ] && echo "DISABLED for local, REQUIRED for cloud" || echo "REQUIRED (GCP Cloud SQL)")"
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
    echo
}

# 환경별 백업 디렉토리 생성
setup_backup_directory() {
    BACKUP_DIR="./db_backups/${SOURCE_ENV}_to_${TARGET_ENV}"
    mkdir -p ${BACKUP_DIR}
    log_success "백업 디렉토리 생성: ${BACKUP_DIR}"
}

# 비밀번호 입력받기
get_passwords() {
    # 소스 환경 비밀번호 입력 (local이 아닌 경우)
    if [ "$SOURCE_ENV" != "local" ] && [ -z "$SOURCE_PASSWORD" ]; then
        echo -n "소스 환경($SOURCE_ENV) MySQL 비밀번호를 입력하세요: "
        read -s SOURCE_PASSWORD
        echo
    fi

    # 백업만 수행하는 경우 타겟 비밀번호 생략
    if [ "$BACKUP_ONLY" = "true" ]; then
        log_info "백업만 수행하므로 타겟 환경 비밀번호는 생략합니다"
        return 0
    fi

    # 타겟 환경 비밀번호 입력 (local이 아닌 경우)
    if [ "$TARGET_ENV" != "local" ] && [ -z "$TARGET_PASSWORD" ]; then
        echo -n "타겟 환경($TARGET_ENV) MySQL 비밀번호를 입력하세요: "
        read -s TARGET_PASSWORD
        echo
    fi
}

# 연결 테스트
test_connections() {
    log_info "데이터베이스 연결 테스트 중..."

    # 소스 연결 테스트
    log_info "소스 데이터베이스 연결 테스트: ${SOURCE_HOST}:${SOURCE_PORT} (환경: $SOURCE_ENV)"

    # SSL 설정 결정
    local source_ssl_options=""
    if [ "$SOURCE_ENV" = "local" ]; then
        source_ssl_options="--protocol=TCP --ssl-mode=DISABLED"
    else
        source_ssl_options="$MYSQL_CONNECTION_OPTIONS"  # SSL 필수
    fi

    local source_mysql_cmd_safe="mysql -h ${SOURCE_HOST} -P ${SOURCE_PORT} -u ${SOURCE_USER} -p*** ${source_ssl_options} -e \"SELECT 1 as test_connection;\""
    log_info "실행 명령어: $source_mysql_cmd_safe"

    local source_mysql_output
    source_mysql_output=$(mysql -h ${SOURCE_HOST} -P ${SOURCE_PORT} -u ${SOURCE_USER} -p${SOURCE_PASSWORD} ${source_ssl_options} -e "SELECT 1 as test_connection;" 2>&1)
    local source_mysql_exit_code=$?

    if [ $source_mysql_exit_code -eq 0 ]; then
        log_success "소스 데이터베이스 연결 성공 (환경: $SOURCE_ENV)"
        log_info "연결 결과: $source_mysql_output"
    else
        log_error "소스 데이터베이스 연결 실패 (exit code: $source_mysql_exit_code)"
        log_error "오류 메시지: $source_mysql_output"
        return 1
    fi

    # 백업만 수행하는 경우 타겟 연결 테스트 생략
    if [ "$BACKUP_ONLY" = "true" ]; then
        log_info "백업만 수행하므로 타겟 환경 연결 테스트를 생략합니다"
        return 0
    fi

    # 타겟 연결 테스트
    log_info "타겟 데이터베이스 연결 테스트: ${TARGET_HOST}:${TARGET_PORT} (환경: $TARGET_ENV)"

    local target_ssl_options=""
    if [ "$TARGET_ENV" = "local" ]; then
        # 로컬 환경에서는 caching_sha2_password 호환성을 위해 SSL 사용
        target_ssl_options="--protocol=TCP --ssl-mode=PREFERRED --default-auth=mysql_native_password"
    else
        target_ssl_options="$MYSQL_CONNECTION_OPTIONS"  # SSL 필수
    fi

    local target_mysql_cmd_safe="mysql -h ${TARGET_HOST} -P ${TARGET_PORT} -u ${TARGET_USER} -p*** ${target_ssl_options} -e \"SELECT 1 as test_connection;\""
    log_info "실행 명령어: $target_mysql_cmd_safe"

    local target_mysql_output
    target_mysql_output=$(mysql -h ${TARGET_HOST} -P ${TARGET_PORT} -u ${TARGET_USER} -p${TARGET_PASSWORD} ${target_ssl_options} -e "SELECT 1 as test_connection;" 2>&1)
    local target_mysql_exit_code=$?

    if [ $target_mysql_exit_code -eq 0 ]; then
        log_success "타겟 데이터베이스 연결 성공 (환경: $TARGET_ENV)"
        log_info "연결 결과: $target_mysql_output"
    else
        log_error "타겟 데이터베이스 연결 실패 (exit code: $target_mysql_exit_code)"
        log_error "오류 메시지: $target_mysql_output"
        return 1
    fi
}

# 소스 데이터베이스 백업
backup_source_db() {
    log_info "소스 데이터베이스 백업 중... (환경: $SOURCE_ENV -> $TARGET_ENV)"

    # 백업 파일명에 소스-타겟 환경 정보 포함
    BACKUP_FILE="${BACKUP_DIR}/${SOURCE_ENV}_to_${TARGET_ENV}_backup_${TIMESTAMP}.sql"
    SCRIPT_CREATED_BACKUP_FILE="$BACKUP_FILE" # 정리할 파일로 지정

    # SSL 설정 결정
    local source_dump_options="$MYSQLDUMP_OPTIONS"
    if [ "$SOURCE_ENV" = "local" ]; then
        source_dump_options="--single-transaction --routines --triggers --events --hex-blob --complete-insert --disable-keys --extended-insert --protocol=TCP --ssl-mode=DISABLED --set-gtid-purged=OFF"
    fi

    if [ -z "$REMOTE_DB" ]; then
        # 모든 데이터베이스 백업 (시스템 DB 제외)
        local mysqldump_cmd_safe="mysqldump -h ${SOURCE_HOST} -P ${SOURCE_PORT} -u ${SOURCE_USER} -p*** ${source_dump_options} --all-databases [시스템 테이블 제외]"
        log_info "실행 명령어: $mysqldump_cmd_safe > ${BACKUP_FILE}"

        mysqldump -h ${SOURCE_HOST} -P ${SOURCE_PORT} \
                  -u ${SOURCE_USER} -p${SOURCE_PASSWORD} \
                  ${source_dump_options} \
                  --all-databases \
                  --ignore-table=mysql.user \
                  --ignore-table=mysql.db \
                  --ignore-table=mysql.tables_priv \
                  --ignore-table=mysql.columns_priv \
                  --ignore-table=mysql.procs_priv \
                  --ignore-table=mysql.proxies_priv > ${BACKUP_FILE}
    else
        # 특정 데이터베이스만 백업 (데이터베이스 생성 구문 포함)
        local mysqldump_cmd_safe="mysqldump -h ${SOURCE_HOST} -P ${SOURCE_PORT} -u ${SOURCE_USER} -p*** ${source_dump_options} --databases ${REMOTE_DB}"
        log_info "실행 명령어: $mysqldump_cmd_safe > ${BACKUP_FILE}"

        mysqldump -h ${SOURCE_HOST} -P ${SOURCE_PORT} \
                  -u ${SOURCE_USER} -p${SOURCE_PASSWORD} \
                  ${source_dump_options} \
                  --databases ${REMOTE_DB} > ${BACKUP_FILE}
    fi

    local dump_exit_code=$?

    if [ $dump_exit_code -eq 0 ]; then
        log_success "백업 완료: ${BACKUP_FILE}"
        log_info "백업 파일 크기: $(du -h ${BACKUP_FILE} | cut -f1)"

        # 백업 파일에 환경 정보 주석 추가
        local temp_file="${BACKUP_FILE}.tmp"
        {
            echo "-- Database backup from ${SOURCE_ENV} to ${TARGET_ENV}"
            echo "-- Backup created at: $(date)"
            echo "-- Source: ${SOURCE_HOST}:${SOURCE_PORT}"
            echo "-- Target: ${TARGET_HOST}:${TARGET_PORT}"
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

# 타겟 데이터베이스로 복원
restore_to_target() {
    log_info "타겟 데이터베이스 복원 시작: ${BACKUP_FILE} -> $TARGET_ENV"

    # 백업 파일 분석
    log_info "백업 파일 분석 중..."
    local detected_db=$(detect_backup_database "$BACKUP_FILE")

    # SSL 설정 결정
    local target_ssl_options=""
    if [ "$TARGET_ENV" = "local" ]; then
        # 로컬 환경에서는 caching_sha2_password 호환성을 위해 SSL 사용
        target_ssl_options="--protocol=TCP --ssl-mode=PREFERRED --default-auth=mysql_native_password"
    else
        target_ssl_options="$MYSQL_CONNECTION_OPTIONS"  # SSL 필수
    fi

    if [ -n "$detected_db" ]; then
        log_info "감지된 데이터베이스: $detected_db"

        # 타겟에 데이터베이스가 존재하는지 확인
        log_info "타겟 데이터베이스 존재 여부 확인 중..."
        local db_exists=$(mysql -h ${TARGET_HOST} -P ${TARGET_PORT} -u ${TARGET_USER} -p${TARGET_PASSWORD} ${target_ssl_options} -e "SHOW DATABASES LIKE '${detected_db}';" 2>/dev/null | grep -c "$detected_db" || echo "0")

        if [ "$db_exists" -eq 0 ]; then
            log_warning "데이터베이스 '$detected_db'가 타겟 환경에 존재하지 않습니다. 새로 생성합니다."
            log_info "데이터베이스 생성 중: $detected_db"
            local create_cmd_safe="mysql -h ${TARGET_HOST} -P ${TARGET_PORT} -u ${TARGET_USER} -p*** ${target_ssl_options} -e \"CREATE DATABASE IF NOT EXISTS \\\`${detected_db}\\\`;\""
            log_info "실행 명령어: $create_cmd_safe"

            mysql -h ${TARGET_HOST} -P ${TARGET_PORT} \
                  -u ${TARGET_USER} -p${TARGET_PASSWORD} \
                  ${target_ssl_options} \
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
        log_info "전체 데이터베이스 백업으로 감지됨. 타겟 환경에 복원합니다."
    fi

    local restore_cmd_safe="mysql -h ${TARGET_HOST} -P ${TARGET_PORT} -u ${TARGET_USER} -p*** ${target_ssl_options} < ${BACKUP_FILE}"
    log_info "실행 명령어: $restore_cmd_safe"

    # 복원 실행
    mysql -h ${TARGET_HOST} -P ${TARGET_PORT} \
          -u ${TARGET_USER} -p${TARGET_PASSWORD} \
          ${target_ssl_options} < ${BACKUP_FILE}

    local restore_exit_code=$?

    if [ $restore_exit_code -eq 0 ]; then
        log_success "타겟 데이터베이스 복원 완료 (환경: $TARGET_ENV)"

        if [ -n "$detected_db" ]; then
            log_info "복원된 데이터베이스: $detected_db"

            # 테이블 수 확인
            local table_count=$(mysql -h ${TARGET_HOST} -P ${TARGET_PORT} -u ${TARGET_USER} -p${TARGET_PASSWORD} ${target_ssl_options} -e "USE \`${detected_db}\`; SHOW TABLES;" 2>/dev/null | wc -l)
            log_info "복원된 테이블 수: $((table_count - 1))"
        fi
    else
        log_error "타겟 데이터베이스 복원 실패 (exit code: $restore_exit_code)"
        return 1
    fi
}


# 데이터베이스 목록 확인
show_databases() {
    log_info "소스 데이터베이스 목록 (환경: $SOURCE_ENV):"

    # SSL 설정 결정
    local source_ssl_options=""
    if [ "$SOURCE_ENV" = "local" ]; then
        source_ssl_options="--protocol=TCP --ssl-mode=DISABLED"
    else
        source_ssl_options="$MYSQL_CONNECTION_OPTIONS"  # SSL 필수
    fi

    local source_db_cmd_safe="mysql -h ${SOURCE_HOST} -P ${SOURCE_PORT} -u ${SOURCE_USER} -p*** ${source_ssl_options} -e \"SHOW DATABASES;\""
    log_info "실행 명령어: $source_db_cmd_safe"

    mysql -h ${SOURCE_HOST} -P ${SOURCE_PORT} \
          -u ${SOURCE_USER} -p${SOURCE_PASSWORD} \
          ${source_ssl_options} \
          -e "SHOW DATABASES;" | grep -v "Database\|information_schema\|performance_schema\|mysql\|sys"

    echo
    log_info "타겟 데이터베이스 목록 (환경: $TARGET_ENV):"

    local target_ssl_options=""
    if [ "$TARGET_ENV" = "local" ]; then
        # 로컬 환경에서는 caching_sha2_password 호환성을 위해 SSL 사용
        target_ssl_options="--protocol=TCP --ssl-mode=PREFERRED --default-auth=mysql_native_password"
    else
        target_ssl_options="$MYSQL_CONNECTION_OPTIONS"  # SSL 필수
    fi

    local target_db_cmd_safe="mysql -h ${TARGET_HOST} -P ${TARGET_PORT} -u ${TARGET_USER} -p*** ${target_ssl_options} -e \"SHOW DATABASES;\""
    log_info "실행 명령어: $target_db_cmd_safe"

    mysql -h ${TARGET_HOST} -P ${TARGET_PORT} \
          -u ${TARGET_USER} -p${TARGET_PASSWORD} \
          ${target_ssl_options} \
          -e "SHOW DATABASES;" | grep -v "Database\|information_schema\|performance_schema\|mysql\|sys"
}

# 정리 작업
cleanup() {
    log_info "정리 작업 중..."

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
    log_warning "스크립트가 중단되었습니다. 정리를 수행합니다..."
    exit 1
}

# 도움말
show_help() {
    echo "MySQL 데이터베이스 복제 스크립트 (소스/타겟 지원)"
    echo
    echo "사용법: $0 <소스> <타겟> [옵션]"
    echo
    echo "환경:"
    echo "  staging                 Staging 환경 (QA)"
    echo "  prod                    Production 환경"
    echo "  local                   로컬 환경"
    echo
    echo "옵션:"
    echo "  -h, --help              이 도움말 표시"
    echo "  -d, --database DB명     특정 데이터베이스만 복제"
    echo "  -l, --list-only         데이터베이스 목록만 확인"
    echo "  -b, --backup-only       백업만 수행 (복원하지 않음, 백업 파일 유지)"
    echo "  -r, --restore FILE      기존 백업 파일로부터 복원 (해당 파일은 삭제하지 않음)"
    echo "  -c, --config            현재 환경 설정 표시"
    echo "  --cleanup               임시 파일 정리"
    echo
    echo "예시:"
    echo "  $0 prod local           # 프로덕션 -> 로컬 전체 복제"
    echo "  $0 staging local -d aip_db  # 스테이징 -> 로컬 aip_db만 복제"
    echo "  $0 prod staging         # 프로덕션 -> 스테이징 (오류 발생 – 타겟이 prod 불가)"
    echo "  $0 staging local -l     # 스테이징과 로컬 DB 목록 확인"
    echo "  $0 prod local -b        # 프로덕션 백업만 수행"
    echo "  $0 staging local -r backup.sql # 기존 백업 파일로 로컬에 복원"
    echo "  $0 staging local -c     # 스테이징-로컬 설정 확인"
    echo "  $0 --cleanup            # 임시 파일 정리"
    echo
    echo "환경별 설정:"
    echo "  • Staging (QA): 34.64.164.212:3306 (SSL 필수)"
    echo "  • Production: 34.64.34.58:3306 (SSL 필수)"
    echo "  • Local: 127.0.0.1:3306 (SSL 비활성화)"
    echo
    echo "보안 제한:"
    echo "  ❌ 프로덕션을 타겟으로 사용할 수 없습니다!"
    echo "  ✅ 허용되는 타겟: staging, local"
    echo
    echo "주요 기능:"
    echo "  • 유연한 소스/타겟 지원 (prod->local, staging->local, staging->staging 등)"
    echo "  • 프로덕션 타겟 자동 차단 (보안)"
    echo "  • 자동 SSL 설정 (로컬: DISABLED, 클라우드: REQUIRED)"
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

# 인수 개수 확인
if [[ $# -eq 0 ]]; then
    log_error "소스와 타겟 환경을 지정해주세요: staging, prod, local"
    show_help
    exit 1
fi

# 첫 번째 인수 처리 (특수 옵션 또는 소스 환경)
case $1 in
    --cleanup)
        log_info "임시 파일 정리 중..."
        rm -f ./db_backups/*/*.tmp 2>/dev/null || true
        log_success "임시 파일 정리 완료"
        exit 0
        ;;
    -h|--help)
        show_help
        exit 0
        ;;
    staging|prod|local)
        SOURCE_ENV=$1
        shift
        
        # 두 번째 인수 확인 (타겟 환경)
        if [[ $# -eq 0 ]] || [[ $1 == -* ]]; then
            log_error "타겟 환경을 지정해주세요"
            show_help
            exit 1
        fi
        
        case $1 in
            staging|prod|local)
                TARGET_ENV=$1
                shift
                ;;
            *)
                log_error "잘못된 타겟 환경: $1"
                log_info "지원되는 환경: staging, prod, local"
                show_help
                exit 1
                ;;
        esac
        ;;
    *)
        log_error "잘못된 소스 환경: $1"
        log_info "지원되는 환경: staging, prod, local"
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
    log_info "=== MySQL 데이터베이스 복제 시작 ($SOURCE_ENV -> $TARGET_ENV) ==="

    # 타겟이 프로덕션인지 검사 (보안)
    if ! validate_target_environment; then
        exit 1
    fi

    # 소스 환경 설정 로드
    if ! load_environment_config "$SOURCE_ENV" "source"; then
        exit 1
    fi

    # 타겟 환경 설정 로드
    if ! load_environment_config "$TARGET_ENV" "target"; then
        exit 1
    fi

    # 설정 유효성 검사
    if ! validate_environment_config; then
        exit 1
    fi

    # 백업 디렉토리 설정
    setup_backup_directory

    # 설정 표시 옵션
    if [ "$SHOW_CONFIG" = "true" ]; then
        show_current_config
        exit 0
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
        restore_to_target
        exit 0 # -r 옵션 사용 시 복원 후 종료 (파일 삭제 안 함)
    fi

    # 백업 수행
    if ! backup_source_db; then
        exit 1
    fi

    # 백업만 수행하는 경우
    if [ "$BACKUP_ONLY" = "true" ]; then
        log_success "백업만 완료되었습니다 ($SOURCE_ENV -> $TARGET_ENV). 백업 파일은 유지됩니다."
        exit 0 # 백업만 하는 경우, cleanup에서 파일을 삭제하지 않도록 함
    fi

    # 타겟으로 복원
    if ! restore_to_target; then
        exit 1
    fi

    log_success "=== 데이터베이스 복제가 완료되었습니다 ($SOURCE_ENV -> $TARGET_ENV) ==="

    # 최종 확인
    echo
    log_info "복제 후 데이터베이스 상태:"
    show_databases
}

# 필수 도구 확인
check_requirements() {
    local missing_tools=()

    for tool in mysql mysqldump nc; do
        if ! command -v $tool &> /dev/null; then
            missing_tools+=($tool)
        fi
    done

    if [ ${#missing_tools[@]} -ne 0 ]; then
        log_error "다음 도구들이 설치되어 있지 않습니다: ${missing_tools[*]}"
        log_info "macOS: brew install mysql-client netcat"
        log_info "Ubuntu/Debian: sudo apt-get install mysql-client netcat"
        exit 1
    fi
}

# 트랩 설정 (스크립트 종료시 정리)
trap cleanup EXIT
trap emergency_cleanup INT TERM

# 필수 도구 확인 후 메인 실행
check_requirements
main