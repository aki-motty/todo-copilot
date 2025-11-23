# Frontend-Lambda Integration Implementation

## Overview
This document describes the React frontend integration with the Lambda backend API, including the HTTP client, API repository, and E2E tests.

## Implementation Summary

### 1. HTTP Client (`src/infrastructure/api/HttpClient.ts`)
- **Purpose**: Type-safe HTTP client for Lambda API communication
- **Features**:
  - POST, GET, PUT, DELETE methods
  - Configurable timeout (default 5 seconds)
  - Request/response logging
  - Meaningful error handling (NetworkError, TimeoutError, HttpError)
  - Automatic API response wrapper handling
  - Support for JSON request/response bodies

**Key Methods**:
```typescript
const client = new HttpClient('https://api.example.com');
const todo = await client.get<TodoDTO>('/todos/123');
const created = await client.post<TodoDTO>('/todos', { title: 'New Todo' });
const updated = await client.put<TodoDTO>('/todos/123', { completed: true });
await client.delete('/todos/123');
```

**Error Handling**:
- `HttpError`: HTTP status errors (400, 404, 500, etc.)
- `NetworkError`: Network connectivity issues
- `TimeoutError`: Request timeout after 5 seconds

### 2. Async API Repository (`src/infrastructure/api/ApiTodoRepository.ts`)
- **Purpose**: Async implementation of TodoRepository for API-based persistence
- **Name**: `AsyncApiTodoRepository`
- **Methods**:
  - `findById(id: TodoId): Promise<Todo | null>`
  - `findAll(): Promise<Todo[]>`
  - `save(todo: Todo): Promise<void>`
  - `remove(id: TodoId): Promise<void>`
  - `clear(): Promise<void>`
  - `count(): Promise<number>`

**Features**:
- Maps API responses (TodoDTO) to domain Todo entities
- Handles network errors gracefully
- Error mapping (404 → Not Found, 500 → Server Error)
- Automatic extraction of data from API response wrapper

### 3. API Configuration Provider (`src/presentation/providers/ApiConfigProvider.tsx`)
- **Purpose**: Provides API configuration to the entire application
- **Uses**: React Context API
- **Configuration Source**: `VITE_API_BASE_URL` environment variable

**useApiConfig Hook**:
```typescript
const { baseUrl, isEnabled, isLocalStorageMode } = useApiConfig();
```

**Configuration Priority**:
1. If `VITE_API_BASE_URL` is set → Use API mode
2. Otherwise → Use localStorage mode

### 4. Updated useTodoList Hook (`src/presentation/hooks/useTodoList.ts`)
- **Purpose**: Automatically switches between API and localStorage backends
- **Features**:
  - Uses `useApiConfig()` to determine backend
  - Creates appropriate repository (AsyncApiTodoRepository or LocalStorageTodoRepository)
  - Maintains same hook interface for backward compatibility
  - All async operations handle loading and error states
  - Exposes `backendMode` state ('api' or 'localStorage')

**Usage**:
```typescript
const {
  todos,
  error,
  loading,
  createTodo,
  toggleTodoCompletion,
  deleteTodo,
  clearError,
  backendMode
} = useTodoList();
```

### 5. Updated App.tsx
- Wraps application with `ApiConfigProvider`
- Displays current backend mode in UI (🌐 API Backend or 💾 Local Storage)
- Passes Vite environment variables to provider

### 6. Environment Configuration Files

**`.env.development`**:
```
VITE_API_BASE_URL=http://localhost:3000
VITE_LOG_LEVEL=debug
```

**`.env.test`**:
```
VITE_API_BASE_URL=http://localhost:3001
VITE_LOG_LEVEL=info
```

**`.env.production`**:
```
VITE_API_BASE_URL=https://api.example.com
VITE_LOG_LEVEL=warn
```

### 7. E2E Tests with API Integration (`e2e/api-integration.spec.ts`)
- **Purpose**: Comprehensive E2E tests against Lambda backend API
- **Test Coverage**:
  - API mode indicator display
  - Create todo via API
  - List todos from API
  - Toggle todo completion via API
  - Delete todo via API
  - Full workflow (create → toggle → delete)
  - Multiple todos persistence
  - Error handling when API unavailable

### 8. Updated package.json Scripts
```json
{
  "scripts": {
    "dev": "vite",
    "dev:api": "VITE_API_BASE_URL=http://localhost:3000 vite",
    "e2e": "playwright test",
    "e2e:api": "VITE_API_BASE_URL=http://localhost:3001 playwright test e2e/api-integration.spec.ts"
  }
}
```

## Backward Compatibility
- All changes are backward compatible
- Existing localStorage implementation continues to work
- If `VITE_API_BASE_URL` is not set, app automatically falls back to localStorage
- Existing E2E tests still pass without modification

## Type Safety
- All code uses TypeScript strict mode
- Full type safety across API communication
- Proper error types and handling
- Domain entities properly mapped from API responses

## Testing & Validation

### Unit Tests
- All existing unit tests pass
- New HTTP client and API repository have full error handling coverage

### Integration Tests
- 32 existing integration tests pass
- Tests cover CRUD operations, error handling, and domain events

### E2E Tests
- Existing localStorage-based E2E tests pass
- New API integration E2E tests cover full workflow
- Tests include error scenarios

### Local Development
Run dev server with API enabled:
```bash
npm run dev:api
```

Run E2E tests against API:
```bash
npm run e2e:api
```

## Production Deployment
Set `VITE_API_BASE_URL` to deployed Lambda API URL:
```bash
VITE_API_BASE_URL=https://your-lambda-api-url.com npm run build
```

## Error Handling
All error scenarios are handled gracefully:
- Network errors display user-friendly messages
- Timeout errors inform user of slow API
- HTTP errors map to appropriate domain errors
- Failed requests don't crash the application

## Performance Considerations
- HTTP requests timeout after 5 seconds
- API calls are wrapped in loading states
- Error recovery is automatic
- Client-side caching via React state

## Logging
- All HTTP requests/responses are logged
- Backend selection is logged on app initialization
- Errors include full context for debugging
- Log level controlled by `VITE_LOG_LEVEL` environment variable

## Files Created
1. `src/infrastructure/api/HttpClient.ts` - HTTP client implementation
2. `src/infrastructure/api/ApiTodoRepository.ts` - Async API repository
3. `src/presentation/providers/ApiConfigProvider.tsx` - API configuration provider
4. `e2e/api-integration.spec.ts` - API E2E tests
5. `.env.development` - Development environment configuration
6. `.env.test` - Test environment configuration
7. `.env.production` - Production environment configuration

## Files Modified
1. `src/presentation/hooks/useTodoList.ts` - Added API backend support
2. `src/presentation/App.tsx` - Added ApiConfigProvider wrapper
3. `package.json` - Added dev:api and e2e:api scripts
4. `playwright.config.ts` - Updated testDir to include e2e directory
