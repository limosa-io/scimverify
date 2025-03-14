<template>
  <div class="test-form">
    <form @submit.prevent="runTests">
      <div class="form-group">
        <label for="url">SCIM Base URL:</label>
        <input type="url" id="url" v-model="url" required>
      </div>
      <div class="form-group">
        <label for="token">Authorization Token:</label>
        <input type="text" id="token" v-model="token" required>
      </div>

      <div class="form-group">
        <label>Resource Types:</label>
        <div class="radio-group">
          <label>
            <input type="radio" v-model="resourceType" value="detect" checked>
            Detect
          </label>
          <label>
            <input type="radio" v-model="resourceType" value="users">
            Users
          </label>
          <label>
            <input type="radio" v-model="resourceType" value="groups">
            Groups
          </label>
          <label>
            <input type="radio" v-model="resourceType" value="both">
            Users &amp; Groups
          </label>
        </div>
      </div>

      <div class="form-group">
        <label for="config">Optional JSON Configuration:</label>
        <textarea id="config" v-model="config">

        </textarea>
      </div>
      <button type="submit">Run Tests</button>
    </form>
  </div>

  <div class="test-output">
    <div v-for="testFile in testFiles.filter(f => f.results.filter(r => ['test:pass', 'test:fail'].includes(r.getLatest().type)).length > 0)" class="file-item">
      <details v-for="r in testFile.results.filter(r => ['test:pass', 'test:fail'].includes(r.getLatest().type))"
        class="result-item">
        <summary class="result-value" :class="[r.getLatest().type, r.skipped() ? 'test:skip' : '']">
          <component :is="r.getLatest().data.nesting == 0 ? 'h2' : 'h3'">
            {{ r.getLatest().data.name }}
          </component>
        </summary>
        <p v-if="r.getLatest().type == 'test:fail' && !r.skipped()">
          {{ r.getLatest().data?.details?.assertionMessage?.replace('\n\n', ': ') }}
        </p>
        <p v-if="r.skipped()">This test was skipped because it depends on a prerequisite test that failed.</p>
      </details>
    </div>
  </div>
</template>

<script>
import { io } from 'socket.io-client';

class TestResult {
  constructor(file, line, column) {
    this.file = file;
    this.line = line;
    this.column = column;
    this.messages = [];
  }

  getLatest() {
    if (this.messages.length === 0) {
      return null;
    }
    return this.messages[this.messages.length - 1];
  }

  skipped() {
    return this.getLatest().data.skip != null;
  }
}

class TestFile {
  constructor(fileName) {
    this.file = fileName;
    this.results = [];
  }

  addResult(result) {
    this.results.push(result);
  }

  findResult(line, column) {
    return this.results.find(r => r.line === line && r.column === column);
  }
}

export default {
  data() {
    return {
      url: 'https://api.scim.dev/scim/v2',
      token: 'NGcR0rU8OPpUicbvnrbTJImTCPuQAnGUopECdN8w3Q8PPnYMJwkfcFdRt6SP',
      config: '',
      output: '',
      socket: null,
      result: new Map(),
      testFiles: [],
      resourceType: 'detect'
    };
  },
  watch: {
    resourceType() {
      this.config = JSON.stringify({
        resourceType: this.resourceType
      }, null, 2);
    }
  },
  beforeUnmount() {
    if (this.socket) {
      this.socket.disconnect();
    }
  },
  methods: {
    setupSocket() {
      if (this.socket && this.socket.connected) {
        return; // Socket already connected
      }

      if (this.socket) {
        this.socket.disconnect(); // Disconnect any existing socket
      }

      this.socket = io('http://localhost:3000'); // Adjust the URL if needed

      this.socket.on('connect', () => {
        console.log('Connected to WebSocket');
      });

      this.socket.on('test-output', (data) => {

        data.split('\n').filter(e => e.length > 0).forEach(line => {
          try {
            const json = JSON.parse(line);
            // Fix the syntax error in the following line

            // append to results, or update existing entry if it has the same file, line and column
            if (json.data.nesting >= 0) {
              // Find or create TestFile
              let testFile = this.testFiles.find(tf => tf.file === json.data.file);
              if (!testFile) {
                testFile = new TestFile(json.data.file);
                this.testFiles.push(testFile);
              }

              // Find or create TestResult
              let existing = testFile.findResult(json.data.line, json.data.column);
              console.log(json);
              if (existing) {
                existing.messages.push(json);
              } else {
                let r = new TestResult(
                  json.data.file,
                  json.data.line,
                  json.data.column
                );
                r.messages.push(json);
                testFile.addResult(r);
              }
            }

            if (json.data.file === json.data.name) {
              return;
            }

            // Create nested map structure by filename and line-column
            if (!this.result.has(json.data.file)) {
              this.result.set(json.data.file, new Map());
            }
            const fileMap = this.result.get(json.data.file);

            fileMap.set(`${json.data.line}-${json.data.column}`, json);

            // Sort the fileMap entries by line number
            const sortedEntries = Array.from(fileMap.entries()).sort((a, b) => {
              const lineA = parseInt(a[0].split('-')[0]);
              const lineB = parseInt(b[0].split('-')[0]);
              return lineA - lineB;
            });

            // Clear the existing map and add the sorted entries back
            fileMap.clear();
            for (const [key, value] of sortedEntries) {
              fileMap.set(key, value);
            }

          } catch (err) {
            console.error('Failed to parse JSON:', err, line);
          }
        });


      });

      this.socket.on('test-error', (data) => {
        this.output += `\nError: ${data}`;
      });

      this.socket.on('test-complete', (data) => {
        this.output += `\nTests completed with code: ${data.code}`;
      });

      this.socket.on('error', (error) => {
        this.output += `\nError: ${error}`;
      });

      this.socket.on('disconnect', () => {
        console.log('Disconnected from WebSocket');
      });
    },
    runTests() {
      this.output = ''; // Clear previous output
      let configObject = {};
      try {
        configObject = this.config ? JSON.parse(this.config) : {};
      } catch (e) {
        this.output = 'Invalid JSON configuration';
        return;
      }

      this.setupSocket(); // Connect to socket when running tests

      this.result.clear();
      this.testFiles = [];
      this.socket.emit('start-tests', {
        url: this.url,
        token: this.token,
        ...configObject
      });
    }
  }
};
</script>

