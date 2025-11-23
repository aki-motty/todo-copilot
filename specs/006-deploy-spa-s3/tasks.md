# Tasks: Deploy SPA to S3

**Input**: Design documents from `/specs/006-deploy-spa-s3/`
**Status**: Phase 1 ⏳ Pending | Phase 2 ⏳ Pending | Phase 3 ⏳ Pending | Phase 4 ⏳ Pending
**Total Tasks**: 18 tasks across 5 phases
**Dependencies**: Feature 002 (Terraform infrastructure) ✅ COMPLETE, Feature 003 (GitHub Actions) ✅ COMPLETE

**Phase Completion Summary**:
- ✅ Phase 1 (T001): Setup
- ✅ Phase 2 (T002-T007): Foundational Terraform Module
- ⏳ Phase 3 (T008-T012): User Story 1 (Access Application)
- ⏳ Phase 4 (T013-T016): User Story 2 (Automated Deployment)
- ⏳ Phase 5 (T017-T018): Polish

---

## Overview: Task Organization by User Story

This feature is organized **by user story to enable independent implementation**:

| Phase | User Story | Focus | Tasks | Duration | Status |
|-------|-----------|-------|-------|----------|--------|
| **Phase 1** | Setup | Project Structure | T001 | 5 min | ✅ COMPLETE |
| **Phase 2** | Foundational | Terraform Module | T002-T007 | 1 hour | ✅ COMPLETE |
| **Phase 3** | US1 | Access Application | T008-T012 | 1 hour | ⏳ Pending |
| **Phase 4** | US2 | Automated Deployment | T013-T016 | 1 hour | ⏳ Pending |
| **Phase 5** | Polish | Documentation | T017-T018 | 30 min | ⏳ Pending |

**MVP Scope** (Phases 1-3): Infrastructure deployed and accessible manually.

---

## Phase 1: Setup

**Status**: ✅ COMPLETE

**Goal**: Prepare the project structure for the new Terraform module.

**Independent Test**: Directory exists.

- [X] T001 Create directory structure for frontend module in `infrastructure/terraform/modules/frontend`

---

## Phase 2: Foundational (Terraform Module)

**Status**: ✅ COMPLETE

**Goal**: Implement the reusable Terraform module for S3 and CloudFront.

**Independent Test**: `terraform validate` passes within the module directory.

- [X] T002 [P] Define variables in `infrastructure/terraform/modules/frontend/variables.tf` (environment, project_name, etc.)
- [X] T003 [P] Define outputs in `infrastructure/terraform/modules/frontend/outputs.tf` (bucket_name, cloudfront_id, cloudfront_url)
- [X] T004 Define S3 bucket resource in `infrastructure/terraform/modules/frontend/main.tf` (website hosting, versioning)
- [X] T005 Define CloudFront Origin Access Control (OAC) in `infrastructure/terraform/modules/frontend/main.tf`
- [X] T006 Define CloudFront Distribution in `infrastructure/terraform/modules/frontend/main.tf` (HTTPS, SPA routing, Caching)
- [X] T007 Define S3 Bucket Policy in `infrastructure/terraform/modules/frontend/main.tf` (Allow OAC access)

---

## Phase 3: User Story 1 (Access Application via Public URL)

**Status**: ✅ COMPLETE

**Goal**: Deploy the infrastructure and verify public access.

**Independent Test**: `terraform apply` succeeds, and the CloudFront URL returns a response (or 403/404 handled correctly).

- [X] T008 [US1] Instantiate frontend module in `infrastructure/terraform/main.tf`
- [X] T009 [US1] Expose module outputs in `infrastructure/terraform/outputs.tf`
- [X] T010 [US1] Run `terraform validate` in `infrastructure/terraform` to ensure configuration is valid
- [X] T011 [US1] Run `terraform plan` to verify resource creation plan
- [X] T012 [US1] Manual verification: Deploy and access sample file via CloudFront

---

## Phase 4: User Story 2 (Automated Frontend Deployment)

**Status**: ✅ COMPLETE

**Goal**: Automate the build and deploy process in GitHub Actions.

**Independent Test**: Pushing to main triggers the workflow, builds the frontend, and syncs to S3.

- [X] T013 [US2] Update `.github/workflows/terraform-ci.yml` to capture API URL output from Terraform
- [X] T014 [US2] Update `.github/workflows/terraform-ci.yml` to build frontend assets (injecting `VITE_API_URL`)
- [X] T015 [US2] Update `.github/workflows/terraform-ci.yml` to sync assets to S3 bucket
- [X] T016 [US2] Update `.github/workflows/terraform-ci.yml` to invalidate CloudFront cache

---

## Phase 5: Polish & Cross-Cutting Concerns

**Status**: ✅ COMPLETE

**Goal**: Documentation and final cleanup.

**Independent Test**: Documentation is accurate and accessible.

- [X] T017 Update documentation (README.md, etc.)
- [X] T018 Final cleanup

---

## Task Dependency Graph

```
Phase 1 (Setup)
└─ T001
    │
Phase 2 (Terraform Module)
    ├─ T002 (Variables)
    ├─ T003 (Outputs)
    └─ T004-T007 (Resources)
        │
Phase 3 (US1 - Access)
        └─ T008-T012 (Integration & Deploy)
            │
Phase 4 (US2 - Automation)
            └─ T013-T016 (CI/CD)
                │
Phase 5 (Polish)
                └─ T017-T018 (Docs)
```

**Critical Path**: Phase 1 -> Phase 2 -> Phase 3 -> Phase 4 -> Phase 5

**Parallel Opportunities**:
- Within Phase 2: T002, T003, and T004-T007 (drafting) can be done in parallel, though they are in the same file.
- Phase 5 can start as soon as Phase 3 is done.

---

## Implementation Strategy

1.  **Infrastructure First**: We must establish the S3 bucket and CloudFront distribution before we can deploy anything to it.
2.  **Manual Verification**: Before automating, we will manually verify that the infrastructure works by uploading a dummy file.
3.  **Automation Last**: Once the target exists and is verified, we update the pipeline to fill it.
