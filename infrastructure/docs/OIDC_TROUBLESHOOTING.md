# OIDC Authentication Troubleshooting Guide

**Purpose**: Diagnostic and troubleshooting procedures for GitHub Actions OIDC authentication issues  
**Audience**: DevOps Engineers, Infrastructure Teams  
**Status**: Phase 2 - T032 Documentation  

---

## Overview

This guide provides step-by-step troubleshooting procedures for common OIDC authentication issues in GitHub Actions CI/CD pipelines.

---

## Common Issues & Solutions

### Issue 1: "Error: The OIDC token could not be fetched"

**Symptom**: Workflow fails during `aws-actions/configure-aws-credentials` step  
```
Error: The OIDC token could not be fetched
```

**Root Causes**:
- GitHub OIDC provider not registered in AWS
- GitHub repository not configured for OIDC
- Token request timing out

**Solution**:

1. **Verify GitHub OIDC provider exists**:
```bash
aws iam list-open-id-connect-providers
# Should show: arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com
```

2. **Re-create provider if missing**:
```bash
./infrastructure/scripts/setup-oidc.sh ap-northeast-1 aki-motty todo-copilot
```

3. **Check GitHub repository settings**:
   - Go to Settings → Secrets and Variables → Actions
   - Verify `AWS_ROLE_TO_ASSUME_DEV` secret is set

4. **Verify GitHub Actions permissions**:
   - Settings → Actions → General
   - Enable "Allow GitHub Actions to create and approve pull requests"

---

### Issue 2: "AccessDenied: User is not authorized to perform: sts:AssumeRoleWithWebIdentity"

**Symptom**: Workflow runs but fails on AWS operations  
```
ClientError: An error occurred (AccessDenied) when calling the AssumeRoleWithWebIdentity operation
```

**Root Causes**:
- IAM role trust policy not configured correctly
- Role ARN in GitHub secrets is incorrect
- Subject claim in trust policy doesn't match GitHub context

**Solution**:

1. **Verify role trust policy**:
```bash
aws iam get-role --role-name github-actions-role-dev | jq '.Role.AssumeRolePolicyDocument'
```

2. **Check for correct trust relationship**:
```bash
# Should include Federated principal and oidc-provider
aws iam get-role --role-name github-actions-role-dev | jq '.Role.AssumeRolePolicyDocument.Statement[0].Principal'
```

3. **Verify subject claim matches**:
```bash
# For dev environment, subject should be:
# repo:aki-motty/todo-copilot:ref:refs/heads/main

# For staging/prod, subject should be:
# repo:aki-motty/todo-copilot:environment:staging
```

4. **Update trust policy if needed**:
```bash
# Re-run setup script
./infrastructure/scripts/setup-oidc.sh ap-northeast-1 aki-motty todo-copilot
```

---

### Issue 3: "ValidationError: 1 validation error detected"

**Symptom**: Token validation error  
```
ValidationError: 1 validation error detected: Value at 'AssumeRoleWithWebIdentity' failed to satisfy constraint
```

**Root Causes**:
- Token format mismatch
- Missing required parameters

**Solution**:

1. **Verify token format in workflow**:
```yaml
- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: ${{ secrets.AWS_ROLE_TO_ASSUME_DEV }}
    aws-region: ap-northeast-1
    token-format: aws4  # Must be 'aws4' for OIDC
```

2. **Check workflow secrets**:
```bash
gh secret list --repo aki-motty/todo-copilot | grep AWS_ROLE
```

3. **Verify secret format**:
```bash
# Should start with: arn:aws:iam::
# Should contain: role/github-actions-role-
```

---

### Issue 4: "UnauthorizedOperation: You are not authorized to perform this operation"

**Symptom**: Terraform operations fail after successful authentication  
```
UnauthorizedOperation: You are not authorized to perform: dynamodb:GetItem
```

**Root Causes**:
- IAM policies not attached to role
- Policy permissions too restrictive
- Resource ARN mismatch

**Solution**:

1. **List attached policies**:
```bash
aws iam list-attached-role-policies --role-name github-actions-role-dev
```

2. **Verify all required policies attached**:
- `github-actions-terraform-state-access`
- `github-actions-lambda-deploy`
- `github-actions-api-gateway-deploy`
- `github-actions-dynamodb-manage`
- `github-actions-iam-role-management`

3. **Attach missing policies**:
```bash
aws iam attach-role-policy \
  --role-name github-actions-role-dev \
  --policy-arn arn:aws:iam::ACCOUNT_ID:policy/github-actions-terraform-state-access
```

4. **Verify S3 bucket and DynamoDB table names**:
```bash
# Check actual bucket name
aws s3 ls | grep terraform-state

# Check actual table name
aws dynamodb list-tables | grep terraform-lock
```

---

### Issue 5: "Invalid provider configuration"

**Symptom**: Provider registration fails  
```
Error: Invalid provider configuration
```

**Root Causes**:
- Provider already exists
- Incorrect thumbprint
- Network connectivity issues

**Solution**:

1. **Check existing providers**:
```bash
aws iam list-open-id-connect-providers
```

2. **If provider exists, verify thumbprint**:
```bash
# Get current thumbprint
CURRENT=$(aws iam get-open-id-connect-provider \
  --open-id-connect-provider-arn arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com \
  | jq '.ThumbprintList[0]')

# Calculate expected thumbprint
EXPECTED=$(echo | openssl s_client -servername token.actions.githubusercontent.com \
  -showcerts -connect token.actions.githubusercontent.com:443 2>/dev/null | \
  openssl x509 -noout -fingerprint -sha1 | cut -d= -f2 | tr -d :)

echo "Current: $CURRENT"
echo "Expected: $EXPECTED"
```

