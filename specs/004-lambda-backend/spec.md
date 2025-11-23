# Feature Specification: Lambda-Powered Todo Backend

**Feature Branch**: `004-lambda-backend`  
**Created**: 2025-11-22  
**Status**: Draft  
**Input**: User description: "AWS Lambdaを利用するように現在のToDoアプリの実装を行ってください。テストも作成してください。デプロイして動作確認してください。"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create Todo via Lambda API (Priority: P1)

Users can create a new todo item by sending a request to a Lambda-backed API Gateway endpoint. The todo is validated, stored in DynamoDB, and a confirmation is returned with the created todo details.

**Why this priority**: This is the core functionality that enables all other todo operations. Creating todos is the primary user action and must be stable before adding advanced features.

**Independent Test**: Can be fully tested by creating a todo via API call and verifying it appears in the response with all expected fields (id, title, completed status, timestamp).

**Acceptance Scenarios**:

1. **Given** a user sends a valid todo creation request, **When** the Lambda function receives the request, **Then** the todo is saved to DynamoDB and returned with a 200 status code including id, title, completed (false), and createdAt timestamp
2. **Given** a user sends a todo with invalid title (empty or > 500 characters), **When** the Lambda processes the request, **Then** it returns a 400 error with a descriptive message
3. **Given** a DynamoDB write error occurs, **When** the Lambda attempts to save, **Then** it returns a 500 error with retry guidance

---

### User Story 2 - Retrieve All Todos from Lambda API (Priority: P1)

Users can fetch all todos by calling the Lambda API endpoint. Results are paginated, filtered, and consistently formatted.

**Why this priority**: Reading todos is as critical as creating them. Users need to see their todo list immediately after creating or modifying todos.

**Independent Test**: Can be fully tested by retrieving todos via API call and verifying they include all created todos with correct structure and metadata.

**Acceptance Scenarios**:

1. **Given** todos exist in DynamoDB, **When** user calls the get todos endpoint, **Then** all todos are returned as a sorted array (newest first) with 200 status code
2. **Given** no todos exist, **When** user calls the endpoint, **Then** an empty array is returned with 200 status code
3. **Given** pagination parameters are provided, **When** the Lambda processes them, **Then** results are returned in pages with appropriate metadata (total count, page number)

---

### User Story 3 - Toggle Todo Completion Status (Priority: P1)

Users can mark a todo as complete or incomplete by calling the Lambda API with the todo ID. The update is reflected immediately in the response.

**Why this priority**: Completing todos is the primary user interaction after creation. This must be reliable and fast.

**Independent Test**: Can be fully tested by toggling a todo's completion status and verifying the updated state is returned correctly.

**Acceptance Scenarios**:

1. **Given** a todo exists in DynamoDB, **When** user sends a toggle request with the todo ID, **Then** the completed status is inverted and the updated todo is returned with 200 status code
2. **Given** a nonexistent todo ID is provided, **When** the Lambda processes the request, **Then** it returns a 404 error
3. **Given** the toggle request is received, **When** DynamoDB is updated, **Then** the response includes the exact timestamp of the update

---

### User Story 4 - Delete Todo via Lambda API (Priority: P2)

Users can delete a todo by sending a delete request with the todo ID. The deletion is confirmed in the response.

**Why this priority**: While important, deletion is less frequently used than creation and completion toggle. It can be implemented after core operations are stable.

**Independent Test**: Can be fully tested by deleting a todo and verifying it no longer appears in subsequent list queries.

**Acceptance Scenarios**:

1. **Given** a todo exists in DynamoDB, **When** user sends a delete request, **Then** the todo is removed and a 200 status code is returned
2. **Given** a nonexistent todo ID is provided, **When** the Lambda processes the delete, **Then** it returns a 404 error
3. **Given** a todo is deleted, **When** user retrieves the todo list, **Then** the deleted todo is not present

---

### User Story 5 - Frontend Integration with Lambda API (Priority: P1)

The React frontend is updated to communicate with Lambda-backed API endpoints instead of using localStorage. All existing UI functionality remains unchanged from the user perspective.

**Why this priority**: The frontend is the user-facing layer. Integration ensures the entire system works together and delivers the expected user experience.

**Independent Test**: Can be fully tested by performing end-to-end workflows (create, read, toggle completion) through the UI and verifying data persists correctly.

**Acceptance Scenarios**:

1. **Given** the React app is loaded, **When** user creates a todo, **Then** it's sent to the Lambda API and displayed immediately
2. **Given** user completes a todo in the UI, **When** the toggle request completes, **Then** the UI updates and the change persists in the backend
3. **Given** user reloads the page, **When** the app initializes, **Then** all todos are fetched from the Lambda API and displayed

---

### User Story 6 - Complete Test Coverage for Lambda Backend (Priority: P1)

Comprehensive unit, integration, and end-to-end tests ensure the Lambda backend is reliable and maintainable.

**Why this priority**: Test coverage is non-negotiable for production-grade code. Tests provide confidence in deployments and protect against regressions.

**Independent Test**: Can be fully tested by running the test suite and verifying coverage > 80% with no test failures.

**Acceptance Scenarios**:

1. **Given** unit tests are written, **When** tests are executed, **Then** all tests pass and Lambda handler functions are tested in isolation
2. **Given** integration tests are written, **When** tests are executed with mocked DynamoDB, **Then** all API operations are verified to work correctly
3. **Given** end-to-end tests are written, **When** tests run against a deployed Lambda, **Then** complete user workflows (create→toggle→delete) work as expected

---

### User Story 7 - Deploy Lambda Backend to AWS (Priority: P1)

The Lambda backend is deployed to AWS using Terraform infrastructure. Multiple environments (dev, staging, production) are provisioned with appropriate configurations.

**Why this priority**: Deployment is essential to validate the complete solution. Without deployment, the feature cannot be verified in a real AWS environment.

**Independent Test**: Can be fully tested by deploying the Lambda function, API Gateway, and DynamoDB tables to AWS and verifying they respond to requests with correct configuration.

**Acceptance Scenarios**:

1. **Given** Terraform configuration is prepared, **When** `terraform apply` is executed, **Then** Lambda function, API Gateway, and DynamoDB are created in AWS
2. **Given** the infrastructure is deployed, **When** API requests are sent, **Then** they are processed successfully and responses are returned
3. **Given** multiple environments are needed, **When** Terraform is configured with environment variables, **Then** dev, staging, and production environments are provisioned separately

---

### Edge Cases

- What happens when a user submits a todo with special characters or very long text (near 500-character limit)?
- How does the system handle DynamoDB throttling or temporary availability issues?
- What happens if a user attempts to create a duplicate todo title?
- How does the API respond when rate-limited by AWS?
- What happens if the frontend loses network connectivity mid-request?
- How are concurrent todo updates handled if multiple requests arrive simultaneously?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide REST API endpoints (POST, GET, PUT, DELETE) for todo operations via Lambda + API Gateway
- **FR-002**: System MUST validate todo titles are 1-500 characters before processing
- **FR-003**: System MUST persist all todos in DynamoDB with unique IDs, titles, completion status, and timestamps
- **FR-004**: System MUST support retrieving all todos with sorting (newest first) and pagination support
- **FR-005**: System MUST support toggling todo completion status (true/false) without modifying other properties
- **FR-006**: System MUST support deleting todos by ID and return appropriate error messages for missing todos
- **FR-007**: System MUST return properly formatted JSON responses with appropriate HTTP status codes (200, 400, 404, 500)
- **FR-008**: System MUST log all Lambda function executions with appropriate context for debugging
- **FR-009**: System MUST handle errors gracefully and return user-friendly error messages
- **FR-010**: React frontend MUST communicate with Lambda API endpoints instead of localStorage
- **FR-011**: System MUST maintain backward compatibility with existing domain entities and business logic
- **FR-012**: System MUST provide comprehensive test coverage for Lambda handlers, repository, and API logic
- **FR-013**: System MUST support deployment to multiple environments (dev, staging, production) via Terraform
- **FR-014**: System MUST protect sensitive operations (production deployments) with GitHub environment approvals

### Key Entities *(include if feature involves data)*

- **Todo**: Represents a todo item with id (UUID), title (string, 1-500 chars), completed (boolean), createdAt (ISO timestamp), updatedAt (ISO timestamp)
- **TodoAPI Response**: Standard API response format containing status, data, error messages, and metadata
- **Lambda Event**: AWS Lambda event structure containing HTTP method, path, body, headers from API Gateway
- **DynamoDB Table**: Primary storage with partition key (id), sort key (createdAt), and supporting indexes for queries

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All Lambda API endpoints respond within 1 second for typical requests (P95 latency < 500ms)
- **SC-002**: Todo creation, retrieval, update, and deletion all complete without data loss in production environment
- **SC-003**: Test coverage for Lambda backend exceeds 80% with all critical paths covered by unit and integration tests
- **SC-004**: Terraform deployment provisions infrastructure successfully with zero manual steps required
- **SC-005**: React frontend end-to-end workflows (create → toggle → delete) complete successfully without errors
- **SC-006**: Production deployment requires single-click approval in GitHub, ensuring human review of changes
- **SC-007**: All todo data migrates seamlessly from localStorage to DynamoDB when frontend switches backends
- **SC-008**: System handles 10 concurrent todo operations without data corruption or race conditions

---

## Assumptions

- AWS account with appropriate permissions (Lambda, API Gateway, DynamoDB, IAM) is available
- GitHub OIDC configuration is complete and functional for AWS authentication
- Terraform state is stored in S3 with DynamoDB locking configured (as per infrastructure setup)
- Existing domain layer (Todo entity, TodoTitle value object) requires no changes for backend integration
- API responses follow REST conventions with appropriate HTTP status codes
- All timestamps use ISO 8601 format (UTC)
- DynamoDB provisioning uses on-demand billing mode for flexibility
- Development environment iterations use short feedback loops (< 2 minutes per deploy)

---

## Implementation Notes

- Lambda handler signature follows AWS conventions (event, context)
- Repository pattern is maintained: LambdaTodoRepository implements existing TodoRepository interface
- CQRS pattern is preserved at the application layer
- All existing domain tests continue to pass without modification
- Error handling distinguishes between validation errors (400) and system errors (500)
- Logging uses existing Pino logger configured for Lambda environment
- Infrastructure code uses modular Terraform with separate modules for Lambda, API Gateway, and DynamoDB
