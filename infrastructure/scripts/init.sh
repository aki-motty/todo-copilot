#!/bin/bash

################################################################################
# Terraform Backend & Workspace Initialization Script
#
# Purpose: Initialize S3 backend bucket, DynamoDB lock table, and workspaces
# Usage: ./init.sh [environment]
# Environments: dev, staging, prod
#
# Requires:
#   - AWS CLI v2+
#   - AWS credentials configured (aws configure)
#   - Terraform CLI 1.6+
#   - Permissions: S3, DynamoDB, IAM
################################################################################

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
TERRAFORM_DIR="${PROJECT_ROOT}/infrastructure/terraform"
AWS_REGION="${AWS_REGION:-ap-northeast-1}"
ENVIRONMENTS=("dev" "staging" "prod")
DEFAULT_ENV="dev"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command_exists aws; then
        log_error "AWS CLI not found. Please install AWS CLI v2+"
        exit 1
    fi
    
    if ! command_exists terraform; then
        log_error "Terraform CLI not found. Please install Terraform 1.6+"
        exit 1
    fi
    
    local aws_version=$(aws --version | cut -d' ' -f1 | cut -d'/' -f2 | cut -d'.' -f1)
    if [ "$aws_version" -lt 2 ]; then
        log_error "AWS CLI v2+ required (found v${aws_version})"
        exit 1
    fi
    
    local tf_version=$(terraform version -json 2>/dev/null | grep -o '"terraform_version":"[^"]*' | cut -d'"' -f4)
    log_info "Using Terraform ${tf_version}"
    
    log_success "All prerequisites met"
}

# Validate environment parameter
validate_environment() {
    local env=$1
    for valid_env in "${ENVIRONMENTS[@]}"; do
        if [ "$env" == "$valid_env" ]; then
            return 0
        fi
    done
    return 1
}

# Get AWS account ID
get_account_id() {
    aws sts get-caller-identity --query Account --output text --region "$AWS_REGION"
}

# Create S3 backend bucket
create_s3_backend() {
    local env=$1
    local account_id=$2
    local bucket_name="todo-copilot-terraform-state-${env}"
    
    log_info "Creating S3 backend bucket for ${env} environment..."
    
    if aws s3 ls "s3://${bucket_name}" --region "$AWS_REGION" 2>&1 | grep -q 'NoSuchBucket'; then
        # Bucket does not exist, create it
        log_info "Bucket ${bucket_name} does not exist. Creating..."
        
        if [ "$AWS_REGION" = "us-east-1" ]; then
            aws s3api create-bucket \
                --bucket "${bucket_name}" \
                --region "$AWS_REGION" \
                --acl private || log_warning "Failed to create bucket or bucket already exists"
        else
            aws s3api create-bucket \
                --bucket "${bucket_name}" \
                --region "$AWS_REGION" \
                --create-bucket-configuration LocationConstraint="$AWS_REGION" \
                --acl private || log_warning "Failed to create bucket or bucket already exists"
        fi
    else
        log_info "Bucket ${bucket_name} already exists"
    fi
    
    # Enable versioning
    log_info "Enabling versioning for ${bucket_name}..."
    aws s3api put-bucket-versioning \
        --bucket "${bucket_name}" \
        --versioning-configuration Status=Enabled \
        --region "$AWS_REGION" || log_warning "Failed to enable versioning"
    
    # Block public access
    log_info "Blocking public access for ${bucket_name}..."
    aws s3api put-public-access-block \
        --bucket "${bucket_name}" \
        --public-access-block-configuration \
        "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true" \
        --region "$AWS_REGION" || log_warning "Failed to block public access"
    
    # Enable encryption
    log_info "Enabling encryption for ${bucket_name}..."
    aws s3api put-bucket-encryption \
        --bucket "${bucket_name}" \
        --server-side-encryption-configuration '{
            "Rules": [{
                "ApplyServerSideEncryptionByDefault": {
                    "SSEAlgorithm": "AES256"
                }
            }]
        }' \
        --region "$AWS_REGION" || log_warning "Failed to enable encryption"
    
    log_success "S3 backend bucket ${bucket_name} configured"
}

