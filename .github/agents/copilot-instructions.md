# todo-copilot Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-11-22

## Active Technologies
- HashiCorp Configuration Language (HCL) 2.0 / Terraform CLI 1.6+ + AWS Provider, Terraform AWS modules, AWS CLI v2 (002-aws-terraform-deploy)
- DynamoDB（アプリケーションデータ）、S3（Terraform状態ファイル）、CloudWatch Logs (002-aws-terraform-deploy)
- TypeScript 5.x, Node.js 18+, HCL (Terraform) + GitHub Actions, Terraform 1.5.0 (005-fix-github-actions)
- N/A (Infrastructure as Code) (005-fix-github-actions)
- Terraform (HCL) ~> 1.5, TypeScript 5.x (Frontend Build), YAML (CI/CD) + AWS Provider for Terraform, Vite (Build Tool) (006-deploy-spa-s3)
- AWS S3 (Static Website Hosting) (006-deploy-spa-s3)
- TypeScript (Node.js 18+) + AWS SAM CLI, Docker, DynamoDB Local, `ts-node` (for seeding), `nodemon` (for watch mode) (008-local-sam-testing)
- DynamoDB Local (Docker) (008-local-sam-testing)
- TypeScript 5.x + React 18, AWS SDK v3 (009-add-subtasks)
- DynamoDB (Single Table Design or Simple Table) (009-add-subtasks)

- TypeScript 5.x、Node.js 18+ (001-basic-todo-list)

## Project Structure

```text
src/
tests/
```

## Commands

npm test && npm run lint

## Code Style

TypeScript 5.x、Node.js 18+: Follow standard conventions

## Recent Changes
- 009-add-subtasks: Added TypeScript 5.x + React 18, AWS SDK v3
- 008-local-sam-testing: Added TypeScript (Node.js 18+) + AWS SAM CLI, Docker, DynamoDB Local, `ts-node` (for seeding), `nodemon` (for watch mode)
- 008-local-sam-testing: Added TypeScript (Node.js 18+) + AWS SAM CLI, Docker, DynamoDB Local, `ts-node` (for seeding), `nodemon` (for watch mode)


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
