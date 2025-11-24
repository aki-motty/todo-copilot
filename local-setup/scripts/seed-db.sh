#!/bin/bash
set -e

# Export dummy credentials for local DynamoDB
export AWS_ACCESS_KEY_ID=dummy
export AWS_SECRET_ACCESS_KEY=dummy
export AWS_DEFAULT_REGION=local

# Detect the host gateway IP to access DynamoDB Local from the dev container
GATEWAY_IP=$(ip route show | grep default | awk '{print $3}')
ENDPOINT_URL="http://${GATEWAY_IP}:8000"

echo "Detected Gateway IP: ${GATEWAY_IP}"
echo "Using DynamoDB Endpoint: ${ENDPOINT_URL}"

echo "Waiting for DynamoDB Local to start..."
# Simple wait loop
until curl -s ${ENDPOINT_URL} > /dev/null; do
  sleep 1
done

echo "Creating DynamoDB table..."
# We use || true to ignore error if table already exists
aws dynamodb create-table \
    --table-name todo-copilot-local \
    --attribute-definitions \
        AttributeName=id,AttributeType=S \
        AttributeName=userId,AttributeType=S \
        AttributeName=createdAt,AttributeType=S \
    --key-schema \
        AttributeName=id,KeyType=HASH \
    --global-secondary-indexes \
        "[
            {
                \"IndexName\": \"UserIdIndex\",
                \"KeySchema\": [
                    {\"AttributeName\": \"userId\",\"KeyType\": \"HASH\"},
                    {\"AttributeName\": \"createdAt\",\"KeyType\": \"RANGE\"}
                ],
                \"Projection\": {
                    \"ProjectionType\": \"ALL\"
                }
            }
        ]" \
    --billing-mode PAY_PER_REQUEST \
    --endpoint-url ${ENDPOINT_URL} \
    --region local || echo "Table might already exist, skipping creation."

echo "Seeding data..."
aws dynamodb batch-write-item \
    --request-items file://local-setup/seeds.json \
    --endpoint-url ${ENDPOINT_URL} \
    --region local

echo "Database setup complete."
