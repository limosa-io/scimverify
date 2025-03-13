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
        <label for="config">Optional JSON Configuration:</label>
        <textarea id="config" v-model="config"></textarea>
      </div>
      <button type="submit">Run Tests</button>
    </form>
  </div>

  <div class="test-output">
      <div v-for="r in results" class="result-item">
        <div class="result-value" v-if="r.getLatest().type !== 'test:summary'">
          <span>
            <template v-if="r.getLatest().data.nesting == 0">
              <template v-if="r.getLatest().type == 'test:pass'">
                <span style="color: green;">▶</span>
              </template>
              <template v-else-if="r.getLatest().type == 'test:fail'">
                <span style="color: red;">▶</span>
              </template>
              <template v-else>
                ▶
              </template>
            </template>
            {{ '&nbsp;'.repeat(r.getLatest().data.nesting) }}
            <template v-if="r.getLatest().data.nesting > 0">
              <template v-if="r.getLatest().data.skip != null">
                <span style="color: black;">~</span>
              </template>
              <template v-else-if="r.getLatest().type == 'test:pass'">
                <span style="color: green;">✔</span>
              </template>
              <template v-else-if="r.getLatest().type == 'test:fail'">
                <span style="color: red;">✖</span>
                <p>
                  {{ r.getLatest().data.details }}
                </p>
              </template>
            </template>
            {{ r.getLatest().data.name }}
          </span>
        </div>
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
      results: [],
    };
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
              const existing = this.results.find(
                r =>
                  r.file === json.data.file
                  && r.line === json.data.line
                  && r.column === json.data.column
              );
              if (existing) {
                existing.messages.push(json);
              } else {
                let r = new TestResult(
                  json.data.file,
                  json.data.line,
                  json.data.column
                );
                r.messages.push(json);
                this.results.push(r);
              }
            }



            console.log(json);

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
      this.results = [];
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
.test-form {
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 10px;
}

label {
  display: block;
  font-weight: bold;
}

input[type="url"],
input[type="text"],
textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
}

textarea {
  font-family: monospace;
  resize: vertical;
  min-height: 100px;
}

button {
  background-color: #4CAF50;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.test-output {
  border: 1px solid #ccc;
  padding: 10px;
  border-radius: 4px;
  background-color: #f4f4f4;
}

pre {
  font-family: monospace;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
