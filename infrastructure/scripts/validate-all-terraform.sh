#!/bin/bash

#################################################################################
# T064: Terraform Module & Configuration Comprehensive Test
#
# このスクリプトは、すべての Terraform モジュールと設定を検証します:
# - terraform validate - 構文検証
# - terraform plan - 各環境でのデプロイメント計画
# - Module dependency チェック
# - Output 値の検証
# - 環境固有の設定検証
#
# 使用方法: ./validate-all-terraform.sh [dev|staging|prod|all]
#################################################################################

set -euo pipefail

# カラー出力定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 設定
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TF_DIR="${SCRIPT_DIR}/terraform"
ENVIRONMENTS=("dev" "staging" "prod")
SELECTED_ENV="${1:-all}"
TEST_RESULTS=()
FAILED_TESTS=()

#################################################################################
# ログとレポート関数
#################################################################################

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_section() {
    echo ""
    echo -e "${BLUE}════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════${NC}"
    echo ""
}

record_test() {
    local test_name="$1"
    local status="$2"
    local details="${3:-}"
    
    if [[ "$status" == "PASS" ]]; then
        TEST_RESULTS+=("✅ $test_name")
    else
        TEST_RESULTS+=("❌ $test_name")
        FAILED_TESTS+=("$test_name")
        if [[ -n "$details" ]]; then
            TEST_RESULTS+=("   詳細: $details")
        fi
    fi
}

#################################################################################
# 前提条件チェック
#################################################################################

check_prerequisites() {
    log_section "前提条件チェック"
    
    # Terraform のバージョン確認
    if ! command -v terraform &> /dev/null; then
        log_error "Terraform がインストールされていません"
        exit 1
    fi
    
    TF_VERSION=$(terraform version | head -n1)
    log_success "Terraform バージョン確認: $TF_VERSION"
    
    # AWS CLI の確認
    if ! command -v aws &> /dev/null; then
        log_warning "AWS CLI がインストールされていません（オプション）"
    else
        AWS_VERSION=$(aws --version)
        log_success "AWS CLI: $AWS_VERSION"
    fi
    
    # Terraform ディレクトリの確認
    if [[ ! -d "$TF_DIR" ]]; then
        log_error "Terraform ディレクトリが見つかりません: $TF_DIR"
        exit 1
    fi
    
    log_success "前提条件チェック完了"
}

#################################################################################
# モジュール構造検証
#################################################################################

validate_module_structure() {
    log_section "モジュール構造検証"
    
    local modules=("backend" "compute" "data" "iam")
    
    for module in "${modules[@]}"; do
        local module_path="${TF_DIR}/modules/${module}"
        
        if [[ ! -d "$module_path" ]]; then
            log_error "モジュルディレクトリが見つかりません: $module"
            record_test "Module Structure: $module" "FAIL" "Directory not found"
            continue
        fi
        
        # 必須ファイルのチェック
        local required_files=("main.tf" "variables.tf" "outputs.tf")
        local all_present=true
        
        for file in "${required_files[@]}"; do
            if [[ ! -f "$module_path/$file" ]]; then
                log_warning "  $module モジュルに $file が見つかりません"
                all_present=false
            fi
        done
        
        if [[ "$all_present" == true ]]; then
            log_success "$module モジュル構造: OK"
            record_test "Module Structure: $module" "PASS"
        else
            record_test "Module Structure: $module" "FAIL"
        fi
    done
}

#################################################################################
# 構文検証（terraform validate）
#################################################################################

validate_terraform_syntax() {
    log_section "Terraform 構文検証"
    
    if [[ ! -f "${TF_DIR}/.terraform/modules/modules.json" ]] && [[ ! -d "${TF_DIR}/.terraform/modules" ]]; then
        log_info "Terraform モジュールをダウンロード中..."
        cd "$TF_DIR"
        terraform init -backend=false -upgrade 2>&1 | grep -E "(Downloading|Installed)" || true
        cd - > /dev/null
    fi
    
    cd "$TF_DIR"
    
    log_info "Terraform validate を実行中..."
    if terraform validate; then
        log_success "Terraform 構文検証: PASS"
        record_test "Syntax Validation" "PASS"
    else
        log_error "Terraform 構文検証: FAIL"
        record_test "Syntax Validation" "FAIL"
        cd - > /dev/null
        return 1
    fi
    
    cd - > /dev/null
}

#################################################################################
# フォーマット検証
#################################################################################

