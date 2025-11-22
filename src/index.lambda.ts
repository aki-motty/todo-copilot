/**
 * Lambda Entry Point
 * Main entry point for AWS Lambda function
 * Exports the handler function for use with AWS Lambda runtime
 * Can be bundled and deployed as Lambda function code
 */

import { handler } from "./infrastructure/lambda/handlers/index";

/**
 * Export the Lambda handler
 * This function processes API Gateway events and returns formatted HTTP responses
 *
 * Usage:
 * - Deploy this file as Lambda function code
 * - Configure API Gateway to route requests to this function
 * - Handler name in Lambda console: index.handler
 */
export { handler };

/**
 * For development/testing purposes, ensure the handler can be invoked directly
 */
if (typeof module !== "undefined" && module.exports) {
  module.exports = { handler };
}
