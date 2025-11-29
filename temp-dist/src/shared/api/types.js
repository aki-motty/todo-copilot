/**
 * Shared types for Lambda API integration
 * Defines DTOs and response formats for the REST API
 */
/**
 * Utility function to extract path parameters from Lambda event
 */
export function getPathParameter(event, paramName) {
    return event.pathParameters?.[paramName];
}
/**
 * Utility function to extract query parameters from Lambda event
 */
export function getQueryParameter(event, paramName) {
    return event.queryStringParameters?.[paramName];
}
/**
 * Utility function to parse request body
 */
export function parseBody(body) {
    if (!body) {
        throw new Error("Request body is required");
    }
    try {
        return JSON.parse(body);
    }
    catch (error) {
        throw new Error(`Failed to parse request body: ${error instanceof Error ? error.message : String(error)}`);
    }
}
/**
 * Create a successful API response
 */
export function createSuccessResponse(statusCode, data) {
    return {
        statusCode,
        body: {
            success: true,
            data,
        },
    };
}
/**
 * Create an error API response
 */
export function createErrorResponse(statusCode, error, message) {
    return {
        statusCode,
        body: {
            success: false,
            error,
            message,
        },
    };
}
