import { spec } from 'node:test/reporters';
import { run } from 'node:test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

run({
  files: [path.resolve(__dirname, 'scim.test.js')]
}).on('test:fail', () => {
  process.exitCode = 1;
}).compose(spec).pipe(process.stdout);
