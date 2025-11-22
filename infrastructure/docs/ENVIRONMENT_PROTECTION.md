# GitHub Environment Protection Rules

**Phase**: 5 (Environment-Based Deployment Pipeline)  
**Tasks**: T057-T058  
**Status**: Configuration Guide  

---

## Overview

GitHub Environment Protection Rules replace deprecated manual approval actions. They provide:
- ✅ Native GitHub UI for approval management
- ✅ Team-based reviewer requirements
- ✅ Branch restrictions for deployment
- ✅ Wait timer before auto-deployment (optional)
- ✅ Audit trail in repository history

---

## Staging Environment Configuration (T057)

### Setup Steps

1. **Navigate to Environment Settings**:
   - Repository → Settings → Environments → staging

2. **Enable Protection Rules**:
   - Click "Add protection rule"

3. **Configure Required Reviewers**:
   - Check: "Require reviewers"
   - Set minimum approvals to: **1**
   - Optionally restrict to specific users/teams

4. **Restrict Deployment Branches**:
   - Check: "Deployment branches and tags"
   - Select: "Protected branches"
   - Click "Add protection rule" → Select "main"

5. **Optional: Wait Timer**:
   - Wait timer: 0 minutes (no delay for staging)

6. **Save Configuration**

### Workflow Integration

When `environment: staging` is set in workflow:
```yaml
deploy-staging:
  environment:
    name: staging
  if: github.ref == 'refs/heads/main'
```

**Activation**:
1. Job reaches `environment: staging` step
2. GitHub enforces protection rules
3. Creates deployment request (visible in deployments tab)
4. **Required**: 1 human approval in GitHub UI
5. After approval: Job continues and applies Terraform

---

## Production Environment Configuration (T058)

### Setup Steps

1. **Navigate to Environment Settings**:
   - Repository → Settings → Environments → production

2. **Enable Protection Rules**:
   - Click "Add protection rule"

3. **Configure Required Reviewers**:
   - Check: "Require reviewers"
   - Set minimum approvals to: **2**
   - Optionally restrict to separate teams:
     - Approvers 1: DevOps team
     - Approvers 2: Security team

4. **Restrict Deployment Branches**:
   - Check: "Deployment branches and tags"
   - Select: "Protected branches"
   - Click "Add protection rule" → Select "main"

5. **Optional: Wait Timer**:
   - Wait timer: 0 minutes (can set to 24h for prod safety)

6. **Save Configuration**

### Workflow Integration

```yaml
deploy-prod:
  environment:
    name: production
  if: github.ref == 'refs/heads/main'
```

**Activation**:
1. Job reaches `environment: production` step
2. GitHub enforces protection rules
3. Creates deployment request
4. **Required**: 2 separate human approvals
5. After both approvals: Job continues and applies Terraform

---

## Approval Workflow for Developers

### Staging Deployment Request

**Scenario**: Developer pushes to main with [deploy-staging] flag

```bash
# Trigger staging deployment
git commit -m "[deploy-staging] Deploy feature to staging"
git push origin main
```

**GitHub Workflow**:
1. ✅ Terraform validate, test, security-scan pass
2. ⏸️ **WAITING FOR APPROVAL**: Deployment blocked at `environment: staging`
3. DevOps engineer reviews deployment request:
   - Go to Repository → Deployments → Pending deployments
   - Click "Review deployments"
   - Choose "Approve and deploy" or "Reject"
4. ✅ If approved: Terraform apply executes
5. ✅ Staging environment updated

### Production Deployment Request

**Scenario**: Developer pushes to main with [deploy-prod] flag

```bash
# Trigger production deployment
git commit -m "[deploy-prod] Release v1.0.0 to production"
git push origin main
```

**GitHub Workflow**:
1. ✅ Terraform validate, test, security-scan pass
2. ⏸️ **WAITING FOR 2 APPROVALS**: Deployment blocked
3. First approver (DevOps):
   - Go to Repository → Deployments → Pending deployments
   - Click "Review deployments" → "Approve and deploy"
4. Second approver (Security):
   - Receives notification
   - Reviews and approves in same interface
5. ✅ After 2nd approval: Terraform apply executes
6. ✅ Production environment updated

