# Research: Deploy SPA to S3

**Feature**: Deploy SPA to S3 (006)
**Date**: 2025-11-23

## 1. Infrastructure Architecture

### S3 Bucket
- **Purpose**: Host static assets (HTML, CSS, JS, images).
- **Configuration**:
  - Block all public access (enforce access via CloudFront only).
  - Enable versioning (optional, but good for rollback).
  - Encryption: SSE-S3 (default).
- **Naming Convention**: `${var.project_name}-${var.environment}-frontend` (e.g., `todo-copilot-dev-frontend`).

### CloudFront Distribution
- **Purpose**: CDN, HTTPS termination, caching.
- **Configuration**:
  - **Origin**: S3 Bucket.
  - **Access Control**: Origin Access Control (OAC) - *Recommended over OAI for new deployments*.
  - **Viewer Protocol Policy**: Redirect HTTP to HTTPS.
  - **Default Root Object**: `index.html`.
  - **Error Pages**:
    - 403 -> `/index.html` (200 OK) - Required for SPA routing.
    - 404 -> `/index.html` (200 OK) - Required for SPA routing.
  - **Caching**: Managed-CachingOptimized policy.

### Terraform Structure
- Create new module: `infrastructure/terraform/modules/frontend`.
- Resources:
  - `aws_s3_bucket`
  - `aws_s3_bucket_public_access_block`
  - `aws_s3_bucket_policy` (Allow CloudFront OAC)
  - `aws_cloudfront_distribution`
  - `aws_cloudfront_origin_access_control`

## 2. Deployment Pipeline (GitHub Actions)

### Workflow Updates
- **Build Step**: Add `npm run build` for the frontend.
- **Deploy Step**:
  - After Terraform Apply (which creates the bucket).
  - Run `aws s3 sync dist/ s3://${BUCKET_NAME} --delete`.
  - Run `aws cloudfront create-invalidation --distribution-id ${DIST_ID} --paths "/*"`.

### Environment Variables
- The frontend needs `VITE_API_URL`.
- This should be injected during the build time.
- The API URL comes from Terraform outputs (`api_gateway_url`).
- **Challenge**: Terraform runs *before* the frontend build in the current pipeline?
  - Actually, the pipeline builds Lambda first, then runs Terraform.
  - For the frontend, we need the API URL.
  - **Solution**:
    1. Run Terraform Apply (updates API Gateway if needed).
    2. Get API URL from Terraform Output.
    3. Build Frontend (injecting API URL).
    4. Sync to S3.

## 3. Security Considerations

- **S3 Public Access**: Strictly blocked. Only CloudFront can read via Bucket Policy + OAC.
- **HTTPS**: Enforced by CloudFront.
- **Headers**: Add security headers (HSTS, X-Frame-Options, etc.) via CloudFront Response Headers Policy.

## 4. Decisions

- **Decision 1**: Use CloudFront Origin Access Control (OAC) instead of OAI.
  - *Rationale*: AWS recommended best practice, better security, supports SSE-KMS (if needed later).
- **Decision 2**: Separate `modules/frontend` Terraform module.
  - *Rationale*: Keeps infrastructure modular and maintainable.
- **Decision 3**: Build frontend *after* Terraform Apply in CI/CD.
  - *Rationale*: Ensures the correct API URL is available for the build.
