<template>
  <div class="test-form">
    <h1>SCIM Verify Test Runner</h1>
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
    <div v-for="(fileMap, filename) in result" :key="filename" class="result-file">
      <div v-for="(testResult, position) in fileMap[1]" :key="position" class="result-item">
        <div class="result-value" v-if="testResult[1].type !== 'test:summary'">
          <span>
            <template v-if="testResult[1].data.nesting == 0">
              <template v-if="testResult[1].type == 'test:pass'">
                <span style="color: green;">▶</span>
              </template>
              <template v-else-if="testResult[1].type == 'test:fail'">
                <span style="color: red;">▶</span>
              </template>
              <template v-else>
                ▶
              </template>
            </template>
            {{ '&nbsp;'.repeat(testResult[1].data.nesting) }}
            <template v-if="testResult[1].data.nesting > 0">
              <template v-if="testResult[1].data.skip != null">
                <span style="color: black;">~</span>
              </template>
              <template v-else-if="testResult[1].type == 'test:pass'">
                <span style="color: green;">✔</span>
              </template>
              <template v-else-if="testResult[1].type == 'test:fail'">
                <span style="color: red;">✖</span>
              </template>
            </template>
            {{ testResult[1].data.name }}
          </span>
        </div>
      </div>
    </div>

  </div>
</template>

<script>
import { io } from 'socket.io-client';
export default {
  data() {
    return {
      url: 'https://api.scim.dev/scim/v2',
      token: 'NGcR0rU8OPpUicbvnrbTJImTCPuQAnGUopECdN8w3Q8PPnYMJwkfcFdRt6SP',
      config: '',
      output: '',
      socket: null,
      result: new Map(),
      results: []
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

            // this.results.push(json);
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