# Create DynamoDB lock table
create_dynamodb_lock_table() {
    local env=$1
    local table_name="terraform-lock-${env}"
    
    log_info "Creating DynamoDB lock table for ${env} environment..."
    
    # Check if table exists
    if aws dynamodb describe-table \
        --table-name "${table_name}" \
        --region "$AWS_REGION" 2>&1 | grep -q 'TableNotFound'; then
        
        log_info "Table ${table_name} does not exist. Creating..."
        
        aws dynamodb create-table \
            --table-name "${table_name}" \
            --attribute-definitions AttributeName=LockID,AttributeType=S \
            --key-schema AttributeName=LockID,KeyType=HASH \
            --billing-mode PAY_PER_REQUEST \
            --region "$AWS_REGION" || log_warning "Failed to create table or table already exists"
        
        # Wait for table to be created
        log_info "Waiting for ${table_name} to be created..."
        aws dynamodb wait table-exists \
            --table-name "${table_name}" \
            --region "$AWS_REGION"
    else
        log_info "Table ${table_name} already exists"
    fi
    
    # Enable TTL for table
    log_info "Enabling TTL for ${table_name}..."
    aws dynamodb update-time-to-live \
        --table-name "${table_name}" \
        --time-to-live-specification "Enabled=true,AttributeName=ExpirationTime" \
        --region "$AWS_REGION" 2>/dev/null || log_warning "TTL already enabled or failed"
    
    log_success "DynamoDB lock table ${table_name} configured"
}

# Initialize Terraform workspace
init_terraform_workspace() {
    local env=$1
    
    log_info "Initializing Terraform for ${env} environment..."
    
    cd "$TERRAFORM_DIR"
    
    # Create workspace if it doesn't exist
    if ! terraform workspace list | grep -q "^[[:space:]]*${env}$"; then
        log_info "Creating Terraform workspace: ${env}"
        terraform workspace new "$env" || log_warning "Workspace ${env} already exists"
    fi
    
    # Select workspace
    log_info "Selecting Terraform workspace: ${env}"
    terraform workspace select "$env"
    
    # Initialize backend
    log_info "Initializing Terraform backend..."
    terraform init \
        -backend-config="bucket=todo-copilot-terraform-state-${env}" \
        -backend-config="key=terraform.tfstate" \
        -backend-config="region=${AWS_REGION}" \
        -backend-config="dynamodb_table=terraform-lock-${env}" \
        -backend-config="encrypt=true" \
        -upgrade || log_error "Failed to initialize Terraform"
    
    log_success "Terraform initialized for ${env} environment"
}

# Validate Terraform configuration
validate_terraform() {
    local env=$1
    
    log_info "Validating Terraform configuration for ${env} environment..."
    
    cd "$TERRAFORM_DIR"
    terraform workspace select "$env"
    
    if terraform validate; then
        log_success "Terraform validation passed for ${env}"
    else
        log_error "Terraform validation failed for ${env}"
        return 1
    fi
}

################################################################################
# Main
################################################################################

main() {
    local environment="${1:-$DEFAULT_ENV}"
    
    log_info "Starting Terraform backend initialization..."
    log_info "Environment: ${environment}"
    log_info "Region: ${AWS_REGION}"
    
    # Check prerequisites
    check_prerequisites
    
    # Validate environment
    if ! validate_environment "$environment"; then
        log_error "Invalid environment: ${environment}"
        log_error "Valid environments: ${ENVIRONMENTS[*]}"
        exit 1
    fi
    
    # Get AWS account ID
    log_info "Fetching AWS account ID..."
    local account_id
    account_id=$(get_account_id) || {
        log_error "Failed to get AWS account ID. Check AWS credentials."
        exit 1
    }
    log_success "AWS Account ID: ${account_id}"
    
    # Create backend infrastructure
    create_s3_backend "$environment" "$account_id"
    create_dynamodb_lock_table "$environment"
    
    # Initialize Terraform
    init_terraform_workspace "$environment"
    validate_terraform "$environment"
    
    log_success "Terraform backend initialization completed successfully for ${environment}!"
    log_info "Next step: Run './plan.sh ${environment}' to plan your infrastructure"
}

# Run main
main "$@"
