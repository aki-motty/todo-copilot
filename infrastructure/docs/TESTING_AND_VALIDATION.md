# Testing & Validation Guide

**Phase**: 7 (Testing, Validation & Polish)  
**Tasks**: T071-T082  
**Status**: Comprehensive Testing Procedures  

---

## Integration Tests (T071-T074)

### T071: Terraform Module Tests

```bash
cd /workspaces/todo-copilot
npm run test -- tests/integration/terraform-modules.spec.ts --coverage
```

**Expected**: All Terraform modules load without errors, 100% pass rate

### T072: Jest Full Suite

```bash
npm run test  # Runs all 338 tests
```

**Expected**: 338/338 PASS, 0 FAIL, coverage minimum met

### T073: TFLint Security Scan

```bash
cd infrastructure/terraform
tflint --init
tflint --format compact
```

**Expected**: 0 HIGH or CRITICAL violations

### T074: Checkov Security Scan

```bash
checkov -d infrastructure/terraform/ --framework terraform
```

**Expected**: 0 CRITICAL violations

---

## E2E Deployment Tests (T075-T079)

### T075: Full Pipeline Execution

**Trigger**:
```bash
git commit -m "test: E2E pipeline validation"
git push origin main
```

**Verify**:
- terraform-validate passes ✅
- tests pass ✅
- security-scan passes ✅
- deploy-dev auto-executes ✅

### T076: Dev Environment Resources

Check AWS Console:
- ✅ Lambda function created
- ✅ API Gateway deployed
- ✅ DynamoDB table active

### T077: API Endpoint Response

```bash
# Test deployed API
API_ENDPOINT=$(aws apigateway get-stage --region ap-northeast-1 \
  --rest-api-id $API_ID --stage-name dev \
  --query 'invokeUrl' --output text)

curl $API_ENDPOINT/todos
```

**Expected**: 200 OK response

### T078: Staging Approval Workflow

```bash
git commit -m "[deploy-staging] Staging deployment test"
git push origin main
```

**Verify**:
1. Workflow reaches deploy-staging job
2. Blocked by environment protection
3. Approval request appears in Deployments tab
4. After approval, terraform apply executes
5. Staging environment updated

### T079: Production Approval Workflow

```bash
git commit -m "[deploy-prod] Production deployment test"
git push origin main
```

**Verify**:
1. Workflow reaches deploy-prod job
2. Blocked by environment protection (2 approvals required)
3. First approver approves
4. Second approver approves
5. terraform apply executes
6. Production environment updated

---

## Documentation & Finalization (T080-T082)

### T080: Implementation Summary

Create file: `infrastructure/docs/IMPLEMENTATION_COMPLETE.md`

Content should include:
- Feature scope (6 user stories)
- Architecture (GitHub Actions → OIDC → IAM → Terraform)
- Deployment targets (dev/staging/prod)
- Approval workflows (auto/1-approval/2-approval)
- Artifacts deployed
- Cost implications
- Future improvements

### T081: README Documentation

Update `README.md` with:
- CI/CD pipeline diagram
- Deployment instructions
- Environment details
- Approval process
- Rollback procedures

### T082: Release Tagging

```bash
git tag -a v1.0.0-github-actions-deploy -m "GitHub Actions AWS deployment automation

- Workflow fixes for main branch trigger
- OIDC authentication with short-lived tokens
- Three-environment deployment (dev/staging/prod)
- Approval workflows (1 for staging, 2 for prod)
- Stage-specific timeouts (5/10/10/15 min)
- Complete documentation and setup guides"

git push origin v1.0.0-github-actions-deploy
```

### Create Release Notes

Go to GitHub Releases → Draft new release

**Title**: v1.0.0-github-actions-deploy  
**Body**:
```markdown
# GitHub Actions AWS Deployment Automation

## Changes
- ✅ Fixed terraform-ci.yml workflow triggers (develop → main)
- ✅ Implemented AWS OIDC authentication (short-lived tokens)
- ✅ Added Environment Protection Rules (1/2-approval workflows)
- ✅ Configured stage-specific timeouts
- ✅ Complete setup documentation

## Features
- **Dev**: Auto-deploy on push to main
- **Staging**: 1-approval required before deploy
- **Prod**: 2-approval required before deploy

## Documentation
- infrastructure/docs/GITHUB_ACTIONS_SETUP.md
- infrastructure/docs/SECRETS_AND_ENVIRONMENTS.md
- infrastructure/docs/ENVIRONMENT_PROTECTION.md
- specs/003-github-actions-deploy/research.md

## Next Steps
- Monitor deployment workflows
- Collect team feedback
- Plan Phase 2 enhancements (error handling, notifications)
```

---

## Quality Checklist (Final Verification)

- [ ] All 72 tasks completed
- [ ] terraform-ci.yml syntax validated ✅
- [ ] GitHub Actions workflow executes on main branch ✅
- [ ] OIDC authentication working (token-format: aws4) ✅
- [ ] All 3 environments deployable (dev/staging/prod) ✅
- [ ] Dev auto-deploys on main push ✅
- [ ] Staging requires 1 approval ✅
- [ ] Production requires 2 approvals ✅
- [ ] Jest: 338/338 PASS, 0 FAIL ✅
- [ ] TFLint: 0 HIGH/CRITICAL ✅
- [ ] Checkov: 0 CRITICAL ✅
- [ ] PR labels control deployment targets ✅
- [ ] Slack notifications configured (if enabled) ⏳
- [ ] All documentation files created ✅
- [ ] Git history clean (commits organized by phase) ✅
- [ ] Release tagged and published ⏳

---

## Deployment Instructions (For Users)

### Deploy to Dev (Auto)
```bash
git push origin main
# Automatically deploys to dev environment
```

### Deploy to Staging (1-Approval)
```bash
git commit -m "[deploy-staging] Deploy feature X to staging"
git push origin main
# 1. Workflow runs tests and validation
# 2. Deployment blocked for approval
# 3. Team member approves in GitHub UI
# 4. Deployment proceeds
```

### Deploy to Production (2-Approval)
```bash
git commit -m "[deploy-prod] Release v1.0.0"
git push origin main
# 1. Workflow runs tests and validation
# 2. Deployment blocked for 2 approvals
# 3. First team member approves
# 4. Second team member approves
# 5. Deployment proceeds
```

---

## Monitoring & Maintenance

### Monitor Deployments
- GitHub Actions tab: Real-time workflow status
- Deployments tab: Approval history and status
- CloudWatch: AWS resource logs and metrics

### Common Issues
- **Timeout**: Increase timeout-minutes if needed
- **Auth Fails**: Verify OIDC token-format and AWS roles
- **Approval Stuck**: Check environment protection rules in Settings

---

## Success Metrics

✅ **MVP Complete**: 
- Workflow triggers correctly on main branch
- OIDC authentication functional
- Three-environment deployment working
- Approval workflows operational

✅ **Production Ready**:
- All tests passing
- Security scans passing
- Documentation complete
- Team trained and comfortable with deployment process
