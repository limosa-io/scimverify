<template>
  <div class="report-container">
    <div class="test-form">
      <form @submit.prevent="runTests">
        <!-- SCIM Base URL -->
        <div class="form-group">
          <label for="url">SCIM Base URL:</label>
          <input type="url" id="url" v-model="url" required placeholder="Enter the SCIM Base URL">
        </div>

        <!-- Authorization Token -->
        <div class="form-group">
          <label for="token">Authorization Token:</label>
          <input type="text" id="token" v-model="token" required placeholder="Enter the Authorization Token">
        </div>

        <!-- Resource Type Tabs -->
        <div class="form-group">
          <label>Resource Type:</label>
          <div class="tabs">
            <div class="tab" :class="{ active: activeTab === 'Config' }" @click="setResourceType('Config')">
              Config
            </div>
            <div class="tab" :class="{ active: activeTab === 'Users' }" @click="setResourceType('Users')">
              Users
            </div>
            <div class="tab" :class="{ active: activeTab === 'Groups' }" @click="setResourceType('Groups')">
              Groups
            </div>
          </div>

          <!-- Config Tab Content -->
          <div v-if="activeTab === 'Config'" class="tab-content">
            <div class="option">
              <input type="checkbox" id="detect-schema" v-model="model.detectSchema">
              <label for="detect-schema">Detect Schema</label>
            </div>
            <div class="option">
              <input type="checkbox" id="detect-resource-types" v-model="model.detectResourceTypes">
              <label for="detect-resource-types">Detect Resource Types</label>
            </div>
          </div>

          <!-- Users Tab Content -->
          <div v-if="activeTab === 'Users'" class="tab-content">
            <div class="option">
              <input type="checkbox" id="enable-users" v-model="model.users.enabled">
              <label for="enable-users">Get</label>
            </div>
            <div class="option">
              <input type="checkbox" id="enable-users-create" v-model="model.users.enableCreate">
              <label for="enable-users-create">Create</label>
            </div>
            <div class="option">
              <input type="checkbox" id="enable-users-replace" v-model="model.users.enableReplace">
              <label for="enable-users-replace">Put</label>
            </div>
            <div class="option" v-if="model.users.enableReplace">
              <label for="users-replace-id">User ID for Replace:</label>
              <input type="text" id="users-replace-id" v-model="model.users.replaceId" 
              placeholder="Leave empty to auto-detect">
            </div>
            <div class="option">
              <input type="checkbox" id="enable-users-update" v-model="model.users.enableUpdate">
              <label for="enable-users-update">Patch</label>
            </div>
            <div class="option" v-if="model.users.enableUpdate">
              <label for="users-replace-id">User ID for Patch:</label>
              <input type="text" id="users-replace-id" v-model="model.users.updateId" 
              placeholder="Leave empty to auto-detect">
            </div>
            <div class="option">
              <input type="checkbox" id="enable-users-delete" v-model="model.users.enableDelete">
              <label for="enable-users-delete">Delete</label>
            </div>
            <div class="option">
              <label for="users-sort-attributes">Sort Attributes to Test:</label>
              <input type="text" id="users-sort-attributes" v-model="userSortAttributesText"
                placeholder="Comma-separated attributes" @change="updateUserSortAttributes">
            </div>
          </div>

          <!-- Groups Tab Content -->
          <div v-if="activeTab === 'Groups'" class="tab-content">
            <div class="option">
              <input type="checkbox" id="enable-groups" v-model="model.groups.enabled">
              <label for="enable-groups">Get</label>
            </div>
            <div class="option">
              <input type="checkbox" id="enable-groups-create" v-model="model.groups.enableCreate">
              <label for="enable-groups-create">Create</label>
            </div>
            <div class="option">
              <input type="checkbox" id="enable-groups-replace" v-model="model.groups.enableReplace">
              <label for="enable-groups-replace">Put</label>
            </div>
            <div class="option">
              <input type="checkbox" id="enable-groups-update" v-model="model.groups.enableUpdate">
              <label for="enable-groups-update">Patch</label>
            </div>
            <div class="option">
              <input type="checkbox" id="enable-groups-delete" v-model="model.groups.enableDelete">
              <label for="enable-groups-delete">Delete</label>
            </div>
            <div class="option">
              <label for="groups-sort-attributes">Sort Attributes to Test:</label>
              <input type="text" id="groups-sort-attributes" v-model="groupSortAttributesText"
                placeholder="Comma-separated attributes" @change="updateGroupSortAttributes">
            </div>
          </div>
        </div>

        <!-- Run Tests Button -->
        <button type="submit">Run Tests</button>
      </form>
    </div>

    <!-- Test Output Section -->
    <div class="test-output" v-if="testFiles?.length > 0">
      <h2>Test Results</h2>
      <div
        v-for="testFile in testFiles.filter(f => f.results.filter(r => ['test:pass', 'test:fail'].includes(r.getLatest().type)).length > 0)"
        class="file-item">
        <details v-for="r in testFile.results.filter(r => ['test:pass', 'test:fail'].includes(r.getLatest().type))"
          class="result-item">
          <summary class="result-value" :class="[r.getLatest().type, r.skipped() ? 'test:skip' : '']">
            <component :is="r.getLatest().data.nesting == 0 ? 'h2' : 'h3'">
              {{ r.getLatest().data.name }}
            </component>
          </summary>
          <p v-if="r.getLatest().type == 'test:fail' && !r.skipped()">
            <strong>Error:</strong> {{ r.getLatest().data?.details?.assertionMessage?.replace('\n\n', ': ') }}
          </p>
          <p v-if="r.skipped()">This test was skipped because it depends on a prerequisite test that failed.</p>

          <!-- Diagnostic Messages -->
          <div
            v-for="msg in r?.messages.filter(m => ['test:diagnostic'].includes(m.type) && m.data.message.type == 'request')"
            class="diagnostic-tabs">
            <div class="tabs">
              <div class="tab" :class="{ active: getActiveDiagnosticTab(msg.data.line) === 'request' }"
                @click="setDiagnosticTab(msg.data.line, 'request')">
                Request
              </div>
              <div class="tab" :class="{ active: getActiveDiagnosticTab(msg.data.line) === 'response' }"
                @click="setDiagnosticTab(msg.data.line, 'response')">
                Response
              </div>
            </div>

            <div v-if="getActiveDiagnosticTab(msg.data.line) === 'request'" class="tab-content">
              <div class="http-request">
                <div class="request-line"><strong>{{ msg.data.message.method }}</strong> {{ msg.data.message.url }}
                  HTTP/1.1</div>
                <div class="request-headers">
                  <div v-for="(value, key) in msg.data.message.headers" :key="key">
                    <strong>{{ key }}:</strong> {{ value }}
                  </div>
                </div>
                <pre v-if="msg.data.message.body">{{ formatJSON(msg.data.message.body) }}</pre>
              </div>
            </div>

            <div
              v-for="response in r?.messages.filter(m => ['test:diagnostic'].includes(m.type) && m.data.message.type == 'response' && m.data.line == msg.data.line)"
              v-if="getActiveDiagnosticTab(msg.data.line) === 'response'" class="tab-content">
              <div>HTTP {{ response.data.message.status }} {{ response.data.message.statusText }}</div>
              <div v-if="response.data.message.headers">
                <span v-for="(value, key) in response.data.message.headers" :key="key">
                  <strong>{{ key }}:</strong> {{ value }}<br />
                </span>
              </div>
              <pre v-if="response.data.message.body">{{ formatJSON(response.data.message.body) }}</pre>
            </div>
          </div>
        </details>
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
    // Find the latest message that is not of type 'test:diagnostic'
    for (let i = this.messages.length - 1; i >= 0; i--) {
      if (this.messages[i].type !== 'test:diagnostic') {
        return this.messages[i];
      }
    }
    // If all messages are diagnostic, return the latest one
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
      activeTab: 'Config', // Changed default tab

      // Simple nested model structure with detection options
      model: {
        detectSchema: true,
        detectResourceTypes: true,
        users: {
          enabled: true,
          sortAttributes: ['userName'],
          enableCreate: true,
          enableReplace: true,
          enableUpdate: true,
          enableDelete: true,
          replaceId: null,
          updateId: null
        },
        groups: {
          enabled: true,
          sortAttributes: ['displayName'],
          enableCreate: true,
          enableReplace: true,
          enableUpdate: true,
          enableDelete: true
        },
        custom: {
          enabled: false,
          schema: '',
          sortAttributes: []
        }
      },

      // Text fields for sort attributes
      userSortAttributesText: 'userName',
      groupSortAttributesText: 'displayName',
      customSortAttributesText: '',

      // Track active diagnostic tabs per message
      diagnosticTabs: new Map(),
    };
  },
  created() {
    // Initialize text fields from model
    this.userSortAttributesText = this.model.users.sortAttributes.join(', ');
    this.groupSortAttributesText = this.model.groups.sortAttributes.join(', ');
    this.customSortAttributesText = this.model.custom.sortAttributes.join(', ');

    // Initialize the config display
    this.updateConfig();
  },
  watch: {
    'model': function () {
      this.updateConfig();
    },
    'model.groups.enabled': function () {
      this.updateConfig();
    },
    'model.users.enableCreate': function () {
      this.updateConfig();
    },
    'model.users.enableReplace': function () {
      this.updateConfig();
    },
    'model.users.enableUpdate': function () {
      this.updateConfig();
    },
    'model.groups.enableCreate': function () {
      this.updateConfig();
    },
    'model.groups.enableReplace': function () {
      this.updateConfig();
    },
    'model.groups.enableUpdate': function () {
      this.updateConfig();
    },
    'model.detectSchema': function () {
      this.updateConfig();
    },
    'model.detectResourceTypes': function () {
      this.updateConfig();
    },
    'model.users.enableDelete': function () {
      this.updateConfig();
    },
    'model.groups.enableDelete': function () {
      this.updateConfig();
    },
    activeTab() {
      this.updateConfig();
    }
  },
  beforeUnmount() {
    if (this.socket) {
      this.socket.disconnect();
    }
  },
  methods: {
    updateUserSortAttributes() {
      this.model.users.sortAttributes = this.userSortAttributesText
        .split(',')
        .map(attr => attr.trim())
        .filter(attr => attr);
      this.updateConfig();
    },
    updateGroupSortAttributes() {
      this.model.groups.sortAttributes = this.groupSortAttributesText
        .split(',')
        .map(attr => attr.trim())
        .filter(attr => attr);
      this.updateConfig();
    },
    updateConfig() {
      const configObj = {
        detectSchema: this.model.detectSchema,
        detectResourceTypes: this.model.detectResourceTypes,
        users: this.model.users,
        groups: this.model.groups
      };

      this.config = JSON.stringify(configObj, null, 2);
    },
    setResourceType(type) {
      this.activeTab = type;
      this.updateConfig();
    },

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

      const configObject = {
        url: this.url,
        token: this.token,
        activeTab: this.activeTab,
        detectSchema: this.model.detectSchema,
        detectResourceTypes: this.model.detectResourceTypes,
        users: this.model.users,
        groups: this.model.groups
      };

      if (this.activeTab === 'Custom' && this.model.custom.enabled) {
        configObject.custom = this.model.custom;
      }

      this.setupSocket(); // Connect to socket when running tests

      this.result.clear();
      this.testFiles = [];
      this.diagnosticTabs.clear(); // Clear previous tab states
      this.socket.emit('start-tests', configObject);
    },
    formatJSON(json) {
      return JSON.stringify(json, null, 2);
    },
    // Set active tab for a specific diagnostic message
    setDiagnosticTab(messageId, tabName) {
      this.diagnosticTabs.set(messageId, tabName);
    },

    // Get active tab for a specific diagnostic message
    getActiveDiagnosticTab(messageId) {
      // Default to 'response' if not set
      return this.diagnosticTabs.get(messageId) || 'response';
    },
  },
};
</script>

