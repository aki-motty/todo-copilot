# Tasks: Enhance CI Workflow with Security Scan and Lint

**Feature Branch**: `007-enhance-ci-workflow`
**Spec**: [spec.md](./spec.md)
**Plan**: [plan.md](./plan.md)

## Phase 1: Setup
*Goal: Verify local environment and tools are ready.*

- [x] T001 Verify local linting and testing scripts in `package.json`

## Phase 2: Foundational
*Goal: Establish shared infrastructure or base classes.*

*(No foundational tasks required for this feature)*

## Phase 3: User Story 1 - Automated Code Quality Checks
*Goal: As a developer, I want my code to be automatically checked for linting errors and security vulnerabilities when I push changes.*

**Independent Test**: Push code to a branch and verify the GitHub Actions workflow runs and reports status.

- [x] T002 [US1] Create `.github/workflows/app-ci.yml` with workflow triggers and permissions
- [x] T003 [US1] Add Lint & Format job (Biome) to `.github/workflows/app-ci.yml`
- [x] T004 [US1] Add Unit Tests job (Jest) to `.github/workflows/app-ci.yml`
- [x] T005 [US1] Add Security Scan job (CodeQL) to `.github/workflows/app-ci.yml`

## Phase 4: User Story 2 - Pull Request Quality Gate
*Goal: As a team lead, I want Pull Requests to show the status of quality checks.*

**Independent Test**: Open a Pull Request and verify checks are displayed.

- [x] T006 [US2] Update `docs/DEVELOPMENT.md` with CI workflow documentation

## Final Phase: Polish & Cross-Cutting
*Goal: Final review and cleanup.*

- [x] T007 Verify workflow syntax and configuration

## Dependencies

- **US1** must be completed before **US2** (Documentation relies on the workflow existing).

## Parallel Execution

- T003, T004, T005 can be defined in parallel within the file, but typically written sequentially.
- T006 (Docs) can be written while T002-T005 are being implemented.

## Implementation Strategy

1.  **MVP**: Implement the `app-ci.yml` with just Lint and Test (T002, T003, T004).
2.  **Security**: Add CodeQL (T005).
3.  **Docs**: Update documentation (T006).
