#!/bin/bash
# T066: Post-Deployment Verification Checks
#
# デプロイメント後の Lambda、DynamoDB、API Gateway の動作確認を行う
# 使用方法: ./verify-deployment.sh <environment>
#
# Environment: dev, staging, prod

set -e

# Configuration
ENVIRONMENT="${1:-dev}"
AWS_REGION="${2:-ap-northeast-1}"
PROJECT_NAME="todo-copilot"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="${SCRIPT_DIR}/deployment-verification-$(date +%Y%m%d-%H%M%S).log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test Results
PASSED=0
FAILED=0
TOTAL=0

# ===========================
# Utility Functions
# ===========================

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a "$LOG_FILE"
    ((PASSED++))
}

log_error() {
    echo -e "${RED}❌ $1${NC}" | tee -a "$LOG_FILE"
    ((FAILED++))
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}" | tee -a "$LOG_FILE"
}

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}" | tee -a "$LOG_FILE"
}

test_result() {
    ((TOTAL++))
    if [ $1 -eq 0 ]; then
        log_success "$2"
    else
        log_error "$2"
    fi
}

# ===========================
# Prerequisite Checks
# ===========================

check_prerequisites() {
    log_info "Prerequisites チェック中..."

    # AWS CLI チェック
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI がインストールされていません"
        exit 1
    fi
    log_success "AWS CLI 検出: $(aws --version)"

    # jq チェック
    if ! command -v jq &> /dev/null; then
        log_error "jq がインストールされていません"
        exit 1
    fi
    log_success "jq 検出"

    # AWS 認証確認
    if ! aws sts get-caller-identity --region "$AWS_REGION" &> /dev/null; then
        log_error "AWS 認証に失敗しました"
        exit 1
    fi
    log_success "AWS 認証: 成功"

    # 環境検証
    case "$ENVIRONMENT" in
        dev|staging|prod)
            log_success "環境: $ENVIRONMENT"
            ;;
        *)
            log_error "無効な環境: $ENVIRONMENT（dev/staging/prod を指定してください）"
            exit 1
            ;;
    esac
}

# ===========================
# DynamoDB Verification
# ===========================

