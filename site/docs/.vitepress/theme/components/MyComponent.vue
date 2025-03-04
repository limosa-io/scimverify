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
    <h2>Test Output:</h2>
    <pre>{{ output }}</pre>
  </div>
</template>

<script>
import { io } from 'socket.io-client';
export default {
    data() {
        return {
            url: '',
            token: '',
            config: '',
            output: '',
            socket: null
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
                this.output += data;
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
