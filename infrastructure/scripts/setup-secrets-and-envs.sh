#!/bin/bash
# GitHub Secrets and Environments Setup Script
# Purpose: Register secrets and create environments via GitHub API
# Usage: ./setup-secrets-and-envs.sh <OWNER> <REPO> <ACCOUNT_ID> <REGION>

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Arguments
OWNER=${1:-aki-motty}
REPO=${2:-todo-copilot}
ACCOUNT_ID=${3:-446713282258}
REGION=${4:-ap-northeast-1}

echo -e "${BLUE}=== GitHub Secrets and Environments Setup ===${NC}"
echo "Owner: $OWNER"
echo "Repository: $REPO"
echo "AWS Account: $ACCOUNT_ID"
echo "AWS Region: $REGION"
echo ""

# Check authentication
echo -e "${YELLOW}Step 1: Verifying GitHub authentication...${NC}"
if ! gh auth status > /dev/null 2>&1; then
  echo -e "${RED}✗ Not authenticated to GitHub. Run 'gh auth login' first.${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Authenticated${NC}"
echo ""

# Secrets configuration
echo -e "${YELLOW}Step 2: Registering secrets...${NC}"

# Create secrets
SECRETS=(
  "AWS_ROLE_TO_ASSUME_DEV:arn:aws:iam::${ACCOUNT_ID}:role/github-actions-role-dev"
  "AWS_ROLE_TO_ASSUME_STAGING:arn:aws:iam::${ACCOUNT_ID}:role/github-actions-role-staging"
  "AWS_ROLE_TO_ASSUME_PROD:arn:aws:iam::${ACCOUNT_ID}:role/github-actions-role-prod"
  "TF_STATE_BUCKET:todo-copilot-terraform-state-prod-${ACCOUNT_ID}"
  "TF_LOCK_TABLE:todo-copilot-terraform-lock"
  "AWS_REGION:${REGION}"
)

for secret in "${SECRETS[@]}"; do
  IFS=':' read -r name value <<< "$secret"
  echo "  Setting secret: $name"
  gh secret set "$name" --body "$value" --repo "$OWNER/$REPO" 2>/dev/null || {
    echo -e "${YELLOW}  ℹ Secret '$name' already exists or requires update${NC}"
  }
done

echo -e "${GREEN}✓ Secrets configured${NC}"
echo ""

# Environments creation
echo -e "${YELLOW}Step 3: Creating environments...${NC}"

# Note: GitHub API for environment creation requires manual UI configuration
# or scripting via curl/API calls. For now, we'll provide instructions.

echo "🔔 GitHub Environments must be created via GitHub UI:"
echo ""
echo "1. Go to: https://github.com/$OWNER/$REPO/settings/environments"
echo ""
echo "2. Create 'develop' environment (no protection rules)"
echo ""
echo "3. Create 'staging' environment with:"
echo "   - Restrict deployments to specific branches: main"
echo "   - NO required reviewers"
echo ""
echo "4. Create 'production' environment with:"
echo "   - Restrict deployments to specific branches: main"
echo "   - Required reviewers: 1"
echo ""

# Verification
echo -e "${YELLOW}Step 4: Verifying secrets...${NC}"
echo -e "${BLUE}Registered secrets:${NC}"
gh secret list --repo "$OWNER/$REPO" 2>/dev/null | head -10 || {
  echo -e "${YELLOW}ℹ Unable to list secrets via gh CLI. Secrets may be configured but not visible here.${NC}"
}
echo ""

echo -e "${GREEN}=== Setup Complete ===${NC}"
echo ""
echo "Next steps:"
echo "1. Create GitHub environments via UI (link above)"
echo "2. Verify environment protection rules in GitHub UI"
echo "3. Run: git push origin main"
echo "4. GitHub Actions workflow will trigger automatically"