<style scoped>
.report-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  width: 100%;
  box-sizing: border-box;
}

@media (max-width: 1240px) {
  .report-container {
    max-width: 100%;
  }
}

/* Common styles */
.test-form, .test-output {
  background-color: #ffffff;
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border: 1px solid #eaeaea;
}

.test-form {
  margin: 28px 0;
  padding: 24px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

.form-group {
  margin-bottom: 20px;
}

/* Form elements */
label {
  display: block;
  font-weight: 500;
  margin-bottom: 8px;
  color: #333;
  font-size: 0.95rem;
}

input[type="url"],
input[type="text"],
textarea {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 14px;
  transition: all 0.2s ease;
  background-color: #fafafa;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05);
  
  &:focus {
    outline: none;
    border-color: #3182ce;
    box-shadow: 0 0 0 3px rgba(49, 130, 206, 0.15);
    background-color: #ffffff;
  }
  
  &::placeholder {
    color: #a0aec0;
  }
}

/* Tabs styling */
.tabs {
  display: flex;
  border-bottom: 1px solid #e2e8f0;
  margin-bottom: 0;
  gap: 4px;
  background-color: #f8fafc;
  border-radius: 8px 8px 0 0;
  padding: 4px 4px 0 4px;
}

.tab {
  padding: 10px 20px;
  cursor: pointer;
  border: 1px solid #e2e8f0;
  border-bottom: none;
  margin-bottom: -1px;
  border-radius: 6px 6px 0 0;
  transition: all 0.2s ease;
  background-color: #f1f5f9;
  font-weight: 500;
  user-select: none;
  font-size: 14px;
  color: #64748b;
  
  &:hover {
    background-color: #f8fafc;
    color: #2563eb;
  }
  
  &.active {
    background-color: #fff;
    border-color: #e2e8f0;
    border-bottom-color: white;
    font-weight: 600;
    color: #2563eb;
    box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.03);
  }
}

