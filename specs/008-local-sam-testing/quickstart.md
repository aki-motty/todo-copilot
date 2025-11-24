# Local Development with AWS SAM

This guide explains how to run the backend locally using AWS SAM and DynamoDB Local.

## Prerequisites

- Docker
- AWS SAM CLI
- Node.js 20+

(These are pre-installed in the Dev Container)

## Quick Start

1. **Start the Local Environment**

   This command starts DynamoDB Local, seeds it with data, builds the Lambda code in watch mode, and starts the SAM Local API.

   ```bash
   npm run dev:local
   ```

   The API will be available at `http://localhost:3000`.

2. **Invoke Lambda Directly**

   To test a specific function invocation without the API Gateway layer:

   ```bash
   npm run test:local:invoke
   ```

## Architecture

- **DynamoDB Local**: Runs in a Docker container (`dynamodb-local`) on port 8000.
- **AWS SAM Local**: Runs the Lambda function in a Docker container.
- **Vite**: Bundles the TypeScript code into `dist-lambda/index.js`.

## Dev Container Specifics

When running inside a Dev Container (Docker-in-Docker), special networking configuration is required.

- **Network**: All containers (DynamoDB, SAM Lambda) run on a shared Docker network named `todo-network`.
- **Connectivity**: The helper scripts (`local-setup/scripts/*.sh`) automatically detect the host gateway IP to allow SAM to communicate with DynamoDB Local.
- **Image Build**: Due to file mounting limitations in some DIND environments, the Lambda code is baked into a Docker image (`todofunction:local`) using `local-setup/Dockerfile.lambda`.

## Troubleshooting

### "Connection Refused" to DynamoDB

Ensure `npm run db:start` has been run and the container is healthy.

### "Internal Server Error" from Lambda

Check the logs in the terminal running `npm run dev:local`. Common issues include:
- Environment variable mismatches (Table name, Endpoint).
- Network connectivity issues between SAM container and DynamoDB container.

### Changes not reflecting

Since we use `PackageType: Image` for stability in DIND:
- `npm run dev:local` builds the image on startup.
- **Hot Reloading limitation**: While Vite rebuilds the JS code instantly, the Docker image used by SAM needs to be rebuilt to pick up changes.
- To apply changes, restart `npm run dev:local` or run `sam build -t local-setup/template.yaml` manually in another terminal.
