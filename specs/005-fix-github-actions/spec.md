# Feature Specification: Fix GitHub Actions Workflows

**Feature Branch**: `005-fix-github-actions`  
**Created**: 2025-11-23  
**Status**: Draft  
**Input**: User description: "GitHub Actionsの拡充を行いたいです。現状Deploy to Devが走らないことがあります。条件に付いて精査して、修正したいです。さらに、現状Terraform Format CheckがFailedしているようなのでそこも直したいです。"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reliable Deployment Pipeline (Priority: P1)

As a developer, I want the deployment pipeline to run automatically and reliably when I push changes to the main branch that affect the application or infrastructure, so that the development environment is always up to date.

**Why this priority**: Core CI/CD functionality. If the deployment doesn't run, the environment becomes stale, leading to confusion and bugs.

**Independent Test**: 
1. Push a change to infrastructure components (which currently might be missing from triggers) on `main` and verify the pipeline triggers.
2. Push a change to application code on `main` and verify the pipeline triggers.

**Acceptance Scenarios**:

1. **Given** I am on the `main` branch, **When** I push a change to infrastructure code (e.g., Lambda functions), **Then** the deployment pipeline triggers.
2. **Given** I am on the `main` branch, **When** I push a change to infrastructure configuration (e.g., Terraform files), **Then** the deployment pipeline triggers.
3. **Given** I am on the `main` branch, **When** I push a change to application code, **Then** the deployment pipeline triggers.

---

### User Story 2 - Infrastructure Code Formatting (Priority: P2)

As a developer, I want the CI system to check infrastructure code formatting and pass if the code is correct, so that I can be sure my code meets style guidelines and the build doesn't fail unnecessarily.

**Why this priority**: Code quality and build stability. Currently, the build is failing, which blocks deployment.

**Independent Test**: Run the validation workflow on the current codebase after applying fixes.

**Acceptance Scenarios**:

1. **Given** the current codebase with unformatted infrastructure files, **When** I apply standard formatting locally and push the changes, **Then** the files are formatted and the CI check passes.
2. **Given** formatted files, **When** the formatting check runs, **Then** it succeeds.

### Edge Cases

- **What happens when a file outside the monitored paths is changed?** The deployment pipeline should NOT trigger (optimization).
- **What happens when the formatting check fails?** The pipeline should stop and notify the developer, preventing deployment of unformatted code.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The deployment pipeline MUST trigger on `push` to `main` branch when changes occur in any infrastructure component (including Lambda functions, scripts), application code, or project configuration.
- **FR-002**: The infrastructure formatting check MUST pass successfully for the current codebase.
- **FR-003**: The infrastructure formatting check MUST fail if new unformatted code is pushed.

### Key Entities *(include if feature involves data)*

N/A

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Deployment pipeline triggers 100% of the time when relevant files (including infrastructure components) are modified on `main`.
- **SC-002**: Infrastructure formatting check status is PASSING for the `main` branch.
- **SC-003**: All infrastructure code files in the repository adhere to the defined formatting standards.

## Assumptions

- The "Deploy to Dev" workflow is defined in `.github/workflows/terraform-ci.yml`.
- The user wants to include all infrastructure changes in the trigger.
- The failure in "Terraform Format Check" is solely due to formatting issues that can be fixed with `terraform fmt`.

