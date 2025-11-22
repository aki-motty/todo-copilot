#!/bin/bash

# Terraform Compliance Check Script
# This script performs compliance and best practice checks
# Including AWS Well-Architected Framework principles

# set -e  # Disabled to allow non-blocking warnings

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TF_DIR="${PROJECT_ROOT}/infrastructure/terraform"
RESULTS_FILE="${PROJECT_ROOT}/infrastructure/compliance-results.txt"

# Counters
PASS_COUNT=0
WARN_COUNT=0
FAIL_COUNT=0

# Helper functions
check_pass() {
    echo -e "${GREEN}✓ PASS${NC}: $1"
    ((PASS_COUNT++))
}

check_warn() {
    echo -e "${YELLOW}⚠ WARN${NC}: $1"
    ((WARN_COUNT++))
}

check_fail() {
    echo -e "${RED}✗ FAIL${NC}: $1"
    ((FAIL_COUNT++))
}

echo "======================================"
echo "Terraform Compliance Check"
echo "AWS Well-Architected Framework"
echo "======================================"
echo ""

cd "${TF_DIR}"

# Pillar 1: Operational Excellence
echo -e "${BLUE}Pillar 1: Operational Excellence${NC}"
echo "=================================="

# Check logging
if grep -r "enable_logging\|logging\|CloudWatch" . --include="*.tf" > /dev/null; then
    check_pass "Logging configuration present"
else
    check_warn "Logging configuration not explicitly defined"
fi

# Check tags
if grep -r "common_tags\|tags" . --include="*.tf" > /dev/null; then
    check_pass "Resource tagging strategy defined"
else
    check_warn "Resource tagging strategy incomplete"
fi

# Check documentation
if grep -r "description\|locals" . --include="*.tf" | wc -l | grep -qE "[0-9]{2,}"; then
    check_pass "Configuration documentation present"
else
    check_warn "Documentation could be improved"
fi

echo ""

# Pillar 2: Security
echo -e "${BLUE}Pillar 2: Security${NC}"
echo "=================================="

# Check IAM principle of least privilege
if grep -r "aws_iam_role\|aws_iam_policy" . --include="*.tf" > /dev/null; then
    check_pass "IAM roles and policies defined"
else
    check_warn "IAM configuration minimal"
fi

# Check encryption
if grep -r "encrypted\|kms\|sse" . --include="*.tf" > /dev/null; then
    check_pass "Encryption mechanisms configured"
else
    check_warn "Encryption configuration not visible"
fi

# Check VPC/security groups
if grep -r "security_group\|subnet\|vpc" . --include="*.tf" > /dev/null; then
    check_pass "Network isolation configured"
else
    check_warn "Network configuration minimal"
fi

# Check for hardcoded credentials
if grep -rE "password.*=|secret.*=|access_key.*=|api_key.*=" . --include="*.tf" | grep -v "variable\|description\|#" > /dev/null; then
    check_fail "Potential hardcoded credentials detected"
else
    check_pass "No obvious hardcoded credentials"
fi

echo ""

# Pillar 3: Reliability
echo -e "${BLUE}Pillar 3: Reliability${NC}"
echo "=================================="

# Check multi-AZ
if grep -r "multi_az\|availability_zones\|replicate" . --include="*.tf" > /dev/null; then
    check_pass "Multi-AZ deployment configured"
else
    check_warn "Multi-AZ deployment not configured"
fi

# Check backup strategy
if grep -r "backup\|snapshot\|replica\|RTO\|RPO" . --include="*.tf" > /dev/null; then
    check_pass "Backup/recovery strategy present"
else
    check_warn "Backup strategy not explicitly configured"
fi

# Check health checks
if grep -r "health_check\|health_checks" . --include="*.tf" > /dev/null; then
    check_pass "Health monitoring configured"
else
    check_warn "Health monitoring not configured"
fi

# Check circuit breaker patterns
if grep -r "retry\|timeout\|throttle" . --include="*.tf" > /dev/null; then
    check_pass "Failure handling patterns present"
else
    check_warn "Failure handling patterns not visible"
fi

echo ""

# Pillar 4: Performance Efficiency
echo -e "${BLUE}Pillar 4: Performance Efficiency${NC}"
echo "=================================="

# Check auto-scaling
if grep -r "auto_scaling\|scaling_policy\|capacity" . --include="*.tf" > /dev/null; then
    check_pass "Auto-scaling configured"
else
    check_warn "Auto-scaling not configured"
fi

# Check caching
if grep -r "cache\|elasticache\|cloudfront" . --include="*.tf" > /dev/null; then
    check_pass "Caching strategy considered"
else
    check_warn "Caching strategy not visible"
fi

# Check instance sizing
if grep -r "instance_type\|memory\|cpu" . --include="*.tf" > /dev/null; then
    check_pass "Resource sizing defined"
else
    check_warn "Resource sizing configuration minimal"
fi

echo ""

# Pillar 5: Cost Optimization
echo -e "${BLUE}Pillar 5: Cost Optimization${NC}"
echo "=================================="

# Check for reserved capacity
if grep -r "reserved\|on_demand\|spot" . --include="*.tf" > /dev/null; then
    check_pass "Capacity planning strategy present"
else
    check_warn "Capacity planning strategy not visible"
fi

# Check for unused resources
if grep -r "terminate_on_launch\|enabled.*false" . --include="*.tf" > /dev/null; then
    check_pass "Resource cleanup policies present"
else
    check_warn "Resource cleanup policies not visible"
fi

# Check monitoring
if grep -r "monitoring\|cloudwatch\|metrics" . --include="*.tf" > /dev/null; then
    check_pass "Cost monitoring configured"
else
    check_warn "Cost monitoring not explicitly configured"
fi

echo ""

# Summary
echo "======================================"
echo "Compliance Check Summary"
echo "======================================"
echo -e "${GREEN}PASS${NC}:   ${PASS_COUNT}"
echo -e "${YELLOW}WARN${NC}:   ${WARN_COUNT}"
echo -e "${RED}FAIL${NC}:   ${FAIL_COUNT}"

TOTAL=$((PASS_COUNT + WARN_COUNT + FAIL_COUNT))
if [ ${FAIL_COUNT} -eq 0 ]; then
    SCORE=$((100 * PASS_COUNT / TOTAL))
    echo -e "${GREEN}✓ Overall Score: ${SCORE}%${NC}"
    echo ""
    echo "✓ Compliance check passed"
    exit 0
else
    echo -e "${RED}✗ Critical issues found: ${FAIL_COUNT}${NC}"
    echo ""
    echo "Please address the FAIL items above"
    exit 1
fi