<style scoped>
.test-output {
  border: 1px solid #eaeaea;
  padding: 16px;
  border-radius: 8px;
  background-color: #fcfcfc;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  margin-top: 24px;
}

.result-item {
  margin-bottom: 12px;
  border-radius: 6px;
  overflow: hidden;
  transition: all 0.2s ease-in-out;
}

.result-item:hover {
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.08);
}

summary {
  margin: 3px 0;
  padding: 10px 14px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
  user-select: none;
  font-weight: 500;
  position: relative;
  background-color: rgba(0, 0, 0, 0.02);

  h2,
  h3 {
    display: inline;
    margin: 0;
    padding: 0;
    font-weight: 600;
  }

  &:hover {
    background-color: rgba(0, 0, 0, 0.04);
  }
}

summary:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(66, 153, 225, 0.5);
}

summary.test\:pass {
  background-color: rgba(72, 187, 120, 0.08);

  &:hover {
    background-color: rgba(72, 187, 120, 0.12);
  }
}

summary.test\:pass::marker {
  color: #48bb78;
  content: '✓ ';
}

summary.test\:fail {
  background-color: rgba(245, 101, 101, 0.08);

  &:hover {
    background-color: rgba(245, 101, 101, 0.12);
  }
}

summary.test\:fail::marker {
  color: #f56565;
  content: '✗ ';
}

summary.test\:skip {
  background-color: rgba(237, 137, 54, 0.08);

  &:hover {
    background-color: rgba(237, 137, 54, 0.12);
  }
}

summary.test\:skip::marker {
  color: #ed8936;
  content: '~ ';
}

.result-item p {
  padding: 12px 16px;
  margin: 0;
  background-color: white;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  font-size: 0.95em;
  line-height: 1.6;
  color: #4a5568;
}

.file-item {
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid #edf2f7;
}

.file-item h3 {
  margin-top: 0;
  margin-bottom: 12px;
  font-size: 1.1em;
  color: #2d3748;
}

.test-form {
  margin-bottom: 28px;
  background-color: #f9fafb;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.form-group {
  margin-bottom: 16px;
}

label {
  display: block;
  font-weight: 600;
  margin-bottom: 6px;
  color: #4a5568;
}

input[type="url"],
input[type="text"],
textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  box-sizing: border-box;
  font-size: 15px;
  transition: border-color 0.2s, box-shadow 0.2s;

  &:focus {
    outline: none;
    border-color: #4299e1;
    box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.25);
  }
}

textarea {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  resize: vertical;
  min-height: 100px;
}

button {
  background-color: #4299e1;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: background-color 0.2s, transform 0.1s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  &:hover {
    background-color: #3182ce;
  }

  &:active {
    transform: translateY(1px);
  }
}

pre {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  white-space: pre-wrap;
  word-break: break-all;
  background-color: #f8fafc;
  padding: 12px;
  border-radius: 4px;
  border: 1px solid #edf2f7;
}

/* Animation for details element */
details[open]>summary~* {
  animation: slide-down 0.3s ease-in-out;
}

@keyframes slide-down {
  0% {
    opacity: 0;
    transform: translateY(-10px);
  }

  100% {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
