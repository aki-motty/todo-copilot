#!/bin/bash
set -e

# Detect the host gateway IP
GATEWAY_IP=$(ip route show | grep default | awk '{print $3}')

echo "Building SAM application..."
sam build -t local-setup/template.yaml

echo "Invoking Lambda..."
sam local invoke \
    -t .aws-sam/build/template.yaml \
    -e local-setup/events/get-todos.json \
    --env-vars local-setup/env.json \
    --docker-network todo-network \
    --container-host ${GATEWAY_IP} \
    --container-host-interface 0.0.0.0 \
    --skip-pull-image
