#!/bin/bash
# GitHub Environment Setup Script
# Purpose: Create GitHub environments and register secrets
# Usage: ./setup-github-env.sh [GITHUB_ORG] [GITHUB_REPO] [AWS_ACCOUNT_ID] [AWS_REGION]

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
GITHUB_ORG=${1:-aki-motty}
GITHUB_REPO=${2:-todo-copilot}
AWS_ACCOUNT_ID=${3:?"AWS_ACCOUNT_ID is required"}
AWS_REGION=${4:-ap-northeast-1}
FULL_REPO="${GITHUB_ORG}/${GITHUB_REPO}"

echo -e "${GREEN}=== GitHub Environment Setup ===${NC}"
echo "Repository: $FULL_REPO"
echo "AWS Account: $AWS_ACCOUNT_ID"
echo "AWS Region: $AWS_REGION"
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
  echo -e "${RED}❌ GitHub CLI (gh) is not installed${NC}"
  echo "Install from: https://cli.github.com"
  exit 1
fi

# Authenticate with gh CLI
echo -e "${YELLOW}Checking GitHub CLI authentication...${NC}"
if ! gh auth status 2>/dev/null | grep -q "Logged in"; then
  echo -e "${RED}❌ Not authenticated with GitHub CLI${NC}"
  echo "Run: gh auth login"
  exit 1
fi
echo -e "${GREEN}✓ Authenticated with GitHub${NC}"
echo ""

# Function to create environment
create_environment() {
  local env_name=$1
  local description=$2
  
  echo -e "${BLUE}Creating environment: $env_name${NC}"
  
  if gh api repos/$FULL_REPO/environments/$env_name 2>/dev/null | grep -q '"name"'; then
    echo -e "${YELLOW}ℹ Environment $env_name already exists${NC}"
  else
    gh api repos/$FULL_REPO/environments \
      -X POST \
      -f name="$env_name" \
      -f description="$description" \
      >/dev/null 2>&1
    echo -e "${GREEN}✓ Created environment: $env_name${NC}"
  fi
}

# Function to set secret
set_secret() {
  local secret_name=$1
  local secret_value=$2
  
  # Only set if value is not empty
  if [ -z "$secret_value" ]; then
    echo -e "${YELLOW}⚠ Skipping $secret_name (empty value)${NC}"
    return
  fi
  
  if gh secret set "$secret_name" --repo "$FULL_REPO" --body "$secret_value" 2>/dev/null; then
    echo -e "${GREEN}✓ Set secret: $secret_name${NC}"
  else
    echo -e "${YELLOW}ℹ Secret already exists or error: $secret_name${NC}"
  fi
}

# Function to set environment secret
set_env_secret() {
  local env_name=$1
  local secret_name=$2
  local secret_value=$3
  
  # Only set if value is not empty
  if [ -z "$secret_value" ]; then
    echo -e "${YELLOW}⚠ Skipping $secret_name in $env_name (empty value)${NC}"
    return
  fi
  
  if gh secret set "$secret_name" --repo "$FULL_REPO" --env "$env_name" --body "$secret_value" 2>/dev/null; then
    echo -e "${GREEN}  ✓ Set $secret_name${NC}"
  else
    echo -e "${YELLOW}  ℹ Secret already exists or error: $secret_name${NC}"
  fi
}

# Step 1: Create Environments
echo -e "${YELLOW}Step 1: Creating GitHub Environments...${NC}"
create_environment "develop" "Development environment - auto-deploy"
create_environment "staging" "Staging environment - 1-approval required"
create_environment "production" "Production environment - 2-approval required"
echo ""

# Step 2: Register Repository Secrets
echo -e "${YELLOW}Step 2: Registering repository secrets...${NC}"

echo -e "${BLUE}Global Secrets:${NC}"
set_secret "AWS_ROLE_TO_ASSUME_DEV" "arn:aws:iam::${AWS_ACCOUNT_ID}:role/github-actions-role-dev"
set_secret "AWS_ROLE_TO_ASSUME_STAGING" "arn:aws:iam::${AWS_ACCOUNT_ID}:role/github-actions-role-staging"
set_secret "AWS_ROLE_TO_ASSUME_PROD" "arn:aws:iam::${AWS_ACCOUNT_ID}:role/github-actions-role-prod"
set_secret "TF_STATE_BUCKET" "todo-copilot-terraform-state-main-${AWS_ACCOUNT_ID}"
set_secret "TF_LOCK_TABLE" "todo-copilot-terraform-lock"
set_secret "AWS_REGION" "$AWS_REGION"
echo ""

# Step 3: Verify Environments Created
echo -e "${YELLOW}Step 3: Verifying environments...${NC}"
echo -e "${BLUE}Environments:${NC}"
gh api repos/$FULL_REPO/environments --jq '.environments[].name' | while read env; do
  echo -e "${GREEN}  ✓ $env${NC}"
done
echo ""

# Step 4: Configure Branch Protection (if applicable)
echo -e "${YELLOW}Step 4: Environment Protection Rules Status${NC}"
echo -e "${BLUE}For Environment Protection Rules, configure in GitHub UI:${NC}"
echo "  1. Go to Settings → Environments → staging"
echo "  2. Set Required Reviewers: 1"
echo "  3. Configure Deployment Branches: main only"
echo ""
echo "  Then repeat for production:"
echo "  1. Go to Settings → Environments → production"
echo "  2. Set Required Reviewers: 2"
echo "  3. Configure Deployment Branches: main only"
echo ""

# Step 5: Verify Secrets
echo -e "${YELLOW}Step 5: Verifying secrets...${NC}"
echo -e "${BLUE}Repository Secrets:${NC}"
gh secret list --repo "$FULL_REPO" | grep -E "AWS_ROLE|TF_" | while read line; do
  secret_name=$(echo "$line" | awk '{print $1}')
  echo -e "${GREEN}  ✓ $secret_name${NC}"
done
echo ""

# Step 6: Final Summary
echo -e "${GREEN}=== Setup Complete ===${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Configure environment protection rules (see GitHub UI instructions above)"
echo "2. Add team members to approval groups"
echo "3. Test workflow: Push to main branch"
echo "4. Monitor workflow execution in GitHub Actions"
echo ""
echo -e "${BLUE}Useful Commands:${NC}"
echo "  # View secrets"
echo "  gh secret list --repo $FULL_REPO"
echo ""
echo "  # View environments"
echo "  gh api repos/$FULL_REPO/environments"
echo ""
echo "  # View recent workflow runs"
echo "  gh run list --repo $FULL_REPO --limit 10"
echo ""
echo "  # View workflow details"
echo "  gh run view <run-id> --repo $FULL_REPO"
echo ""
echo -e "${GREEN}For more details, see:${NC}"
echo "  - infrastructure/docs/SECRETS_AND_ENVIRONMENTS.md"
echo "  - infrastructure/docs/ENVIRONMENT_PROTECTION.md"