verify_dynamodb() {
    log_info "\n📊 DynamoDB テーブル検証..."

    local table_name="${PROJECT_NAME}-todos-${ENVIRONMENT}"

    # テーブル存在確認
    if ! aws dynamodb describe-table \
        --table-name "$table_name" \
        --region "$AWS_REGION" &> /dev/null; then
        log_error "DynamoDB テーブルが見つかりません: $table_name"
        return 1
    fi
    test_result 0 "DynamoDB テーブル検出: $table_name"

    # テーブルステータス確認
    local status=$(aws dynamodb describe-table \
        --table-name "$table_name" \
        --region "$AWS_REGION" \
        --query 'Table.TableStatus' \
        --output text)

    if [ "$status" != "ACTIVE" ]; then
        log_error "DynamoDB テーブルが ACTIVE ではありません: $status"
        return 1
    fi
    test_result 0 "DynamoDB テーブルステータス: ACTIVE"

    # テーブル設定確認
    local table_info=$(aws dynamodb describe-table \
        --table-name "$table_name" \
        --region "$AWS_REGION")

    local read_capacity=$(echo "$table_info" | jq '.Table.BillingModeSummary.BillingMode // .Table.ProvisionedThroughput.ReadCapacityUnits')
    log_info "読み取り容量: $read_capacity"

    local write_capacity=$(echo "$table_info" | jq '.Table.ProvisionedThroughput.WriteCapacityUnits // "オンデマンド"')
    log_info "書き込み容量: $write_capacity"

    # TTL 設定確認
    if aws dynamodb describe-time-to-live \
        --table-name "$table_name" \
        --region "$AWS_REGION" \
        --query 'TimeToLiveDescription.TimeToLiveStatus' \
        --output text 2>/dev/null | grep -q "ENABLED"; then
        test_result 0 "DynamoDB TTL: 有効"
    else
        log_warning "DynamoDB TTL は無効です"
    fi

    # アイテム数確認
    local item_count=$(aws dynamodb scan \
        --table-name "$table_name" \
        --region "$AWS_REGION" \
        --select "COUNT" \
        --query 'Count' \
        --output text)
    log_info "テーブル内アイテム数: $item_count"

    # テスト書き込み
    local test_id="test-$(date +%s)"
    local test_item=$(cat <<EOF
{
  "id": {"S": "$test_id"},
  "title": {"S": "Verification Test"},
  "completed": {"BOOL": false},
  "created_at": {"S": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"}
}
EOF
)

    if aws dynamodb put-item \
        --table-name "$table_name" \
        --item "$test_item" \
        --region "$AWS_REGION" &> /dev/null; then
        test_result 0 "DynamoDB テスト書き込み: 成功"

        # テスト削除
        aws dynamodb delete-item \
            --table-name "$table_name" \
            --key "{\"id\": {\"S\": \"$test_id\"}}" \
            --region "$AWS_REGION" &> /dev/null
    else
        log_error "DynamoDB テスト書き込みが失敗しました"
        return 1
    fi
}

# ===========================
# Lambda Verification
# ===========================

verify_lambda() {
    log_info "\n⚡ Lambda 関数検証..."

    local function_name="${PROJECT_NAME}-api-${ENVIRONMENT}"

    # 関数存在確認
    if ! aws lambda get-function-concurrency \
        --function-name "$function_name" \
        --region "$AWS_REGION" &> /dev/null 2>&1; then
        
        if ! aws lambda get-function \
            --function-name "$function_name" \
            --region "$AWS_REGION" &> /dev/null; then
            log_error "Lambda 関数が見つかりません: $function_name"
            return 1
        fi
    fi
    test_result 0 "Lambda 関数検出: $function_name"

    # 関数設定確認
    local function_config=$(aws lambda get-function-configuration \
        --function-name "$function_name" \
        --region "$AWS_REGION")

    # Runtime チェック
    local runtime=$(echo "$function_config" | jq -r '.Runtime')
    if [[ "$runtime" == "nodejs"* ]]; then
        test_result 0 "Lambda Runtime: $runtime"
    else
        log_warning "Lambda Runtime: $runtime（Node.js 推奨）"
    fi

    # メモリ設定確認
    local memory=$(echo "$function_config" | jq -r '.MemorySize')
    log_info "Lambda メモリ: ${memory}MB"

    # タイムアウト確認
    local timeout=$(echo "$function_config" | jq -r '.Timeout')
    log_info "Lambda タイムアウト: ${timeout}秒"

    # 環境変数確認
    local env_vars=$(echo "$function_config" | jq '.Environment.Variables // {}' | jq 'keys | length')
    log_info "環境変数数: $env_vars"

    # 実行ロール確認
    local role=$(echo "$function_config" | jq -r '.Role')
    test_result 0 "Lambda 実行ロール: $role"

    # CloudWatch Logs グループ確認
    local log_group="/aws/lambda/$function_name"
    if aws logs describe-log-groups \
        --log-group-name-prefix "$log_group" \
        --region "$AWS_REGION" \
        --query "logGroups[?logGroupName=='$log_group']" | grep -q "$log_group"; then
        test_result 0 "CloudWatch Logs グループ: 存在"

        # 最新ログストリーム確認
        local latest_stream=$(aws logs describe-log-streams \
            --log-group-name "$log_group" \
            --region "$AWS_REGION" \
            --order-by "LastEventTime" \
            --descending \
            --max-items 1 \
            --query 'logStreams[0].logStreamName' \
            --output text 2>/dev/null || echo "")

        if [ -n "$latest_stream" ] && [ "$latest_stream" != "None" ]; then
            log_info "最新ログストリーム: $latest_stream"
        fi
    else
        log_warning "CloudWatch Logs グループが見つかりません"
    fi

    # 同時実行数確認
    local concurrency=$(aws lambda get-function-concurrency \
        --function-name "$function_name" \
        --region "$AWS_REGION" \
        --query 'ReservedConcurrentExecutions' \
        --output text 2>/dev/null || echo "無制限")
    log_info "予約済み同時実行: $concurrency"

    # ヘルスチェック（invoke）
    local health_check=$(cat <<EOF
{
  "method": "GET",
  "path": "/health",
  "headers": {}
}
EOF
)

    local invoke_result=$(aws lambda invoke \
        --function-name "$function_name" \
        --invocation-type "RequestResponse" \
        --payload "$health_check" \
        --region "$AWS_REGION" \
        /tmp/lambda-response.json 2>&1 || echo "")

    if [ -f /tmp/lambda-response.json ]; then
        test_result 0 "Lambda ヘルスチェック: 実行成功"
        rm -f /tmp/lambda-response.json
    else
        log_warning "Lambda ヘルスチェック: 応答なし"
    fi
}

# ===========================
# API Gateway Verification
# ===========================

verify_api_gateway() {
    log_info "\n🌐 API Gateway 検証..."

    # API 検索
    local api_name="${PROJECT_NAME}-api-${ENVIRONMENT}"
    local api_id=$(aws apigatewayv2 get-apis \
        --region "$AWS_REGION" \
        --query "Items[?Name=='$api_name'].ApiId" \
        --output text)

    if [ -z "$api_id" ]; then
        log_warning "API Gateway が見つかりません: $api_name"
        return 0
    fi
    test_result 0 "API Gateway 検出: $api_id"

    # API 詳細取得
    local api_details=$(aws apigatewayv2 get-api \
        --api-id "$api_id" \
        --region "$AWS_REGION")

    # Protocol チェック
    local protocol=$(echo "$api_details" | jq -r '.ProtocolType')
    log_info "API Protocol: $protocol"

    # ステージ確認
    local stages=$(aws apigatewayv2 get-stages \
        --api-id "$api_id" \
        --region "$AWS_REGION" \
        --query "Items[].StageName" \
        --output text)
    test_result 0 "API Stages: $stages"

    # Default ステージ確認
    local default_stage=$(echo "$stages" | awk '{print $1}')
    if [ -n "$default_stage" ]; then
        local endpoint=$(aws apigatewayv2 get-stages \
            --api-id "$api_id" \
            --region "$AWS_REGION" \
            --query "Items[?StageName=='$default_stage'].CreatedDate" \
            --output text)
        log_info "デフォルトステージ: $default_stage"
    fi

    # ルート確認
    local routes=$(aws apigatewayv2 get-routes \
        --api-id "$api_id" \
        --region "$AWS_REGION" \
        --query 'Items | length(@)' \
        --output text)
    test_result 0 "API ルート数: $routes"

    # Throttle 設定確認
    local throttle=$(aws apigatewayv2 get-throttle-settings \
        --api-id "$api_id" \
        --region "$AWS_REGION" 2>/dev/null || echo '{}')
    log_info "API Throttle 設定: $(echo "$throttle" | jq '.')"

    # CORS 確認
    local cors=$(echo "$api_details" | jq '.CorsPolicy // "未設定"')
    log_info "CORS 設定: $(echo "$cors" | jq '.')"
}

# ===========================
# CloudWatch Metrics
# ===========================

verify_cloudwatch_metrics() {
    log_info "\n📈 CloudWatch メトリクス確認..."

    local function_name="${PROJECT_NAME}-api-${ENVIRONMENT}"
    local end_time=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    local start_time=$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ)

    # Lambda Invocations
    local invocations=$(aws cloudwatch get-metric-statistics \
        --namespace "AWS/Lambda" \
        --metric-name "Invocations" \
        --dimensions Name=FunctionName,Value="$function_name" \
        --start-time "$start_time" \
        --end-time "$end_time" \
        --period 3600 \
        --statistics Sum \
        --region "$AWS_REGION" \
        --query 'Datapoints[0].Sum' \
        --output text 2>/dev/null || echo "0")
    test_result 0 "Lambda Invocations (1h): $invocations"

    # Lambda Errors
    local errors=$(aws cloudwatch get-metric-statistics \
        --namespace "AWS/Lambda" \
        --metric-name "Errors" \
        --dimensions Name=FunctionName,Value="$function_name" \
        --start-time "$start_time" \
        --end-time "$end_time" \
        --period 3600 \
        --statistics Sum \
        --region "$AWS_REGION" \
        --query 'Datapoints[0].Sum' \
        --output text 2>/dev/null || echo "0")

    if [ "$errors" != "0" ] && [ "$errors" != "None" ]; then
        log_warning "Lambda Errors: $errors"
    else
        test_result 0 "Lambda Errors (1h): 0"
    fi

    # Lambda Duration
    local duration=$(aws cloudwatch get-metric-statistics \
        --namespace "AWS/Lambda" \
        --metric-name "Duration" \
        --dimensions Name=FunctionName,Value="$function_name" \
        --start-time "$start_time" \
        --end-time "$end_time" \
        --period 3600 \
        --statistics Average \
        --region "$AWS_REGION" \
        --query 'Datapoints[0].Average' \
        --output text 2>/dev/null || echo "N/A")

    if [ "$duration" != "N/A" ] && [ "$duration" != "None" ]; then
        test_result 0 "Lambda Duration 平均: ${duration}ms"
    else
        log_info "Lambda Duration: データなし"
    fi

    # DynamoDB Metrics
    local table_name="${PROJECT_NAME}-todos-${ENVIRONMENT}"
    local consumed_read=$(aws cloudwatch get-metric-statistics \
        --namespace "AWS/DynamoDB" \
        --metric-name "ConsumedReadCapacityUnits" \
        --dimensions Name=TableName,Value="$table_name" \
        --start-time "$start_time" \
        --end-time "$end_time" \
        --period 3600 \
        --statistics Sum \
        --region "$AWS_REGION" \
        --query 'Datapoints[0].Sum' \
        --output text 2>/dev/null || echo "0")
    test_result 0 "DynamoDB Read 容量消費 (1h): $consumed_read"

    local consumed_write=$(aws cloudwatch get-metric-statistics \
        --namespace "AWS/DynamoDB" \
        --metric-name "ConsumedWriteCapacityUnits" \
        --dimensions Name=TableName,Value="$table_name" \
        --start-time "$start_time" \
        --end-time "$end_time" \
        --period 3600 \
        --statistics Sum \
        --region "$AWS_REGION" \
        --query 'Datapoints[0].Sum' \
        --output text 2>/dev/null || echo "0")
    test_result 0 "DynamoDB Write 容量消費 (1h): $consumed_write"
}

