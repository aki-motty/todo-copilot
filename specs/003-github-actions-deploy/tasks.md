# Tasks: GitHub Actions AWS Deployment Automation

**Input**: Design documents from `/specs/003-github-actions-deploy/`
**Status**: Ready for implementation (Phase 0: Research → Phase 7: Polish)
**Total Tasks**: 72 tasks across 8 phases
**Dependencies**: Feature 002 (Terraform infrastructure, S3 state, DynamoDB lock) MUST be complete first

---

## Overview: Task Organization by Phase

This feature is organized **by user story to enable independent implementation**:

| Phase | Focus | User Stories | Tasks | Duration |
|-------|-------|-------------|-------|----------|
| **Phase 0** | Research | — | T001-T008 | 4-6 hours |
| **Phase 1** | Foundational Setup | — | T009-T020 | 2-3 hours |
| **Phase 2** | AWS OIDC Setup | US1 | T021-T033 | 3-4 hours |
| **Phase 3** | GitHub Secrets | US2 | T034-T045 | 1-2 hours |
| **Phase 4** | Workflow Fixes | US3 | T046-T056 | 2-3 hours |
| **Phase 5** | Environment Deploy | US4 | T057-T065 | 3-4 hours |
| **Phase 6** | Error Handling | US5 | T066-T070 | 2-3 hours |
| **Phase 7** | Testing & Polish | US6 | T071-T072 | 2-3 hours |

**MVP Scope** (Phases 0-4): GitHub Actions ワークフロー修正完了 (develop→main, OIDC, secrets最適化)

---

## Phase 0: Research & Analysis

**Purpose**: Gather information, validate assumptions, establish deployment strategy

**Independent Test**: None (research phase)

- [x] T001 Research GitHub Actions OIDC provider integration patterns (AWS docs, example repos)
- [x] T002 Document AWS OIDC setup procedure for `sub:repo:aki-motty/todo-copilot:*` claim mapping
- [x] T003 [P] Audit current terraform-ci.yml and identify all failing points (branch refs, OIDC, env blocks)
- [x] T004 [P] Research GitHub Environment Protection Rules configuration (UI-based approval workflows)
- [x] T005 [P] Document stage-specific timeout recommendations (validate/test/deploy phases)
- [x] T006 [P] Research TFLint and Checkov integration best practices for GitHub Actions
- [x] T007 Review existing S3 backend and DynamoDB lock configuration (feature 002 validation)
- [x] T008 Create research findings summary document (research.md) ✅

**Checkpoint**: Research complete, deployment architecture validated ✅

---

## Phase 1: Foundational Setup (Blocking Prerequisites)

**Purpose**: Establish shared infrastructure, environment variables, GitHub configuration

**⚠️ CRITICAL**: All following phases depend on Phase 1 completion

**Independent Test**: GitHub repository settings configured, AWS account permissions verified, no secrets or environment conflicts

- [ ] T009 [P] Create infrastructure/docs/GITHUB_ACTIONS_SETUP.md with complete OIDC provider setup guide
- [ ] T010 [P] Document required GitHub Organization permissions (admin for secrets, environment settings)
- [ ] T011 Create infrastructure/docs/SECRETS_AND_ENVIRONMENTS.md defining all required repository secrets
- [ ] T012 [P] Validate that Feature 002 (Terraform backend) is fully deployed (S3 bucket, DynamoDB lock table exist)
- [ ] T013 [P] Create infrastructure/scripts/setup-oidc.sh script (AWS OIDC provider creation automation)
- [ ] T014 [P] Create infrastructure/scripts/setup-github-env.sh script (GitHub environment creation automation)
- [ ] T015 Create GitHub Environment Protection Rules documentation in infrastructure/docs/ENVIRONMENT_PROTECTION.md
- [ ] T016 [P] Add AWS IAM role creation script (infrastructure/terraform/modules/iam/github-actions-role.tf)
- [ ] T017 [P] Update infrastructure/docs/QUICKSTART_DEPLOYMENT.md with full setup walkthrough
- [ ] T018 Add architecture diagram (infrastructure/docs/github-actions-architecture.md) showing flow: GitHub Actions → OIDC → IAM → Terraform
- [ ] T019 Create terraform/backend-config/[env].tfbackend files (if needed for backend initialization)
- [ ] T020 Validate all terraform modules load correctly (terraform validate in infrastructure/terraform/)

**Checkpoint**: Foundation ready, AWS OIDC and GitHub environment infrastructure prepared

---

## Phase 2: AWS OIDC Authentication Setup (User Story 1 - P1)

**Goal**: Establish secure AWS OIDC authentication for GitHub Actions, eliminating long-lived secrets

