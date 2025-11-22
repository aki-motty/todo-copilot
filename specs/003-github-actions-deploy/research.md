# Research Phase: GitHub Actions AWS Deployment Automation

**Date**: 2025-11-22  
**Tasks**: T001-T008  
**Status**: ✅ COMPLETE

---

## T001: GitHub Actions OIDC Provider Integration Patterns

### Key Findings

**AWS OIDC Provider Setup**:
- GitHub Actions provides OIDC token at `$GITHUB_STEP_SUMMARY`
- AWS accepts GitHub as OIDC provider via `token.actions.githubusercontent.com`
- Subject claim format: `repo:OWNER/REPO:*` or `repo:OWNER/REPO:ref:refs/heads/BRANCH`

**Benefits**:
- Short-lived tokens (max 15 minutes)
- No long-lived AWS credentials in repository
- Audit trail in GitHub Actions logs
- Automatic token refresh per job

**Integration Pattern** (aws-actions/configure-aws-credentials@v4):
```yaml
- uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: arn:aws:iam::ACCOUNT_ID:role/github-actions-role
    aws-region: ap-northeast-1
    token-format: aws4
    web-identity-token-file: ${{ env.GITHUB_STEP_SUMMARY }}
```

---

## T002: AWS OIDC Setup Procedure for `aki-motty/todo-copilot`

### Step-by-step AWS Setup

**1. Create OIDC Provider**:
```bash
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938FD4D98BAB503D5EB8D237B44B7D5ABD7BED4 \
  --region ap-northeast-1
```

**2. Create IAM Role** (github-actions-role-dev):
```bash
ROLE_TRUST_POLICY='{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::446713282258:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:aki-motty/todo-copilot:*"
        }
      }
    }
  ]
}'

aws iam create-role \
  --role-name github-actions-role-dev \
  --assume-role-policy-document "$ROLE_TRUST_POLICY"
```

**3. Attach Terraform Policy**:
```bash
aws iam attach-role-policy \
  --role-name github-actions-role-dev \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess
```

(For production, use least-privilege policy)

**4. Register in GitHub Secrets**:
- `AWS_ROLE_TO_ASSUME_DEV`: `arn:aws:iam::446713282258:role/github-actions-role-dev`
- Similar for staging and prod roles

---

## T003: Current terraform-ci.yml Failing Points

### Critical Issues

| Issue | Current State | Problem | Impact |
|-------|---------------|---------|--------|
| **Branch Trigger** | `develop` in `on.push.branches` | develop branch doesn't exist | Workflow won't trigger on any branch |
| **Deploy Dev Condition** | `if: github.ref == 'refs/heads/develop'` | develop is non-existent | Dev deploys never execute |
| **Staging Trigger** | `contains(github.event.head_commit.message, '[deploy-staging]')` | Requires commit message | Not discoverable via UI |
| **Prod Trigger** | `contains(github.event.head_commit.message, '[deploy-prod]')` | Requires commit message | Not discoverable via UI |
| **Approval Action** | `trstringer/manual-approval@v1` | Deprecated, team-based approval difficult | Not maintainable long-term |
| **OIDC Auth** | `role-to-assume` uses secret | No OIDC provider registered in AWS | GitHub Actions can't assume role |
| **Environment Block** | `environment: name: development` | Correct but no protection rules configured | No manual approval workflow |
| **Terraform Wrapper** | Inconsistent `terraform_wrapper` settings | Some jobs set false, some default true | Unpredictable output format |

### Root Cause Analysis

**Primary Issues**:
1. **Workflow designed for non-existent develop branch** → Entire pipeline blocked
2. **Manual approval using deprecated action** → Unsustainable
3. **OIDC not configured in AWS** → Authentication will fail
4. **Deploy triggers use commit messages** → Poor UX compared to PR labels

---

## T004: GitHub Environment Protection Rules Configuration

### Setup Instructions

