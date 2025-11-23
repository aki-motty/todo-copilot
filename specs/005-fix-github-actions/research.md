# Research: Fix GitHub Actions Workflows

**Feature**: 005-fix-github-actions
**Date**: 2025-11-23

## 1. Workflow Trigger Analysis

**Problem**: The "Deploy to Dev" workflow does not trigger for some changes.
**Findings**:
- The current `on.push.paths` configuration in `.github/workflows/terraform-ci.yml` includes:
  - `src/**`
  - `tests/**`
  - `infrastructure/terraform/**`
  - Config files (`package.json`, etc.)
- **MISSING**: `infrastructure/lambda/**`. This directory contains the source code for the Lambda functions (handlers, repository implementation, etc.). Changes here MUST trigger a deployment to update the Lambda code.
- **MISSING**: `infrastructure/scripts/**`. Changes to deployment scripts should likely trigger a build/test cycle.

**Decision**:
- Update `on.push.paths` and `on.pull_request.paths` to include `infrastructure/**`. This is a broader catch-all that ensures any infrastructure change (Terraform, Lambda code, scripts) triggers the pipeline.
- Alternatively, explicitly add `infrastructure/lambda/**`. Given the project structure, `infrastructure/**` is safer and simpler.

## 2. Terraform Formatting Analysis

**Problem**: The "Terraform Format Check" step fails.
**Findings**:
- Ran `terraform fmt -check -recursive infrastructure/terraform` locally.
- **Result**: `infrastructure/terraform/modules/compute/main.tf` is unformatted.
- This causes the CI job to fail because it runs with `-check`.

**Decision**:
- Run `terraform fmt -recursive infrastructure/terraform` to fix the formatting locally.
- Commit the formatted file as part of this feature.
- The CI check will then pass.

## 3. Implementation Strategy

1.  **Modify Workflow**: Edit `.github/workflows/terraform-ci.yml` to expand the `paths` list.
2.  **Fix Formatting**: Run `terraform fmt` and commit changes.
3.  **Verification**:
    - Push changes.
    - Verify CI triggers.
    - Verify "Terraform Format Check" passes.