---

## Manual Deployment (Workflow Dispatch)

### Trigger Manual Deployment

Via GitHub Actions UI:
1. Go to Repository → Actions → Terraform CI/CD
2. Click "Run workflow"
3. Select environment: dev / staging / prod
4. Click "Run workflow"

**Result**: Workflow executes for selected environment (no approval needed for dev)

---

## Comparing Old vs New Approval System

| Aspect | Old (Manual Action) | New (Env Protection) |
|--------|-------|----------|
| **UI** | Requires checking workflow logs | Native GitHub Deployments tab |
| **Approvers** | String-based (unreliable) | GitHub teams/users (reliable) |
| **Audit Trail** | GitHub issue comments | GitHub Deployments history |
| **Multiple Approvals** | Custom logic needed | Built-in support |
| **Branch Restrictions** | No native support | Built-in support |
| **Notifications** | Manual polling | GitHub notifications |
| **Maintenance** | Action versions | None (built-in) |

**Benefits of new system**:
- ✅ Reduced maintenance burden
- ✅ Better audit trail
- ✅ Native GitHub experience
- ✅ Scalable for teams
- ✅ Branch protection integration

---

## Environment Status Checks

### View Deployment History

```bash
# List all deployments
gh deployment list -r aki-motty/todo-copilot

# Get deployment status
gh deployment status <deployment-id>

# Cancel deployment
gh deployment cancel <deployment-id>
```

### Monitor via GitHub UI

1. Repository → Deployments tab
2. View all environment deployments
3. Click deployment to see job logs
4. Review approvers and timestamps

---

## Troubleshooting

### Deployment Blocked - Can't Find Approval UI

**Solution**:
1. Go to Repository → Deployments
2. Look for "Pending deployments" section
3. If not visible, expand "Show more" or refresh page

### Approval Button Disabled

**Cause**: User is not authorized to approve

**Solution**:
- Check GitHub team membership
- Verify user has "Review deployments" permission
- Contact repository admin for access

### Deployment Timeout

**Default**: GitHub allows 30-day wait for deployment approval

**Solution**:
- Keep deployments pending for at most 30 days
- Cancel and retry if needed
- Increase wait timer if necessary

### Wrong Environment Triggered

**Solution**:
- Verify commit message matches: `[deploy-staging]` or `[deploy-prod]`
- Check branch is `main`
- Verify GitHub Actions workflow conditions

---

## Best Practices

### 1. Team-Based Approvals

```
Staging:
  - Approvers: Any team member
  - Min approvals: 1

Production:
  - Approvers: DevOps + Security teams
  - Min approvals: 2 (one from each team)
```

### 2. Documentation

Add to team runbook:
- How to request deployment
- How to approve deployment
- How to cancel deployment
- Rollback procedures

### 3. Monitoring

Set up alerts for:
- Pending deployments (notify approvers)
- Failed deployments (notify team)
- Deployment duration (optimize timeouts)

### 4. Testing

Before production deployment:
- ✅ Test in dev environment (auto-deploy)
- ✅ Test approval workflow in staging
- ✅ Test with actual team approvers

---

## Verification Checklist (T057-T058)

### Staging Environment

- [ ] Staging environment created in Settings → Environments
- [ ] "Require reviewers" enabled: 1 approval
- [ ] "Deployment branches and tags" enabled: main only
- [ ] No wait timer (or configured)
- [ ] Can manually test approval workflow

### Production Environment

- [ ] Production environment created in Settings → Environments
- [ ] "Require reviewers" enabled: 2 approvals
- [ ] Approvers restricted to appropriate teams
- [ ] "Deployment branches and tags" enabled: main only
- [ ] No wait timer (or configured)
- [ ] Can manually test approval workflow with 2 approvers

### Workflow Integration

- [ ] `environment: staging` in deploy-staging job
- [ ] `environment: production` in deploy-prod job
- [ ] Jobs properly gated on approval
- [ ] Deployment history visible in GitHub UI

---

## Next Phase

→ **Phase 7**: Testing & Validation (T071-T082)
- Run full pipeline tests
- Verify both auto-deploy (dev) and approval (staging/prod) workflows
- Document final implementation
