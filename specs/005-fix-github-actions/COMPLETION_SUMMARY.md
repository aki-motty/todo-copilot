# Completion Summary: Fix GitHub Actions Workflows

**Date**: November 23, 2025
**Status**: ✅ COMPLETE

## Overview
This task focused on fixing issues with the GitHub Actions CI/CD pipeline, specifically ensuring that infrastructure changes trigger the deployment workflow and that Terraform code passes formatting checks. Additionally, we resolved IAM permission issues that were blocking the deployment of CloudWatch alarms.

## Completed Work

### 1. Workflow Trigger Fixes (User Story 1)
- **Issue**: The "Deploy to Dev" workflow was not triggering for changes in the `infrastructure/` directory (e.g., Lambda code updates).
- **Fix**: Updated `.github/workflows/terraform-ci.yml` to include `infrastructure/**` in the `on.push.paths` and `on.pull_request.paths` triggers.
- **Result**: Changes to Lambda functions and other infrastructure code now correctly trigger the CI/CD pipeline.

### 2. Terraform Formatting Fixes (User Story 2)
- **Issue**: The "Terraform Format Check" step in CI was failing due to inconsistent formatting.
- **Fix**: Ran `terraform fmt -recursive infrastructure/terraform` to standardize the formatting of all Terraform files.
- **Result**: The format check now passes in CI.

### 3. IAM Permission Resolution (Unplanned)
- **Issue**: Deployment failed with `AccessDenied` errors when trying to create CloudWatch alarms defined in `monitoring.tf`.
- **Fix**:
    - Identified missing permissions in the GitHub Actions IAM role: `cloudwatch:PutMetricAlarm`, `cloudwatch:DeleteAlarms`, `cloudwatch:DescribeAlarms`, `cloudwatch:GetMetricStatistics`, `cloudwatch:ListMetrics`, and tagging permissions (`cloudwatch:TagResource`, etc.).
    - Updated `infrastructure/scripts/setup-oidc.sh` to include these permissions in the `github-actions-terraform-deploy` policy.
    - Updated `infrastructure/terraform/modules/iam/github-actions-role.tf` to reflect these changes in the IaC definition.
    - Re-ran the OIDC setup script to apply the changes to the AWS environment.
- **Result**: The deployment successfully created the CloudWatch alarms and completed without errors.

### 4. Terraform Resource Fixes
- **Issue**: `monitoring.tf` had conflicting arguments (`statistic` and `extended_statistic`) for the `lambda_duration` alarm.
- **Fix**: Removed the conflicting `statistic` argument.
- **Result**: `terraform validate` passes.

## Verification
- **CI Triggers**: Confirmed that pushing changes triggers the workflow.
- **Format Check**: Confirmed that the format check passes.
- **Deployment**: Confirmed by the user that the deployment to the dev environment is now successful ("通るようになりました").

## Next Steps
- Monitor the pipeline for a few more deployments to ensure stability.
- Consider adding more granular IAM permissions if needed in the future, rather than using `Resource: "*"`.
