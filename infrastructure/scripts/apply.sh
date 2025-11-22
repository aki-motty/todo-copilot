#!/bin/bash

################################################################################
# Terraform Apply Script
#
# Purpose: Execute Terraform apply with deployment confirmations and validation
# Usage: ./apply.sh [environment] [options]
# Environments: dev, staging, prod
#
# Options:
#   --auto-approve      Skip interactive approval (use with caution in prod)
#   --plan-file FILE    Apply from saved plan file
#   --no-backup         Skip backup creation
################################################################################

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
TERRAFORM_DIR="${PROJECT_ROOT}/infrastructure/terraform"
AWS_REGION="${AWS_REGION:-ap-northeast-1}"
ENVIRONMENTS=("dev" "staging" "prod")
DEFAULT_ENV="dev"

# Options
AUTO_APPROVE=false
PLAN_FILE=""
NO_BACKUP=false

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
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_apply() {
    echo -e "${CYAN}[APPLY]${NC} $1"
}

# Print usage
print_usage() {
    cat <<EOF
Usage: $0 [environment] [options]

Environments:
  dev          Development environment (default)
  staging      Staging environment
  prod         Production environment

Options:
  --auto-approve      Skip interactive approval (use with caution in prod!)
  --plan-file FILE    Apply from saved plan file
  --no-backup         Skip backup creation
  -h, --help          Show this help message

Examples:
  $0 dev                              # Apply dev with confirmation
  $0 staging --auto-approve           # Auto-approve staging
  $0 prod --plan-file plan.tfplan     # Apply from plan file
  $0 dev --no-backup                  # Skip backup

⚠️  WARNING: In production, always review plans before approving!

EOF
}

# Parse command line arguments
parse_arguments() {
    local environment=""
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --auto-approve)
                AUTO_APPROVE=true
                shift
                ;;
            --plan-file)
                PLAN_FILE="$2"
                shift 2
                ;;
            --no-backup)
                NO_BACKUP=true
                shift
                ;;
            -h|--help)
                print_usage
                exit 0
                ;;
            dev|staging|prod)
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
    
    echo "${environment:-$DEFAULT_ENV}"
}

# Validate environment
validate_environment() {
    local env=$1
    for valid_env in "${ENVIRONMENTS[@]}"; do
        if [ "$env" == "$valid_env" ]; then
            return 0
        fi
    done
    return 1
}

# Check if Terraform is initialized
check_terraform_initialized() {
    local env=$1
    
    if [ ! -d "${TERRAFORM_DIR}/.terraform" ]; then
        log_error "Terraform not initialized. Run './init.sh ${env}' first."
        exit 1
    fi
}

# Confirm deployment (especially important for prod)
confirm_deployment() {
    local env=$1
    local approved_file="${PROJECT_ROOT}/.terraform-approved-${env}"
    
    if [ "$AUTO_APPROVE" = true ]; then
        log_warning "Auto-approve mode enabled. Skipping confirmation."
        return 0
    fi
    
    if [ "$env" = "prod" ]; then
        log_warning "⚠️  YOU ARE ABOUT TO APPLY CHANGES TO PRODUCTION ENVIRONMENT"
        echo ""
        log_info "Please review the plan above carefully before proceeding."
        echo ""
        read -p "Type 'yes' to confirm production deployment: " confirmation
        
        if [ "$confirmation" != "yes" ]; then
            log_error "Deployment cancelled by user"
            exit 1
        fi
        
        # Additional prod confirmation
        echo ""
        read -p "Confirm again (type environment name '${env}'): " env_confirm
        if [ "$env_confirm" != "$env" ]; then
            log_error "Environment confirmation mismatch. Deployment cancelled."
            exit 1
        fi
    else
        log_info "Deploying to ${env} environment."
        read -p "Type 'yes' to confirm: " confirmation
        
        if [ "$confirmation" != "yes" ]; then
            log_error "Deployment cancelled by user"
            exit 1
        fi
    fi
}

