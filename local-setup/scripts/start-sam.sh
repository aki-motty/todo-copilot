#!/bin/bash
set -e

# Detect the host gateway IP to access DynamoDB Local from the dev container
# This is needed for Docker-outside-of-Docker setups (like Dev Containers)
GATEWAY_IP=$(ip route show | grep default | awk '{print $3}')
echo "Detected Gateway IP: ${GATEWAY_IP}"

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
sam local start-api \
    -t .aws-sam/build/template.yaml \
    --env-vars local-setup/env.json \
    --docker-network todo-network \
    --host 0.0.0.0 \
    --container-host ${GATEWAY_IP} \
    --container-host-interface 0.0.0.0 \
    --skip-pull-image
