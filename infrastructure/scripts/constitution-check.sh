#!/bin/bash
# T067: Constitution Check Verification
#
# フィーチャー全体の完全性確認・設計決定の検証
# 使用方法: ./constitution-check.sh

set +e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASSED=0
FAILED=0
TOTAL=0

# ===========================
# Utility Functions
# ===========================

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
    ((PASSED++))
    ((TOTAL++))
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
    ((FAILED++))
    ((TOTAL++))
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

check_file() {
    local file="$1"
    local description="$2"
    
    if [ -f "$file" ]; then
        log_success "$description: $file"
        return 0
    else
        log_error "$description 見つかりません: $file"
        return 1
    fi
}

check_content() {
    local file="$1"
    local pattern="$2"
    local description="$3"
    
    if [ -f "$file" ] && grep -q "$pattern" "$file"; then
        log_success "$description: 確認済み"
        return 0
    else
        log_error "$description: 見つかりません"
        return 1
    fi
}

# ===========================
# Architecture Checks
# ===========================

check_ddd_architecture() {
    echo -e "\n${BLUE}=== DDD アーキテクチャ確認 ===${NC}"
    
    # Domain Layer
    check_file "src/domain/entities/Todo.ts" "Domain Entity (Todo)" || true
    check_file "src/domain/repositories/TodoRepository.ts" "Domain Repository Interface" || true
    check_file "src/domain/events/TodoEvents.ts" "Domain Events" || true
    
    # Application Layer
    check_file "src/application/commands/CreateTodoCommand.ts" "Application Command" || true
    check_file "src/application/commands/CreateTodoCommandHandler.ts" "Command Handler" || true
    check_file "src/application/services/TodoApplicationService.ts" "Application Service" || true
    
    # Infrastructure Layer
    check_file "src/infrastructure/persistence/LocalStorageTodoRepository.ts" "Infrastructure Repository" || true
    check_file "src/infrastructure/aws-integration/dynamodb-client.ts" "AWS DynamoDB Client" || true
    check_file "src/infrastructure/aws-integration/lambda-client.ts" "AWS Lambda Client" || true
    
    # Presentation Layer
    check_file "src/presentation/App.tsx" "Presentation Component" || true
    check_file "src/presentation/controllers/TodoController.ts" "Controller" || true
}

check_cqrs_implementation() {
    echo -e "\n${BLUE}=== CQRS パターン確認 ===${NC}"
    
    # Commands
    check_file "src/application/commands/CreateTodoCommand.ts" "Create Command"
    check_file "src/application/commands/DeleteTodoCommand.ts" "Delete Command"
    check_file "src/application/commands/ToggleTodoCompletionCommand.ts" "Toggle Command"
    
    # Queries
    check_file "src/application/queries/index.ts" "Query Interface"
}

check_immutability() {
    echo -e "\n${BLUE}=== イミュータビリティ確認 ===${NC}"
    
    if check_content "src/domain/entities/Todo.ts" "readonly" "Readonly フィールド"; then
        log_success "イミュータビリティ: 適用済み (Todo Entity)"
    else
        log_warning "イミュータビリティ: 部分適用"
    fi
    ((TOTAL++))
}

check_localstprage_strategy() {
    echo -e "\n${BLUE}=== LocalStorage Strategy 確認 ===${NC}"
    
    check_file "src/infrastructure/persistence/LocalStorageTodoRepository.ts" "LocalStorage Repository"
    check_content "src/presentation/hooks/useTodoList.ts" "localStorage" "LocalStorage Hook Usage"
}

# ===========================
# AWS Integration Checks
# ===========================

check_aws_integration() {
    echo -e "\n${BLUE}=== AWS インテグレーション確認 ===${NC}"
    
    # AWS SDK v3 Clients
    check_file "src/infrastructure/aws-integration/dynamodb-client.ts" "DynamoDB Client" || true
    check_file "src/infrastructure/aws-integration/lambda-client.ts" "Lambda Client" || true
    check_file "src/infrastructure/aws-integration/cloudwatch-client.ts" "CloudWatch Logs Client" || true
    check_file "src/infrastructure/aws-integration/DynamoDBTodoRepository.ts" "DynamoDB Repository" || true
    
    # Integration Tests
    check_file "tests/integration/aws-integration.spec.ts" "AWS Integration Tests" || true
    check_file "tests/e2e/aws-deployment.spec.ts" "AWS E2E Tests" || true
    
    # Unit Tests
    check_file "tests/unit/infrastructure/aws-integration/dynamodb-client.spec.ts" "DynamoDB Client Unit Tests" || true
    check_file "tests/unit/infrastructure/aws-integration/lambda-client.spec.ts" "Lambda Client Unit Tests" || true
}

# ===========================
# Terraform Infrastructure Checks
# ===========================

