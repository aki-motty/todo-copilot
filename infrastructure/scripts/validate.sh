#!/bin/bash

################################################################################
# Terraform Validation Script
#
# Purpose: Comprehensive Terraform validation including syntax, compliance, and best practices
# Usage: ./validate.sh [environment] [options]
# Environments: dev, staging, prod, all
#
# Options:
#   --strict            Enable strict mode with additional checks
#   --detailed          Show detailed validation output
#   --fix               Attempt to auto-fix formatting issues
################################################################################

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
TERRAFORM_DIR="${PROJECT_ROOT}/infrastructure/terraform"
AWS_REGION="${AWS_REGION:-ap-northeast-1}"
ENVIRONMENTS=("dev" "staging" "prod")
ALL_ENV="all"

# Options
STRICT_MODE=false
DETAILED=false
FIX_ISSUES=false

# Results tracking
PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

################################################################################
# Helper Functions
################################################################################

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((PASS_COUNT++))
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
    ((WARN_COUNT++))
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((FAIL_COUNT++))
}

# Print usage
print_usage() {
    cat <<EOF
Usage: $0 [environment] [options]

Environments:
  dev          Development environment
  staging      Staging environment
  prod         Production environment
  all          All environments (default)

Options:
  --strict            Enable strict mode with additional checks
  --detailed          Show detailed validation output
  --fix               Attempt to auto-fix formatting issues
  -h, --help          Show this help message

Examples:
  $0                                  # Validate all environments
  $0 dev --strict                     # Strict validation for dev
  $0 prod --detailed                  # Detailed validation for prod
  $0 all --fix                        # Auto-fix issues across all envs

EOF
}

# Parse command line arguments
parse_arguments() {
    local environment="${ALL_ENV}"
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --strict)
                STRICT_MODE=true
                shift
                ;;
            --detailed)
                DETAILED=true
                shift
                ;;
            --fix)
                FIX_ISSUES=true
                shift
                ;;
            -h|--help)
                print_usage
                exit 0
                ;;
            dev|staging|prod|all)
                environment="$1"
                shift
                ;;
            *)
                log_error "Unknown option: $1"
                print_usage
                exit 1
                ;;
        esac
    done
    
    echo "$environment"
}

# Check if Terraform is installed
check_terraform() {
    if ! command -v terraform >/dev/null 2>&1; then
        log_error "Terraform CLI not found"
        exit 1
    fi
    
    local version
    version=$(terraform version -json 2>/dev/null | grep -o '"terraform_version":"[^"]*' | cut -d'"' -f4)
    log_info "Terraform version: ${version}"
}

# Validate Terraform syntax
validate_syntax() {
    local env=$1
    
    log_info "Validating Terraform syntax for ${env}..."
    
    cd "$TERRAFORM_DIR"
    
    if [ "$env" != "$ALL_ENV" ]; then
        terraform workspace select "$env" 2>/dev/null || log_warning "Cannot select workspace ${env}"
    fi
    
    if terraform validate > /tmp/tf_validate.log 2>&1; then
        log_success "Terraform syntax validation passed"
        [ "$DETAILED" = true ] && cat /tmp/tf_validate.log
    else
        log_error "Terraform syntax validation failed"
        cat /tmp/tf_validate.log
        return 1
    fi
}

# Check for best practices
check_best_practices() {
    local env=$1
    
    log_info "Checking Terraform best practices for ${env}..."
    
    cd "$TERRAFORM_DIR"
    
    local found_issues=0
    
    # Check 1: All variables should be documented
    if grep -r "variable" --include="*.tf" | grep -v "description" >/dev/null 2>&1; then
        if [ "$STRICT_MODE" = true ]; then
            log_warning "Some variables lack descriptions"
            ((found_issues++))
        fi
    fi
    
    # Check 2: Sensitive values should be marked
    if grep -r "password\|secret\|token\|key" --include="*.tf" | grep -v "sensitive" >/dev/null 2>&1; then
        log_warning "Found potential sensitive values that may not be marked"
        ((found_issues++))
    fi
    
    # Check 3: Resource naming conventions
    if grep -r "resource \"" --include="*.tf" | grep -E "[A-Z]" >/dev/null 2>&1; then
        log_warning "Resource names should use lowercase with underscores"
        ((found_issues++))
    fi
    
    # Check 4: All resources should have tags
    if grep -c "resource \"aws_" --include="*.tf" $(find . -name "*.tf") >/dev/null 2>&1; then
        local resource_count=$(grep -r "resource \"aws_" --include="*.tf" | wc -l)
        local tagged_count=$(grep -r "tags = " --include="*.tf" | wc -l)
        
        if [ "$tagged_count" -lt "$resource_count" ]; then
            log_warning "Not all AWS resources are tagged (${tagged_count}/${resource_count})"
            ((found_issues++))
        fi
    fi
    
    if [ "$found_issues" -eq 0 ]; then
        log_success "Best practices check passed"
    else
        log_warning "Found ${found_issues} potential best practice issues"
    fi
}

# Validate tfvars files
validate_tfvars() {
    local env=$1
    
    if [ "$env" = "$ALL_ENV" ]; then
        log_info "Validating all tfvars files..."
        for e in "${ENVIRONMENTS[@]}"; do
            validate_tfvars "$e"
        done
        return 0
    fi
    
    log_info "Validating tfvars for ${env}..."
    
    local tfvars_file="${TERRAFORM_DIR}/environments/${env}.tfvars"
    
    if [ ! -f "$tfvars_file" ]; then
        log_error "tfvars file not found: ${tfvars_file}"
        return 1
    fi
    
    # Basic validation - check if HCL is parseable
    cd "$TERRAFORM_DIR"
    if terraform validate -var-file="$tfvars_file" >/dev/null 2>&1; then
        log_success "tfvars validation passed for ${env}"
    else
        log_error "tfvars validation failed for ${env}"
        return 1
    fi
}

