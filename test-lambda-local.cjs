
const lambda = require('./dist-lambda/index.cjs');

const event = {
  requestContext: {
    http: {
      method: 'GET',
      path: '/health'
    },
    requestId: 'test-request'
  }
};

async function run() {
  try {
    const result = await lambda.handler(event);
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

run();
