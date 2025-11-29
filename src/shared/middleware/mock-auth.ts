import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Handler } from "aws-lambda";

export const withMockAuth = (handler: Handler<APIGatewayProxyEventV2, APIGatewayProxyResultV2>) => {
  return async (event: APIGatewayProxyEventV2, context: any, callback: any) => {
    if (process.env["AWS_SAM_LOCAL"] === "true") {
      console.log("🔒 Using Mock Authentication for Local SAM");

      // Inject mock user identity
      // We cast to any because requestContext structure might vary or be strictly typed
      (event as any).requestContext = {
        ...event.requestContext,
        authorizer: {
          jwt: {
            claims: {
              sub: "test-user-1",
              email: "test@example.com",
            },
            scopes: [],
          },
        },
      };
    }

    return handler(event, context, callback);
  };
};
