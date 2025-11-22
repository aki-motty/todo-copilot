#!/bin/bash
# OIDC Authentication Test Script
# Purpose: Validate GitHub Actions OIDC token generation and AWS role assumption
# Usage: ./test-oidc-auth.sh [GITHUB_TOKEN] [GITHUB_REPO_URL] [ENVIRONMENT]

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}=== GitHub Actions OIDC Authentication Test ===${NC}"
echo ""

# Prerequisites check
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command -v aws &> /dev/null; then
  echo -e "${RED}❌ AWS CLI not installed${NC}"
  exit 1
fi

if ! command -v jq &> /dev/null; then
  echo -e "${RED}❌ jq not installed${NC}"
  exit 1
fi

echo -e "${GREEN}✓ AWS CLI and jq available${NC}"
echo ""

# Test 1: Check GitHub OIDC Provider exists in AWS
echo -e "${YELLOW}Test 1: Verifying GitHub OIDC Provider in AWS...${NC}"

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
PROVIDER_ARN="arn:aws:iam::${ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com"

if aws iam list-open-id-connect-providers | jq -e '.OIDCProviderList[] | select(.Arn == "'$PROVIDER_ARN'")' >/dev/null 2>&1; then
  echo -e "${GREEN}✓ GitHub OIDC Provider exists: $PROVIDER_ARN${NC}"
else
  echo -e "${RED}❌ GitHub OIDC Provider not found${NC}"
  echo "Run: infrastructure/scripts/setup-oidc.sh to create provider"
  exit 1
fi
echo ""

# Test 2: Check GitHub Actions IAM Roles
echo -e "${YELLOW}Test 2: Verifying GitHub Actions IAM Roles...${NC}"

for ENVIRONMENT in dev staging prod; do
  ROLE_NAME="github-actions-role-${ENVIRONMENT}"
  
  if aws iam get-role --role-name "$ROLE_NAME" >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Role exists: $ROLE_NAME${NC}"
  else
    echo -e "${YELLOW}⚠ Role not found: $ROLE_NAME${NC}"
  fi
done
echo ""

# Test 3: Verify role trust relationships
echo -e "${YELLOW}Test 3: Verifying role trust relationships...${NC}"

for ENVIRONMENT in dev staging prod; do
  ROLE_NAME="github-actions-role-${ENVIRONMENT}"
  
  TRUST_POLICY=$(aws iam get-role --role-name "$ROLE_NAME" 2>/dev/null | jq '.Role.AssumeRolePolicyDocument' 2>/dev/null || echo "")
  
  if echo "$TRUST_POLICY" | jq -e '.Statement[] | select(.Principal.Federated | contains("oidc-provider"))' >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Trust policy configured: $ROLE_NAME${NC}"
  else
    echo -e "${YELLOW}⚠ Trust policy may not be properly configured: $ROLE_NAME${NC}"
  fi
done
echo ""

# Test 4: Check Attached Policies
echo -e "${YELLOW}Test 4: Verifying attached policies...${NC}"

for ENVIRONMENT in dev staging prod; do
  ROLE_NAME="github-actions-role-${ENVIRONMENT}"
  
  POLICIES=$(aws iam list-attached-role-policies --role-name "$ROLE_NAME" 2>/dev/null | jq '.AttachedPolicies | length')
  
  if [ "$POLICIES" -gt 0 ]; then
    echo -e "${GREEN}✓ $POLICIES policies attached to $ROLE_NAME${NC}"
  else
    echo -e "${YELLOW}⚠ No policies attached to $ROLE_NAME${NC}"
  fi
done
echo ""

# Test 5: Verify Terraform State Access
echo -e "${YELLOW}Test 5: Verifying Terraform state access...${NC}"

STATE_BUCKET=$(aws s3 ls | grep "todo-copilot-terraform-state" | awk '{print $3}')

if [ ! -z "$STATE_BUCKET" ]; then
  echo -e "${GREEN}✓ Terraform state bucket found: $STATE_BUCKET${NC}"
else
  echo -e "${YELLOW}⚠ Terraform state bucket not found${NC}"
fi

# Check DynamoDB lock table
LOCK_TABLE=$(aws dynamodb list-tables --query 'TableNames[?contains(@, `terraform-lock`)]' --output text 2>/dev/null)

if [ ! -z "$LOCK_TABLE" ]; then
  echo -e "${GREEN}✓ DynamoDB lock table found: $LOCK_TABLE${NC}"
else
  echo -e "${YELLOW}⚠ DynamoDB lock table not found${NC}"
fi
echo ""

# Test 6: Token Format Verification
echo -e "${YELLOW}Test 6: Verifying OIDC token configuration...${NC}"

# This test checks if the workflow can generate tokens
# In local environment, we can only verify the configuration exists
echo -e "${GREEN}ℹ Token generation must be tested in GitHub Actions workflow${NC}"
echo "   The workflow will use: aws-actions/configure-aws-credentials@v4"
echo "   With token-format: aws4"
echo ""

# Test 7: Summary Report
echo -e "${GREEN}=== Test Summary ===${NC}"
echo ""
echo -e "${GREEN}Configuration Status:${NC}"
echo "  ✓ GitHub OIDC Provider: Configured"
echo "  ✓ AWS Account: $ACCOUNT_ID"

# Count active roles
ACTIVE_ROLES=$(for env in dev staging prod; do aws iam get-role --role-name "github-actions-role-${env}" 2>/dev/null | grep -q '"Arn"' && echo 1 || echo 0; done | grep 1 | wc -l)
echo "  ✓ GitHub Actions Roles: $ACTIVE_ROLES/3 configured"

echo ""
echo -e "${GREEN}Next Steps:${NC}"
echo "1. Push a test commit to main branch"
echo "2. Monitor GitHub Actions workflow execution"
echo "3. Verify workflow authenticates to AWS without errors"
echo "4. Check AWS CloudTrail for AssumeRoleWithWebIdentity calls"
echo ""
echo -e "${YELLOW}For more details, see:${NC}"
echo "  - infrastructure/docs/GITHUB_ACTIONS_SETUP.md"
echo "  - infrastructure/docs/OIDC_TROUBLESHOOTING.md"
