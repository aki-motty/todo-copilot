# Research Findings: Lambda-Powered Todo Backend

**Date**: 2025-11-23  
**Branch**: `004-lambda-backend`  
**Status**: Phase 0 Complete (all clarifications resolved)

---

## Executive Summary

Feature 004 has **infrastructure deployed but zero application implementation**. AWS resources (Lambda, API Gateway, DynamoDB) are ACTIVE in dev environment, but:
- ❌ Frontend still uses localStorage (not Lambda API)
- ❌ Lambda handler has no business logic (only test stub)
- ❌ React components not integrated with backend
- ❌ End-to-end flows untested

**Recovery Plan**: Implement full feature from application layer up (handlers → frontend → E2E tests).

---

## Technical Clarifications (Resolved)

### 1. **Lambda Handler Architecture** ✅
**Question**: How to implement handlers while maintaining DDD/CQRS?
**Decision**: 
- Handler receives AWS Lambda event (HTTP request from API Gateway V2)
- Routes to command/query handlers based on HTTP method
- Each handler calls application layer (CreateTodoHandler, ListTodosHandler, etc.)
- Repository injected at handler init
- **File**: `src/infrastructure/lambda/handlers/index.ts` (entry point)

**Rationale**: Decouples HTTP transport (Lambda) from business logic (application layer)

---

### 2. **DynamoDB Schema** ✅
**Question**: What partition/sort key strategy?
**Decision**:
- **Partition Key**: `id` (todo UUID)
- **Sort Key**: `createdAt` (ISO timestamp)
- **GSI (if needed)**: `userId` + `createdAt` for multi-user support (future)
- **On-demand billing**: No provisioning needed, scales automatically
- **TTL**: Optional cleanup for deleted todos (configurable)

**Rationale**: Simple schema enables single-fetch operations (id lookup) + time-series queries (list all by date)

---

### 3. **API Contract (REST)** ✅
**Question**: OpenAPI spec for frontend/backend contract?
**Decision**:
```
POST   /todos                 → CreateTodoHandler
GET    /todos                 → ListTodosHandler (paginated)
GET    /todos/{id}            → GetTodoHandler
PUT    /todos/{id}/toggle     → ToggleTodoHandler
DELETE /todos/{id}            → DeleteTodoHandler
```

**Response Format**:
```json
{
  "status": "success|error",
  "data": { /* entity */ },
  "error": "message if status=error",
  "meta": { "timestamp": "ISO", "requestId": "uuid" }
}
```

**Rationale**: Standardized format enables frontend to handle all responses uniformly

---

### 4. **Frontend Integration** ✅
**Question**: How to replace localStorage with Lambda API?
**Decision**:
- Create `src/infrastructure/services/todoApiClient.ts` (replaces localStorage)
- Implement `useTodoAPI()` hook for React components
- No changes needed to existing domain entities (Todo, TodoTitle)
- Components call hook methods: `createTodo()`, `listTodos()`, `toggleTodo()`, `deleteTodo()`

**Rationale**: Minimal changes to existing components; infrastructure layer handles HTTP/API details

---

### 5. **Test Strategy** ✅
**Question**: How to achieve 80%+ coverage with 582 tests?
**Decision**:
- Unit tests (existing): 338 tests on domain layer (entities, value objects) - NO CHANGES
- Unit tests (new): 150+ tests on Lambda handlers + repositories
- Integration tests (new): 60+ tests on API workflows with mocked DynamoDB
- E2E tests (existing): 3 Playwright tests (create → toggle → delete) against deployed API

**Coverage Target**: 
- Domain: 95%+ (immutable, well-tested)
- Application: 85%+ (handlers, use cases)
- Infrastructure: 70%+ (Lambda, DynamoDB adapters)
- **Overall**: 80%+ minimum

**Rationale**: Existing domain tests cover business logic; new tests focus on infrastructure integration

---

### 6. **Deployment Strategy** ✅
**Question**: GitHub Actions → Terraform → AWS (dev/staging/prod)?
**Decision**:
- **Dev**: Auto-deploy on push to main (GitHub Actions triggers Terraform apply)
- **Staging**: Manual approval required (1 approver) via GitHub Environment Protection Rules
- **Prod**: Double approval required (2 approvers) via GitHub Environment Protection Rules
- **Rollback**: Terraform destroy + reapply previous state (documented in DISASTER_RECOVERY.md)

**Rationale**: Safety gates prevent accidental production changes; dev enables fast iteration