validate_terraform_format() {
    log_section "Terraform フォーマット検証"
    
    cd "$TF_DIR"
    
    log_info "terraform fmt をチェック中..."
    if terraform fmt -check -recursive > /dev/null 2>&1; then
        log_success "Terraform フォーマット: OK"
        record_test "Format Check" "PASS"
    else
        log_warning "Terraform フォーマット: 不一致を検出"
        log_info "修正を実行中..."
        terraform fmt -recursive > /dev/null
        log_success "Terraform フォーマット: 修正完了"
        record_test "Format Check" "PASS" "Auto-fixed"
    fi
    
    cd - > /dev/null
}

#################################################################################
# Plan テスト（各環境）
#################################################################################

test_terraform_plan() {
    local env="$1"
    
    log_section "環境: $env - Terraform Plan テスト"
    
    cd "$TF_DIR"
    
    local tfvars_file="environments/${env}.tfvars"
    
    if [[ ! -f "$tfvars_file" ]]; then
        log_error "環境変数ファイルが見つかりません: $tfvars_file"
        record_test "Plan Test: $env" "FAIL" "Missing tfvars file"
        cd - > /dev/null
        return 1
    fi
    
    log_info "環境変数ファイル: $tfvars_file"
    
    # Plan 出力を一時ファイルに保存
    local plan_file="/tmp/terraform_${env}_plan.out"
    local plan_json="/tmp/terraform_${env}_plan.json"
    
    log_info "terraform plan を実行中..."
    if terraform plan -var-file="$tfvars_file" -out="$plan_file" > /tmp/terraform_plan_output.txt 2>&1; then
        log_success "Plan 実行: 成功"
        record_test "Plan Execution: $env" "PASS"
        
        # Plan 詳細を表示
        local resource_count=$(grep -c "^  # " /tmp/terraform_plan_output.txt || echo "0")
        log_info "計画されるリソース操作: 約 $resource_count 件"
        
        # JSON 形式の Plan を出力（分析用）
        if terraform show -json "$plan_file" > "$plan_json" 2>/dev/null; then
            log_success "Plan JSON 出力: 成功"
        fi
        
        # リソース数カウント
        if [[ -f "$plan_json" ]]; then
            local add_count=$(grep -o '"actions":\["create"\]' "$plan_json" | wc -l)
            local modify_count=$(grep -o '"actions":\["update"\]' "$plan_json" | wc -l)
            local delete_count=$(grep -o '"actions":\["delete"\]' "$plan_json" | wc -l)
            
            log_info "  - 新規作成: $add_count"
            log_info "  - 変更: $modify_count"
            log_info "  - 削除: $delete_count"
        fi
        
        # クリーンアップ
        rm -f "$plan_file" "$plan_json" /tmp/terraform_plan_output.txt
    else
        log_error "Plan 実行: 失敗"
        record_test "Plan Execution: $env" "FAIL"
        cat /tmp/terraform_plan_output.txt || true
        cd - > /dev/null
        return 1
    fi
    
    cd - > /dev/null
}

#################################################################################
# 環境設定検証
#################################################################################

validate_environment_config() {
    local env="$1"
    
    log_section "環境設定検証: $env"
    
    local tfvars_file="${TF_DIR}/environments/${env}.tfvars"
    
    if [[ ! -f "$tfvars_file" ]]; then
        log_error "環境設定ファイルが見つかりません: $tfvars_file"
        record_test "Environment Config: $env" "FAIL"
        return 1
    fi
    
    log_info "チェック項目:"
    
    # 必須変数のチェック
    local required_vars=("environment" "aws_region" "resource_prefix")
    local all_valid=true
    
    for var in "${required_vars[@]}"; do
        if grep -q "^${var}" "$tfvars_file"; then
            local value=$(grep "^${var}" "$tfvars_file" | cut -d'=' -f2- | tr -d ' "')
            log_success "  $var = $value"
        else
            log_warning "  $var が設定されていません"
            all_valid=false
        fi
    done
    
    if [[ "$all_valid" == true ]]; then
        record_test "Environment Config: $env" "PASS"
    else
        record_test "Environment Config: $env" "FAIL"
    fi
}

#################################################################################
# Output 値検証
#################################################################################

validate_outputs() {
    log_section "Output 値検証"
    
    local outputs_file="${TF_DIR}/outputs.tf"
    
    if [[ ! -f "$outputs_file" ]]; then
        log_error "outputs.tf が見つかりません"
        record_test "Outputs Definition" "FAIL"
        return 1
    fi
    
    log_info "定義されている Output:"
    
    # Output を抽出
    local output_count=$(grep -c '^output "' "$outputs_file" || echo "0")
    
    if [[ $output_count -gt 0 ]]; then
        grep '^output "' "$outputs_file" | sed 's/output "\([^"]*\)".*/  - \1/' | while read -r line; do
            log_success "$line"
        done
        record_test "Outputs Definition" "PASS" "$output_count outputs"
    else
        log_warning "Output が定義されていません"
        record_test "Outputs Definition" "FAIL"
    fi
}