**1. Create Environments** (via UI or API):
```bash
# Via GitHub CLI
gh repo set-default aki-motty/todo-copilot
gh api repos/aki-motty/todo-copilot/environments \
  -X POST \
  -f "name=staging"
```

**2. Configure Protection Rules** (via UI):
- Go to Settings → Environments → staging
- Enable "Deployment branches and tags" → Restrict to main
- Enable "Required reviewers" → Minimum 1 approval
- Enable "Dismiss stale pull request approvals"

**3. Environment Secrets**:
- Can override repository secrets per environment
- Example: `AWS_ROLE_TO_ASSUME_STAGING` in staging environment

**4. Conditional Job Execution**:
```yaml
deploy-staging:
  environment: staging  # Triggers protection rules
  if: github.ref == 'refs/heads/main'  # Only from main
```

### Advantages Over Manual Approval Actions

| Feature | GitHub Env Rules | Manual Actions |
|---------|-----------------|----------------|
| UI-based | ✅ Native GitHub UI | ❌ Action logs only |
| Team management | ✅ Via organization teams | ❌ String-based |
| Audit trail | ✅ GitHub audit log | ⚠️ Issue comments |
| Dismissal | ✅ Built-in | ❌ Must re-approve |
| Maintenance | ✅ No action version tracking | ❌ Deprecated actions |

---

## T005: Stage-Specific Timeout Recommendations

### Analysis

**Current Pipeline Stages**:
1. **terraform-validate**: format check, init, validate, plan (all 3 envs)
2. **tests**: Jest suite, module tests
3. **security-scan**: TFLint, Checkov
4. **deploy-***: terraform init, plan, apply

**Recommended Timeouts**:

| Stage | Tasks | Typical Duration | Recommended | Rationale |
|-------|-------|------------------|-------------|-----------|
| validate | fmt, init, validate, plan×3 | 2-3 min | **5 min** | Plan generation can be slow with large modules |
| tests | Jest 338 tests + coverage | 3-5 min | **10 min** | Slow test first time; caching helps |
| security-scan | TFLint + Checkov scan | 2-4 min | **10 min** | Buffer for large codebases |
| deploy | init + apply | 5-10 min | **15 min** | AWS resource provisioning can vary |

**Implementation**:
```yaml
jobs:
  terraform-validate:
    timeout-minutes: 5
  tests:
    timeout-minutes: 10
  security-scan:
    timeout-minutes: 10
  deploy-dev:
    timeout-minutes: 15
  deploy-staging:
    timeout-minutes: 15
  deploy-prod:
    timeout-minutes: 15
```

---

## T006: TFLint and Checkov Integration Best Practices

### TFLint Configuration

**Setup**:
```bash
# In .tflint.hcl (create at infrastructure/terraform/)
plugin "aws" {
  enabled = true
  version = "0.24.0"
  source  = "github.com/terraform-linters/tflint-ruleset-aws"
}

rule "aws_instance_invalid_type" {
  enabled = true
}
```

**GitHub Actions Integration**:
```yaml
- uses: terraform-linters/setup-tflint@v4
  with:
    tflint_version: latest

- run: |
    cd infrastructure/terraform
    tflint --init
    tflint --format compact --force
```

**Output Format**: Use SARIF for GitHub Code Scanning integration

### Checkov Configuration

**Best Practices**:
- Run against infrastructure/terraform directory
- Filter for CRITICAL and HIGH severity
- Output SARIF format for GitHub integration
- Skip checks if necessary (document why)

**GitHub Actions Integration**:
```yaml
- uses: bridgecrewio/checkov-action@master
  with:
    directory: infrastructure/terraform
    framework: terraform
    output_format: sarif
    output_file_path: report.sarif
```

---

## T007: Feature 002 Backend Validation

### S3 Backend Configuration

