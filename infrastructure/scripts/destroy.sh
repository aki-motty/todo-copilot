#!/bin/bash

################################################################################
# Terraform Destroy Script
#
# Purpose: Safely destroy Terraform-managed infrastructure with production safeguards
# Usage: ./destroy.sh [environment] [options]
# Environments: dev, staging, prod
#
# Options:
#   --force             Skip secondary confirmations (use cautiously)
#   --target RESOURCE   Destroy specific resource
#   --no-backup         Skip backup creation
#
# IMPORTANT: Production environment has additional safeguards!
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
FORCE=false
TARGET=""
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

log_destroy() {
    echo -e "${RED}[DESTROY]${NC} $1"
}

# Print usage
print_usage() {
    cat <<EOF
Usage: $0 [environment] [options]

Environments:
  dev          Development environment (default)
  staging      Staging environment
  prod         Production environment (heavily guarded!)

Options:
  --force             Skip secondary confirmations
  --target RESOURCE   Destroy specific resource (e.g., aws_lambda_function.todo_api)
  --no-backup         Skip backup creation
  -h, --help          Show this help message

Examples:
  $0 dev                              # Destroy dev environment
  $0 staging --force                  # Force destroy staging
  $0 prod --target 'aws_s3_bucket.state'  # Destroy specific resource in prod

⚠️  WARNING: This operation is DESTRUCTIVE and cannot be easily undone!
   - Databases will be DELETED
   - Code deployments will be REMOVED
   - State files will be required for recovery

   Production environment requires triple confirmation!

EOF
}

# Parse command line arguments
parse_arguments() {
    local environment=""
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --force)
                FORCE=true
                shift
                ;;
            --target)
                TARGET="$2"
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
        log_error "Terraform not initialized. Cannot destroy."
        exit 1
    fi
}

# Confirm destruction with multiple safeguards
confirm_destruction() {
    local env=$1
    
    log_destroy "⚠️  YOU ARE ABOUT TO DESTROY INFRASTRUCTURE IN ${env} ENVIRONMENT"
    echo ""
    
    if [ "$env" = "prod" ]; then
        # Production has triple confirmation
        log_error "PRODUCTION ENVIRONMENT - HIGHEST LEVEL PROTECTION ACTIVE"
        echo ""
        
        log_warning "All data associated with this environment will be PERMANENTLY DELETED:"
        log_warning "  - DynamoDB tables"
        log_warning "  - Lambda functions"
        log_warning "  - API Gateway"
        log_warning "  - CloudWatch logs"
        echo ""
        
        # First confirmation
        read -p "⚠️  Type 'I understand the risks' to proceed: " confirmation1
        if [ "$confirmation1" != "I understand the risks" ]; then
            log_error "Destruction cancelled by user"
            exit 1
        fi
        
        # Second confirmation - environment name
        echo ""
        log_warning "Confirm the environment name that will be destroyed:"
        read -p "Type the environment name 'prod': " confirmation2
        if [ "$confirmation2" != "prod" ]; then
            log_error "Environment name mismatch. Destruction cancelled."
            exit 1
        fi
        
        # Third confirmation - account awareness
        echo ""
        local account_id
        account_id=$(aws sts get-caller-identity --query Account --output text)
        log_warning "This will destroy resources in AWS Account: ${account_id}"
        read -p "Type 'I want to destroy everything' to confirm: " confirmation3
        if [ "$confirmation3" != "I want to destroy everything" ]; then
            log_error "Final confirmation failed. Destruction cancelled."
            exit 1
        fi
        
        # Optional: Verify account number
        echo ""
        read -p "Enter the account number to verify (${account_id}): " account_verify
        if [ "$account_verify" != "$account_id" ]; then
            log_error "Account number mismatch. Destruction cancelled for safety."
            exit 1
        fi
        
    elif [ "$env" = "staging" ]; then
        # Staging has double confirmation
        log_warning "All staging infrastructure will be DELETED"
        echo ""
        read -p "Type 'destroy staging' to confirm: " confirmation
        if [ "$confirmation" != "destroy staging" ]; then
            log_error "Destruction cancelled by user"
            exit 1
        fi
        
    else
        # Dev has single confirmation but warning
        log_warning "All development infrastructure will be DELETED"
        echo ""
        read -p "Type 'destroy dev' to confirm: " confirmation
        if [ "$confirmation" != "destroy dev" ]; then
            log_error "Destruction cancelled by user"
            exit 1
        fi
    fi
    
    if [ "$FORCE" = false ]; then
        echo ""
        log_warning "Ready to destroy. This will happen in 5 seconds..."
        read -t 5 -p "Press Ctrl+C now to cancel, or wait to continue..." || true
        echo ""
    fi
}

