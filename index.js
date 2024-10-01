const { spec } = require('node:test/reporters');
const { run } = require('node:test');
const path = require('node:path');
const { tap } = require('node:test/reporters');

run({
  files: [path.resolve(__dirname, 'scim.test.js')]
}).on('test:fail', () => {
  process.exitCode = 1;
}).compose(spec).pipe(process.stdout);