# Check for formatting issues
check_formatting() {
    local env=$1
    
    log_info "Checking code formatting..."
    
    cd "$TERRAFORM_DIR"
    
    # Use terraform fmt to check formatting
    local fmt_output
    fmt_output=$(terraform fmt -recursive -check . 2>&1 || true)
    
    if [ -z "$fmt_output" ]; then
        log_success "Code formatting is correct"
    else
        if [ "$FIX_ISSUES" = true ]; then
            log_info "Auto-fixing formatting issues..."
            terraform fmt -recursive . >/dev/null
            log_success "Formatting issues fixed"
        else
            log_warning "Formatting issues found:"
            terraform fmt -recursive -check . 2>&1 | head -10
            log_info "Run with --fix to auto-fix formatting"
        fi
    fi
}

# Validate backend configuration
check_backend() {
    local env=$1
    
    if [ "$env" = "$ALL_ENV" ]; then
        log_info "Checking backend configuration for all environments..."
        for e in "${ENVIRONMENTS[@]}"; do
            check_backend "$e"
        done
        return 0
    fi
    
    log_info "Checking backend configuration for ${env}..."
    
    cd "$TERRAFORM_DIR"
    
    # Verify backend files exist
    local backend_files=(
        "modules/backend/main.tf"
        "modules/backend/variables.tf"
        "modules/backend/outputs.tf"
    )
    
    for file in "${backend_files[@]}"; do
        if [ ! -f "$file" ]; then
            log_error "Backend file not found: ${file}"
            return 1
        fi
    done
    
    log_success "Backend configuration files present"
}

# Validate module structure
check_modules() {
    log_info "Checking module structure..."
    
    cd "$TERRAFORM_DIR"
    
    local required_modules=("backend" "compute" "data" "iam")
    
    for module in "${required_modules[@]}"; do
        if [ -d "modules/${module}" ]; then
            if [ -f "modules/${module}/main.tf" ] && [ -f "modules/${module}/variables.tf" ]; then
                log_success "Module '${module}' structure valid"
            else
                log_error "Module '${module}' missing required files"
                return 1
            fi
        else
            log_error "Module '${module}' directory not found"
            return 1
        fi
    done
}

# Lint Terraform files
run_tflint() {
    local env=$1
    
    if ! command -v tflint >/dev/null 2>&1; then
        log_warning "tflint not installed, skipping linting"
        return 0
    fi
    
    log_info "Running tflint for ${env}..."
    
    cd "$TERRAFORM_DIR"
    
    if tflint . 2>&1 | grep -q "failed"; then
        log_warning "tflint found issues"
    else
        log_success "tflint validation passed"
    fi
}

# Security checks
check_security() {
    log_info "Checking for security issues..."
    
    cd "$TERRAFORM_DIR"
    
    local issues=0
    
    # Check for hardcoded credentials
    if grep -r "password\|api_key\|secret" --include="*.tf" | grep -v "var\." | grep -v "#" >/dev/null 2>&1; then
        log_warning "Potential hardcoded credentials found"
        ((issues++))
    fi
    
    # Check for open security groups
    if grep -r "0\.0\.0\.0/0" --include="*.tf" >/dev/null 2>&1; then
        log_warning "Found CIDR 0.0.0.0/0 (consider restricting)"
        ((issues++))
    fi
    
    # Check for encryption settings
    if grep -r "encrypted = false" --include="*.tf" >/dev/null 2>&1; then
        log_error "Found resources with encryption disabled"
        ((issues++))
    fi
    
    if [ "$issues" -eq 0 ]; then
        log_success "Security checks passed"
    else
        log_warning "Found ${issues} potential security concerns"
    fi
}

# Display summary
display_summary() {
    echo ""
    echo "═════════════════════════════════════════"
    log_info "Validation Summary"
    echo "═════════════════════════════════════════"
    
    echo -e "Passed:  ${GREEN}${PASS_COUNT}${NC}"
    echo -e "Warnings: ${YELLOW}${WARN_COUNT}${NC}"
    echo -e "Failed:  ${RED}${FAIL_COUNT}${NC}"
    
    if [ "$FAIL_COUNT" -eq 0 ]; then
        log_success "All validations completed successfully!"
        return 0
    else
        log_error "Validation completed with failures"
        return 1
    fi
}

################################################################################
# Main
################################################################################

main() {
    local environment
    
    # Parse arguments
    environment=$(parse_arguments "$@")
    
    log_info "Starting Terraform validation..."
    log_info "Environment: ${environment}"
    log_info "Strict mode: ${STRICT_MODE}"
    
    # Check prerequisites
    check_terraform
    
    # Run validations
    if [ "$environment" = "$ALL_ENV" ]; then
        log_info "Validating all environments..."
        for env in "${ENVIRONMENTS[@]}"; do
            echo ""
            log_info "=== Validating ${env} environment ==="
            validate_syntax "$env"
            validate_tfvars "$env"
        done
    else
        validate_syntax "$environment"
        validate_tfvars "$environment"
    fi
    
    # Additional checks
    check_formatting
    check_best_practices "$environment"
    check_modules
    check_backend "$environment"
    run_tflint "$environment"
    check_security
    
    # Display summary and return status
    display_summary
}

# Run main
main "$@"
