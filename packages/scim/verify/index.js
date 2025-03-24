import { run } from 'node:test';
import path from 'path';
import { fileURLToPath } from 'url';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Run tests sequentially and pipe directly to NDJSON reporter and stdout
run({
  files: [path.resolve(__dirname, 'scim.test.js')],
  concurrency: 1,
  reporter: 'spec'
}).on('test:fail', () => {
  process.exitCode = 1;
})
  .pipe(process.stdout);
