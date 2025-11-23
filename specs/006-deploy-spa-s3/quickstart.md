# Quickstart: Deploying the SPA

**Feature**: 006-deploy-spa-s3

## Prerequisites

- AWS Credentials configured (for local deployment).
- Terraform installed (v1.5+).
- Node.js installed (v18+).

## Manual Deployment (Local)

1.  **Initialize Terraform**:
    ```bash
    cd infrastructure/terraform
    terraform init
    ```

2.  **Apply Infrastructure**:
    ```bash
    terraform apply -var-file="environments/dev.tfvars"
    ```
    *Note the `frontend_bucket_name` and `cloudfront_distribution_id` from the outputs.*

3.  **Build Frontend**:
    ```bash
    # Go back to root
    cd ../..
    
    # Get API URL (example)
    export VITE_API_URL=$(cd infrastructure/terraform && terraform output -raw api_gateway_url)
    
    # Build
    npm run build
    ```

4.  **Sync to S3**:
    ```bash
    export BUCKET_NAME=$(cd infrastructure/terraform && terraform output -raw frontend_bucket_name)
    aws s3 sync dist/ s3://$BUCKET_NAME --delete
    ```

5.  **Invalidate Cache**:
    ```bash
    export DIST_ID=$(cd infrastructure/terraform && terraform output -raw cloudfront_distribution_id)
    aws cloudfront create-invalidation --distribution-id $DIST_ID --paths "/*"
    ```

## CI/CD Deployment (GitHub Actions)

The deployment is automated in `.github/workflows/terraform-ci.yml`.

1.  **Push to Main**: Merging a PR to `main` triggers the `dev` deployment.
2.  **Staging/Prod**: Use the `[deploy-staging]` or `[deploy-prod]` tags in the commit message, or manually trigger the workflow via GitHub UI.

## Accessing the Application

After deployment, the application will be available at the CloudFront Domain Name (output as `cloudfront_domain_name`).