**Verification**:
```bash
# Check S3 bucket exists and has versioning
aws s3api head-bucket --bucket TODO_STATE_BUCKET
aws s3api get-bucket-versioning --bucket TODO_STATE_BUCKET

# Verify DynamoDB lock table
aws dynamodb describe-table --table-name terraform-locks
```

**Expected State**:
- ✅ S3 bucket: todo-copilot-terraform-state-ap-northeast-1
- ✅ DynamoDB table: terraform-locks (on-demand billing)
- ✅ Backend config: infrastructure/terraform/backend.tf
- ✅ State files: dev/terraform.tfstate, staging/terraform.tfstate, prod/terraform.tfstate

### Pre-requisites for This Feature

**Feature 002 Status**: ✅ COMPLETE
- S3 bucket provisioned
- DynamoDB lock table created
- Backend configuration validated
- State files initialized per environment

**This feature (003) dependencies**:
- Use existing S3 bucket for state
- Use existing DynamoDB lock table
- Refer to S3 bucket ARN in IAM policy
- Reference DynamoDB table in terraform init

---

## T008: Research Findings Summary

### Architecture Overview

```
GitHub Actions Workflow (terraform-ci.yml)
  ↓
  OIDC Authentication (AWS STS)
  ↓
  IAM Roles (github-actions-role-{dev,staging,prod})
  ↓
  Terraform (IaC)
  ↓
  AWS Resources (Lambda, API Gateway, DynamoDB)
```

### Key Decisions for Implementation

**1. Authentication**: Use AWS OIDC instead of long-lived credentials
- ✅ Supports: aws-actions/configure-aws-credentials@v4
- ✅ Benefits: Short-lived tokens, audit trail, no secret rotation
- ⏱️ Setup time: ~5-10 minutes (AWS API + GitHub secrets)

**2. Approval Workflow**: Use GitHub Environment Protection Rules instead of manual approval actions
- ✅ Benefits: Native GitHub UI, team management, audit log
- ⏱️ Setup time: ~5 minutes (GitHub UI)

**3. Deploy Triggers**: Use PR labels instead of commit messages
- ✅ Benefits: Clear intent in UI, discoverable, easy to audit
- ⏱️ Implementation: Conditional job execution based on label detection

**4. Branch Strategy**: Use main as primary, keep develop for reference
- ✅ Benefits: Clear deployment source, no dangling references
- ⏱️ Implementation: Change branch triggers and conditions

**5. Timeouts**: Implement stage-specific timeouts
- ✅ Benefits: Early failure detection, resource efficiency
- ⏱️ Implementation: Add `timeout-minutes` per job

### Implementation Roadmap

**Phase 0** (This): Research complete ✅  
**Phase 1**: Foundational setup (docs, scripts, infrastructure)  
**Phase 2**: AWS OIDC setup (create provider, IAM roles)  
**Phase 3**: GitHub secrets (register repository secrets)  
**Phase 4**: Workflow fixes (update terraform-ci.yml)  
**Phase 5**: Environment deployment (test approval workflows)  
**Phase 6**: Error handling (logging, notifications)  
**Phase 7**: Testing & polish (comprehensive validation)

### MVP Completion Criteria (Phases 0-4)

- ✅ Research complete (Phase 0)
- Foundational infrastructure created (Phase 1)
- AWS OIDC provider configured (Phase 2)
- GitHub secrets registered (Phase 3)
- terraform-ci.yml updated for main branch with PR labels (Phase 4)

**Timeline**: 3-4 hours for MVP  
**Full Timeline**: 18-24 hours for all phases

---

## Assumptions Validated

✅ AWS account (446713282258) has admin access  
✅ GitHub organization has admin permissions  
✅ Feature 002 (Terraform backend) is complete  
✅ S3 and DynamoDB resources exist  
✅ No breaking changes to existing Terraform modules  

---

## Next Steps

→ Proceed to Phase 1: Foundational Setup  
→ Create documentation for OIDC setup guide  
→ Create automation scripts for provider registration  
→ Prepare GitHub environment configuration