# Create backup of current state
create_state_backup() {
    local env=$1
    
    if [ "$NO_BACKUP" = true ]; then
        log_info "Skipping backup (--no-backup flag set)"
        return 0
    fi
    
    log_info "Creating backup of current state..."
    
    local backup_dir="${PROJECT_ROOT}/.terraform-backups"
    mkdir -p "$backup_dir"
    
    local backup_file="${backup_dir}/state-${env}-$(date +%Y%m%d-%H%M%S).backup"
    
    cd "$TERRAFORM_DIR"
    terraform workspace select "$env"
    
    # Export current state
    if terraform show > "$backup_file" 2>/dev/null; then
        log_success "State backed up to: ${backup_file}"
    else
        log_warning "Could not backup current state (may not exist yet)"
    fi
}

# Run Terraform apply
run_terraform_apply() {
    local env=$1
    local tfvars_file="${TERRAFORM_DIR}/environments/${env}.tfvars"
    
    log_info "Starting Terraform apply for ${env} environment..."
    
    cd "$TERRAFORM_DIR"
    
    # Select workspace
    terraform workspace select "$env"
    
    # Build apply command
    local apply_cmd="terraform apply"
    
    # Use plan file if provided
    if [ -n "$PLAN_FILE" ]; then
        if [ ! -f "$PLAN_FILE" ]; then
            log_error "Plan file not found: ${PLAN_FILE}"
            exit 1
        fi
        apply_cmd="${apply_cmd} ${PLAN_FILE}"
    else
        apply_cmd="${apply_cmd} -var-file=${tfvars_file}"
    fi
    
    # Add auto-approve if requested
    if [ "$AUTO_APPROVE" = true ]; then
        apply_cmd="${apply_cmd} -auto-approve"
    fi
    
    apply_cmd="${apply_cmd} -input=false"
    
    # Execute apply
    log_apply "Executing: $apply_cmd"
    eval "$apply_cmd"
    
    return $?
}

# Validate deployment
validate_deployment() {
    local env=$1
    
    log_info "Validating deployment for ${env} environment..."
    
    cd "$TERRAFORM_DIR"
    terraform workspace select "$env"
    
    # Get outputs
    local outputs
    outputs=$(terraform output -json 2>/dev/null || echo "{}")
    
    # Validate key outputs exist
    if echo "$outputs" | grep -q "api_gateway_endpoint"; then
        local api_endpoint
        api_endpoint=$(echo "$outputs" | grep -o '"api_gateway_endpoint"[^}]*' | cut -d'"' -f4)
        log_success "API Gateway endpoint: ${api_endpoint}"
    fi
    
    if echo "$outputs" | grep -q "lambda_function_arn"; then
        log_success "Lambda function deployed"
    fi
    
    if echo "$outputs" | grep -q "dynamodb_table_name"; then
        local table_name
        table_name=$(echo "$outputs" | grep -o '"dynamodb_table_name"[^}]*' | cut -d'"' -f4)
        log_success "DynamoDB table: ${table_name}"
    fi
    
    log_success "Deployment validation completed"
}

################################################################################
# Main
################################################################################

main() {
    local environment
    
    # Parse arguments
    environment=$(parse_arguments "$@")
    
    log_info "Starting Terraform apply..."
    log_info "Environment: ${environment}"
    log_info "Region: ${AWS_REGION}"
    
    # Validate environment
    if ! validate_environment "$environment"; then
        log_error "Invalid environment: ${environment}"
        log_error "Valid environments: ${ENVIRONMENTS[*]}"
        exit 1
    fi
    
    # Check Terraform initialized
    check_terraform_initialized "$environment"
    
    # Show plan first (unless using saved plan file)
    if [ -z "$PLAN_FILE" ]; then
        log_info "Running plan first to show proposed changes..."
        cd "$TERRAFORM_DIR"
        terraform workspace select "$environment"
        terraform plan -var-file="${TERRAFORM_DIR}/environments/${environment}.tfvars" -no-color -input=false | head -50
        echo ""
    fi
    
    # Confirm deployment
    confirm_deployment "$environment"
    
    # Create backup
    create_state_backup "$environment"
    
    # Apply changes
    if run_terraform_apply "$environment" "${PLAN_FILE}"; then
        log_success "Terraform apply completed successfully for ${environment}!"
        
        # Validate deployment
        validate_deployment "$environment"
        
        log_success "Deployment successful!"
        log_info "Infrastructure is now live in ${environment} environment."
    else
        log_error "Terraform apply failed for ${environment}"
        exit 1
    fi
}

# Run main
main "$@"