.tab-content {
  padding: 20px;
  background-color: white;
  border: 1px solid #e2e8f0;
  border-top: none;
  border-radius: 0 0 8px 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.03);
}

/* Checkbox styling */
.option {
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  
  label {
    display: inline-block;
    font-weight: 500;
    cursor: pointer;
    color: #4b5563;
    user-select: none;
    width: 300px;
    font-size: 0.9rem;
  }
  
  input[type="checkbox"] {
    appearance: none;
    -webkit-appearance: none;
    width: 18px;
    height: 18px;
    border: 1px solid #cbd5e0;
    border-radius: 4px;
    margin-right: 10px;
    cursor: pointer;
    vertical-align: middle;
    transition: all 0.2s;
    background-color: white;
    
    &:checked {
      background-color: #2563eb;
      border-color: #2563eb;
      
      &::after {
        content: '';
        position: absolute;
        left: 5px;
        top: 2px;
        width: 6px;
        height: 10px;
        border: solid white;
        border-width: 0 2px 2px 0;
        transform: rotate(45deg);
      }
    }
    
    &:hover {
      border-color: #93c5fd;
    }
    
    &:focus {
      outline: none;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
    }
  }
}

/* Button styling */
button {
  background-color: #2563eb;
  color: white;
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s ease;
  box-shadow: 0 2px 5px rgba(37, 99, 235, 0.2);
  font-size: 15px;
  letter-spacing: 0.3px;
  
  &:hover {
    background-color: #1d4ed8;
    box-shadow: 0 4px 8px rgba(37, 99, 235, 0.25);
  }
  
  &:active {
    transform: translateY(1px);
    box-shadow: 0 1px 3px rgba(37, 99, 235, 0.2);
  }
}

