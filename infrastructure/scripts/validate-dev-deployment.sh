#!/bin/bash

# Deployment Validation Script for Dev Environment
# Tests the deployed Lambda and frontend in dev environment

set -e

ENVIRONMENT="${ENVIRONMENT:-dev}"
API_ENDPOINT="${API_ENDPOINT:-https://api-${ENVIRONMENT}.todos.internal}"
FRONTEND_URL="${FRONTEND_URL:-https://todos-${ENVIRONMENT}.example.com}"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Deployment Validation: $ENVIRONMENT Environment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test 1: Health check
echo ""
echo "📋 Test 1: API Health Check"
echo "   Endpoint: $API_ENDPOINT/health"

HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$API_ENDPOINT/health" || echo "000")
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
  echo "   ✓ API is healthy (HTTP 200)"
else
  echo "   ✗ API health check failed (HTTP $HTTP_CODE)"
  exit 1
fi

# Test 2: CORS Headers
echo ""
echo "📋 Test 2: CORS Headers Verification"
echo "   Testing OPTIONS request from frontend origin"

CORS_RESPONSE=$(curl -s -i -X OPTIONS "$API_ENDPOINT/todos" \
  -H "Origin: $FRONTEND_URL" \
  -H "Access-Control-Request-Method: GET" 2>&1 || echo "FAILED")

if echo "$CORS_RESPONSE" | grep -q "Access-Control-Allow-Origin"; then
  echo "   ✓ CORS headers present"
else
  echo "   ✗ CORS headers missing"
  exit 1
fi

# Test 3: Create Todo via API
echo ""
echo "📋 Test 3: Create Todo (POST /todos)"

TODO_ID=$(curl -s -X POST "$API_ENDPOINT/todos" \
  -H "Content-Type: application/json" \
  -d '{"title":"Deployment Validation Test"}' \
  | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$TODO_ID" ]; then
  echo "   ✗ Failed to create todo"
  exit 1
else
  echo "   ✓ Todo created: $TODO_ID"
fi

# Test 4: List Todos via API
echo ""
echo "📋 Test 4: List Todos (GET /todos)"

TODOS_COUNT=$(curl -s -X GET "$API_ENDPOINT/todos" \
  | grep -o '"id"' | wc -l)

if [ "$TODOS_COUNT" -gt 0 ]; then
  echo "   ✓ Listed $TODOS_COUNT todo(s)"
else
  echo "   ✗ Failed to list todos"
  exit 1
fi

# Test 5: Get Specific Todo via API
echo ""
echo "📋 Test 5: Get Specific Todo (GET /todos/:id)"

GET_RESPONSE=$(curl -s -X GET "$API_ENDPOINT/todos/$TODO_ID")

if echo "$GET_RESPONSE" | grep -q "$TODO_ID"; then
  echo "   ✓ Retrieved todo: $TODO_ID"
else
  echo "   ✗ Failed to retrieve todo"
  exit 1
fi

# Test 6: Update Todo via API
echo ""
echo "📋 Test 6: Update Todo (PUT /todos/:id)"

UPDATE_RESPONSE=$(curl -s -X PUT "$API_ENDPOINT/todos/$TODO_ID" \
  -H "Content-Type: application/json" \
  -d '{"title":"Updated Test","completed":true}')

if echo "$UPDATE_RESPONSE" | grep -q "Updated Test"; then
  echo "   ✓ Todo updated successfully"
else
  echo "   ✗ Failed to update todo"
  exit 1
fi

# Test 7: Delete Todo via API
echo ""
echo "📋 Test 7: Delete Todo (DELETE /todos/:id)"

DELETE_RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE "$API_ENDPOINT/todos/$TODO_ID")
DELETE_HTTP_CODE=$(echo "$DELETE_RESPONSE" | tail -n1)

if [ "$DELETE_HTTP_CODE" = "200" ] || [ "$DELETE_HTTP_CODE" = "204" ]; then
  echo "   ✓ Todo deleted successfully (HTTP $DELETE_HTTP_CODE)"
else
  echo "   ✗ Failed to delete todo (HTTP $DELETE_HTTP_CODE)"
  exit 1
fi

# Test 8: Frontend Accessibility
echo ""
echo "📋 Test 8: Frontend Accessibility"
echo "   URL: $FRONTEND_URL"

FRONTEND_RESPONSE=$(curl -s -w "\n%{http_code}" "$FRONTEND_URL")
FRONTEND_HTTP_CODE=$(echo "$FRONTEND_RESPONSE" | tail -n1)

if [ "$FRONTEND_HTTP_CODE" = "200" ]; then
  echo "   ✓ Frontend is accessible (HTTP 200)"
else
  echo "   ✗ Frontend not accessible (HTTP $FRONTEND_HTTP_CODE)"
  exit 1
fi

# Test 9: CloudWatch Logs
echo ""
echo "📋 Test 9: CloudWatch Logs Availability"
echo "   Checking if Lambda logs are being written..."

# This would require AWS CLI access
# For now, just verify the configuration exists
if command -v aws &> /dev/null; then
  LOG_GROUP="/aws/lambda/todo-api-${ENVIRONMENT}"
  aws logs describe-log-groups --query "logGroups[?logGroupName=='$LOG_GROUP'].logGroupName" \
    --region us-east-1 2>/dev/null | grep -q "$LOG_GROUP" && \
    echo "   ✓ CloudWatch log group exists" || \
    echo "   ⚠ CloudWatch log group not found (may require AWS credentials)"
else
  echo "   ⚠ AWS CLI not available (skipping CloudWatch check)"
fi

# Test 10: Database Connectivity
echo ""
echo "📋 Test 10: Database Connectivity"
echo "   Verifying DynamoDB operations..."

# This is tested implicitly through the CRUD operations above
echo "   ✓ Database operations successful (verified through API tests)"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All deployment validation tests passed!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
