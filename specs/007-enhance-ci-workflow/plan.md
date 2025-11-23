# Implementation Plan - Enhance CI Workflow

**Feature**: Enhance CI Workflow with Security Scan and Lint
**Number**: 007
**Branch**: `007-enhance-ci-workflow`
**Spec**: [spec.md](./spec.md)

## Technical Context

The project currently has a `terraform-ci.yml` workflow that handles infrastructure validation and deployment. There is no dedicated workflow for the application code (TypeScript/React/Lambda) to run linting or security checks on every push.

- **Existing Tools**:
  - **Linter**: Biome (configured in `biome.json`, scripts in `package.json`).
  - **Testing**: Jest (Unit), Playwright (E2E).
  - **CI**: GitHub Actions.

- **New Components**:
  - **Workflow**: `.github/workflows/app-ci.yml`
  - **Security**: GitHub CodeQL Action.

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| **I. TDD** | ✅ | CI will enforce test execution. |
| **II. DDD** | N/A | Infrastructure/Tooling change. |
| **III. Functional** | N/A | Infrastructure/Tooling change. |
| **IV. Clean Arch** | N/A | Infrastructure/Tooling change. |
| **V. CQRS** | N/A | Infrastructure/Tooling change. |
| **VI. IaC** | ✅ | Workflow defined as code (YAML). |
| **VII. Serverless** | N/A | Infrastructure/Tooling change. |

## Phase 0: Outline & Research

- [x] **Research**: Determine best practices for Biome and CodeQL in GitHub Actions. [research.md](./research.md)
- [x] **Decision**: Create a separate `app-ci.yml` to keep concerns separated from `terraform-ci.yml`.

## Phase 1: Design & Contracts

- [x] **Design**: Define workflow structure and jobs. [data-model.md](./data-model.md)
- [x] **Agent Context**: Update agent instructions.

## Phase 2: Implementation

### Step 1: Create Application CI Workflow

**Goal**: Create the GitHub Actions workflow file with Lint, Test, and Security jobs.

- [ ] **Task**: Create `.github/workflows/app-ci.yml`.
  - **Details**:
    - Trigger on `push` to `main` and `pull_request`.
    - **Job 1: Quality**:
      - Checkout code.
      - Setup Node.js (v18).
      - Install dependencies (`npm ci`).
      - Run Biome Check (`npm run check`).
      - Run Unit Tests (`npm test`).
    - **Job 2: Security**:
      - Initialize CodeQL.
      - Analyze.
  - **Files**: `.github/workflows/app-ci.yml`
  - **Verification**: Push to branch and verify workflow runs in GitHub Actions tab (simulated by checking file validity).

### Step 2: Documentation

- [ ] **Task**: Update `README.md` or `DEVELOPMENT.md` to mention the new CI checks.
  - **Files**: `docs/DEVELOPMENT.md`

## Gates & Checks

- [ ] **Gate**: Workflow syntax is valid.
- [ ] **Gate**: `npm run check` passes locally (to ensure CI won't fail immediately).
