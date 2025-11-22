# GitHub Organization Permissions for GitHub Actions Deployment

**Purpose**: Document required GitHub Organization and Repository permissions for GitHub Actions CI/CD pipeline  
**Audience**: GitHub Organization Admins, Repository Maintainers  
**Status**: Phase 1 - T010 Documentation  

---

## Overview

GitHub Actions deployment automation requires specific permissions at both the Organization level and Repository level. This guide documents all necessary permissions to securely configure the CI/CD pipeline.

---

## Repository-Level Permissions Required

### 1. Secrets Management

**Location**: Settings → Secrets and Variables → Actions

**Required Permissions**:
- Repository Admin or higher can manage repository secrets
- GitHub Actions must have read access to secrets during workflow execution

**Secrets to Configure**:
```
AWS_ROLE_TO_ASSUME_DEV
AWS_ROLE_TO_ASSUME_STAGING
AWS_ROLE_TO_ASSUME_PROD
TF_STATE_BUCKET
TF_LOCK_TABLE
AWS_REGION (optional, can be hardcoded)
```

**Permission Check**:
```bash
# Run as organization admin
gh secret list --repo aki-motty/todo-copilot
```

---

### 2. Environments Configuration

**Location**: Settings → Environments

**Required Permissions**:
- Repository Admin to create and manage environments
- Environment Protection Rules require Admin access

**Environments to Create**:
1. `develop` (auto-deploy, no approvals)
2. `staging` (1-approval required)
3. `production` (2-approval required)

**Permission Verification**:
```bash
# List environments
gh api repos/aki-motty/todo-copilot/environments
```

---

### 3. Environment Protection Rules

**Location**: Settings → Environments → [environment name]

**Required Permissions**:
- Repository Admin to configure protection rules

**Configuration Needed**:

#### Staging Environment
- **Required Reviewers**: 1 approval minimum
- **Restrict who can review**: Optional (configure trusted team)
- **Deployment Branches**: main branch only
- **Prevent self-approval**: Recommended enabled

#### Production Environment
- **Required Reviewers**: 2 approvals minimum (from different people)
- **Restrict who can review**: Recommended (configure release team only)
- **Deployment Branches**: main branch only
- **Prevent self-approval**: Strongly recommended enabled

**CLI Configuration**:
```bash
# Staging (1-approval)
gh api repos/aki-motty/todo-copilot/environments/staging \
  -X PATCH \
  -f required_approval_count=1 \
  -f allowed_actions=all \
  -f prevent_self_review=true

# Production (2-approval)
gh api repos/aki-motty/todo-copilot/environments/production \
  -X PATCH \
  -f required_approval_count=2 \
  -f allowed_actions=all \
  -f prevent_self_review=true
```

---

### 4. Workflow Execution

**Location**: Settings → Actions → General

**Required Permissions**:
- Repository Admin to configure workflow permissions

**Recommended Settings**:
- ✅ **Allow all actions and reusable workflows**: Enabled
- ✅ **Actions permissions**: 
  - Local actions: Allowed
  - Third-party actions: Verified creators only (recommended)
- ✅ **Workflow permissions**: 
  - Read and write permissions: Recommended for deployment
  - Expire token: 24 hours recommended

**Configuration**:
```bash
# Set workflow permissions
gh api repos/aki-motty/todo-copilot \
  -X PATCH \
  -f "actions_workflow_permissions.default_workflow_permissions=write" \
  -f "actions_workflow_permissions.can_approve_pull_request_reviews=true"
```

---

### 5. Branch Protection Rules

**Location**: Settings → Branches → Branch Protection Rules

**Required Permissions**:
- Repository Admin to create and manage branch protection rules

**Main Branch Protection**:
- ✅ Require a pull request before merging
- ✅ Require status checks to pass before merging
  - Status checks: `terraform-validate`, `tests`, `security-scan`
- ✅ Require branches to be up to date before merging
- ✅ Require conversation resolution before merging
- ✅ Require signed commits: Optional but recommended
- ✅ Dismiss stale pull request approvals when new commits are pushed
- ✅ Require approval from code owners: Optional

**CLI Configuration**:
```bash
# Get main branch protection status
gh api repos/aki-motty/todo-copilot/branches/main/protection

# Update branch protection
gh api repos/aki-motty/todo-copilot/branches/main/protection \
  -X PUT \
  -f required_status_checks.strict=true \
  -f required_status_checks.contexts='["terraform-validate","tests","security-scan"]' \
  -f require_code_owner_reviews=false \
  -f dismiss_stale_reviews=true
```

---

## Organization-Level Permissions Required

### 1. OIDC Provider Access

**Permission**: Organization Owner or Admin

**Requirements**:
- Create and manage GitHub Organization OIDC provider (if organization-level setup)
- This is typically handled at repository level via GitHub OpenID Connect

**Verification**:
```bash
# Check OIDC configuration
gh api repos/aki-motty/todo-copilot/actions/oidc/customization/sub
```

