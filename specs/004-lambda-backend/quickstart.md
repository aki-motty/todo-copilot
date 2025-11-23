# Quickstart: Lambda Todo Backend Development

**Target Audience**: Frontend & Backend Engineers  
**Setup Time**: 15-20 minutes  
**Prerequisites**: Node.js 18+, AWS CLI (configured with `aws login`), Docker (optional)

---

## 1. Environment Setup

### Clone & Install Dependencies

```bash
cd /workspaces/todo-copilot

# Install all dependencies (frontend + backend + tests)
npm install

# Verify installation
npm list | head -20
```

### Verify AWS Credentials

```bash
# Check AWS login status
aws sts get-caller-identity --region ap-northeast-1

# Output should show:
# {
#   "UserId": "446713282258",
#   "Account": "446713282258",
#   "Arn": "arn:aws:iam::446713282258:root"
# }
```

### Environment Variables (for local development)

```bash
# Create .env.local (frontend)
cat > .env.local << 'EOF'
VITE_API_URL=http://localhost:3001
VITE_ENVIRONMENT=development
EOF

# For Lambda local testing:
export AWS_REGION=ap-northeast-1
export DYNAMODB_TABLE=todo-copilot-dev
export ENVIRONMENT=dev
export NODE_ENV=production
export LOG_LEVEL=DEBUG
```

---

## 2. Running Tests

### Unit & Integration Tests (Jest)

```bash
# Run all tests with coverage
npm test

# Expected result: 582 tests passing (existing 338 + new Lambda tests)

# Run specific test file
npm test -- src/infrastructure/lambda/handlers/index.test.ts

# Watch mode (for development)
npm test -- --watch
```

### E2E Tests (Playwright)

```bash
# Run end-to-end tests against deployed API
npm run test:e2e

# Run specific E2E test
npx playwright test e2e/create-todo.spec.ts

# Debug mode (opens browser)
npx playwright test --debug
```

---

## 3. Local Development Workflow

### Option A: Frontend Only (Using Deployed Lambda)

```bash
# Start React dev server (connects to deployed Lambda API)
npm run dev

# Open browser: http://localhost:5173
# The app will call the deployed Lambda API (ada8f6v36f)
```

### Option B: Backend Only (Using LocalStack or AWS dev environment)

```bash
# Terminal 1: Build Lambda package
npm run build:lambda

# Terminal 2: Test Lambda locally with sam (requires AWS SAM CLI)
sam local start-api --template infrastructure/terraform/modules/compute/lambda-template.yml

# Terminal 3: Test API
curl http://localhost:3000/todos
```

### Option C: Full Stack Local (with DynamoDB Local)

```bash
# 1. Start DynamoDB Local (requires Docker)
docker run -p 8000:8000 amazon/dynamodb-local

# 2. Create local table
aws dynamodb create-table \
  --table-name todo-copilot-dev \
  --attribute-definitions AttributeName=id,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --endpoint-url http://localhost:8000 \
  --region ap-northeast-1

# 3. Set local DynamoDB endpoint
export AWS_DYNAMODB_ENDPOINT=http://localhost:8000

# 4. Start Lambda locally (requires sam)
sam local start-api

# 5. Start React (in new terminal)
npm run dev
```

---

## 4. Project Structure Guide

### Frontend (React)

```
src/
├── presentation/
│   ├── components/
│   │   ├── TodoApp.tsx          # Main component (uses useTodoAPI hook)
│   │   ├── TodoForm.tsx
│   │   ├── TodoList.tsx
│   │   └── TodoItem.tsx
│   ├── hooks/
│   │   └── useTodoAPI.ts        # Hook to call Lambda API (replaces localStorage)
│   └── services/
│       └── todoApiClient.ts      # HTTP client for Lambda endpoints
└── index.tsx                     # App entry point
```

**Key Change**: Existing `useTodos()` hook (localStorage) → `useTodoAPI()` hook (Lambda API)

### Backend (Lambda)

```
src/infrastructure/lambda/
├── handlers/
│   └── index.ts                 # Lambda entry point (routes to handlers)
├── repositories/
│   └── DynamoDBTodoRepository.ts # DynamoDB adapter (implements TodoRepository interface)
└── adapters/
    └── APIGatewayAdapter.ts     # Converts API Gateway event → handler input
```

### Application Layer (Shared)

```
src/application/
├── handlers/
│   ├── CreateTodoHandler.ts
│   ├── ListTodosHandler.ts
│   ├── ToggleTodoHandler.ts
│   └── DeleteTodoHandler.ts
└── dto/
    └── TodoDTO.ts               # Data transfer objects
```

### Domain Layer (Immutable)

```
src/domain/
├── entities/
│   └── Todo.ts                  # Domain entity (same as before)
├── valueObjects/
│   └── TodoTitle.ts             # Value object (same as before)
└── repositories/
    └── TodoRepository.interface.ts  # Interface (implemented by DynamoDBTodoRepository)
```

---

## 5. Common Development Tasks

### Implementing a New API Endpoint

```bash
# 1. Define API in contracts/lambda-api.yml (OpenAPI spec)

# 2. Create handler in src/application/handlers/
cat > src/application/handlers/MyNewHandler.ts << 'EOF'
export class MyNewHandler {
  constructor(private repository: TodoRepository) {}
  
  async execute(input: Input): Promise<Output> {
    // Business logic here
  }
}
EOF

# 3. Register in Lambda handler (src/infrastructure/lambda/handlers/index.ts)
case 'POST /my-endpoint':
  const handler = new MyNewHandler(repository);
  result = await handler.execute(body);
  break;

# 4. Write tests
cat > src/infrastructure/lambda/handlers/MyNewHandler.test.ts << 'EOF'
describe('MyNewHandler', () => {
  it('should do something', async () => {
    // Test implementation
  });
});
EOF

# 5. Run tests
npm test -- MyNewHandler.test.ts
```

