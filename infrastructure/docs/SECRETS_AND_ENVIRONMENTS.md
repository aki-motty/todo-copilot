# GitHub Secrets & Environments Configuration

**Phase**: 3 (GitHub Secrets Optimization)  
**Tasks**: T034-T045  
**Status**: Implementation Guide  

---

## Required GitHub Repository Secrets

All secrets must be registered in GitHub repository settings: **Settings → Secrets and variables → Actions**

### AWS OIDC Role ARNs (T034-T036)

| Secret Name | Value | Example | Purpose |
|------------|-------|---------|---------|
| `AWS_ROLE_TO_ASSUME_DEV` | IAM Role ARN | `arn:aws:iam::446713282258:role/github-actions-role-dev` | Dev environment OIDC auth |
| `AWS_ROLE_TO_ASSUME_STAGING` | IAM Role ARN | `arn:aws:iam::446713282258:role/github-actions-role-staging` | Staging environment OIDC auth |
| `AWS_ROLE_TO_ASSUME_PROD` | IAM Role ARN | `arn:aws:iam::446713282258:role/github-actions-role-prod` | Production environment OIDC auth |

### Terraform State Configuration (T037-T038)

| Secret Name | Value | Example | Purpose |
|------------|-------|---------|---------|
| `TF_STATE_BUCKET` | S3 bucket name | `todo-copilot-terraform-state-ap-northeast-1` | Terraform state storage |
| `TF_LOCK_TABLE` | DynamoDB table | `terraform-locks` | Terraform state locking |

### Optional Configuration (T039)

| Secret Name | Value | Default | Purpose |
|------------|-------|---------|---------|
| `AWS_REGION` | AWS region | `ap-northeast-1` | AWS region (hardcoded ok) |
| `SLACK_WEBHOOK_URL` | Slack webhook | N/A | Slack notifications (optional) |

---

## GitHub CLI Commands (Recommended)

### Prerequisites

```bash
# Install GitHub CLI
brew install gh  # macOS
# or: choco install gh  # Windows
# or: apt-get install gh  # Linux

# Login to GitHub
gh auth login

# Set repository
gh repo set-default aki-motty/todo-copilot
```

### Register Secrets

```bash
# AWS OIDC Roles (T034-T036)
gh secret set AWS_ROLE_TO_ASSUME_DEV --body "arn:aws:iam::446713282258:role/github-actions-role-dev"
gh secret set AWS_ROLE_TO_ASSUME_STAGING --body "arn:aws:iam::446713282258:role/github-actions-role-staging"
gh secret set AWS_ROLE_TO_ASSUME_PROD --body "arn:aws:iam::446713282258:role/github-actions-role-prod"

# Terraform State (T037-T038)
gh secret set TF_STATE_BUCKET --body "todo-copilot-terraform-state-ap-northeast-1"
gh secret set TF_LOCK_TABLE --body "terraform-locks"

# Optional: Slack Webhook
# gh secret set SLACK_WEBHOOK_URL --body "https://hooks.slack.com/services/..."
```

### Verify Secrets (T044)

```bash
gh secret list
```

Expected output:
```
AWS_ROLE_TO_ASSUME_DEV
AWS_ROLE_TO_ASSUME_STAGING
AWS_ROLE_TO_ASSUME_PROD
TF_STATE_BUCKET
TF_LOCK_TABLE
```

---

## GitHub Environments Configuration

### Create Environments (T040-T042)

**Using GitHub CLI**:

```bash
# Develop environment (no approvals required)
gh api repos/aki-motty/todo-copilot/environments \
  -X POST \
  -f "name=develop" \
  -f "wait_timer=0"

# Staging environment (1 approval required)
gh api repos/aki-motty/todo-copilot/environments \
  -X POST \
  -f "name=staging" \
  -f "wait_timer=0"

# Production environment (2 approvals required)
gh api repos/aki-motty/todo-copilot/environments \
  -X POST \
  -f "name=production" \
  -f "wait_timer=0"
```

