# Phase 5 Deployment Report

## Status: Success ✅

The backend deployment has been successfully verified. The API is operational and responding correctly.

## Issues Resolved

### 1. API Gateway Throttling (429)
- **Issue**: API Gateway returned 429 Too Many Requests.
- **Cause**: Default throttling limits were too low or missing.
- **Fix**: Configured `throttling_burst_limit` and `throttling_rate_limit` in Terraform.

### 2. Lambda Runtime Error (500) - `window is not defined`
- **Issue**: Lambda failed with `ReferenceError: window is not defined`.
- **Cause**: Vite build included browser-specific code from AWS SDK because it was targeting a browser environment by default.
- **Fix**: Updated `vite.config.lambda.ts` to use `ssr: true`, forcing a Node.js-compatible build.

### 3. Missing Dependencies (500) - `Cannot find module 'uuid'`
- **Issue**: Lambda failed with `Runtime.ImportModuleError`.
- **Cause**: `ssr: true` in Vite externalizes dependencies by default, so `uuid` was not bundled.
- **Fix**: Added `ssr: { noExternal: true }` to `vite.config.lambda.ts` to bundle all dependencies into the Lambda artifact.

### 4. Routing Error (404)
- **Issue**: API Gateway returned 404 for valid endpoints.
- **Cause**: API Gateway passes the full path including stage (e.g., `/dev/health`), but the Lambda handler expected paths without the stage (e.g., `/health`).
- **Fix**: Updated `src/infrastructure/lambda/handlers/index.ts` to normalize the path by stripping the stage prefix.

## Verification Results

The following endpoints have been verified:

- **Health Check**: `GET /dev/health` -> **200 OK**
- **Create Todo**: `POST /dev/todos` -> **201 Created**
- **List Todos**: `GET /dev/todos` -> **200 OK**

## Next Steps

- The CI/CD pipeline has been updated with the fixes.
- Future deployments will automatically apply these configurations.
- The frontend can now be connected to the backend API URL:
  `https://9e4itrdq7c.execute-api.ap-northeast-1.amazonaws.com/dev`