### Debugging a Test Failure

```bash
# 1. Run failing test with verbose output
npm test -- src/infrastructure/lambda/handlers/index.test.ts --verbose

# 2. If it's an integration test, check DynamoDB mock:
# - Mock data setup
# - Query conditions
# - Expected vs actual response

# 3. Use debugger
node --inspect-brk node_modules/.bin/jest src/infrastructure/lambda/handlers/index.test.ts
# Then open chrome://inspect in Chrome DevTools
```

---

## 6. Deploying to AWS

### Deploy to Dev (Automatic via GitHub Actions)

```bash
# Push to main branch
git add .
git commit -m "feat: implement new handler"
git push origin 004-lambda-backend

# Create PR and merge to main
# GitHub Actions automatically:
# 1. Runs tests
# 2. Builds Lambda package
# 3. Deploys to dev via Terraform
# Watch: https://github.com/aki-motty/todo-copilot/actions
```

### Manual Deploy to Dev (for testing)

```bash
cd infrastructure/terraform

# Export credentials
export AWS_REGION=ap-northeast-1

# Plan changes
terraform plan -var-file=environments/dev.tfvars -out=plan-dev.tfplan

# Review plan
terraform show plan-dev.tfplan | head -50

# Apply changes
terraform apply plan-dev.tfplan
```

### Deploy to Staging (requires approval)

```bash
# 1. Tag PR with 'deploy-staging' label
# 2. Merge to main
# 3. GitHub Actions creates deployment
# 4. Wait for 1 approval from team
# 5. Deployment proceeds automatically
```

### Deploy to Prod (requires 2 approvals)

```bash
# 1. Tag PR with 'deploy-prod' label
# 2. Merge to main
# 3. GitHub Actions creates deployment
# 4. Wait for 2 approvals from different team members
# 5. Deployment proceeds automatically
```

---

## 7. Useful Commands

### Build Lambda Package

```bash
# Compile TypeScript + create ZIP for AWS Lambda
npm run build:lambda

# Output: infrastructure/lambda/dist.zip (uploaded to Lambda)
```

### Run Linting & Formatting

```bash
# Format code with Biome
npm run format

# Check types with TypeScript
npm run type-check

# Lint with Biome
npm run lint
```

### View CloudWatch Logs

```bash
# Stream logs from deployed Lambda
aws logs tail /aws/lambda/todo-copilot-api-dev \
  --region ap-northeast-1 \
  --follow

# View specific log stream
aws logs describe-log-streams \
  --log-group-name /aws/lambda/todo-copilot-api-dev \
  --region ap-northeast-1
```

### Query DynamoDB Directly

```bash
# List all todos in dev environment
aws dynamodb scan \
  --table-name todo-copilot-dev \
  --region ap-northeast-1 \
  --profile terraform-dev

# Get specific todo by ID
aws dynamodb get-item \
  --table-name todo-copilot-dev \
  --key '{"id":{"S":"550e8400-e29b-41d4-a716-446655440000"}}' \
  --region ap-northeast-1 \
  --profile terraform-dev
```

---

## 8. Troubleshooting

### Lambda Tests Failing with "Module not found"

```bash
# Solution: Ensure build is complete
npm run build:lambda
npm test
```

### DynamoDB Connection Errors in Tests

```bash
# Solution: Use mocked DynamoDB in tests (configured in test setup)
# Check: tests/setup.ts for mock configuration

# If mock not working, ensure jest.config.ts has:
testEnvironment: 'node'
setupFilesAfterEnv: ['<rootDir>/tests/setup.ts']
```

### API Gateway Returning 502 Bad Gateway

```bash
# Solution: Check Lambda logs
aws logs tail /aws/lambda/todo-copilot-api-dev --follow --region ap-northeast-1

# Common causes:
# 1. Lambda timeout (30 seconds) - increase in infrastructure/terraform/modules/compute/main.tf
# 2. DynamoDB permission denied - check IAM role in AWS console
# 3. Unhandled exception - check error logs above
```

### Frontend Can't Connect to Lambda API

```bash
# Solution: Check CORS configuration
# Expected CORS headers from API Gateway:
# Access-Control-Allow-Origin: *
# Access-Control-Allow-Headers: Content-Type,Authorization
# Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS

# Verify with curl:
curl -i https://ada8f6v36f.execute-api.ap-northeast-1.amazonaws.com/dev/todos \
  -H "Origin: http://localhost:5173"
```

---

## 9. Next Steps

1. **Implement Frontend**: Update React components to call Lambda API (useTodoAPI hook)
2. **Add Handler Logic**: Implement handlers in `src/application/handlers/`
3. **Write Tests**: Add unit/integration/E2E tests (target 80%+ coverage)
4. **Deploy**: Push to main, approve deployments, verify in dev/staging/prod
5. **Monitor**: Check CloudWatch logs, DynamoDB metrics in AWS console

---

## 10. References

- **API Contract**: See `specs/004-lambda-backend/contracts/lambda-api.yml`
- **Data Model**: See `specs/004-lambda-backend/data-model.md`
- **Research**: See `specs/004-lambda-backend/research.md`
- **Tasks**: See `specs/004-lambda-backend/tasks.md`
- **AWS Lambda**: https://docs.aws.amazon.com/lambda/latest/dg/
- **DynamoDB**: https://docs.aws.amazon.com/dynamodb/latest/developerguide/
- **Infrastructure**: See `infrastructure/terraform/` directory