**Independent Test**: GitHub Actions successfully authenticates to AWS without hardcoded credentials, STS token generation confirmed

### Implementation for User Story 1

- [ ] T021 [P] [US1] Execute infrastructure/scripts/setup-oidc.sh to register GitHub OIDC provider in AWS account
- [ ] T022 [P] [US1] Create IAM role (role-to-assume-dev) with trust policy for GitHub OIDC provider
- [ ] T023 [P] [US1] Create IAM role (role-to-assume-staging) with trust policy for GitHub OIDC provider
- [ ] T024 [P] [US1] Create IAM role (role-to-assume-prod) with trust policy for GitHub OIDC provider
- [ ] T025 [US1] Attach inline policies to dev role: Terraform execution permissions, S3 state access, DynamoDB lock access
- [ ] T026 [US1] Attach inline policies to staging role: Terraform execution permissions, S3 state access, DynamoDB lock access
- [ ] T027 [US1] Attach inline policies to prod role: Terraform execution permissions, S3 state access, DynamoDB lock access
- [ ] T028 [P] [US1] Document OIDC trust relationship configuration in infrastructure/docs/GITHUB_ACTIONS_SETUP.md
- [ ] T029 [US1] Test OIDC authentication: Update terraform-ci.yml validate job to use `aws-actions/configure-aws-credentials@v4` with OIDC
- [ ] T030 [US1] Verify AWS CLI commands run successfully without explicit credentials in terraform-ci.yml
- [ ] T031 [P] [US1] Create test script (tests/integration/test-oidc-auth.sh) to validate OIDC token generation
- [ ] T032 [US1] Document OIDC troubleshooting guide (infrastructure/docs/OIDC_TROUBLESHOOTING.md)
- [ ] T033 [US1] Create backup IAM policy files (infrastructure/terraform/modules/iam/github-actions-policies.json) for reference

**Checkpoint**: AWS OIDC authentication configured, GitHub Actions can authenticate to AWS, no long-lived secrets required

---

## Phase 3: GitHub Secrets Optimization (User Story 2 - P1)

**Goal**: Minimize and properly configure GitHub repository secrets for environment-specific deployments

**Independent Test**: All required secrets registered in GitHub, accessible in workflow, no secrets appear in logs, environment-specific secret usage correct

### Implementation for User Story 2

- [ ] T034 [P] [US2] Register GitHub repository secret: `AWS_ROLE_TO_ASSUME_DEV` (ARN from phase 2)
- [ ] T035 [P] [US2] Register GitHub repository secret: `AWS_ROLE_TO_ASSUME_STAGING` (ARN from phase 2)
- [ ] T036 [P] [US2] Register GitHub repository secret: `AWS_ROLE_TO_ASSUME_PROD` (ARN from phase 2)
- [ ] T037 [P] [US2] Register GitHub repository secret: `TF_STATE_BUCKET` (S3 bucket name from feature 002)
- [ ] T038 [P] [US2] Register GitHub repository secret: `TF_LOCK_TABLE` (DynamoDB table name from feature 002)
- [ ] T039 [P] [US2] Register GitHub repository secret: `AWS_REGION` (or hardcode in terraform-ci.yml: ap-northeast-1)
- [ ] T040 [US2] Create GitHub environment `develop` (for verification, no approvals needed)
- [ ] T041 [US2] Create GitHub environment `staging` with 1-approval requirement
- [ ] T042 [US2] Create GitHub environment `prod` with 2-approval requirement (separate teams/approvers)
- [ ] T043 [P] [US2] Set environment-specific secret overrides (if any, e.g., TF_VARS per environment)
- [ ] T044 [US2] Audit GitHub secrets for any leaked information (check all environments)
- [ ] T045 [US2] Document secrets rotation policy (quarterly rotation recommended for backup AWS keys if used)

**Checkpoint**: GitHub secrets configured, environments created, no hardcoded credentials in repository

---

## Phase 4: GitHub Actions Workflow Fixes (User Story 3 - P1)

**Goal**: Fix broken terraform-ci.yml workflow, establish main branch trigger, implement PR label-based deploy control

**Independent Test**: terraform-ci.yml passes YAML validation, main branch triggers correctly, PR labels control deployment targets

### Implementation for User Story 3

