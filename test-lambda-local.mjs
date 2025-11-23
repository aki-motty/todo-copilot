
import { handler } from './dist-lambda/index.js';

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
    const result = await handler(event);
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

run();
