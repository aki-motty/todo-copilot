# 👨‍💻 Development Guide

> Complete setup, development workflow, testing procedures, and troubleshooting for todo-copilot

## 📋 Table of Contents
1. [Environment Setup](#environment-setup)
2. [Development Workflow](#development-workflow)
3. [Testing Guide](#testing-guide)
4. [Build & Deployment](#build--deployment)
5. [Troubleshooting](#troubleshooting)
6. [Code Quality](#code-quality)

## 🔧 Environment Setup

### Prerequisites
- **Node.js** 18.x or higher
- **npm** 9.x or higher
- **Git** 2.37+
- **VS Code** (recommended) with TypeScript support

### Verify Installation
```bash
node --version    # Should be v18.x or higher
npm --version     # Should be 9.x or higher
git --version     # Should be 2.37+
```

### Initial Setup
```bash
# Clone repository
git clone https://github.com/your-org/todo-copilot.git
cd todo-copilot

# Install dependencies
npm install

# Verify installation
npm run type-check   # Should complete with 0 errors
npm test             # Should show all tests passing

# Start development server
npm run dev
# Open http://localhost:5173
```

## 🚀 Development Workflow

### Project Structure
```
src/
├── domain/              # Business logic (no dependencies)
│   ├── entities/
│   ├── events/
│   └── repositories/
├── application/         # Use cases (CQRS)
│   ├── commands/
│   ├── handlers/
│   ├── queries/
│   └── services/
├── infrastructure/      # Technical implementation
│   ├── persistence/
│   └── config/
├── presentation/        # React UI
│   ├── components/
│   ├── hooks/
│   ├── controllers/
│   └── App.tsx
└── shared/              # Types, utilities
```

### Adding a New Feature (TDD Workflow)

#### Step 1: RED - Write Failing Tests
```bash
# Create test file
touch tests/unit/domain/entities/NewFeature.spec.ts

# Write test for expected behavior
cat > tests/unit/domain/entities/NewFeature.spec.ts << 'EOF'
import { NewFeature } from '../../../src/domain/entities/NewFeature';

describe('NewFeature', () => {
  it('should create new feature with valid input', () => {
    const feature = NewFeature.create('test');
    expect(feature.id).toBeDefined();
  });
});
EOF

# Run test (should fail)
npm test -- tests/unit/domain/entities/NewFeature.spec.ts
```

#### Step 2: GREEN - Implement Minimum Code
```bash
# Create domain entity
touch src/domain/entities/NewFeature.ts

cat > src/domain/entities/NewFeature.ts << 'EOF'
export class NewFeature {
  private constructor(readonly id: string) {}

  static create(input: string): NewFeature {
    return new NewFeature(Math.random().toString());
  }
}
EOF

# Run test (should pass)
npm test -- tests/unit/domain/entities/NewFeature.spec.ts
```

#### Step 3: REFACTOR - Improve Code Quality
```bash
# Check code quality
npm run lint
npm run type-check
npm run format

# Commit changes
git add .
git commit -m "feat(domain): Add NewFeature entity"
```

### Git Workflow

#### Feature Branches
```bash
# Create feature branch
git checkout -b feature/feature-name

# Make changes, test thoroughly
npm test

# Commit with clear message
git commit -m "feat: Add feature description"

# Push and create PR
git push origin feature/feature-name
```

#### Commit Message Format
```
<type>(<scope>): <subject>

<body>

<footer>

Types:
  - feat:     New feature
  - fix:      Bug fix
  - test:     Test additions/changes
  - refactor: Code refactoring
  - docs:     Documentation
  - chore:    Build, dependencies

Scope:
  - domain, application, infrastructure, presentation, shared

Example:
feat(domain): Add Todo entity with immutability guarantees
- Implement private constructor and factory method
- Add freeze() for runtime immutability
- Add validation for title length (1-500 chars)
- Add 15 unit tests covering edge cases
```

### Common Development Tasks

#### Create a New Command Handler
```bash
# 1. Define command in src/application/commands/
cat > src/application/commands/MyCommand.ts << 'EOF'
export interface MyCommand {
  readonly param: string;
}
EOF

# 2. Create handler in src/application/handlers/
cat > src/application/handlers/MyCommandHandler.ts << 'EOF'
import { MyCommand } from '../commands/MyCommand';

export class MyCommandHandler {
  async handle(command: MyCommand): Promise<void> {
    // Implementation
  }
}
EOF

# 3. Create integration in service
# Edit src/application/services/TodoApplicationService.ts

# 4. Write tests
cat > tests/unit/application/handlers/MyCommandHandler.spec.ts << 'EOF'
describe('MyCommandHandler', () => {
  it('should handle command', async () => {
    const handler = new MyCommandHandler();
    await handler.handle({ param: 'test' });
  });
});
EOF

# 5. Test and commit
npm test
git commit -m "feat: Add MyCommand handler"
```

#### Create a New React Component
```bash
# 1. Create component
cat > src/presentation/components/MyComponent.tsx << 'EOF'
import React from 'react';

interface Props {
  title: string;
}

export const MyComponent: React.FC<Props> = ({ title }) => {
  return <div>{title}</div>;
};
EOF

# 2. Create component test
cat > tests/unit/presentation/components/MyComponent.spec.ts << 'EOF'
import { render, screen } from '@testing-library/react';
import { MyComponent } from '../../../../src/presentation/components/MyComponent';

describe('MyComponent', () => {
  it('should render with title', () => {
    render(<MyComponent title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
EOF

# 3. Test and use in App
npm test
# Import in src/presentation/App.tsx
```

## 🧪 Testing Guide

### Test Organization

#### Unit Tests (Domain & Application)
```bash
# Location: tests/unit/

# Domain entity tests
npm test -- tests/unit/domain/entities/Todo.spec.ts

# Application handler tests
npm test -- tests/unit/application/handlers/CreateTodoCommandHandler.spec.ts

# Utility tests
npm test -- tests/unit/shared/types.spec.ts
```

#### Integration Tests
```bash
# Location: tests/integration/

# Full CQRS flow tests
npm test -- tests/integration/TodoApplicationService.spec.ts

# Repository tests
npm test -- tests/integration/LocalStorageTodoRepository.spec.ts
```

#### Performance Tests
```bash
# Location: tests/performance/

npm test -- tests/performance/performance.spec.ts

# Validates UI response < 100ms, list load < 1s
```

#### E2E Tests (Playwright)
```bash
# Location: e2e/

# Run all E2E tests (currently skipped due to setup)
npm run e2e

# Run specific E2E scenario
npm run e2e -- tests/display-todos.spec.ts

# Run in UI mode (interactive)
npm run e2e:ui
```

### Running Tests

#### All Tests
```bash
npm test
# Result: All 132+ tests passing
```

#### Specific Test File
```bash
npm test -- tests/unit/domain/entities/Todo.spec.ts
```

#### Watch Mode (Re-run on file change)
```bash
npm test -- --watch

# Press:
# - a: run all tests
# - f: run failed tests
# - p: filter by filename
# - q: quit
```

#### Coverage Report
```bash
npm test -- --coverage

# View HTML report
open coverage/lcov-report/index.html
```

#### Performance Tests Only
```bash
npm test -- tests/performance/performance.spec.ts
```

### Writing Effective Tests

#### Unit Test Structure
```typescript
describe('Todo', () => {
  // Setup
  let todo: Todo;

  beforeEach(() => {
    todo = Todo.create('Test todo');
  });

  // Arrange-Act-Assert pattern
  it('should toggle completion status', () => {
    // Act
    const updated = todo.toggleCompletion();

    // Assert
    expect(updated.status).toBe(TodoStatus.COMPLETED);
    expect(todo.status).toBe(TodoStatus.PENDING); // Original unchanged
  });

  // Test edge cases
  it('should throw on invalid title', () => {
    expect(() => TodoTitle.create('')).toThrow();
    expect(() => TodoTitle.create('a'.repeat(501))).toThrow();
  });

  // Test error scenarios
  it('should handle storage errors gracefully', async () => {
    const mockRepo = {
      save: jest.fn().mockRejectedValue(new StorageError())
    };
    
    expect(() => handler.handle(command)).rejects.toThrow(StorageError);
  });
});
```

#### Mocking Patterns
```typescript
// Mock repository
const mockRepository = {
  findAll: jest.fn().mockResolvedValue([]),
  save: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined)
};

// Mock with specific return value
mockRepository.findAll.mockResolvedValue([
  Todo.create('Test 1'),
  Todo.create('Test 2')
]);

// Mock with side effects
mockRepository.save.mockImplementation((todo) => {
  todos.push(todo);
});

// Verify mock was called
expect(mockRepository.save).toHaveBeenCalledWith(
  expect.objectContaining({ title: 'Test' })
);
```

## 🏗️ Build & Deployment

### Development Server
```bash
# Start Vite dev server
npm run dev

# Server runs at http://localhost:5173
# Auto-reloads on file changes
# Supports HMR (Hot Module Replacement)
```

### Production Build
```bash
# Build for production
npm run build

# Output: dist/ directory
# Type-checked, minified, optimized

# Preview production build locally
npm run preview
# Server runs at http://localhost:4173
```

### Environment Configuration

#### Development (.env.development)
```bash
VITE_API_BASE_URL=http://localhost:3000
VITE_DEBUG=true
VITE_LOG_LEVEL=debug
```

#### Production (.env.production)
```bash
VITE_API_BASE_URL=https://api.example.com
VITE_DEBUG=false
VITE_LOG_LEVEL=info
```

#### Usage in Code
```typescript
const apiUrl = import.meta.env.VITE_API_BASE_URL;
const debug = import.meta.env.VITE_DEBUG === 'true';
```

### Deployment Checklist

```bash
# 1. Run full verification
npm run type-check
npm run lint
npm test
npm run test:perf

# 2. Build for production
npm run build

# 3. Preview build
npm run preview

# 4. Commit and tag release
git add .
git commit -m "chore: Bump version to 1.0.0"
git tag -a v1.0.0 -m "Release Sprint 1 MVP"

# 5. Push to repository
git push origin main
git push origin v1.0.0

# 6. Deploy dist/ directory to hosting
# For Vercel: auto-deploys on push
# For manual: copy dist/ to server
```

## 🔍 Code Quality

### Linting
```bash
# Check for issues
npm run lint

# Fix auto-fixable issues
npm run lint -- --fix
```

#### Configuration
- **Tool**: Biome (rust-based, fast)
- **Config**: `biome.json`
- **Coverage**: 42 files
- **Acceptable Warnings**: 15 (test utilities)

### Code Formatting
```bash
# Format all files
npm run format

# Check formatting without changes
npm run format:check
```

#### Biome Configuration
```json
{
  "organizeImports": { "enabled": true },
  "linter": {
    "rules": {
      "suspicious": { "noExplicitAny": "warn" },
      "style": { "useLiteralKeys": "warn" }
    }
  }
}
```

### Type Checking
```bash
# Full TypeScript check
npm run type-check

# Should report: 0 errors
# Strict mode enabled
```

#### TypeScript Configuration
- **Version**: 5.x
- **Mode**: Strict
- **Target**: ES2020
- **Module**: ESNext

### All Quality Checks
```bash
# Run all checks (mimics CI pipeline)
npm run type-check && \
npm run lint && \
npm run format:check && \
npm test

# Or use pre-commit hook (automatic)
npm run pre-commit
```

## 🐛 Troubleshooting

### Common Issues

#### Issue: `npm install` fails
```bash
# Solution 1: Clear npm cache
npm cache clean --force

# Solution 2: Delete node_modules and try again
rm -rf node_modules package-lock.json
npm install

# Solution 3: Check Node.js version
node --version  # Must be 18+
```

#### Issue: Tests fail with "Cannot find module"
```bash
# Solution 1: Verify file exists
ls -la src/domain/entities/Todo.ts

# Solution 2: Check import path
# ❌ Wrong: import { Todo } from 'Todo'
# ✅ Right: import { Todo } from '../entities/Todo'

# Solution 3: Rebuild TypeScript
npm run type-check
```

#### Issue: Dev server won't start
```bash
# Solution 1: Check port 5173 availability
lsof -i :5173  # See what's using port

# Solution 2: Kill process and restart
npm run dev

# Solution 3: Use different port
npm run dev -- --port 5174
```

#### Issue: TypeScript strict mode errors
```bash
# Error: Type 'any' not allowed
# Solution: Use proper typing
// ❌ const result: any = await handler.handle(command);
// ✅ const result: Todo = await handler.handle(command);

# Error: Property 'x' does not exist
# Solution: Use type casting
// ❌ obj.x
// ✅ (obj as Record<string, unknown>).x
```

#### Issue: localStorage full
```typescript
// localStorage quota exceeded error

// Solution 1: Clear old todos
localStorage.removeItem('todos');

// Solution 2: Export and archive
const backup = JSON.stringify(localStorage.getItem('todos'));
// Save backup, then clear
```

### Debug Logging

#### Enable Debug Logs
```typescript
// src/infrastructure/config/logger.ts
// Set LOG_LEVEL environment variable
process.env.LOG_LEVEL = 'debug';

// Or in code
import { logger } from '../../infrastructure/config/logger';
logger.debug('Message', { context: data });
```

#### Browser Console
```javascript
// View localStorage
localStorage.getItem('todos');

// Clear localStorage
localStorage.clear();

// View all keys
Object.keys(localStorage);

// Monitor state changes
window.addEventListener('storage', (e) => {
  console.log('Storage changed:', e);
});
```

### Performance Debugging

#### Identify Slow Operations
```bash
npm test -- tests/performance/performance.spec.ts

# Shows timing for each operation
# Compare against thresholds:
# - UI response: <100ms ✅
# - List load: <1s ✅
```

#### Chrome DevTools
```
1. Open DevTools (F12)
2. Performance tab
3. Record → perform action → Stop
4. Analyze flame chart
5. Look for expensive operations
```

### Git Troubleshooting

#### Undo Last Commit
```bash
# Keep changes, undo commit
git reset --soft HEAD~1

# Discard changes and commit
git reset --hard HEAD~1
```

#### Merge Conflicts
```bash
# Check conflicted files
git status

# View conflict
git diff

# After resolving (edit files):
git add .
git commit -m "chore: Resolve merge conflicts"
```

## 📚 Additional Resources

### Configuration Files
- `tsconfig.json` - TypeScript configuration
- `vite.config.ts` - Vite build configuration
- `biome.json` - Linting/formatting rules
- `jest.config.ts` - Test runner configuration
- `.prettierrc` - Code formatting (via Biome)

### Key Scripts
```json
{
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "test": "jest",
  "type-check": "tsc --noEmit",
  "lint": "biome lint src tests",
  "format": "biome format src tests --write",
  "pre-commit": "npm run type-check && npm run lint && npm test"
}
```

### External Documentation
- [Vite Docs](https://vitejs.dev/)
- [Jest Testing](https://jestjs.io/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Docs](https://react.dev/)
- [Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)

---

**Last Updated**: November 22, 2025  
**Status**: Production Ready (Sprint 1 MVP)