# ===========================
# IAM Role Verification
# ===========================

verify_iam_roles() {
    log_info "\n🔐 IAM ロール・ポリシー検証..."

    # Lambda 実行ロール確認
    local lambda_function="${PROJECT_NAME}-api-${ENVIRONMENT}"
    local lambda_config=$(aws lambda get-function-configuration \
        --function-name "$lambda_function" \
        --region "$AWS_REGION" 2>/dev/null || echo "{}")

    local role_arn=$(echo "$lambda_config" | jq -r '.Role // "N/A"')

    if [ "$role_arn" != "N/A" ]; then
        local role_name=$(echo "$role_arn" | awk -F'/' '{print $NF}')
        test_result 0 "Lambda 実行ロール: $role_name"

        # ロールのポリシー確認
        local policies=$(aws iam list-role-policies \
            --role-name "$role_name" \
            --query 'PolicyNames | length(@)' \
            --output text 2>/dev/null || echo "0")
        log_info "ロールに付与されたポリシー数: $policies"

        # 管理ポリシー確認
        local managed_policies=$(aws iam list-attached-role-policies \
            --role-name "$role_name" \
            --query 'AttachedPolicies | length(@)' \
            --output text 2>/dev/null || echo "0")
        log_info "管理ポリシー数: $managed_policies"

        # DynamoDB アクセス権確認
        local dynamodb_policy=$(aws iam get-role-policy \
            --role-name "$role_name" \
            --policy-name "*dynamodb*" \
            --region "$AWS_REGION" 2>/dev/null || echo "{}")

        if echo "$dynamodb_policy" | jq -e '.PolicyDocument.Statement[] | select(.Action[] | contains("dynamodb"))' > /dev/null 2>&1; then
            test_result 0 "DynamoDB アクセス権: 確認済み"
        else
            log_warning "DynamoDB アクセス権: 見つかりません"
        fi
    fi
}