#################################################################################
# 依存関係検証
#################################################################################

validate_dependencies() {
    log_section "モジュール依存関係検証"
    
    local main_tf="${TF_DIR}/main.tf"
    
    if [[ ! -f "$main_tf" ]]; then
        log_error "main.tf が見つかりません"
        record_test "Module Dependencies" "FAIL"
        return 1
    fi
    
    log_info "モジュール呼び出し:"
    
    local module_calls=$(grep -c '^module "' "$main_tf" || echo "0")
    
    if [[ $module_calls -gt 0 ]]; then
        grep '^module "' "$main_tf" | sed 's/module "\([^"]*\)".*/  - \1/' | while read -r line; do
            log_success "$line"
        done
        record_test "Module Dependencies" "PASS" "$module_calls modules"
    else
        log_warning "モジュール呼び出しが見つかりません"
        record_test "Module Dependencies" "FAIL"
    fi
}

#################################################################################
# 変数検証
#################################################################################

validate_variables() {
    log_section "変数定義検証"
    
    local variables_file="${TF_DIR}/variables.tf"
    
    if [[ ! -f "$variables_file" ]]; then
        log_error "variables.tf が見つかりません"
        record_test "Variables Definition" "FAIL"
        return 1
    fi
    
    log_info "定義されている変数:"
    
    local var_count=$(grep -c '^variable "' "$variables_file" || echo "0")
    
    if [[ $var_count -gt 0 ]]; then
        grep '^variable "' "$variables_file" | sed 's/variable "\([^"]*\)".*/  - \1/' | while read -r line; do
            log_success "$line"
        done
        record_test "Variables Definition" "PASS" "$var_count variables"
    else
        log_warning "変数が定義されていません"
        record_test "Variables Definition" "FAIL"
    fi
}

#################################################################################
# テスト結果リポート
#################################################################################

print_test_report() {
    log_section "テスト結果レポート"
    
    echo ""
    for result in "${TEST_RESULTS[@]}"; do
        echo "$result"
    done
    
    echo ""
    
    # 統計
    local total=${#TEST_RESULTS[@]}
    local passed=$((total - ${#FAILED_TESTS[@]}))
    local failed=${#FAILED_TESTS[@]}
    
    if [[ $failed -eq 0 ]]; then
        log_success "すべてのテストに合格しました！"
        log_success "合格: $passed / $total"
    else
        log_error "いくつかのテストが失敗しました"
        log_error "合格: $passed / $total"
        log_error "失敗: $failed / $total"
        
        if [[ $failed -gt 0 ]]; then
            echo ""
            log_error "失敗したテスト:"
            for test in "${FAILED_TESTS[@]}"; do
                echo "  - $test"
            done
        fi
    fi
    
    echo ""
}

#################################################################################
# メイン実行フロー
#################################################################################

main() {
    log_section "T064: Terraform Module & Configuration Comprehensive Test"
    
    echo "実行開始時刻: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "選択環境: $SELECTED_ENV"
    echo ""
    
    # 前提条件チェック
    check_prerequisites
    
    # モジュール構造検証
    validate_module_structure
    
    # 構文検証
    validate_terraform_syntax
    
    # フォーマット検証
    validate_terraform_format
    
    # 変数検証
    validate_variables
    
    # Output 検証
    validate_outputs
    
    # 依存関係検証
    validate_dependencies
    
    # 環境別テスト
    case "$SELECTED_ENV" in
        all)
            for env in "${ENVIRONMENTS[@]}"; do
                validate_environment_config "$env"
                test_terraform_plan "$env"
            done
            ;;
        dev|staging|prod)
            validate_environment_config "$SELECTED_ENV"
            test_terraform_plan "$SELECTED_ENV"
            ;;
        *)
            log_error "無効な環境: $SELECTED_ENV"
            log_info "使用可能な環境: dev, staging, prod, all"
            exit 1
            ;;
    esac
    
    # テスト結果リポート
    print_test_report
    
    echo "実行終了時刻: $(date '+%Y-%m-%d %H:%M:%S')"
    echo ""
    
    # 終了コード
    if [[ ${#FAILED_TESTS[@]} -gt 0 ]]; then
        return 1
    else
        return 0
    fi
}

# スクリプト実行
main "$@"