/* Test output styling */
.test-output {
  padding: 20px;
  margin-top: 30px;
  border-color: #e4e4e7;
  
  h2 {
    margin: 0 0 20px 0;
    font-size: 1.4em;
    color: #18181b;
    padding-bottom: 12px;
    border-bottom: 1px solid #f4f4f5;
  }
}

.file-item {
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid #f4f4f5;
}

.result-item {
  margin-bottom: 12px;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.2s ease-in-out;
  border: 1px solid #f4f4f5;
  
  &:hover {
    box-shadow: 0 3px 12px rgba(0, 0, 0, 0.06);
  }
  
  p {
    padding: 14px 18px;
    margin: 0;
    background-color: white;
    border-top: 1px solid #f4f4f5;
    font-size: 0.9rem;
    line-height: 1.6;
    color: #4b5563;
  }
}

/* Summary styling */
summary {
  margin: 0;
  padding: 14px 18px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
  user-select: none;
  font-weight: 500;
  position: relative;
  background-color: #fafafa;
  
  h2, h3 {
    display: inline;
    margin: 0;
    padding: 0;
    font-weight: 600;
    font-size: 1rem;
  }
  
  &:hover {
    background-color: #f5f5f5;
  }
  
  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.3);
  }
  
  &.test\:pass {
    background-color: rgba(34, 197, 94, 0.05);
    
    &:hover {
      background-color: rgba(34, 197, 94, 0.08);
    }
    
    &::marker {
      color: #22c55e;
      content: '✓ ';
    }
  }
  
  &.test\:fail {
    background-color: rgba(239, 68, 68, 0.05);
    
    &:hover {
      background-color: rgba(239, 68, 68, 0.08);
    }
    
    &::marker {
      color: #ef4444;
      content: '✗ ';
    }
  }
  
  &.test\:skip {
    background-color: rgba(245, 158, 11, 0.05);
    
    &:hover {
      background-color: rgba(245, 158, 11, 0.08);
    }
    
    &::marker {
      color: #f59e0b;
      content: '~ ';
    }
  }
}

