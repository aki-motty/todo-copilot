#!/bin/bash

################################################################################
# Terraform Import Script
#
# Purpose: Import existing AWS resources into Terraform state management
# Usage: ./import.sh [environment] [resource-type] [resource-id] [state-name]
# Environments: dev, staging, prod
#
# Examples:
#   ./import.sh dev aws_dynamodb_table todo-copilot-dev todo_table
#   ./import.sh prod aws_lambda_function arn:aws:lambda:ap-northeast-1:ACCOUNT:function:todo-api-prod lambda_api
################################################################################

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
TERRAFORM_DIR="${PROJECT_ROOT}/infrastructure/terraform"
AWS_REGION="${AWS_REGION:-ap-northeast-1}"
ENVIRONMENTS=("dev" "staging" "prod")

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

log_import() {
    echo -e "${CYAN}[IMPORT]${NC} $1"
}

# Print usage
print_usage() {
    cat <<EOF
Usage: $0 [environment] [resource-type] [resource-id] [state-name]

Arguments:
  environment    dev, staging, or prod
  resource-type  AWS resource type (e.g., aws_dynamodb_table, aws_lambda_function)
  resource-id    AWS resource identifier (name, ARN, or ID depending on resource type)
  state-name     State name for Terraform (e.g., todo_table, lambda_api)

Common Resources & IDs:
  DynamoDB Table:     aws_dynamodb_table     [table-name]
  Lambda Function:    aws_lambda_function    [function-name or ARN]
  API Gateway:        aws_apigatewayv2_api   [api-id]
  S3 Bucket:          aws_s3_bucket          [bucket-name]
  IAM Role:           aws_iam_role           [role-name]

Examples:
  $0 dev aws_dynamodb_table todo-copilot-dev todo_table
  $0 prod aws_lambda_function arn:aws:lambda:ap-northeast-1:ACCOUNT:function:todo-api-prod lambda_api
  $0 staging aws_s3_bucket todo-copilot-state-staging state_bucket
  $0 prod aws_iam_role terraform-executor-prod terraform_role

⚠️  Before importing:
  1. Ensure the resource exists in AWS
  2. Ensure no matching Terraform resource exists in state
  3. The resource will be managed by Terraform after import
  4. Make backups of your state

EOF
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

# Validate resource type
validate_resource_type() {
    local resource_type=$1
    
    case "$resource_type" in
        aws_dynamodb_table|aws_lambda_function|aws_apigatewayv2_api|aws_s3_bucket|\
        aws_iam_role|aws_cloudwatch_log_group|aws_apigatewayv2_stage|aws_apigatewayv2_integration)
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

# Check if Terraform is initialized
check_terraform_initialized() {
    local env=$1
    
    if [ ! -d "${TERRAFORM_DIR}/.terraform" ]; then
        log_error "Terraform not initialized. Run './init.sh ${env}' first."
        exit 1
    fi
}

# Verify resource exists in AWS
verify_resource_exists() {
    local resource_type=$1
    local resource_id=$2
    
    log_info "Verifying resource exists in AWS..."
    
    case "$resource_type" in
        aws_dynamodb_table)
            if aws dynamodb describe-table \
                --table-name "$resource_id" \
                --region "$AWS_REGION" >/dev/null 2>&1; then
                log_success "DynamoDB table found: ${resource_id}"
                return 0
            else
                log_error "DynamoDB table not found: ${resource_id}"
                return 1
            fi
            ;;
        aws_lambda_function)
            if aws lambda get-function \
                --function-name "$resource_id" \
                --region "$AWS_REGION" >/dev/null 2>&1; then
                log_success "Lambda function found: ${resource_id}"
                return 0
            else
                log_error "Lambda function not found: ${resource_id}"
                return 1
            fi
            ;;
        aws_s3_bucket)
            if aws s3 ls "s3://${resource_id}" --region "$AWS_REGION" >/dev/null 2>&1; then
                log_success "S3 bucket found: ${resource_id}"
                return 0
            else
                log_error "S3 bucket not found: ${resource_id}"
                return 1
            fi
            ;;
        aws_iam_role)
            if aws iam get-role \
                --role-name "$resource_id" >/dev/null 2>&1; then
                log_success "IAM role found: ${resource_id}"
                return 0
            else
                log_error "IAM role not found: ${resource_id}"
                return 1
            fi
            ;;
        *)
            log_warning "Cannot verify resource type: ${resource_type}"
            return 0
            ;;
    esac
}

# Check if resource already exists in state
check_state_conflict() {
    local env=$1
    local resource_address=$2
    
    log_info "Checking for state conflicts..."
    
    cd "$TERRAFORM_DIR"
    terraform workspace select "$env"
    
    # Try to show the resource (it should fail if not already imported)
    if terraform state show "$resource_address" >/dev/null 2>&1; then
        log_warning "Resource may already be imported: ${resource_address}"
        echo ""
        read -p "Continue anyway? (yes/no): " continue_import
        if [ "$continue_import" != "yes" ]; then
            log_error "Import cancelled"
            return 1
        fi
    else
        log_success "No state conflict detected"
        return 0
    fi
}

