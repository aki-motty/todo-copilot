# Tasks: Fix GitHub Actions Workflows

**Input**: Design documents from `/specs/005-fix-github-actions/`
**Status**: Phase 1 ✅ COMPLETE | Phase 3 ✅ COMPLETE | Phase 4 ✅ COMPLETE
**Total Tasks**: 5 tasks across 4 phases
**Dependencies**: None

**Phase Completion Summary**:
- ✅ Phase 1 (T001): Setup
- ✅ Phase 3 (T002): User Story 1 - Reliable Deployment
- ✅ Phase 4 (T003): User Story 2 - Format Check
- ⏳ Phase 5 (T004-T005): Verification

---

## Overview: Task Organization by User Story

This feature is organized **by user story to enable independent implementation**:

| Phase | User Story | Focus | Tasks | Duration | Status |
|-------|-----------|-------|-------|----------|--------|
| **Phase 1** | — | Setup | T001 | 5 min | ✅ COMPLETE |
| **Phase 3** | US1 | Reliable Deployment | T002 | 15 min | ✅ COMPLETE |
| **Phase 4** | US2 | Format Check | T003 | 10 min | ✅ COMPLETE |
| **Phase 5** | — | Verification | T004-T005 | 20 min | ⏳ Pending |

**MVP Scope**: All phases are required for the fix.

---

## Phase 1: Setup

**Status**: ✅ COMPLETE

**Goal**: Ensure local environment is ready for infrastructure updates.

- [X] T001 Verify Terraform version matches CI (1.5.0) in local environment

---

## Phase 2: Foundational Tasks

**Status**: ✅ Skipped (No blocking dependencies)

---

## Phase 3: Reliable Deployment Pipeline (User Story 1)

**Status**: ✅ COMPLETE

**Goal**: Ensure "Deploy to Dev" triggers on all infrastructure changes.

**Independent Test**: Push a change to `infrastructure/lambda/` and verify workflow triggers.

### Workflow Configuration

- [X] T002 [US1] Update `on.push.paths` and `on.pull_request.paths` in `.github/workflows/terraform-ci.yml` to include `infrastructure/**`

---

## Phase 4: Infrastructure Code Formatting (User Story 2)

**Status**: ✅ COMPLETE

**Goal**: Fix failing Terraform format checks in CI.

**Independent Test**: Run `terraform fmt -check -recursive` locally and verify it passes.

### Formatting Fixes

- [X] T003 [P] [US2] Run `terraform fmt -recursive infrastructure/terraform` to fix formatting in `infrastructure/terraform/modules/compute/main.tf` and other files

---

## Phase 5: Polish & Verification

**Status**: ⏳ Pending

**Goal**: Verify fixes in CI environment.

### Verification

- [ ] T004 Verify "Deploy to Dev" triggers on infrastructure change (manual verification via git push)
- [ ] T005 Verify "Terraform Format Check" passes in CI (manual verification via GitHub Actions UI)

---

## Task Dependency Graph

```
Phase 1 (Setup)
└─ T001
    ├─ Phase 3 (US1)
    │   └─ T002: Update workflow triggers
    │
    └─ Phase 4 (US2)
        └─ T003: Fix formatting
            │
            └─ Phase 5 (Verification)
                ├─ T004: Verify triggers
                └─ T005: Verify format check
```

**Critical Path**: T001 → T002/T003 → T004/T005
**Parallel Opportunities**: T002 and T003 can be executed independently.