# Create comprehensive state backup
create_state_backup() {
    local env=$1
    
    if [ "$NO_BACKUP" = true ]; then
        log_info "Skipping backup (--no-backup flag set)"
        return 0
    fi
    
    log_info "Creating comprehensive backup before destruction..."
    
    local backup_dir="${PROJECT_ROOT}/.terraform-backups"
    mkdir -p "$backup_dir"
    
    local backup_timestamp=$(date +%Y%m%d-%H%M%S)
    local backup_prefix="${backup_dir}/destroy-${env}-${backup_timestamp}"
    
    cd "$TERRAFORM_DIR"
    terraform workspace select "$env"
    
    # Backup state
    local state_backup="${backup_prefix}-state.backup"
    if terraform show > "$state_backup" 2>/dev/null; then
        log_success "State backed up to: ${state_backup}"
    fi
    
    # Backup plan (what will be destroyed)
    local plan_backup="${backup_prefix}-plan.tfplan"
    terraform plan -destroy -var-file="${TERRAFORM_DIR}/environments/${env}.tfvars" -out="${plan_backup}" -input=false 2>/dev/null
    log_success "Destruction plan backed up to: ${plan_backup}"
    
    # Backup outputs
    local outputs_backup="${backup_prefix}-outputs.json"
    terraform output -json > "$outputs_backup" 2>/dev/null || echo "{}" > "$outputs_backup"
    log_success "Outputs backed up to: ${outputs_backup}"
}

# Show what will be destroyed
show_destruction_plan() {
    local env=$1
    
    log_info "Resources that will be destroyed:"
    echo ""
    
    cd "$TERRAFORM_DIR"
    terraform workspace select "$env"
    
    terraform plan -destroy -var-file="${TERRAFORM_DIR}/environments/${env}.tfvars" -no-color -input=false 2>&1 | grep "resource" | head -20
    
    echo ""
}

# Run Terraform destroy
run_terraform_destroy() {
    local env=$1
    
    log_destroy "Starting destruction of ${env} environment..."
    
    cd "$TERRAFORM_DIR"
    
    # Select workspace
    terraform workspace select "$env"
    
    # Build destroy command
    local destroy_cmd="terraform destroy -auto-approve -input=false"
    
    # Add target if specified
    if [ -n "$TARGET" ]; then
        destroy_cmd="${destroy_cmd} -target='${TARGET}'"
        log_destroy "Destroying specific target: ${TARGET}"
    else
        destroy_cmd="${destroy_cmd} -var-file=${TERRAFORM_DIR}/environments/${env}.tfvars"
    fi
    
    # Execute destroy
    log_destroy "Executing: $destroy_cmd"
    eval "$destroy_cmd"
    
    return $?
}

# Post-destruction verification
verify_destruction() {
    local env=$1
    
    log_info "Verifying destruction..."
    
    cd "$TERRAFORM_DIR"
    terraform workspace select "$env"
    
    # Count remaining resources
    local resource_count
    resource_count=$(terraform state list 2>/dev/null | wc -l || echo "0")
    
    if [ "$resource_count" -eq 0 ]; then
        log_success "All resources have been destroyed"
    else
        log_warning "Warning: ${resource_count} resources may still exist"
        terraform state list || true
    fi
}

################################################################################
# Main
################################################################################

main() {
    local environment
    
    # Parse arguments
    environment=$(parse_arguments "$@")
    
    log_destroy "Starting Terraform destroy..."
    log_destroy "Environment: ${environment}"
    log_destroy "Region: ${AWS_REGION}"
    
    # Validate environment
    if ! validate_environment "$environment"; then
        log_error "Invalid environment: ${environment}"
        log_error "Valid environments: ${ENVIRONMENTS[*]}"
        exit 1
    fi
    
    # Check Terraform initialized
    check_terraform_initialized "$environment"
    
    # Show what will be destroyed
    show_destruction_plan "$environment"
    
    # Confirm destruction
    confirm_destruction "$environment"
    
    # Create backup
    create_state_backup "$environment"
    
    # Destroy infrastructure
    if run_terraform_destroy "$environment"; then
        log_success "Terraform destroy completed successfully for ${environment}!"
        
        # Verify destruction
        verify_destruction "$environment"
        
        log_success "Infrastructure has been destroyed."
        log_info "Backups are available in: ${PROJECT_ROOT}/.terraform-backups"
    else
        log_error "Terraform destroy failed for ${environment}"
        exit 1
    fi
}

# Run main
main "$@"
