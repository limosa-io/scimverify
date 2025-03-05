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
      
      // Output each event as a single line of JSON
      this.push(JSON.stringify(eventWithTimestamp) + '\n');
      callback();
    }
  });
}