- [x] T046 [P] [US3] Update .github/workflows/terraform-ci.yml: Change `on.push.branches` from `develop` to `[main]` ✅
- [x] T047 [P] [US3] Add pull_request trigger configuration for PR validation (validate/test/security-scan, no deploy) ✅
- [x] T048 [P] [US3] Remove deprecated `trstringer/manual-approval@v1` action, prepare for Environment Protection Rules ✅
- [x] T049 [P] [US3] Add label detection logic: Check for `deploy-staging` and `deploy-prod` labels in workflow ✅
- [x] T050 [US3] Implement conditional job execution based on labels (deploy-staging → staging job, deploy-prod → prod job) ✅
- [x] T051 [P] [US3] Add `workflow_dispatch` manual trigger option with environment parameter selection ✅
- [x] T052 [P] [US3] Update terraform-ci.yml `configure-aws-credentials@v4` to use OIDC: `role-to-assume: ${{ secrets.AWS_ROLE_TO_ASSUME_DEV }}`, `token-format: aws4` ✅
- [x] T053 [US3] Fix environment block definitions in terraform-ci.yml: Add `environment: develop/staging/production` ✅
- [x] T054 [P] [US3] Set stage-specific job timeouts: validate (timeout-minutes: 5), test (10), security-scan (10), deploy (15) ✅
- [x] T055 [P] [US3] Remove `terraform_wrapper: false` inconsistency, set to `false` for all terraform setup steps ✅
- [ ] T056 [US3] Validate terraform-ci.yml syntax with `github-super-linter` or `actionlint` tool

**Checkpoint**: terraform-ci.yml syntax correct, main branch trigger working, PR labels implemented, OIDC authentication integrated

---

## Phase 5: Environment-Based Deployment Pipeline (User Story 4 - P2)

**Goal**: Establish dev auto-deploy, staging/prod manual approval workflows with GitHub Environment Protection Rules

**Independent Test**: Dev deploys automatically, staging/prod require approval, AWS resources created per environment, no failed deployments

### Implementation for User Story 4

- [ ] T057 [P] [US4] Configure GitHub Environment Protection Rules for `staging`: Minimum 1 approval, branch restrictions (main only)
- [ ] T058 [P] [US4] Configure GitHub Environment Protection Rules for `prod`: Minimum 2 approvals, separate approver teams, branch restrictions (main only)
- [ ] T059 [P] [US4] Create deploy-staging conditional in terraform-ci.yml: `if: contains(github.event.pull_request.labels.*.name, 'deploy-staging')`
- [ ] T060 [P] [US4] Create deploy-prod conditional in terraform-ci.yml: `if: contains(github.event.pull_request.labels.*.name, 'deploy-prod')`
- [ ] T061 [US4] Update Terraform variables for environment selection (infrastructure/terraform/variables.tf: var.environment)
- [ ] T062 [US4] Create AWS deployment status check in terraform-ci.yml (verify resources ACTIVE after apply)
- [ ] T063 [P] [US4] Add GitHub Issue notification step for approval workflow (ping reviewers in staging/prod jobs)
- [ ] T064 [P] [US4] Create rollback plan documentation (infrastructure/docs/DEPLOYMENT_ROLLBACK.md)
- [ ] T065 [US4] Execute smoke test deployment in dev environment (terraform apply with validation)

**Checkpoint**: Environment Protection Rules configured, deployment pipeline operational (dev auto → staging approval → prod approval)

---

## Phase 6: Error Handling & Observability (User Story 5 - P2)

**Goal**: Improve error reporting, add logging, failure notifications, artifact preservation

**Independent Test**: Intentional error cases trigger proper error handling, Slack notifications sent, logs/artifacts preserved

### Implementation for User Story 5

- [ ] T066 [P] [US5] Add detailed error logging in terraform-ci.yml: `terraform validate` failures with error output to GitHub issue
- [ ] T067 [P] [US5] Implement `continue-on-error: true` for non-critical jobs (security-scan), alert-only behavior
- [ ] T068 [US5] Add Slack notification step for workflow failures (optional, requires SLACK_WEBHOOK_URL secret)
- [ ] T069 [P] [US5] Upload terraform logs as workflow artifacts (tfplan, apply output) for 90-day retention
- [ ] T070 [US5] Create error handling guide (infrastructure/docs/WORKFLOW_TROUBLESHOOTING.md) with common failure scenarios

**Checkpoint**: Error reporting improved, observability in place, failure notifications configured

---

## Phase 7: Testing, Validation & Polish (User Story 6 - P3)

**Goal**: Comprehensive testing of entire CI/CD pipeline, integration validation, documentation completion

**Independent Test**: Full pipeline execution (validate → test → security-scan → deploy-dev) succeeds 100%, resources deployed successfully, API responds

### Integration & E2E Tests for User Story 6

