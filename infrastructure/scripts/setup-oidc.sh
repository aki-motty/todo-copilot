#!/bin/bash
# AWS OIDC Provider Setup Script
# Purpose: Register GitHub OIDC provider in AWS account
# Usage: ./setup-oidc.sh [AWS_REGION] [GITHUB_ORG] [GITHUB_REPO]

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
AWS_REGION=${1:-ap-northeast-1}
GITHUB_ORG=${2:-aki-motty}
GITHUB_REPO=${3:-todo-copilot}
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo -e "${GREEN}=== AWS OIDC Provider Setup ===${NC}"
echo "AWS Region: $AWS_REGION"
echo "GitHub Organization: $GITHUB_ORG"
echo "GitHub Repository: $GITHUB_REPO"
echo "AWS Account ID: $ACCOUNT_ID"
echo ""

# Function to check if provider exists
check_provider_exists() {
  local provider_arn="arn:aws:iam::${ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com"
  
  if aws iam list-open-id-connect-providers --region "$AWS_REGION" 2>/dev/null | grep -q "$provider_arn"; then
    return 0  # Provider exists
  else
    return 1  # Provider does not exist
  fi
}

# Step 1: Get GitHub OIDC Provider Thumbprint
echo -e "${YELLOW}Step 1: Fetching GitHub OIDC provider thumbprint...${NC}"
THUMBPRINT=$(echo | openssl s_client -servername token.actions.githubusercontent.com -showcerts -connect token.actions.githubusercontent.com:443 2>/dev/null | openssl x509 -noout -fingerprint -sha1 | cut -d= -f2 | tr -d :)
echo -e "${GREEN}✓ Thumbprint: $THUMBPRINT${NC}"
echo ""

# Step 2: Create OIDC Provider
echo -e "${YELLOW}Step 2: Creating AWS OIDC Provider...${NC}"

if check_provider_exists; then
  echo -e "${YELLOW}ℹ OIDC provider already exists, skipping creation${NC}"
else
  aws iam create-open-id-connect-provider \
    --url "https://token.actions.githubusercontent.com" \
    --client-id-list "sts.amazonaws.com" \
    --thumbprint-list "$THUMBPRINT" \
    --region "$AWS_REGION" \
    >/dev/null 2>&1 || echo -e "${YELLOW}ℹ Provider creation completed${NC}"
fi

PROVIDER_ARN="arn:aws:iam::${ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com"
echo -e "${GREEN}✓ OIDC Provider ARN: $PROVIDER_ARN${NC}"
echo ""

# Step 3: Create IAM Roles
echo -e "${YELLOW}Step 3: Creating IAM roles for GitHub Actions...${NC}"

for ENVIRONMENT in dev staging prod; do
  ROLE_NAME="github-actions-role-${ENVIRONMENT}"
  
  # Determine subject constraint based on environment
  if [ "$ENVIRONMENT" = "dev" ]; then
    SUBJECT_CONSTRAINT="repo:${GITHUB_ORG}/${GITHUB_REPO}:ref:refs/heads/main"
  else
    SUBJECT_CONSTRAINT="repo:${GITHUB_ORG}/${GITHUB_REPO}:environment:${ENVIRONMENT}"
  fi
  
  # Create assume role policy
  ASSUME_ROLE_POLICY=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "${PROVIDER_ARN}"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "${SUBJECT_CONSTRAINT}"
        }
      }
    }
  ]
}
EOF
)
  
  # Create role if not exists
  if aws iam get-role --role-name "$ROLE_NAME" --region "$AWS_REGION" >/dev/null 2>&1; then
    echo -e "${YELLOW}ℹ Role $ROLE_NAME already exists${NC}"
  else
    aws iam create-role \
      --role-name "$ROLE_NAME" \
      --assume-role-policy-document "$ASSUME_ROLE_POLICY" \
      --region "$AWS_REGION" \
      >/dev/null 2>&1
    echo -e "${GREEN}✓ Created role: $ROLE_NAME${NC}"
  fi
done
echo ""

# Step 4: Create IAM Policies
echo -e "${YELLOW}Step 4: Creating IAM policies for GitHub Actions...${NC}"

# Terraform state access policy
TERRAFORM_POLICY=$(cat <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::todo-copilot-terraform-state-*",
        "arn:aws:s3:::todo-copilot-terraform-state-*/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:DescribeTable",
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:DeleteItem"
      ],
      "Resource": "arn:aws:dynamodb:*:*:table/todo-copilot-terraform-lock"
    }
  ]
}
EOF
)

# Create and attach policies
for ENVIRONMENT in dev staging prod; do
  POLICY_NAME="github-actions-terraform-access-${ENVIRONMENT}"
  ROLE_NAME="github-actions-role-${ENVIRONMENT}"
  
  if ! aws iam get-role-policy --role-name "$ROLE_NAME" --policy-name "$POLICY_NAME" --region "$AWS_REGION" >/dev/null 2>&1; then
    aws iam put-role-policy \
      --role-name "$ROLE_NAME" \
      --policy-name "$POLICY_NAME" \
      --policy-document "$TERRAFORM_POLICY" \
      --region "$AWS_REGION" \
      >/dev/null 2>&1
    echo -e "${GREEN}✓ Attached policy to $ROLE_NAME${NC}"
  else
    echo -e "${YELLOW}ℹ Policy already attached to $ROLE_NAME${NC}"
  fi
done
echo ""

# Step 5: Output Summary
echo -e "${GREEN}=== Setup Complete ===${NC}"
echo ""
echo "OIDC Provider Setup Complete!"
echo ""
echo "GitHub Secrets to configure:"
echo "  AWS_ROLE_TO_ASSUME_DEV=arn:aws:iam::${ACCOUNT_ID}:role/github-actions-role-dev"
echo "  AWS_ROLE_TO_ASSUME_STAGING=arn:aws:iam::${ACCOUNT_ID}:role/github-actions-role-staging"
echo "  AWS_ROLE_TO_ASSUME_PROD=arn:aws:iam::${ACCOUNT_ID}:role/github-actions-role-prod"
echo "  TF_STATE_BUCKET=todo-copilot-terraform-state-${ENVIRONMENT}-${ACCOUNT_ID}"
echo "  TF_LOCK_TABLE=todo-copilot-terraform-lock"
echo "  AWS_REGION=${AWS_REGION}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Copy the secret values above"
echo "2. Go to GitHub: Settings → Secrets and Variables → Actions"
echo "3. Add each secret with the values above"
echo "4. Create GitHub Environments (develop, staging, production)"
echo "5. Configure environment protection rules"
echo ""
echo -e "${GREEN}For more details, see:${NC}"
echo "  - infrastructure/docs/GITHUB_ACTIONS_SETUP.md"
echo "  - infrastructure/docs/SECRETS_AND_ENVIRONMENTS.md"
