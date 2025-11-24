# Feature Specification: Local SAM Testing

**Feature Branch**: `008-local-sam-testing`
**Created**: 2025-11-23
**Status**: Draft
**Input**: User description: "AWS SAMを利用して、terraform applyをCICDによって行う前に、ローカル環境でのテストが行えるようにしたいです。"

## Clarifications

### Session 2025-11-23
- Q: How should the local environment connect to the database? → A: Run DynamoDB Local in Docker (Option B).
- Q: Should we support hot reloading for local development? → A: Yes, enable hot reloading (Option A).
- Q: How should we handle initial data for the local database? → A: Automatic Seeding on Startup (Option A).
- Q: How should we handle authentication in the local environment? → A: Mock Authentication Middleware (Option A).
- Q: How should the frontend connect to the local backend? → A: Environment Variable Override (Option A).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Invoke Lambda Function Locally (Priority: P1)

As a developer, I want to invoke my Lambda functions locally using AWS SAM so that I can verify logic changes quickly without deploying to AWS.

**Why this priority**: This is the core request. Enabling local feedback loops significantly speeds up development and reduces the risk of deploying broken code.

**Independent Test**: Can be tested by running a script that invokes a specific Lambda function (e.g., "Get Todos") with a sample event and verifying the output matches the expected JSON response.

**Acceptance Scenarios**:

1. **Given** the Lambda code is built and a sample event JSON exists, **When** I run the local invoke command for "List Todos", **Then** I receive a 200 OK response with the list of todos.
2. **Given** the Lambda code has a syntax error, **When** I run the local invoke command, **Then** I see the error stack trace in the console.

---

### User Story 2 - Run Local API Gateway (Priority: P2)

As a developer, I want to start a local API Gateway that routes requests to my local Lambda functions so that I can test the API endpoints via HTTP clients (like curl or Postman) or the frontend application.

**Why this priority**: It allows testing the integration between the API surface and the Lambda logic, including path parameters and query strings, which `invoke` might miss if the event JSON isn't perfect.

**Independent Test**: Can be tested by starting the local API and sending a curl request to `http://localhost:3000/todos`.

**Acceptance Scenarios**:

1. **Given** the local API is running, **When** I send a GET request to `/todos`, **Then** I receive a JSON response with todo items.
2. **Given** the local API is running, **When** I send a POST request to `/todos` with valid data, **Then** a new todo is created (in the configured database) and returned.

---

### User Story 3 - Debug Lambda Locally (Priority: P3)

As a developer, I want to attach a debugger to the local Lambda execution so that I can inspect variables and step through code to troubleshoot complex issues.

**Why this priority**: Debugging is essential for fixing bugs that are hard to reproduce with just logs.

**Independent Test**: Can be tested by configuring the IDE to attach to the debug port exposed by SAM.

**Acceptance Scenarios**:

1. **Given** a breakpoint is set in the code, **When** I run the local invoke command in debug mode, **Then** the execution pauses at the breakpoint in my IDE.

### Edge Cases

- What happens when the local environment variables (e.g., DB connection) are missing?
    - The Lambda should fail gracefully with a clear error message indicating configuration issues.
- How does the system handle differences between local Node.js version and AWS Runtime?
    - SAM uses Docker containers to mimic the AWS runtime, minimizing this issue.
- What happens if the `template.yaml` falls out of sync with Terraform?
    - This is a risk. The process should include a step or guideline to update `template.yaml` when infrastructure changes.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a `template.yaml` file that defines the Lambda functions, API events, and runtime settings, mirroring the Terraform configuration.
- **FR-002**: System MUST provide a mechanism (e.g., `npm` scripts or `Makefile`) to build the TypeScript Lambda code into a format compatible with SAM (e.g., `dist-lambda`).
- **FR-003**: System MUST allow invoking specific Lambda functions locally using `sam local invoke` with predefined test events.
- **FR-004**: System MUST allow starting a local HTTP server using `sam local start-api` to simulate API Gateway.
- **FR-005**: System MUST support loading environment variables from a file (e.g., `env.json` or `.env`) to configure local execution (e.g., DynamoDB table names, AWS region).
- **FR-006**: System MUST include sample event JSON files for common operations (Create, List, Update, Delete).
- **FR-007**: System MUST provide a `docker-compose.yml` (or similar) to run DynamoDB Local and create the necessary tables for testing.
- **FR-008**: System MUST support "watch mode" or hot reloading, where changes to TypeScript source files automatically trigger a rebuild and update the running local API.
- **FR-009**: System MUST automatically seed the local DynamoDB with initial test data (from `seeds.json`) upon startup to ensure a ready-to-test state.
- **FR-010**: System MUST provide a "Mock Authentication" mechanism (e.g., middleware) that bypasses real Google OAuth validation when running locally, accepting any token or a specific mock token.
- **FR-011**: System MUST document how to configure the frontend to connect to the local SAM API using `.env.local` (setting `VITE_API_BASE_URL`).

### Key Entities *(include if feature involves data)*

- **SAM Template (`template.yaml`)**: The definition file for AWS SAM, describing functions and APIs.
- **Local Environment Config**: Configuration file containing environment variables for local execution.
- **Test Events**: JSON files representing API Gateway proxy events.
- **DynamoDB Local**: A Docker container simulating the DynamoDB service.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Developers can successfully run `npm run test:local:invoke -- <function-name>` (or similar) and see the output.
- **SC-002**: Developers can successfully run `npm run test:local:api` and access endpoints via `localhost:3000`.
- **SC-003**: A `README` or documentation section exists explaining how to set up the local testing environment (prerequisites like Docker, SAM CLI).
- **SC-004**: The local setup works without modifying the production Terraform code.
- **SC-005**: Local tests run against DynamoDB Local without requiring AWS credentials.
- **SC-006**: Frontend application can successfully communicate with the local SAM API when configured.

## Assumptions

- The user has Docker and AWS SAM CLI installed (or can install them in the dev container).
- The local tests will use DynamoDB Local for persistence, ensuring isolation from AWS environments.
- We are not replacing Terraform with SAM for deployment; SAM is strictly for local testing.