- [ ] T071 [P] [US6] Run integration test: `npm run test:terraform-modules` (validates all Terraform modules load, syntax correct)
- [ ] T072 [P] [US6] Run integration test: `npm run test` (Jest suite: 338/338 tests pass, 100% coverage minimum)
- [ ] T073 [P] [US6] Run security scan: `tflint infrastructure/terraform/` (no HIGH/CRITICAL violations)
- [ ] T074 [P] [US6] Run security scan: `checkov -d infrastructure/terraform/ --framework terraform` (no CRITICAL violations)
- [ ] T075 [P] [US6] Run E2E test: Push to main branch, validate GitHub Actions workflow executes from start to finish
- [ ] T076 [US6] Verify dev environment deployment: Check AWS console for Lambda, API Gateway, DynamoDB resources
- [ ] T077 [P] [US6] Verify API endpoint response from deployed dev environment (curl or Playwright test)
- [ ] T078 [P] [US6] Test staging approval workflow: Add `deploy-staging` label to PR, merge, verify approval notification, approve, verify deploy
- [ ] T079 [P] [US6] Test prod approval workflow: Add `deploy-prod` label to PR, merge, verify 2-approval requirement, approve both, verify deploy
- [ ] T080 [US6] Create final implementation summary (infrastructure/docs/IMPLEMENTATION_COMPLETE.md)
- [ ] T081 [P] [US6] Update main README.md with CI/CD pipeline diagram and deployment instructions
- [ ] T082 [US6] Tag repository with release version (v1.0.0-github-actions-deploy) and create GitHub Release notes

**Checkpoint**: Full pipeline tested and working, documentation complete, ready for production use

---

## Additional Tasks: Documentation & Knowledge Transfer

**Optional but recommended**:

- [ ] T083 [P] Create video walkthrough of GitHub Actions deployment process (optional, for team knowledge sharing)
- [ ] T084 Create runbook for deployment emergency procedures (rollback, recovery)
- [ ] T085 [P] Add GitHub Actions status badge to main README (build status, passing/failing indicator)

---

## Task Dependency Graph

```
Phase 0 (Research)
  ↓
Phase 1 (Foundational Setup) ← BLOCKING - must complete before US1-US6
  ├→ Phase 2 (OIDC Setup / US1) ← Required before Phase 3
  │   ├→ Phase 3 (GitHub Secrets / US2) ← Required before Phase 4
  │   └→ Phase 4 (Workflow Fixes / US3) ← Required before Phases 5-6
  │       ├→ Phase 5 (Environment Deploy / US4) ← Can parallel with Phase 6
  │       └→ Phase 5 (Error Handling / US5) ← Can parallel with Phase 5
  │           ↓
  └→ Phase 7 (Testing & Polish / US6) ← Final validation after all phases
```

**Critical Path**: Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 7  
**Parallel Opportunities**: 
- Phase 2 (OIDC setup) can run in parallel with Phase 3 (Secrets) after Phase 1
- Phase 5 (Deploy pipeline) and Phase 6 (Error handling) can run in parallel
- Within each phase, [P] marked tasks can run simultaneously

---

## Execution Strategy: MVP-First Delivery

**MVP Scope** (Minimum Viable Product - 3-4 hours):
- Phases 0-4 only (T001-T056)
- Result: terraform-ci.yml fully functional, OIDC configured, secrets optimized, PR labels working
- NOT INCLUDED: Error handling (Phase 6), comprehensive testing (Phase 7)

**Full Feature** (All phases, 18-24 hours):
- Phases 0-7 (T001-T085)
- Result: Production-ready CI/CD pipeline with full observability, error handling, documentation

**Recommended Execution Timeline**:
1. Day 1 (8 hours): Phases 0-3 (Research, foundational setup, OIDC, secrets)
2. Day 2 (6 hours): Phases 4-5 (Workflow fixes, environment deploy)
3. Day 3 (4 hours): Phases 6-7 (Error handling, testing, polish)

---

## Quality Checklist (Post-Completion)

- [ ] All 72 tasks completed
- [ ] terraform-ci.yml syntax validated
- [ ] GitHub Actions workflow executes successfully on main branch
- [ ] OIDC authentication working (AWS CLI commands successful without secrets)
- [ ] All 3 environments (dev/staging/prod) deployable
- [ ] Dev deploys automatically, staging/prod require approval
- [ ] Test coverage: Jest 338/338 PASS, 0 FAIL
- [ ] Security scans: TFLint 0 HIGH/CRITICAL, Checkov 0 CRITICAL
- [ ] PR labels control deployment targets correctly
- [ ] Slack notifications (if configured) send on workflow events
- [ ] Workflow execution time < 15 minutes per environment
- [ ] All documentation files created (OIDC_SETUP, SECRETS, ENVIRONMENT_PROTECTION, etc.)
- [ ] Git history clean (commits organized by phase)
- [ ] Ready for production merge to main branch
