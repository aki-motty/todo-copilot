# Implementation Plan: Fix GitHub Actions Workflows

**Branch**: `005-fix-github-actions` | **Date**: 2025-11-23 | **Spec**: [specs/005-fix-github-actions/spec.md](spec.md)
**Input**: Feature specification from `/specs/005-fix-github-actions/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

The goal is to improve the reliability of the CI/CD pipeline by ensuring the "Deploy to Dev" workflow triggers for all relevant changes (infrastructure and application) and by fixing the failing "Terraform Format Check". This involves updating the GitHub Actions workflow triggers and applying standard formatting to Terraform files.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 18+, HCL (Terraform)
**Primary Dependencies**: GitHub Actions, Terraform 1.5.0
**Storage**: N/A (Infrastructure as Code)
**Testing**: Jest (for app), TFLint, Checkov (for infra), `terraform fmt`
**Target Platform**: GitHub Actions Runners (Ubuntu Latest)
**Project Type**: Fullstack (React + Lambda + Terraform)
**Performance Goals**: Reliable workflow triggering (< 1 min delay), fast feedback loop
**Constraints**: Must run within GitHub Actions limits
**Scale/Scope**: CI/CD pipeline for the entire repository

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. TDD**: N/A for CI config, but pipeline enforces TDD.
- **II. DDD**: N/A.
- **III. Functional Domain Modeling**: N/A.
- **IV. Clean Architecture**: N/A.
- **V. CQRS**: N/A.
- **VI. IaC - Terraform**: **SUPPORTED**. Feature directly improves IaC pipeline reliability and code quality.
- **VII. Serverless AWS**: **SUPPORTED**. Pipeline deploys serverless resources.
- **VIII. Google ToDo**: N/A.

**Result**: ✅ PASS. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/005-fix-github-actions/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # N/A
├── quickstart.md        # N/A
├── contracts/           # N/A
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
.github/
└── workflows/
    └── terraform-ci.yml  # Main workflow file to be modified

infrastructure/
└── terraform/            # Terraform files to be formatted
```

**Structure Decision**: Modifying existing CI/CD configuration and infrastructure files. No new project structure required.

## Complexity Tracking

N/A

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
