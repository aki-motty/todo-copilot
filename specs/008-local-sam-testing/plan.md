# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Enable local testing of AWS Lambda functions and API Gateway using AWS SAM, Docker, and DynamoDB Local. This includes hot reloading, automatic database seeding, and mock authentication to provide a fast, offline-capable development loop without deploying to AWS.

## Technical Context

**Language/Version**: TypeScript (Node.js 18+)
**Primary Dependencies**: AWS SAM CLI, Docker, DynamoDB Local, `ts-node` (for seeding), `nodemon` (for watch mode)
**Storage**: DynamoDB Local (Docker)
**Testing**: Jest (Unit), SAM Local Invoke (Integration)
**Target Platform**: AWS Lambda (Local Simulation)
**Project Type**: Serverless Backend
**Performance Goals**: Hot reload < 2s
**Constraints**: Must not modify production Terraform; Must run offline; `template.yaml` must mirror Terraform.
**Scale/Scope**: Local environment only.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. TDD**: ✅ Supported. Local invoke allows running integration tests against the local environment.
- **II. DDD**: ✅ Neutral. Local setup supports the existing DDD structure.
- **VI. IaC**: ⚠️ **Warning**. `template.yaml` duplicates Terraform configuration.
    - *Justification*: SAM is required for local testing but Terraform is the source of truth for deployment. We must ensure `template.yaml` is treated as a derived/secondary artifact or manually synced.
- **VII. Serverless**: ✅ Aligned. Using SAM to simulate serverless environment.
- **VIII. Google ToDo**: ⚠️ **Warning**. Mock auth bypasses real integration.
    - *Justification*: Necessary for offline/local development speed. Real integration tested in E2E/Dev environment.

## Project Structure

### Documentation (this feature)

```text
specs/008-local-sam-testing/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (seeds.json schema)
├── quickstart.md        # Phase 1 output (Local dev guide)
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
src/
├── index.lambda.ts      # Entry point
├── application/
├── domain/
└── infrastructure/

local-setup/             # [NEW] Directory for local dev assets
├── template.yaml        # SAM template
├── docker-compose.yml   # DynamoDB Local
├── seeds.json           # Initial data
├── env.json             # Local env vars
└── scripts/             # Helper scripts (seed, start, etc.)
```

**Structure Decision**: Create a dedicated `local-setup/` directory to keep local testing artifacts separate from production source code and infrastructure configuration.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

- **Duplicate IaC**: Maintaining `template.yaml` alongside Terraform adds maintenance burden.
    - *Mitigation*: Add a check or script to warn if they diverge, or document the update process clearly.
- **Mock Auth**: Divergence from production auth.
    - *Mitigation*: Ensure the mock middleware is strictly stripped out or disabled in production builds.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
