# Research Findings: Local SAM Testing

**Feature**: Local SAM Testing
**Date**: 2025-11-23

## 1. Terraform vs. SAM Template Synchronization

**Question**: How to keep `template.yaml` in sync with Terraform?
**Findings**:
- There is no official, reliable tool to convert Terraform to SAM templates automatically.
- SAM CLI has a beta feature (`--hook-name terraform`), but it can be unstable with complex modules.
- **Decision**: Maintain a dedicated `template.yaml` for local development.
    - **Rationale**: Provides stability and allows specific local-only configurations (like pointing to DynamoDB Local) without polluting the Terraform state.
    - **Mitigation**: Add a comment header in `template.yaml` warning that it must be manually updated when Terraform resources change.

## 2. Mock Authentication Strategy

**Question**: How to implement mock auth without polluting production code?
**Findings**:
- The project uses raw Lambda handlers, not Express.
- **Decision**: Use a Higher-Order Function (HOF) pattern.
    - Create a `withMockAuth` wrapper.
    - It checks for `process.env.AWS_SAM_LOCAL === 'true'`.
    - If true, it injects a mock user identity into `event.requestContext.authorizer`.
    - If false, it passes execution through to the original handler.
    - **Rationale**: Keeps the core business logic clean and testable.

## 3. Hot Reloading Configuration

**Question**: Best way to achieve hot reloading?
**Findings**:
- SAM supports `--warm-containers EAGER` to keep containers alive.
- TypeScript needs to be recompiled on change.
- **Decision**: Use `concurrently` to run `tsc -w` and `sam local start-api` in parallel.
    - **Command**: `concurrently "npm run watch" "sam local start-api ..."`
    - **Rationale**: Standard pattern for TS + SAM.

## 4. DynamoDB Local Seeding

**Question**: How to seed data on startup?
**Findings**:
- DynamoDB Local does not support auto-seeding from file natively on boot without a custom image.
- **Decision**: Use an `npm` script that runs immediately after starting the DB container.
    - **Script**: `aws dynamodb batch-write-item --endpoint-url http://localhost:8000 ...`
    - **Rationale**: Simple, uses standard AWS CLI, easy to maintain.

## 5. Frontend Integration

**Question**: How to connect the frontend?
**Findings**:
- Vite supports `.env.local` which is git-ignored.
- **Decision**: Developers will create `.env.local` setting `VITE_API_BASE_URL=http://127.0.0.1:3000`.
    - **Rationale**: Zero code changes required in the frontend application.