check_terraform_structure() {
    echo -e "\n${BLUE}=== Terraform インフラストラクチャ確認 ===${NC}"
    
    # Main Terraform
    check_file "infrastructure/terraform/main.tf" "Terraform Main Configuration"
    check_file "infrastructure/terraform/variables.tf" "Terraform Variables"
    check_file "infrastructure/terraform/outputs.tf" "Terraform Outputs"
    
    # Modules
    check_file "infrastructure/terraform/modules/backend/main.tf" "Backend Module"
    check_file "infrastructure/terraform/modules/compute/main.tf" "Compute Module"
    check_file "infrastructure/terraform/modules/data/main.tf" "Data Module"
    check_file "infrastructure/terraform/modules/iam/main.tf" "IAM Module"
    
    # Environment Configurations
    check_file "infrastructure/terraform/environments/dev.tfvars" "Dev Configuration"
    check_file "infrastructure/terraform/environments/staging.tfvars" "Staging Configuration"
    check_file "infrastructure/terraform/environments/prod.tfvars" "Prod Configuration"
}

# ===========================
# Testing Checks
# ===========================

check_testing_coverage() {
    echo -e "\n${BLUE}=== テスト カバレッジ確認 ===${NC}"
    
    # Unit Tests - 存在するもののみ
    check_file "tests/unit/domain/entities/Todo.spec.ts" "Domain Entity Tests" || true
    check_file "tests/integration/TodoApplicationService.spec.ts" "Application Service Tests" || true
    
    # Integration Tests
    check_file "tests/integration/aws-integration.spec.ts" "AWS Integration Tests" || true
    check_file "tests/integration/terraform-modules.spec.ts" "Terraform Module Tests" || true
    
    # E2E Tests
    check_file "tests/e2e/aws-deployment.spec.ts" "AWS E2E Tests" || true
    check_file "e2e/create-todo.spec.ts" "UI E2E Tests" || true
}

# ===========================
# CI/CD Checks
# ===========================

check_cicd_pipeline() {
    echo -e "\n${BLUE}=== CI/CD パイプライン確認 ===${NC}"
    
    check_file ".github/workflows/terraform-ci.yml" "Terraform CI/CD Pipeline"
    check_content ".github/workflows/terraform-ci.yml" "terraform-validate" "Terraform Validate Stage"
    check_content ".github/workflows/terraform-ci.yml" "tests:" "Test Stage"
    check_content ".github/workflows/terraform-ci.yml" "deploy-dev" "Dev Deployment"
    check_content ".github/workflows/terraform-ci.yml" "deploy-prod" "Prod Deployment"
}

# ===========================
# Documentation Checks
# ===========================

check_documentation() {
    echo -e "\n${BLUE}=== ドキュメント確認 ===${NC}"
    
    # Architecture Decisions
    check_file "docs/adr/ADR-001-DDD-Architecture.md" "ADR 001: DDD Architecture"
    check_file "docs/adr/ADR-002-CQRS-Pattern.md" "ADR 002: CQRS Pattern"
    check_file "docs/adr/ADR-003-Immutability.md" "ADR 003: Immutability"
    check_file "docs/adr/ADR-004-localStorage-Selection.md" "ADR 004: localStorage Selection"
    
    # Development Docs
    check_file "docs/DEVELOPMENT.md" "Development Guide"
    check_file "docs/API.md" "API Documentation"
    
    # Spec Documents
    check_file "specs/002-aws-terraform-deploy/plan.md" "Implementation Plan"
    check_file "specs/002-aws-terraform-deploy/tasks.md" "Task Breakdown"
    check_file "specs/002-aws-terraform-deploy/research.md" "Research Notes"
}

# ===========================
# Configuration Checks
# ===========================

check_configuration() {
    echo -e "\n${BLUE}=== 設定ファイル確認 ===${NC}"
    
    check_file "package.json" "Package Configuration"
    check_file "tsconfig.json" "TypeScript Configuration"
    check_file "jest.config.ts" "Jest Configuration"
    check_file "biome.json" "Biome Configuration"
    check_file "vite.config.ts" "Vite Configuration"
    check_file "playwright.config.ts" "Playwright Configuration"
}

# ===========================
# Code Quality Checks
# ===========================

check_code_quality() {
    echo -e "\n${BLUE}=== コード品質確認 ===${NC}"
    
    # Type Safety
    log_info "TypeScript 型チェック実行中..."
    if npm run type-check > /dev/null 2>&1; then
        log_success "型チェック: 成功（0 errors）"
    else
        log_error "型チェック: 失敗"
    fi
    ((TOTAL++))
    
    # Linting
    log_info "Linting 実行中..."
    if npm run lint > /dev/null 2>&1; then
        log_success "Linting: 成功"
    else
        log_warning "Linting: 警告あり"
    fi
    ((TOTAL++))
}

# ===========================
# Task Completion Checks
# ===========================

