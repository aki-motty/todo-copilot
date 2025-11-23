# Release Notes v1.0.0-lambda-backend

## 🚀 Features
- **Serverless Backend**: Migrated from localStorage to AWS Lambda + DynamoDB.
- **Global Sync**: Data is now synchronized across devices.
- **Scalable API**: Built on Amazon API Gateway and Lambda.
- **Infrastructure as Code**: Fully managed via Terraform.

## 🛠 Improvements
- **Performance**: Optimized Lambda bundle size for <300ms cold starts.
- **Reliability**: Added CloudWatch alarms for errors and latency.
- **Testing**: Added E2E tests with Playwright running against live infrastructure.

## 📦 Deployment
The backend is deployed to the `dev` environment.
API Endpoint: `https://9e4itrdq7c.execute-api.ap-northeast-1.amazonaws.com/dev`

## 📝 Known Issues
- None.

## 🔧 Configuration
- `VITE_API_BASE_URL`: Set to the API Gateway URL in `.env.local` or `.env.development.local`.