3. **Delete and recreate if thumbprint mismatch**:
```bash
aws iam delete-open-id-connect-provider \
  --open-id-connect-provider-arn arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com

./infrastructure/scripts/setup-oidc.sh ap-northeast-1 aki-motty todo-copilot
```

---

## Diagnostic Commands

### Verify OIDC Configuration
```bash
# List all OIDC providers
aws iam list-open-id-connect-providers

# Get specific provider details
aws iam get-open-id-connect-provider \
  --open-id-connect-provider-arn arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com
```

### Check GitHub Actions Role
```bash
# Get role details
aws iam get-role --role-name github-actions-role-dev

# Get trust policy
aws iam get-role --role-name github-actions-role-dev | jq '.Role.AssumeRolePolicyDocument'

# List attached policies
aws iam list-attached-role-policies --role-name github-actions-role-dev

# Get inline policies
aws iam list-role-policies --role-name github-actions-role-dev
```

### Check S3 State Backend
```bash
# List Terraform state buckets
aws s3 ls | grep terraform-state

# Get bucket versioning status
aws s3api get-bucket-versioning --bucket todo-copilot-terraform-state-main-ACCOUNT_ID

# Get bucket encryption
aws s3api get-bucket-encryption --bucket todo-copilot-terraform-state-main-ACCOUNT_ID
```

### Check DynamoDB Lock Table
```bash
# List DynamoDB tables
aws dynamodb list-tables | grep terraform

# Describe lock table
aws dynamodb describe-table --table-name todo-copilot-terraform-lock

# Check table items
aws dynamodb scan --table-name todo-copilot-terraform-lock
```

### Monitor AWS CloudTrail
```bash
# Get recent AssumeRoleWithWebIdentity events
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=AssumeRoleWithWebIdentity \
  --max-results 10 | jq '.Events[] | {EventTime, EventName, Username}'

# Filter by GitHub Actions role
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=ResourceName,AttributeValue=github-actions-role-dev \
  --max-results 10
```

---

## Debugging Workflow Issues

### Enable Debug Logging in GitHub Actions
Add to workflow YAML:
```yaml
env:
  RUNNER_DEBUG: 1
  AWS_ROLE_SESSION_NAME: GitHubActions-${{ github.run_id }}
```

### Check Workflow Logs
```bash
# View recent workflow runs
gh run list --repo aki-motty/todo-copilot --limit 5

# View specific run logs
gh run view <RUN_ID> --repo aki-motty/todo-copilot --log

# Download logs for offline analysis
gh run view <RUN_ID> --repo aki-motty/todo-copilot --log-failed
```

### Local Testing with OIDC Token
To simulate GitHub Actions environment locally:

```bash
# Get a test token (requires GitHub CLI auth)
GITHUB_TOKEN=$(gh auth token)

# This can be used for testing token requests
echo "Token retrieved for testing"
```

---

## Performance Issues

### Issue: Workflow Runs Slowly

**Symptoms**: OIDC authentication takes unusually long

**Diagnosis**:
```bash
# Check AWS API response times via CloudWatch
aws cloudwatch get-metric-statistics \
  --namespace AWS/STS \
  --metric-name Duration \
  --start-time 2024-01-XX \
  --end-time 2024-01-XX \
  --period 60 \
  --statistics Average,Maximum
```

**Solutions**:
1. Check network connectivity from GitHub Actions runner to AWS
2. Verify AWS API rate limits not exceeded
3. Consider caching OIDC tokens (GitHub Actions handles this automatically)

---

## Security Validation

### Verify Token Expiration
```bash
# Tokens generated by GitHub OIDC are short-lived (15 minutes by default)
# Verify in workflow logs: "Token expiration set to..."
```

### Audit Role Access
```bash
# Check who/what has assumed the role
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=AssumeRoleWithWebIdentity \
  --start-time 2024-01-XX \
  --end-time 2024-01-XX | jq '.Events[] | {EventTime, Username, UserAgent}'
```

### Verify Secret Rotation
GitHub secrets don't expire automatically. Rotate annually:
```bash
# Update role ARN secret
gh secret set AWS_ROLE_TO_ASSUME_DEV \
  --repo aki-motty/todo-copilot \
  --body "arn:aws:iam::ACCOUNT_ID:role/github-actions-role-dev"
```

---

## Recovery Procedures

### If OIDC Provider Becomes Unavailable

1. **Temporarily fall back to long-lived secrets**:
```bash
# Create temporary IAM user with minimal permissions
aws iam create-access-key --user-name github-actions-temp

# Register temporary credentials in GitHub secrets
gh secret set AWS_ACCESS_KEY_ID --body "AKXXXXXXXXXXXXXXXXXX"
gh secret set AWS_SECRET_ACCESS_KEY --body "..."
```

2. **Update workflow to use temporary credentials**:
```yaml
- name: Configure AWS credentials (temporary)
  uses: aws-actions/configure-aws-credentials@v4
  with:
    aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
    aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    aws-region: ap-northeast-1
```

3. **Recreate OIDC provider**:
```bash
./infrastructure/scripts/setup-oidc.sh ap-northeast-1 aki-motty todo-copilot
```

4. **Switch back to OIDC**:
   - Revert workflow changes
   - Delete temporary credentials
   - Verify OIDC authentication working

---

## Useful Resources

- [GitHub Actions OIDC Documentation](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)
- [AWS OIDC Provider Setup](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc.html)
- [GitHub CLI Reference](https://cli.github.com/manual)
- [AWS CloudTrail Documentation](https://docs.aws.amazon.com/awscloudtrail/)

---

**Status**: ✅ T032 Complete  
**Created**: Phase 2 - AWS OIDC Setup  
**Last Updated**: 2024-01-XX
