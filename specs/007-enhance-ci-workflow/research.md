# Research: Enhance CI Workflow

## Unknowns & Clarifications

| ID | Question | Status | Resolution |
|----|----------|--------|------------|
| UNK-001 | Should we merge with `terraform-ci.yml` or create a new workflow? | Resolved | Create a separate `app-ci.yml` to decouple application lifecycle from infrastructure lifecycle. |
| UNK-002 | Which security scanner to use for application code? | Resolved | GitHub CodeQL is the standard for GitHub Actions and supports TypeScript/JavaScript. |
| UNK-003 | How to run Biome in CI? | Resolved | Use the `npm run check` script which runs `biome check` (lint + format). |

## Technology Decisions

### 1. Workflow Structure
- **Decision**: Create a new workflow file `.github/workflows/app-ci.yml`.
- **Rationale**: Separation of concerns. `terraform-ci.yml` handles infrastructure (Terraform), while `app-ci.yml` will handle application code (TypeScript, React, Lambda). This allows them to run independently and at different frequencies if needed.
- **Alternatives**: Merging into `terraform-ci.yml`. Rejected because it would make the workflow file too large and complex, and app changes shouldn't necessarily trigger terraform validation if infra didn't change (though often they go together).

### 2. Linting Tool
- **Decision**: Use **Biome**.
- **Rationale**: Project already uses Biome (`biome.json` exists). It is fast and combines linting and formatting.
- **Implementation**: Run `npm ci` then `npm run check`.

### 3. Security Scanning
- **Decision**: Use **GitHub CodeQL**.
- **Rationale**: Native integration with GitHub, supports TypeScript, free for public repos (and often available for private depending on plan).
- **Alternatives**: SonarCloud (requires external setup), Snyk (requires token). CodeQL is easiest to bootstrap.

### 4. Test Execution
- **Decision**: Include Unit Tests (`npm test`) in the new workflow.
- **Rationale**: CI should always run tests. `terraform-ci.yml` runs terraform tests, but app tests should run in app CI.

## Best Practices

- **Caching**: Use `actions/setup-node` with caching for `npm`.
- **Triggers**: Run on `push` to `main` and `pull_request`.
- **Permissions**: Minimal permissions (contents: read, security-events: write).
