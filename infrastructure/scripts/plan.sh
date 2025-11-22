#!/bin/bash

################################################################################
# Terraform Plan Script
#
# Purpose: Execute Terraform plan with enhanced output and analysis
# Usage: ./plan.sh [environment] [options]
# Environments: dev, staging, prod
#
# Options:
#   -d, --detailed     Show detailed resource changes
#   -j, --json         Output plan in JSON format
#   -o, --output FILE  Save plan to file
#   --destroy          Plan for destroy operation
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
DETAILED=false
JSON_OUTPUT=false
OUTPUT_FILE=""
DESTROY_MODE=false

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

log_plan() {
    echo -e "${CYAN}[PLAN]${NC} $1"
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
  -d, --detailed     Show detailed resource changes
  -j, --json         Output plan in JSON format
  -o, --output FILE  Save plan to file
  --destroy          Plan for destroy operation
  -h, --help         Show this help message

Examples:
  $0 dev                                   # Plan dev environment
  $0 prod --detailed                       # Plan prod with details
  $0 staging -o plan.tfplan                # Save plan to file
  $0 prod --destroy                        # Plan resource destruction

EOF
}

# Parse command line arguments
parse_arguments() {
    local environment=""
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            -d|--detailed)
                DETAILED=true
                shift
                ;;
            -j|--json)
                JSON_OUTPUT=true
                shift
                ;;
            -o|--output)
                OUTPUT_FILE="$2"
                shift 2
                ;;
            --destroy)
                DESTROY_MODE=true
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

# Get environment-specific tfvars file
get_tfvars_file() {
    local env=$1
    local tfvars_file="${TERRAFORM_DIR}/environments/${env}.tfvars"
    
    if [ ! -f "$tfvars_file" ]; then
        log_error "tfvars file not found: ${tfvars_file}"
        exit 1
    fi
    
    echo "$tfvars_file"
}

# Execute Terraform plan
run_terraform_plan() {
    local env=$1
    local tfvars_file=$2
    
    log_info "Executing Terraform plan for ${env} environment..."
    
    cd "$TERRAFORM_DIR"
    
    # Select workspace
    terraform workspace select "$env"
    
    # Build plan command
    local plan_cmd="terraform plan -var-file=${tfvars_file}"
    
    # Add destroy flag if requested
    if [ "$DESTROY_MODE" = true ]; then
        plan_cmd="${plan_cmd} -destroy"
        log_warning "Planning resource destruction!"
    fi
    
    # Add output file if specified
    if [ -n "$OUTPUT_FILE" ]; then
        plan_cmd="${plan_cmd} -out=${OUTPUT_FILE}"
        log_info "Plan will be saved to: ${OUTPUT_FILE}"
    fi
    
    # Add input=false to prevent prompts
    plan_cmd="${plan_cmd} -input=false"
    
    # Execute plan
    eval "$plan_cmd"
    
    return 0
}

# Parse and display plan summary
parse_plan_summary() {
    local env=$1
    
    log_info "Analyzing plan summary..."
    
    cd "$TERRAFORM_DIR"
    terraform workspace select "$env"
    
    # Run plan with no-color for parsing
    local plan_output
    plan_output=$(terraform plan -var-file="${TERRAFORM_DIR}/environments/${env}.tfvars" -no-color -input=false 2>&1 | tail -20)
    
    echo ""
    log_plan "Plan Summary:"
    echo "$plan_output"
}

# Display plan statistics
display_plan_stats() {
    local plan_output=$1
    
    # Extract resource counts from plan output
    local added=$(echo "$plan_output" | grep -o "# [0-9]* to add" | grep -o "[0-9]*" | head -1)
    local changed=$(echo "$plan_output" | grep -o "# [0-9]* to change" | grep -o "[0-9]*" | head -1)
    local destroyed=$(echo "$plan_output" | grep -o "# [0-9]* to destroy" | grep -o "[0-9]*" | head -1)
    
    echo ""
    log_info "Resource Changes:"
    [ -n "$added" ] && [ "$added" -gt 0 ] && echo -e "${GREEN}  + ${added} resources to add${NC}"
    [ -n "$changed" ] && [ "$changed" -gt 0 ] && echo -e "${YELLOW}  ~ ${changed} resources to change${NC}"
    [ -n "$destroyed" ] && [ "$destroyed" -gt 0 ] && echo -e "${RED}  - ${destroyed} resources to destroy${NC}"
}

# Convert plan to JSON
export_plan_json() {
    local env=$1
    local output_file=$2
    
    log_info "Exporting plan to JSON format..."
    
    cd "$TERRAFORM_DIR"
    
    # First generate the plan file
    local plan_file="plan.tfplan"
    terraform plan -var-file="${TERRAFORM_DIR}/environments/${env}.tfvars" -out="${plan_file}" -input=false
    
    # Convert to JSON
    terraform show -json "${plan_file}" > "${output_file}"
    
    log_success "Plan exported to: ${output_file}"
}

################################################################################
# Main
################################################################################

main() {
    local environment
    
    # Parse arguments
    environment=$(parse_arguments "$@")
    
    log_info "Starting Terraform plan..."
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
    
    # Get tfvars file
    local tfvars_file
    tfvars_file=$(get_tfvars_file "$environment") || exit 1
    log_info "Using tfvars file: ${tfvars_file}"
    
    # Run plan
    if [ "$JSON_OUTPUT" = true ] && [ -n "$OUTPUT_FILE" ]; then
        export_plan_json "$environment" "$OUTPUT_FILE"
    else
        run_terraform_plan "$environment" "$tfvars_file"
    fi
    
    # Parse and display summary
    parse_plan_summary "$environment"
    
    log_success "Terraform plan completed successfully for ${environment}!"
    
    if [ -z "$OUTPUT_FILE" ]; then
        log_info "Next step: Review the plan above and run './apply.sh ${environment}' to apply"
    else
        log_info "Plan saved to: ${OUTPUT_FILE}"
        log_info "Apply with: terraform apply ${OUTPUT_FILE}"
    fi
}

# Run main
main "$@"