---

### 7. **Environment Configuration** ✅
**Question**: How to manage Lambda env vars for dev/staging/prod?
**Decision**:
- `DYNAMODB_TABLE`: `todo-copilot-{ENVIRONMENT}` (dev/staging/prod)
- `ENVIRONMENT`: Injected by Terraform from `var.environment`
- `NODE_ENV`: Always `production` (Lambda best practice)
- `LOG_LEVEL`: DEBUG (dev), INFO (staging), WARN (prod)
- **No hardcoded values** in code; all via environment variables or Terraform

**Rationale**: Enables multi-environment deployments without code changes

---

## Implementation Blockers (Resolved)

### Issue 1: CloudWatch Log Group Conflict ✅
**Problem**: Terraform tried to create log group, Lambda auto-creates → ResourceAlreadyExistsException
**Solution**: Remove CloudWatch log group resource from Terraform, let Lambda manage it
**Status**: ✅ FIXED in Terraform code

### Issue 2: Lambda ZIP Package Build ✅
**Problem**: GitHub Actions workflow didn't build Lambda ZIP, Terraform apply failed
**Solution**: Added Node.js setup + `npm run build:lambda` + ZIP creation step in workflow
**Status**: ✅ FIXED in terraform-ci.yml

### Issue 3: AWS_REGION Environment Variable ✅
**Problem**: Lambda runtime reserves AWS_REGION, Terraform tried to set it → InvalidParameterValueException
**Solution**: Remove AWS_REGION from environment variables, Lambda provides automatically
**Status**: ✅ FIXED in Terraform code

---

## Remaining Work (Phase 1-7)

| Phase | Task | Estimated Duration |
|-------|------|-------------------|
| Phase 1 | Data model + API contracts | 2 hours |
| Phase 2 | Frontend components + API client | 4 hours |
| Phase 3 | Lambda handler implementation | 4 hours |
| Phase 4 | Unit/integration tests | 3 hours |
| Phase 5 | E2E tests + deployment validation | 2 hours |
| Phase 6 | Performance optimization + error handling | 2 hours |
| Phase 7 | Documentation + release | 1 hour |
| **Total** | Full feature implementation | **~18 hours** |

---

## Next Steps

1. ✅ Generate `data-model.md` (DynamoDB schema details)
2. ✅ Generate `contracts/` directory (OpenAPI spec)
3. ✅ Generate `quickstart.md` (developer setup)
4. ✅ Run `update-agent-context.sh` (Copilot awareness update)
5. Generate `tasks.md` with full implementation task list (80+ tasks)
6. Begin Phase 2: Frontend component implementation

---

## Decision Log

| Decision | Date | Rationale | Status |
|----------|------|-----------|--------|
| Use REST (not GraphQL) for API | 2025-11-23 | Simpler for Lambda, matches existing patterns | ✅ Approved |
| CQRS at handler level | 2025-11-23 | Maintains architecture patterns, enables optimization | ✅ Approved |
| On-demand DynamoDB billing | 2025-11-23 | No provisioning overhead, scales automatically | ✅ Approved |
| Multi-approval prod deployments | 2025-11-23 | Safety gate for production, team coordination | ✅ Approved |

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Lambda cold starts | P95 latency > 1s first request | Provision concurrency (future), optimize package size |
| DynamoDB throttling | API returns 400 errors | On-demand billing auto-scales; add monitoring/alerts |
| Frontend/API misalignment | Integration failures late | Lock API contract early, generate mock server for frontend dev |
| Test coverage gaps | Production bugs | Mandate 80%+ coverage gate, code review checklist |

---

## Assumptions Validated

✅ AWS account permissions sufficient  
✅ Terraform state in S3 + DynamoDB lock table configured  
✅ GitHub OIDC for AWS authentication working  
✅ Existing domain layer (Todo entity, TodoTitle) usable as-is  
✅ All timestamps UTC/ISO-8601 compatible  
✅ 256MB Lambda memory sufficient for node handler  
✅ API Gateway V2 (HTTP) vs V1 (REST) - V2 chosen (simpler, same cost)

---

## References

- AWS Lambda Best Practices: https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html
- DynamoDB Design Patterns: https://aws.amazon.com/blogs/database/
- API Gateway V2: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api.html
- Constitution (todo-copilot): `/workspaces/todo-copilot/.specify/memory/constitution.md`
- Previous Deployment Issues: See blockers section above

