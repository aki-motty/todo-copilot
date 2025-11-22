#!/bin/bash

# Terraform Validation Script
# This script performs comprehensive validation of Terraform configuration
# Including syntax checks, module validation, and format checks

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TF_DIR="${PROJECT_ROOT}/infrastructure/terraform"
TERRAFORM_VERSION="1.6+"

echo "================================"
echo "Terraform Configuration Validation"
echo "================================"
echo ""

# Check if terraform is installed
if ! command -v terraform &> /dev/null; then
    echo -e "${RED}ERROR: Terraform is not installed${NC}"
    exit 1
fi

# Display terraform version
CURRENT_TF_VERSION=$(terraform version | grep Terraform | awk '{print $2}')
echo -e "${GREEN}✓ Terraform version: ${CURRENT_TF_VERSION}${NC}"
echo ""

# Change to terraform directory
cd "${TF_DIR}"

# Step 1: Validate Terraform syntax
echo -e "${YELLOW}Step 1: Validating Terraform syntax...${NC}"
if terraform validate; then
    echo -e "${GREEN}✓ Terraform syntax validation passed${NC}"
else
    echo -e "${RED}✗ Terraform syntax validation failed${NC}"
    exit 1
fi
echo ""

# Step 2: Format check
echo -e "${YELLOW}Step 2: Checking Terraform format...${NC}"
if terraform fmt -check -recursive .; then
    echo -e "${GREEN}✓ Terraform format check passed${NC}"
else
    echo -e "${YELLOW}⚠ Terraform format issues detected (auto-fixing...)${NC}"
    terraform fmt -recursive .
    echo -e "${GREEN}✓ Terraform format auto-fixed${NC}"
fi
echo ""

# Step 3: Lint with tflint (if available)
echo -e "${YELLOW}Step 3: Running TFLint (optional)...${NC}"
if command -v tflint &> /dev/null; then
    if tflint --init && tflint .; then
        echo -e "${GREEN}✓ TFLint passed${NC}"
    else
        echo -e "${YELLOW}⚠ TFLint found issues (review required)${NC}"
    fi
else
    echo -e "${YELLOW}⚠ TFLint not installed (skipping)${NC}"
fi
echo ""

# Step 4: Validate module structure
echo -e "${YELLOW}Step 4: Validating module structure...${NC}"
MODULES=("backend" "compute" "data" "iam")
MODULE_ERRORS=0

for MODULE in "${MODULES[@]}"; do
    MODULE_PATH="modules/${MODULE}"
    if [ -d "${MODULE_PATH}" ]; then
        echo -n "  Checking module: ${MODULE}... "
        if cd "${MODULE_PATH}" && terraform fmt -check -recursive . > /dev/null 2>&1; then
            echo -e "${GREEN}✓${NC}"
            cd "${TF_DIR}"
        else
            echo -e "${YELLOW}⚠${NC} (format issues)"
            cd "${TF_DIR}"
        fi
    fi
done

echo -e "${GREEN}✓ Module structure checked${NC}"
echo ""

# Step 5: Security checks
echo -e "${YELLOW}Step 5: Performing security checks...${NC}"
SECURITY_ISSUES=0

# Check for hardcoded secrets
if grep -r "secret\|password\|api_key" . --include="*.tf" | grep -v "variable" | grep -v "description" | grep -v "default"; then
    echo -e "${RED}⚠ Potential hardcoded secrets detected${NC}"
    SECURITY_ISSUES=$((SECURITY_ISSUES + 1))
fi

# Check for open CIDR blocks (0.0.0.0/0)
if grep -r "0\.0\.0\.0/0" . --include="*.tf" | grep -v "comment" | grep -v "description"; then
    echo -e "${YELLOW}⚠ Open CIDR block (0.0.0.0/0) detected - review for security implications${NC}"
    SECURITY_ISSUES=$((SECURITY_ISSUES + 1))
fi

if [ ${SECURITY_ISSUES} -eq 0 ]; then
    echo -e "${GREEN}✓ No obvious security issues detected${NC}"
else
    echo -e "${YELLOW}⚠ Review security warnings above${NC}"
fi
echo ""

# Step 6: Check required files
echo -e "${YELLOW}Step 6: Checking required files...${NC}"
REQUIRED_FILES=("main.tf" "variables.tf" "outputs.tf")
MISSING_FILES=0

for FILE in "${REQUIRED_FILES[@]}"; do
    if [ -f "${FILE}" ]; then
        echo -e "  ${GREEN}✓${NC} ${FILE}"
    else
        echo -e "  ${RED}✗${NC} ${FILE} (missing)"
        MISSING_FILES=$((MISSING_FILES + 1))
    fi
done

# Check for environment tfvars
if [ -d "environments" ] && ls environments/*.tfvars > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} environment tfvars files"
elif [ -f "terraform.tfvars" ]; then
    echo -e "  ${GREEN}✓${NC} terraform.tfvars"
else
    echo -e "  ${YELLOW}⚠${NC} No tfvars configuration found (will use environment variables)"
fi

if [ ${MISSING_FILES} -eq 0 ]; then
    echo -e "${GREEN}✓ All required files present${NC}"
else
    echo -e "${RED}✗ ${MISSING_FILES} required file(s) missing${NC}"
    exit 1
fi
echo ""

echo "================================"
echo -e "${GREEN}✓ Validation completed successfully${NC}"
echo "================================"
