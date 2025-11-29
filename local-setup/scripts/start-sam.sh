#!/bin/bash
set -e

# Detect the host gateway IP to access DynamoDB Local from the dev container
# This is needed for Docker-outside-of-Docker setups (like Dev Containers)
GATEWAY_IP=$(ip route show | grep default | awk '{print $3}')
echo "Detected Gateway IP: ${GATEWAY_IP}"

# Workaround for "Credentials store ... exited with" error in Dev Containers
# Create a temporary docker config to bypass the failing credential helper
# This needs to persist for the duration of the script because sam local start-api
# interacts with Docker when invoking functions.
TEMP_DOCKER_CONFIG=$(mktemp -d)
echo "{}" > "$TEMP_DOCKER_CONFIG/config.json"
export DOCKER_CONFIG=$TEMP_DOCKER_CONFIG

# Ensure cleanup happens on exit
cleanup() {
    echo "Cleaning up temporary Docker config..."
    rm -rf "$TEMP_DOCKER_CONFIG"
}
trap cleanup EXIT

# Build the SAM application (Docker Image)
echo "Building SAM application..."

sam build -t local-setup/template.yaml

# Start SAM Local API
# --host 0.0.0.0: Bind to all interfaces so it's accessible from host
# --container-host ${GATEWAY_IP}: Tell SAM where the host is (for DIND)
# --container-host-interface 0.0.0.0: Bind container ports to all interfaces
# --docker-network todo-network: Connect to the same network as DynamoDB
# --skip-pull-image: Use the locally built image
echo "Starting SAM Local API..."
export AWS_REGION=ap-northeast-1
export AWS_ACCESS_KEY_ID=dummy
export AWS_SECRET_ACCESS_KEY=dummy

sam local start-api \
    -t .aws-sam/build/template.yaml \
    --env-vars local-setup/env.json \
    --docker-network todo-network \
    --host 0.0.0.0 \
    --container-host ${GATEWAY_IP} \
    --container-host-interface 0.0.0.0 \
    --skip-pull-image
