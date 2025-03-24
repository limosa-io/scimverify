import { Transform } from 'node:stream';

/**
 * NDJSON reporter for Node.js test runner
 * Outputs each test event as a single JSON object per line
 */
export function ndjson() {
  return new Transform({
    objectMode: true,
    transform(event, encoding, callback) {
      // Add timestamp to each event
      const eventWithTimestamp = {
        ...event,
        timestamp: new Date().toISOString()
      };
      
      // Extract and include the assertion message for failed tests
      if (event.type === 'test:fail' && event.data && event.data.details && event.data.details.error) {
        const error = event.data.details.error;
        
        // Check if there's an assertion error in the cause
        if (error.cause) {
          // If the message isn't already included, add it to the output
          if (!eventWithTimestamp.data.details.error.message) {
            eventWithTimestamp.data.details.error.message = error.cause.message || 'Assertion failed';
          }
          
          // For assertion errors, the third parameter is the message
            if (error.cause.code === 'ERR_ASSERTION' && !eventWithTimestamp.data.details.assertionMessage) {
            // Extract the assertion message which is often passed as the third parameter
            const assertionArgs = error.cause.stack?.match(/assert\.strictEqual\([^,]+,[^,]+,\s*['"]([^'"]+)['"]\)/);
            if (assertionArgs && assertionArgs[1]) {
              eventWithTimestamp.data.details.assertionMessage = assertionArgs[1];
            } else {
              // Try to extract from just the message if available
              const message = error.cause.message;
              // Extract only the part before \n\n if it exists
              const cleanMessage = message.split('\n\n')[0];
              eventWithTimestamp.data.details.assertionMessage = cleanMessage;
            }
            }
        }
      }
      
      // Output each event as a single line of JSON
      this.push(JSON.stringify(eventWithTimestamp) + '\n');
      callback();
    }
  });
}