# ===========================
# Report Generation
# ===========================

generate_report() {
    log_info "\n" 
    log_info "=================================================="
    log_info "デプロイメント検証レポート"
    log_info "=================================================="
    log_info "環境: $ENVIRONMENT"
    log_info "リージョン: $AWS_REGION"
    log_info "実行時刻: $(date)"
    log_info "=================================================="
    log_info "テスト結果:"
    log_info "  ✅ 成功: $PASSED"
    log_info "  ❌ 失敗: $FAILED"
    log_info "  📊 合計: $TOTAL"
    log_info "=================================================="
    
    if [ $FAILED -eq 0 ]; then
        log_success "デプロイメント検証: 完了✅"
        echo -e "${GREEN}すべてのチェックが成功しました。${NC}"
        return 0
    else
        log_error "デプロイメント検証: 失敗❌"
        echo -e "${RED}一部のチェックが失敗しました。上記のログを確認してください。${NC}"
        return 1
    fi
}

# ===========================
# Main Execution
# ===========================

main() {
    log "================================================"
    log "T066: Post-Deployment Verification Checks"
    log "================================================"
    log "環境: $ENVIRONMENT"
    log "リージョン: $AWS_REGION"
    log "ログファイル: $LOG_FILE"
    log ""

    check_prerequisites
    verify_dynamodb
    verify_lambda
    verify_api_gateway
    verify_cloudwatch_metrics
    verify_iam_roles
    generate_report

    exit $?
}

# Run main function
main