---

### 2. Team-Based Approvals (For Production)

**Permission**: Organization Owner

**Configuration**:
- Create approval team (e.g., `@aki-motty/devops` or `@aki-motty/release`)
- Add team members for production approvals
- Restrict environment protection rules to specific teams

**Team Setup**:
```bash
# Create team (if not exists)
gh api orgs/aki-motty/teams \
  -X POST \
  -f name="devops" \
  -f description="DevOps team for production approvals"

# Add members to team
gh api orgs/aki-motty/teams/devops/memberships/username \
  -X PUT \
  -f role=member
```

---

### 3. Actions Billing & Limits

**Permission**: Organization Owner

**Verify**:
- GitHub Actions minutes allowance (private repo: 2,000 min/month free)
- Storage limits for artifacts and logs
- Monitor spending: Settings → Billing and Plans → Transactions

**Limits Configuration**:
```bash
# Check organization actions settings
gh api orgs/aki-motty/settings/actions
```

---

## User Permission Roles Summary

| Role | Repository Secret Mgmt | Environment Config | Branch Protection | Workflow Execution | OIDC Setup |
|------|----------------------|-------------------|------------------|------------------|----------|
| **Repository Owner** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Repository Admin** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Repository Maintainer** | ✅ | ✅ | ❌ | ✅ | ❌ |
| **Organization Owner** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Repository Collaborator** | ❌ | ❌ | ❌ | ✅ | ❌ |

---

## Minimal Permission Set (Principle of Least Privilege)

For teams implementing this CI/CD pipeline:

### DevOps Engineer (Setup & Maintenance)
- ✅ Repository Admin (for secrets, environments, workflows)
- ✅ Organization Admin (for OIDC, billing)
- ✅ Team ownership (for release team membership)

### Release Manager (Approvals)
- ✅ Environment approval reviewer (no repo admin needed)
- ✅ Members of staging/production approval teams

### Developer (Merge & Deploy)
- ✅ Repository Contributor (can trigger workflows via PR labels)
- ✅ Read access to workflow runs and logs

### CI/CD Service (GitHub Actions)
- ✅ `GITHUB_TOKEN` with read/write scope (auto-provided)
- ✅ AWS OIDC role assumption (configured in secrets)

---

## Pre-Implementation Checklist

Before implementing GitHub Actions deployment:

**Organization Admin**:
- [ ] Verify organization has GitHub Actions enabled
- [ ] Check Actions usage minutes available
- [ ] Confirm billing alerts configured (if applicable)

**Repository Admin**:
- [ ] Confirm repository admin access for current user
- [ ] Verify branch protection rules not blocking workflow PRs
- [ ] Check existing secrets don't conflict with new ones

**Team Setup**:
- [ ] Identify users for staging approval team (1+ members)
- [ ] Identify users for production approval team (2+ members)
- [ ] Verify team members have repository access

**AWS Setup**:
- [ ] AWS account owner ready for OIDC provider creation
- [ ] IAM permissions ready for role creation
- [ ] Verify AWS CLI access available

---

## Post-Implementation Verification

After configuration:

```bash
# Verify repository secrets registered
gh secret list --repo aki-motty/todo-copilot

# Verify environments created
gh api repos/aki-motty/todo-copilot/environments

# Verify branch protection
gh api repos/aki-motty/todo-copilot/branches/main/protection

# Verify actions enabled
gh api repos/aki-motty/todo-copilot/actions/permissions

# Check workflow runs
gh run list --repo aki-motty/todo-copilot --limit 5
```

---

## Troubleshooting Permission Issues

### Issue: "Permission denied" when accessing secrets
**Solution**: Ensure user has Repository Admin role or higher

### Issue: Environment protection rules not enforcing approvals
**Solution**: Verify environment protection rules configured correctly
```bash
gh api repos/aki-motty/todo-copilot/environments/production
```

### Issue: Workflow cannot read secrets
**Solution**: Check workflow permissions in repository settings
```bash
# Enable write permissions for workflows
gh api repos/aki-motty/todo-copilot \
  -X PATCH \
  -f actions_workflow_permissions.default_workflow_permissions=write
```

### Issue: Team members cannot see approval requests
**Solution**: Verify team members have repository access and environment access
```bash
# Check team repository access
gh api teams/aki-motty/devops/repos/aki-motty/todo-copilot
```

---

## References

- [GitHub Environments Documentation](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)
- [GitHub Actions Permissions](https://docs.github.com/en/actions/security-guides/automatic-token-authentication)
- [GitHub OpenID Connect](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)
- [GitHub Repository Roles](https://docs.github.com/en/organizations/managing-access-to-your-organizations-repositories/repository-roles-for-an-organization)

---

**Status**: ✅ T010 Complete  
**Created**: Phase 1 - Foundational Setup  
**Updated**: 2024-01-XX