# Get resource details
get_resource_details() {
    local resource_type=$1
    local resource_id=$2
    
    case "$resource_type" in
        aws_dynamodb_table)
            log_info "Table Details:"
            aws dynamodb describe-table \
                --table-name "$resource_id" \
                --region "$AWS_REGION" \
                --query 'Table.[TableName,TableStatus,ItemCount,TableArn]' \
                --output text
            ;;
        aws_lambda_function)
            log_info "Lambda Function Details:"
            aws lambda get-function \
                --function-name "$resource_id" \
                --region "$AWS_REGION" \
                --query 'Configuration.[FunctionName,Runtime,Handler,CodeSize]' \
                --output text
            ;;
        aws_s3_bucket)
            log_info "S3 Bucket Details:"
            aws s3api head-bucket \
                --bucket "$resource_id" \
                --region "$AWS_REGION" \
                --query '[ResponseMetadata.HTTPHeaders.[date]]' \
                --output text 2>/dev/null || echo "Bucket found"
            ;;
    esac
    echo ""
}

# Import resource
import_resource() {
    local env=$1
    local resource_type=$2
    local resource_id=$3
    local state_name=$4
    
    log_import "Importing ${resource_type} into Terraform state..."
    
    cd "$TERRAFORM_DIR"
    terraform workspace select "$env"
    
    # Construct resource address
    local resource_address="${resource_type}.${state_name}"
    
    log_import "Resource address: ${resource_address}"
    log_import "AWS resource: ${resource_id}"
    
    # Execute import
    if terraform import -input=false \
        "${resource_address}" \
        "${resource_id}"; then
        log_success "Resource imported successfully!"
        log_success "State address: ${resource_address}"
        
        # Show imported resource details
        log_info "Imported resource details:"
        terraform state show "$resource_address" | head -20
        
        return 0
    else
        log_error "Failed to import resource"
        return 1
    fi
}

# Create resource block template
create_resource_template() {
    local resource_type=$1
    local state_name=$2
    
    log_info "To manage this resource, add the following to your Terraform configuration:"
    echo ""
    echo "resource \"${resource_type}\" \"${state_name}\" {"
    echo "  # Resource configuration here"
    echo "  # Run 'terraform state show ${resource_type}.${state_name}' to see attributes"
    echo "}"
    echo ""
}

# Post-import validation
validate_import() {
    local env=$1
    local resource_address=$2
    
    log_info "Validating import..."
    
    cd "$TERRAFORM_DIR"
    terraform workspace select "$env"
    
    if terraform state show "$resource_address" >/dev/null 2>&1; then
        log_success "Resource validated in state"
        
        # Run plan to check for diffs
        log_info "Running plan to check for configuration differences..."
        if terraform plan -var-file="environments/${env}.tfvars" 2>&1 | grep -q "$resource_address"; then
            log_warning "Configuration differences detected for imported resource"
            log_info "Run 'terraform plan' to see details"
        else
            log_success "No configuration differences detected"
        fi
    else
        log_error "Resource not found in state after import"
        return 1
    fi
}

################################################################################
# Main
################################################################################

main() {
    if [ $# -lt 4 ]; then
        print_usage
        exit 1
    fi
    
    local environment=$1
    local resource_type=$2
    local resource_id=$3
    local state_name=$4
    
    log_import "Starting Terraform resource import..."
    
    # Validate inputs
    if ! validate_environment "$environment"; then
        log_error "Invalid environment: ${environment}"
        exit 1
    fi
    
    if ! validate_resource_type "$resource_type"; then
        log_error "Invalid or unsupported resource type: ${resource_type}"
        log_info "Run '$0' with no arguments to see supported types"
        exit 1
    fi
    
    log_info "Environment: ${environment}"
    log_info "Resource Type: ${resource_type}"
    log_info "AWS Resource: ${resource_id}"
    log_info "State Name: ${state_name}"
    echo ""
    
    # Check prerequisites
    check_terraform_initialized "$environment"
    
    # Verify resource exists
    if ! verify_resource_exists "$resource_type" "$resource_id"; then
        exit 1
    fi
    
    # Show resource details
    get_resource_details "$resource_type" "$resource_id"
    
    # Check for state conflicts
    local resource_address="${resource_type}.${state_name}"
    if ! check_state_conflict "$environment" "$resource_address"; then
        exit 1
    fi
    
    # Confirm import
    echo ""
    log_warning "This will import the AWS resource into Terraform state."
    read -p "Continue? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        log_error "Import cancelled"
        exit 1
    fi
    
    echo ""
    
    # Import the resource
    if import_resource "$environment" "$resource_type" "$resource_id" "$state_name"; then
        # Validate import
        validate_import "$environment" "$resource_address"
        
        # Show template
        create_resource_template "$resource_type" "$state_name"
        
        log_success "Import completed successfully!"
        log_info "Next: Update your Terraform configuration files with resource definitions"
        log_info "Then run './apply.sh ${environment}' to confirm changes"
    else
        log_error "Import failed"
        exit 1
    fi
}

# Run main
if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
    print_usage
    exit 0
fi

main "$@"