**Using GitHub Web UI**:

1. Go to Repository → Settings → Environments
2. Click "New environment"
3. Enter environment name:
   - `develop` (for verification)
   - `staging` (1 approval)
   - `production` (2 approvals)
4. Click "Create environment"

### Configure Protection Rules (Part of Phase 5)

**Staging Environment**:
1. Settings → Environments → staging
2. Click "Add protection rules"
3. Enable "Require reviewers" → Set to 1 reviewer
4. Enable "Deployment branches and tags" → Restrict to `main`
5. Save

**Production Environment**:
1. Settings → Environments → production
2. Click "Add protection rules"
3. Enable "Require reviewers" → Set to 2 reviewers
4. Enable "Deployment branches and tags" → Restrict to `main`
5. Save

---

## Environment-Specific Secrets (T043)

### Override secrets per environment (optional)

If you need different values per environment, you can set environment-specific secrets:

```bash
# Set staging-specific secret (example)
gh secret set TF_VAR_ENVIRONMENT --body "staging" \
  --env staging

# Set production-specific secret (example)
gh secret set TF_VAR_ENVIRONMENT --body "production" \
  --env production
```

---

## Security Audit (T044-T045)

### Verify No Secrets Leak

```bash
# Check all secrets are properly masked in workflow logs
# Run a test workflow and verify logs don't contain:
# - AWS role ARNs
# - S3 bucket names
# - DynamoDB table names
# - Any credential values

# Verify secrets are used only in configure-aws-credentials step
grep -n "secrets\." .github/workflows/terraform-ci.yml
```

Expected only in:
- `aws-actions/configure-aws-credentials@v4` steps

### Rotation Policy (T045)

**Recommended**: Quarterly rotation for AWS credentials
- If using long-lived AWS keys (not OIDC), rotate every 3 months
- OIDC tokens are short-lived (15 min) and auto-renewed
- GitHub secrets should be reviewed and updated as needed

**Implementation**:
- Set calendar reminder for Q1, Q2, Q3, Q4
- Document rotation in team runbook
- Add to GitHub issue template for scheduled tasks

---

## Troubleshooting

### Secret not found in workflow

```
Error: Secrets are not being passed to the workflow
```

**Solution**:
1. Verify secret is registered: `gh secret list`
2. Check secret name is spelled correctly in workflow
3. Verify workflow has `permissions.id-token: write` for OIDC
4. Check environment restrictions (not job-specific)

### Secret appears in logs

```
Error: AWS credentials visible in workflow logs!
```

**Solution**:
- GitHub automatically masks secrets in logs
- If visible, likely not stored as secret (check variable vs secret)
- Audit `.github/workflows/terraform-ci.yml` for hardcoded values
- Regenerate compromised credentials immediately

### OIDC authentication fails

```
Error: NotOIDCConfiguredError: No OIDC configured
```

**Solution**:
1. Verify AWS OIDC provider exists: `aws iam list-open-id-connect-providers`
2. Check IAM role trust policy includes GitHub Actions subject
3. Verify role ARN is correct in `AWS_ROLE_TO_ASSUME_*` secret
4. Check role has appropriate permissions

---

## Verification Checklist

- [ ] All 5 secrets registered (`AWS_ROLE_*`, `TF_STATE_BUCKET`, `TF_LOCK_TABLE`)
- [ ] Three environments created (`develop`, `staging`, `production`)
- [ ] Develop environment has no protection rules
- [ ] Staging environment requires 1 approval
- [ ] Production environment requires 2 approvals
- [ ] All secrets visible in: `gh secret list`
- [ ] No hardcoded credentials in terraform-ci.yml
- [ ] OIDC token-format configured: `token-format: aws4`
- [ ] Test workflow runs successfully with OIDC auth
- [ ] Secrets properly masked in workflow logs

---

## Next Phase

→ **Phase 5**: Environment-Based Deployment Pipeline (T057-T065)
- Configure deployment branch restrictions
- Test approval workflows
- Execute smoke test deployment