/* Code styling */
pre, .http-request {
  font-family: 'SF Mono', SFMono-Regular, ui-monospace, Consolas, Menlo, monospace;
  font-size: 13px;
}

pre {
  white-space: pre-wrap;
  word-break: break-all;
  background-color: #f9fafb;
  padding: 14px;
  border-radius: 6px;
  border: 1px solid #f1f5f9;
  margin: 10px 0;
  color: #334155;
}

/* Request/Response details */
.request-line {
  margin-bottom: 12px;
  color: #334155;
  
  strong {
    color: #2563eb;
  }
}

.request-headers {
  margin-bottom: 12px;
  color: #64748b;
  
  strong {
    color: #475569;
  }
}

/* Diagnostic tabs */
.diagnostic-tabs {
  margin-top: 16px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  
  .tabs {
    display: flex;
    border-bottom: 1px solid #e2e8f0;
    background-color: #f8fafc;
    border-radius: 6px 6px 0 0;
    padding: 4px 4px 0 4px;
  }
  
  .tab {
    padding: 8px 14px;
    font-size: 13px;
    border-radius: 4px 4px 0 0;
  }
  
  .tab-content {
    padding: 16px;
    font-size: 13px;
    white-space: pre-wrap;
    word-break: break-word;
    color: #334155;
  }
}

/* Animation */
details[open] > summary ~ * {
  animation: slide-down 0.25s ease-in-out;
}

@keyframes slide-down {
  0% {
    opacity: 0;
    transform: translateY(-8px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .test-form {
    padding: 16px;
  }
  
  .tab {
    padding: 8px 12px;
    font-size: 13px;
  }
  
  .option label {
    width: auto;
  }
  
  button {
    width: 100%;
  }
}
</style>