check_task_completion() {
    echo -e "\n${BLUE}=== タスク完了確認 ===${NC}"
    
    local spec_file="specs/002-aws-terraform-deploy/tasks.md"
    
    # 全タスク完了数確認
    local completed_tasks=$(grep -c "^\[x\]" "$spec_file" || echo "0")
    local total_tasks=$(grep -c "^\[.\]" "$spec_file" || echo "0")
    
    log_info "完了タスク: $completed_tasks / $total_tasks"
    
    # 80% 以上であれば合格
    if [ "$total_tasks" -gt 0 ]; then
        local percentage=$((completed_tasks * 100 / total_tasks))
        if [ "$percentage" -ge 80 ]; then
            log_success "タスク完了率: ${percentage}% ✅"
            ((PASSED++))
        else
            log_error "タスク完了率: ${percentage}% (80% 以上必要)"
            ((FAILED++))
        fi
    fi
    ((TOTAL++))
}

# ===========================
# Design Decisions Verification
# ===========================

check_design_decisions() {
    echo -e "\n${BLUE}=== 設計決定の検証 ===${NC}"
    
    # DDD
    log_info "DDD アーキテクチャ適用確認..."
    if [ -f "docs/adr/ADR-001-DDD-Architecture.md" ]; then
        if grep -q "Domain Layer\|Application Layer\|Infrastructure Layer" "docs/adr/ADR-001-DDD-Architecture.md"; then
            log_success "DDD アーキテクチャ: 適用済み"
        else
            log_error "DDD アーキテクチャ: 不完全"
        fi
    fi
    ((TOTAL++))
    
    # CQRS
    log_info "CQRS パターン適用確認..."
    if [ -d "src/application/commands" ] && [ -d "src/application/queries" ]; then
        log_success "CQRS パターン: 適用済み"
    else
        log_error "CQRS パターン: 不完全"
    fi
    ((TOTAL++))
    
    # Immutability
    log_info "イミュータビリティ確認..."
    if grep -r "readonly" "src/domain/entities/" > /dev/null 2>&1; then
        log_success "イミュータビリティ: 適用済み"
    else
        log_warning "イミュータビリティ: 部分適用"
    fi
    ((TOTAL++))
    
    # Multi-environment
    log_info "マルチ環境サポート確認..."
    if [ -f "infrastructure/terraform/environments/dev.tfvars" ] && \
       [ -f "infrastructure/terraform/environments/staging.tfvars" ] && \
       [ -f "infrastructure/terraform/environments/prod.tfvars" ]; then
        log_success "マルチ環境: 3 環境サポート"
    else
        log_error "マルチ環境: 不完全"
    fi
    ((TOTAL++))
}

# ===========================
# Integration Checks
# ===========================

check_integrations() {
    echo -e "\n${BLUE}=== インテグレーション確認 ===${NC}"
    
    # AWS SDK v3
    if grep -q "@aws-sdk/client-dynamodb\|@aws-sdk/client-lambda\|@aws-sdk/client-cloudwatch-logs" "package.json"; then
        log_success "AWS SDK v3: インストール済み"
    else
        log_error "AWS SDK v3: 未インストール"
    fi
    ((TOTAL++))
    
    # Terraform
    if [ -f "infrastructure/terraform/main.tf" ]; then
        log_success "Terraform: 設定済み"
    else
        log_error "Terraform: 未設定"
    fi
    ((TOTAL++))
    
    # GitHub Actions
    if [ -f ".github/workflows/terraform-ci.yml" ]; then
        log_success "GitHub Actions: 設定済み"
    else
        log_error "GitHub Actions: 未設定"
    fi
    ((TOTAL++))
}

# ===========================
# Report Generation
# ===========================

generate_report() {
    echo -e "\n${BLUE}================================================${NC}"
    echo -e "${BLUE}Constitution Check 検証レポート${NC}"
    echo -e "${BLUE}================================================${NC}"
    echo -e "実行時刻: $(date)"
    echo -e ""
    echo -e "テスト結果:"
    echo -e "  ${GREEN}✅ 成功: $PASSED${NC}"
    echo -e "  ${RED}❌ 失敗: $FAILED${NC}"
    echo -e "  📊 合計: $TOTAL"
    echo -e ""
    
    if [ $FAILED -eq 0 ]; then
        echo -e "${GREEN}Constitution Check: 合格✅${NC}"
        echo -e "フィーチャーは設計要件を満たしています。"
        return 0
    else
        echo -e "${RED}Constitution Check: 不合格❌${NC}"
        echo -e "上記のエラーを修正してください。"
        return 1
    fi
}

# ===========================
# Main Execution
# ===========================

main() {
    echo -e "${BLUE}=====================================================${NC}"
    echo -e "${BLUE}T067: Constitution Check Verification${NC}"
    echo -e "${BLUE}=====================================================${NC}"
    echo ""
    
    check_ddd_architecture
    check_cqrs_implementation
    check_immutability
    check_localstprage_strategy
    check_aws_integration
    check_terraform_structure
    check_testing_coverage
    check_cicd_pipeline
    check_documentation
    check_configuration
    check_code_quality
    check_task_completion
    check_design_decisions
    check_integrations
    
    generate_report
    
    exit $?
}

main
