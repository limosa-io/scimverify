<template>
  <div class="report-container">
    <div class="test-form">
      <form @submit.prevent="validateAndRunTests">

       
        
        <div class="form-group">

          <p>
            SCIM Verify is a testing tool for validating SCIM 2.0 implementations.<br />
            Simply provide your SCIM base URL and authentication token.<br />
            Optionally, select which features to test.
        </p>

          <label for="url">SCIM Base URL:</label>
          <input type="url" id="url" v-model="url" required placeholder="Enter the SCIM Base URL">

          <label for="token" style="margin-top: 15px;">Authorization Token:</label>
          <input type="text" id="token" v-model="token" required placeholder="Enter the Authorization Token">


        <!-- Turnstile widget container -->
        <div class="turnstile-container">
          <div id="turnstile-widget" ref="turnstileWidget"></div>
          <div v-if="turnstileError" class="turnstile-error">
            Please complete the Cloudflare Turnstile challenge to verify you're human.
          </div>
        </div>

        <!-- Run Tests Button -->
        <button type="submit">Run Tests</button>

        <!-- Advanced settings toggle button -->
        <button type="button" class="advanced-toggle" @click="showAdvanced = !showAdvanced">
          {{ showAdvanced ? 'Hide Advanced Settings' : 'Show Advanced Settings' }}
        </button>

        </div>


        <!-- Advanced settings -->
        <div class="form-group advanced-settings" :class="{ 'show': showAdvanced }">
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

            <div class="option" v-if="model.users.enableCreate">
              <label for="create-user-template">Example User JSON:</label>
              <textarea 
                id="create-user-template" 
                v-model="model.users.createTemplate" 
                placeholder="Provide example JSON for user creation (optional)"
                rows="3"></textarea>
              <div class="hint">Leave empty to use default template</div>
            </div>

            <div class="option">
              <input type="checkbox" id="enable-users-replace" v-model="model.users.enableReplace">
              <label for="enable-users-replace">Put</label>
            </div>
            <div class="option" v-if="model.users.enableReplace">
              <label for="users-replace-id">User ID for Put:</label>
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
            <div class="option" v-if="model.users.enableDelete">
              <label for="users-delete-id">User ID for Delete:</label>
              <input type="text" id="users-delete-id" v-model="model.users.deleteId" 
              placeholder="Leave empty to auto-detect">
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
      url: '',
      token: '',
      config: '',
      output: '',
      socket: null,
      result: new Map(),
      testFiles: [],
      activeTab: 'Config', // Changed default tab
      showAdvanced: false, // Hide advanced settings by default

      // Simple nested model structure with detection options
      model: {
        detectSchema: true,
        detectResourceTypes: true,
        users: {
          enabled: true,
          sortAttributes: ['userName'],
          enableCreate: true,
          createTemplate: null,
          enableReplace: true,
          enableUpdate: true,
          enableDelete: true,
          replaceId: null,
          updateId: null,
          deleteId: null
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

      // Turnstile data
      turnstileToken: import.meta.env.VITE_TURNSTILE_SITE_KEY,
      turnstileError: false,
      turnstileWidgetId: null,
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
  mounted() {
    // Initialize Turnstile when the component is mounted
    this.loadTurnstileScript();
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
    // Clean up Turnstile if it was initialized
    if (this.turnstileWidgetId) {
      turnstile.reset(this.turnstileWidgetId);
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

    // Load Turnstile script
    loadTurnstileScript() {
      if (window.turnstile) {
        this.renderTurnstileWidget();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.onload = this.renderTurnstileWidget;
      document.body.appendChild(script);
    },

    // Render the Turnstile widget
    renderTurnstileWidget() {
      if (!window.turnstile) return;
      
      // Use the environment variable for the site key or fallback to a default
      const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA';
      
      // Reset any existing widget
      if (this.turnstileWidgetId) {
        turnstile.reset(this.turnstileWidgetId);
      }
      
      // Render the widget
      this.turnstileWidgetId = turnstile.render('#turnstile-widget', {
        sitekey: siteKey,
        callback: (token) => {
          this.turnstileToken = token;
          this.turnstileError = false;
        },
        'expired-callback': () => {
          this.turnstileToken = null;
          this.turnstileError = true;
        }
      });
    },
    
    // Validate Turnstile before running tests
    validateAndRunTests() {
      if (!this.turnstileToken) {
        this.turnstileError = true;
        return;
      }
      
      this.runTests();
    },

    setupSocket() {
      if (this.socket && this.socket.connected) {
        return; // Socket already connected
      }

      if (this.socket) {
        this.socket.disconnect(); // Disconnect any existing socket
      }

      this.socket = io(import.meta.env.VITE_SCIM_TEST_SERVER_URL); // Adjust the URL if needed

      this.socket.on('connect', () => {
        // connected
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

      this.showAdvanced = false;

      const configObject = {
        url: this.url,
        token: this.token,
        activeTab: this.activeTab,
        detectSchema: this.model.detectSchema,
        detectResourceTypes: this.model.detectResourceTypes,
        users: this.model.users,
        groups: this.model.groups,
        turnstileToken: this.turnstileToken // Include Turnstile token
      };

      if (this.activeTab === 'Custom' && this.model.custom.enabled) {
        configObject.custom = this.model.custom;
      }

      this.setupSocket(); // Connect to socket when running tests

      this.result.clear();
      this.testFiles = [];
      this.diagnosticTabs.clear(); // Clear previous tab states
      this.socket.emit('start-tests', configObject);
      
      // Reset Turnstile after submitting
      this.resetTurnstile();
    },
    
    // Reset Turnstile widget
    resetTurnstile() {
      if (window.turnstile && this.turnstileWidgetId) {
        turnstile.reset(this.turnstileWidgetId);
        this.turnstileToken = null;
      }
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
  max-width: 1000px;
  margin: 0 auto;
  padding: 0 20px;
  width: 100%;
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  color: #3c4043;
}

@media (max-width: 1040px) {
  .report-container {
    max-width: 100%;
  }
}

/* Chrome-like form styling */
.test-form {
  margin: 28px 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background-color: transparent;
  border: none;
  box-shadow: none;
}

/* Chrome-style section card */
.form-group {
  margin-bottom: 16px;
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(60, 64, 67, 0.3), 0 1px 3px 1px rgba(60, 64, 67, 0.15);
  overflow: hidden;
}

/* URL and Token inputs section */
.form-group:nth-child(-n+2) {
  padding: 20px 24px;
}

/* Form elements */
label {
  display: block;
  font-weight: 500;
  margin-bottom: 8px;
  color: #3c4043;
  font-size: 13px;
}

input[type="url"],
input[type="text"],
textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #dadce0;
  border-radius: 4px;
  font-size: 14px;
  transition: all 0.15s ease;
  background-color: #ffffff;
  color: #3c4043;
  box-shadow: none;
  
  &:focus {
    outline: none;
    border-color: #1a73e8;
    box-shadow: 0 1px 2px rgba(26, 115, 232, 0.1);
  }
  
  &::placeholder {
    color: #80868b;
  }
}

/* Tabs styling - Chrome style */
.tabs {
  display: flex;
  border-bottom: 1px solid #dadce0;
  margin-bottom: 0;
  gap: 0;
  background-color: #ffffff;
  padding: 0;
}

.tab {
  padding: 14px 16px 14px;
  cursor: pointer;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  border-radius: 0;
  transition: all 0.15s ease;
  background-color: transparent;
  font-weight: 500;
  user-select: none;
  font-size: 14px;
  color: #5f6368;
  flex: 1;
  text-align: center;
  
  &:hover {
    background-color: rgba(26, 115, 232, 0.04);
    color: #1a73e8;
  }
  
  &.active {
    background-color: transparent;
    border-bottom: 2px solid #1a73e8;
    font-weight: 500;
    color: #1a73e8;
    box-shadow: none;
  }
}

.tab-content {
  padding: 24px;
  background-color: white;
  border-top: none;
  border-radius: 0;
  box-shadow: none;
}

/* Checkbox styling - Chrome style */
.option {
  margin-bottom: 18px;
  display: flex;
  align-items: flex-start; /* Changed from center to flex-start */
  flex-wrap: wrap; /* Added to allow wrapping for longer elements */
  
  label {
    display: inline-block;
    font-weight: 400;
    cursor: pointer;
    color: #3c4043;
    user-select: none;
    width: 300px;
    font-size: 14px;
    margin-bottom: 8px; /* Added margin bottom */
  }

  textarea {
    width: 100%;
    min-height: 120px;
    font-family: 'SF Mono', SFMono-Regular, ui-monospace, Consolas, Menlo, monospace;
    font-size: 13px;
    line-height: 1.4;
    padding: 12px;
    background-color: #f9fafb;
    border: 1px solid #dadce0;
    border-radius: 4px;
    resize: vertical;
    
    &:focus {
      outline: none;
      border-color: #1a73e8;
      box-shadow: 0 1px 2px rgba(26, 115, 232, 0.1);
    }
  }

  .hint {
    width: 100%;
    margin-top: 6px;
    color: #5f6368;
    font-size: 12px;
    font-style: italic;
  }
  
}

.option {
  margin-bottom: 18px;
  display: flex;
  align-items: center;
  
  label {
    display: inline-block;
    font-weight: 400;
    cursor: pointer;
    color: #3c4043;
    user-select: none;
    width: 300px;
    font-size: 14px;
    margin-bottom: 0;
  }
  
  input[type="checkbox"] {
    appearance: none;
    -webkit-appearance: none;
    width: 16px;
    height: 16px;
    border: 2px solid #5f6368;
    border-radius: 2px;
    margin-right: 12px;
    cursor: pointer;
    vertical-align: middle;
    transition: all 0.15s;
    background-color: white;
    position: relative;
    
    &:checked {
      background-color: #1a73e8;
      border-color: #1a73e8;
      
      &::after {
        content: '';
        position: absolute;
        left: 4px;
        top: 1px;
        width: 4px;
        height: 8px;
        border: solid white;
        border-width: 0 2px 2px 0;
        transform: rotate(45deg);
      }
    }
    
    &:hover {
      border-color: #1a73e8;
    }
    
    &:focus {
      outline: none;
      box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.25);
    }
  }
}

/* Button styling - Chrome style */
button {
  background-color: #1a73e8;
  color: white;
  padding: 8px 24px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.15s ease;
  font-size: 14px;
  letter-spacing: 0.25px;
  margin-top: 8px;
  
  &:hover {
    background-color: #1765cc;
    box-shadow: 0 1px 2px rgba(60, 64, 67, 0.3), 0 1px 3px 1px rgba(60, 64, 67, 0.15);
  }
  
  &:active {
    background-color: #185abc;
    box-shadow: 0 1px 2px rgba(60, 64, 67, 0.3), 0 1px 3px 1px rgba(60, 64, 67, 0.15);
  }
}

/* Advanced settings toggle button */
.advanced-toggle {
  background-color: transparent;
  color: #1a73e8;
  padding: 8px 16px;
  border: 1px solid #1a73e8;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.15s ease;
  font-size: 14px;
  letter-spacing: 0.25px;
  margin-top: 16px;
  margin-left: 12px;
  
  &:hover {
    background-color: rgba(26, 115, 232, 0.04);
    box-shadow: 0 1px 2px rgba(60, 64, 67, 0.1);
  }
  
  &:active {
    background-color: rgba(26, 115, 232, 0.08);
    box-shadow: 0 1px 2px rgba(60, 64, 67, 0.1);
  }
}

/* Test output styling */
.test-output {
  padding: 20px;
  margin-top: 30px;
  border-color: #dadce0;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(60, 64, 67, 0.3), 0 1px 3px 1px rgba(60, 64, 67, 0.15);
  
  h2 {
    margin: 0 0 20px 0;
    font-size: 16px;
    color: #3c4043;
    padding-bottom: 12px;
    border-bottom: 1px solid #dadce0;
    font-weight: 500;
  }
}

/* The rest of the existing styles for results, etc. */
.file-item {
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid #dadce0;
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
    padding: 0;
  }
  
  .form-group:nth-child(-n+2) {
    padding: 16px;
  }
  
  .tab {
    padding: 12px 8px;
    font-size: 13px;
  }
  
  .tab-content {
    padding: 16px;
  }
  
  .option label {
    width: auto;
  }
  
  button {
    width: 100%;
  }

  .advanced-toggle {
    margin-left: 0;
    width: 100%;
    margin-top: 16px;
  }

  .turnstile-container {
    margin: 16px 0;
  }
}

/* Turnstile container styling */
.turnstile-container {
  margin: 20px 0;
  display: flex;
  flex-direction: column;
  align-items: start;
}

.turnstile-error {
  color: #ef4444;
  font-size: 14px;
  margin-top: 8px;
  font-weight: 500;
}

/* Advanced settings animation */
.advanced-settings {
  max-height: 0;
  opacity: 0;
  overflow: hidden;
  transition: max-height 0.3s ease-out, opacity 0.2s ease-out;
}

.advanced-settings.show {
  max-height: 2000px; /* Large enough to contain all content */
  opacity: 1;
}
</style>
