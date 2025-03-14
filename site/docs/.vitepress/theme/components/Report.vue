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
        <div class="option">
          <input type="checkbox" id="detect-schema" v-model="model.detectSchema">
          <label for="detect-schema">Detect Schema</label>
        </div>
        
        <div class="option">
          <input type="checkbox" id="detect-resource-types" v-model="model.detectResourceTypes">
          <label for="detect-resource-types">Detect Resource Types</label>
        </div>
      </div>

      <div class="form-group">
        <label>Resource Type:</label>
        <div class="tabs">
          <div class="tab" :class="{ active: activeTab === 'Users' }" @click="setResourceType('Users')">
            Users
          </div>
          <div class="tab" :class="{ active: activeTab === 'Groups' }" @click="setResourceType('Groups')">
            Groups
          </div>
          <!-- <div class="tab" :class="{ active: activeTab === 'Custom' }" @click="setResourceType('Custom')">
            Custom
          </div> -->
        </div>

        <div v-if="activeTab === 'Users'" class="tab-content">
          <div class="option">
            <input type="checkbox" id="enable-users" v-model="model.users.enabled">
            <label for="enable-users">Enable Users testing</label>
          </div>

          <div class="option">
            <input type="checkbox" id="enable-users-create" v-model="model.users.enableCreate">
            <label for="enable-users-create">Enable Create</label>
          </div>
          
          <div class="option">
            <input type="checkbox" id="enable-users-replace" v-model="model.users.enableReplace">
            <label for="enable-users-replace">Enable Replace (PUT)</label>
          </div>
          
          <div class="option">
            <input type="checkbox" id="enable-users-update" v-model="model.users.enableUpdate">
            <label for="enable-users-update">Enable Update (PATCH)</label>
          </div>
          
          <div class="option">
            <input type="checkbox" id="enable-users-delete" v-model="model.users.enableDelete">
            <label for="enable-users-delete">Enable Delete</label>
          </div>

          <div class="option">
            <label for="users-sort-attributes">Sort Attributes to Test:</label>
            <input type="text" id="users-sort-attributes" v-model="userSortAttributesText"
              placeholder="Comma-separated attributes" @change="updateUserSortAttributes">
          </div>

        </div>

        <div v-if="activeTab === 'Groups'" class="tab-content">
          <div class="option">
            <input type="checkbox" id="enable-groups" v-model="model.groups.enabled">
            <label for="enable-groups">Enable Groups testing</label>
          </div>
          
          <div class="option">
            <input type="checkbox" id="enable-groups-create" v-model="model.groups.enableCreate">
            <label for="enable-groups-create">Enable Create</label>
          </div>
          
          <div class="option">
            <input type="checkbox" id="enable-groups-replace" v-model="model.groups.enableReplace">
            <label for="enable-groups-replace">Enable Replace (PUT)</label>
          </div>
          
          <div class="option">
            <input type="checkbox" id="enable-groups-update" v-model="model.groups.enableUpdate">
            <label for="enable-groups-update">Enable Update (PATCH)</label>
          </div>
          
          <div class="option">
            <input type="checkbox" id="enable-groups-delete" v-model="model.groups.enableDelete">
            <label for="enable-groups-delete">Enable Delete</label>
          </div>
          
          <div class="option">
            <label for="groups-sort-attributes">Sort Attributes to Test:</label>
            <input type="text" id="groups-sort-attributes" v-model="groupSortAttributesText"
              placeholder="Comma-separated attributes" @change="updateGroupSortAttributes">
          </div>
        </div>
      </div>

      <div class="form-group">
        <label for="config">Optional JSON Configuration:</label>
        <textarea id="config" v-model="config" readonly></textarea>
      </div>
      <button type="submit">Run Tests</button>
    </form>
  </div>

  <div class="test-output">
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
      activeTab: 'Users',
      
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
          enableDelete: true
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
      customSortAttributesText: ''
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
    'model': function() {
      this.updateConfig();
    },
    'model.groups.enabled': function() {
      this.updateConfig();
    },
    'model.users.enableCreate': function() {
      this.updateConfig();
    },
    'model.users.enableReplace': function() {
      this.updateConfig();
    },
    'model.users.enableUpdate': function() {
      this.updateConfig();
    },
    'model.groups.enableCreate': function() {
      this.updateConfig();
    },
    'model.groups.enableReplace': function() {
      this.updateConfig();
    },
    'model.groups.enableUpdate': function() {
      this.updateConfig();
    },
    'model.detectSchema': function() {
      this.updateConfig();
    },
    'model.detectResourceTypes': function() {
      this.updateConfig();
    },
    'model.users.enableDelete': function() {
      this.updateConfig();
    },
    'model.groups.enableDelete': function() {
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
      this.socket.emit('start-tests', configObject);
    }
  }
};
</script>

<style scoped>
.tabs {
  display: flex;
  border-bottom: 1px solid #ddd;
  margin-bottom: 0; /* Removed margin to eliminate spacing */
  gap: 4px;
}

.tab {
  padding: 10px 20px;
  cursor: pointer;
  border: 1px solid #e2e8f0;
  border-bottom: none;
  margin-bottom: -1px;
  border-radius: 6px 6px 0 0;
  transition: all 0.2s ease;
  background-color: #f8fafc;
  font-weight: 500;
  user-select: none;
}

.tab:hover {
  background-color: #edf2f7;
  color: #3182ce;
}

.tab.active {
  background-color: #fff;
  border-color: #ddd;
  border-bottom-color: white;
  font-weight: 600;
  color: #3182ce;
  box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.05);
}

.tab-content {
  padding: 18px;
  background-color: white;
  border: 1px solid #ddd;
  border-top: none;
  border-radius: 0 0 8px 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.option {
  margin-bottom: 16px;
  display: flex;
  align-items: center;
}

.option input[type="checkbox"] {
  appearance: none;
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  border: 1px solid #cbd5e0;
  border-radius: 4px;
  margin-right: 10px;
  position: relative;
  cursor: pointer;
  vertical-align: middle;
  transition: all 0.2s;
  background-color: white;
}

.option input[type="checkbox"]:checked {
  background-color: #4299e1;
  border-color: #4299e1;
}

.option input[type="checkbox"]:checked::after {
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

.option input[type="checkbox"]:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.25);
}

.option label {
  display: inline-block;
  font-weight: 500;
  cursor: pointer;
  color: #4a5568;
  user-select: none;
  width: 300px;
}

select[multiple] {
  height: 120px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 8px;
  width: 100%;
  background-color: white;
}

select[multiple] option {
  padding: 6px 8px;
  margin: 2px 0;
  border-radius: 4px;
}

select[multiple] option:checked {
  background-color: #ebf4ff;
  color: #3182ce;
}

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
