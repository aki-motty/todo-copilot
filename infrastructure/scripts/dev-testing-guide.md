#!/bin/bash

# Dev Environment Setup and Testing Guide
# This guide provides step-by-step instructions for testing the dev environment

set -e

ENVIRONMENT="dev"
PROJECT_NAME="todo-app"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║   $PROJECT_NAME - Dev Environment Testing Guide            ║"
echo "╚════════════════════════════════════════════════════════════╝"

cat << 'EOF'

## Manual Testing Guide for Dev Environment

### Prerequisites
- Access to the dev environment deployment
- Frontend URL: https://todos-dev.example.com
- API Endpoint: https://api-dev.todos.internal

### Test Scenarios

#### 1. Basic Navigation
- [ ] Open https://todos-dev.example.com
- [ ] Verify the page loads without errors
- [ ] Confirm header shows "Todo App"
- [ ] Verify input field and Create button are visible

#### 2. Create Todo
- [ ] Type "Buy groceries" in the input field
- [ ] Click Create button
- [ ] Verify todo appears in the list
- [ ] Verify the UI shows the todo as not completed
- [ ] Check browser console for no JavaScript errors

#### 3. Display Multiple Todos
- [ ] Create at least 5 different todos
- [ ] Verify all todos appear in the list
- [ ] Verify todos are sorted with most recent first
- [ ] Check that each todo displays:
    - Title
    - Checkbox (unchecked)
    - Delete button

#### 4. Toggle Completion
- [ ] Click the checkbox for "Buy groceries"
- [ ] Verify the todo shows as completed (e.g., strikethrough)
- [ ] Click the checkbox again
- [ ] Verify the todo shows as not completed
- [ ] Create 3 new todos
- [ ] Verify you can toggle each one independently

#### 5. Delete Todo
- [ ] Create a new todo: "Temporary Task"
- [ ] Click the delete button next to "Temporary Task"
- [ ] Verify the todo is removed from the list
- [ ] Create and delete another todo to confirm consistency

#### 6. Persistence (Browser Refresh)
- [ ] Create a new todo: "Persistent Task"
- [ ] Mark it as completed
- [ ] Refresh the browser (F5 or Cmd+R)
- [ ] Verify the todo still exists
- [ ] Verify the completion status is preserved

#### 7. API Error Handling
- [ ] Open browser Network tab (F12)
- [ ] Simulate slow network: DevTools > Network > Throttling
- [ ] Create a new todo and observe the request
- [ ] Clear browser offline mode (DevTools)
- [ ] Verify proper error messages if operations fail
- [ ] Check for retry logic in network requests

#### 8. CORS Verification
- [ ] Open browser DevTools (F12)
- [ ] Go to Network tab
- [ ] Create a todo and check the request headers:
    - Should have: Origin, Authorization headers
    - Should receive: Access-Control-Allow-Origin header
- [ ] Verify no CORS errors in console

#### 9. Performance Check
- [ ] Open DevTools (F12)
- [ ] Go to Performance tab
- [ ] Create a new todo and record performance
- [ ] Check metrics:
    - Page load time < 2s
    - Todo creation response < 500ms
    - Smooth animations (60 FPS)

#### 10. Accessibility
- [ ] Use keyboard to navigate: Tab through all elements
- [ ] Verify focus indicators are visible
- [ ] Test screen reader compatibility (if available)
- [ ] Check color contrast for readability

### Automated Testing

#### Run Unit Tests
```bash
npm test
```
Expected: All tests pass, 80%+ coverage

#### Run E2E Tests (if in dev environment with deployed app)
```bash
npm run e2e
```
Expected: All Playwright tests pass

#### API Testing with curl

Create a todo:
```bash
curl -X POST https://api-dev.todos.internal/todos \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Todo"}'
```

List all todos:
```bash
curl https://api-dev.todos.internal/todos
```

Get specific todo:
```bash
curl https://api-dev.todos.internal/todos/{todoId}
```

Update a todo:
```bash
curl -X PUT https://api-dev.todos.internal/todos/{todoId} \
  -H "Content-Type: application/json" \
  -d '{"title":"Updated","completed":true}'
```

Delete a todo:
```bash
curl -X DELETE https://api-dev.todos.internal/todos/{todoId}
```

### Troubleshooting

**Issue: Page not loading**
- Verify network connectivity
- Check if frontend URL is correct
- Look for CORS errors in console
- Verify API endpoint is accessible

**Issue: Todos not creating**
- Check Network tab for API response
- Look for error messages in console
- Verify API endpoint is responding
- Check if DynamoDB is operational

**Issue: Slow performance**
- Check Network waterfall for bottlenecks
- Verify Lambda cold start issues
- Check DynamoDB throttling
- Review CloudWatch metrics

**Issue: Data not persisting**
- Verify DynamoDB table exists
- Check IAM permissions for Lambda
- Review CloudWatch logs for errors
- Check if correct environment is being used

### Sign-off Checklist

Once all manual tests pass:
- [ ] All test scenarios passed
- [ ] No console errors observed
- [ ] API endpoints respond correctly
- [ ] Data persists across page refreshes
- [ ] Performance meets targets
- [ ] CORS headers are correct
- [ ] Accessibility requirements met

### Next Steps

After successful dev validation:
1. Run automated deployment validation script
2. Proceed to staging environment testing
3. Coordinate staging approval with team
4. Begin production deployment preparation

EOF

echo ""
echo "✅ Dev testing guide created"
echo ""
echo "To run the automated validation script:"
echo "  bash ./infrastructure/scripts/validate-dev-deployment.sh"
echo ""
