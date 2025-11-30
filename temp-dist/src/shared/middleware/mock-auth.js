export const withMockAuth = (handler) => {
  return async (event, context, callback) => {
    if (process.env.AWS_SAM_LOCAL === "true") {
      console.log("🔒 Using Mock Authentication for Local SAM");
      // Inject mock user identity
      // We cast to any because requestContext structure might vary or be strictly typed
      event.requestContext = {
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
