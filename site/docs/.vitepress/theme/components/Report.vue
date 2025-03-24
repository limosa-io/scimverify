<template>
  <div class="report-container">
    <div class="test-form">
      <form @submit.prevent="validateAndRunTests">

        <div class="form-group">

          <p style="margin-bottom: 20px;">
            <span class="font-scim">SCIM</span> <span style="font-weight: 600">Verify</span> is a conformance testing
            tool to verify your <span class="font-scim">SCIM</span> <span style="font-weight: 600">2.0</span>
            implementation complies with the specifications.
          </p>

          <label for="url">SCIM Base URL:</label>
          <input type="url" id="url" v-model="url" required placeholder="Enter the SCIM Base URL">
          <div class="input-hint">Example: https://api.scim.dev/scim/v2</div>


          <label for="auth-scheme" style="margin-top: 15px;">Authentication Scheme:</label>
          <select id="auth-scheme" v-model="authScheme" required>
            <option value="basic">Basic</option>
            <option value="bearer">Bearer</option>
            <option value="custom">Custom</option>
          </select>

          <div v-if="authScheme === 'basic'" style="margin-top: 10px;">
            <label for="basic-username">Username:</label>
            <input type="text" id="basic-username" v-model="basicAuth.username" required placeholder="Enter username">

            <label for="basic-password" style="margin-top: 10px;">Password:</label>
            <input type="password" id="basic-password" v-model="basicAuth.password" required
              placeholder="Enter password">
          </div>

          <div v-if="authScheme === 'bearer'" style="margin-top: 10px;">
            <label for="bearer-token">Bearer Token:</label>
            <input type="text" id="bearer-token" v-model="bearerToken" required placeholder="Enter the Bearer token">
          </div>

          <div v-if="authScheme === 'custom'" style="margin-top: 10px;">
            <label for="custom-auth">Custom Authorization Header:</label>
            <input type="text" id="custom-auth" v-model="customAuth" required
              placeholder="Enter the complete Authorization header value">
            <div class="input-hint">Example: Basic dXNlcm5hbWU6cGFzc3dvcmQ=</div>
          </div>

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


        <!-- Advanced settings YAML editor -->
        <div class="form-group advanced-settings" :class="{ 'show': showAdvanced }">
          <div class="editor-label">
            <label for="yaml-editor">Advanced Configuration (YAML):</label>
            <div class="editor-hint">Configure test settings using YAML format</div>
          </div>
          <div ref="editor" class="yaml-editor"></div>
          <div v-if="yamlError" class="yaml-error">
            {{ yamlError }}
          </div>
        </div>


      </form>
    </div>

    <!-- Test Output Section -->
    <div class="test-output" ref="testOutputSection" v-if="testFiles?.length > 0">
      <h2>Test Results</h2>
      <div
        v-for="testFile in testFiles.filter(f => f.results.filter(r => ['test:pass', 'test:fail'].includes(r.getLatest().type)).length > 0)"
        class="file-item">
        <details v-for="r in testFile.results.filter(r => ['test:pass', 'test:fail'].includes(r.getLatest().type))"
          class="result-item">
          <summary class="result-value" :class="[
            r.getLatest().type,
            r.skipped() ? 'test:skip' : '',
            !(r.getLatest().type === 'test:fail' ||
              r.skipped() ||
              r.messages.some(m => m.type === 'test:diagnostic' && m.data.message?.type === 'request')) ? 'no-details' : ''
          ]">
            <component :is="r.getLatest().data.nesting == 0 ? 'h2' : 'h3'">
              {{ r.getLatest().data.name }} <span>show more ↴</span>
            </component>
          </summary>

          <p v-if="r.getLatest().type == 'test:fail' && !r.skipped()">
            <strong>Error:</strong> {{ r.getLatest().data?.details?.assertionMessage?.replace('\n\n', ': ') }}
          </p>

          <p v-if="r.skipped()">This test was skipped because it depends on a prerequisite test that failed.</p>

          <!-- Diagnostic Messages -->
          <div v-else-if="r.messages.filter(m => ['test:diagnostic'].includes(m.type)).length > 0"
            v-for="msg in r?.messages.filter(m => ['test:diagnostic'].includes(m.type) && m.data.message.type == 'request')"
            class="diagnostic-tabs">
            <div class="tabs">
              <div class="tab" :class="{ active: getActiveDiagnosticTab(msg.id) === 'request' }"
                @click="setDiagnosticTab(msg.id, 'request')">
                Request
              </div>
              <div class="tab" :class="{ active: getActiveDiagnosticTab(msg.id) === 'response' }"
                @click="setDiagnosticTab(msg.id, 'response')">
                Response
              </div>
            </div>

            <div v-if="getActiveDiagnosticTab(msg.id) === 'request'" class="tab-content">
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

            <div v-if="getActiveDiagnosticTab(msg.id) === 'response'" class="tab-content">
              <div v-for="response in r?.messages.filter((m, index) => {
                const msgIndex = r.messages.findIndex(item => item.id === msg.id);
                return ['test:diagnostic'].includes(m.type) &&
                  m.data.message.type == 'response' &&
                  m.data.message.requestId === msg.data.message.id &&
                  index > msgIndex;
              }).slice(0, 1)">
                <div>HTTP {{ response.data.message.status }} {{ response.data.message.statusText }}</div>
                <div v-if="response.data.message.headers">
                  <span v-for="(value, key) in response.data.message.headers" :key="key">
                    <strong>{{ key }}:</strong> {{ value }}<br />
                  </span>
                </div>
                <pre v-if="response.data.message.body">{{ formatJSON(response.data.message.body) }}</pre>
              </div>
            </div>
          </div>
        </details>
      </div>
    </div>
  </div>
</template>

<script>
import { io } from 'socket.io-client';
import { EditorView, basicSetup, minimalSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { yaml } from '@codemirror/lang-yaml';
import { oneDark } from '@codemirror/theme-one-dark';
import jsYaml from 'js-yaml';
import { lineNumbers } from '@codemirror/view';
import { foldGutter, foldKeymap } from '@codemirror/language';
import { keymap } from '@codemirror/view';
import defaultConfig from './config.yaml?raw';

class TestResult {
  constructor(file, line, column, name) {
    this.file = file;
    this.line = line;
    this.column = column;
    this.name = name;
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

  findResult(line, column, name) {
    return this.results.find(r => r.line === line && r.column === column && r.name === name);
  }
}

export default {
  data() {
    // Parse the default config
    let defaultModel = {};
    try {
      defaultModel = jsYaml.load(defaultConfig) || {};
    } catch (err) {
      console.error('Failed to parse default config:', err);
    }

    return {
      url: '',
      authScheme: 'bearer', // Default to bearer
      bearerToken: '',
      basicAuth: {
        username: '',
        password: ''
      },
      customAuth: '',
      config: '',
      output: '',
      socket: null,
      result: new Map(),
      testFiles: [],
      showAdvanced: false, // Hide advanced settings by default
      editor: null,
      yamlConfig: '',
      yamlError: null,

      // Model structure with detection options, initialized with default config
      model: defaultModel,

      // Track active diagnostic tabs per message
      diagnosticTabs: new Map(),

      // Turnstile data
      turnstileToken: import.meta.env.VITE_TURNSTILE_SITE_KEY,
      turnstileError: false,
      turnstileWidgetId: null,
    };
  },
  created() {
    this.modelToYaml();
  },
  mounted() {
    this.loadTurnstileScript();
    this.initEditor();
  },
  watch: {
    'model': {
      deep: true,
      handler() {
        this.modelToYaml();
        this.updateConfig();
      }
    },
    showAdvanced(newVal) {
      if (newVal && this.editor) {
        // Need to refresh the editor when it becomes visible
        setTimeout(() => {
          this.editor.dispatch({ type: "refresh" });
        }, 10);
      }
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
    // Clean up editor
    if (this.editor) {
      this.editor.destroy();
    }
  },
  methods: {
    // Initialize CodeMirror editor
    initEditor() {
      if (!this.$refs.editor) {
        setTimeout(() => this.initEditor(), 100);
        return;
      }

      const startState = EditorState.create({
        doc: this.yamlConfig,
        extensions: [
          minimalSetup,
          lineNumbers(),
          yaml(),
          oneDark,
          foldGutter(),
          keymap.of(foldKeymap),
          EditorView.updateListener.of(update => {
            if (update.docChanged) {
              this.yamlConfig = update.state.doc.toString();
              this.yamlToModel();
            }
          })
        ]
      });

      this.editor = new EditorView({
        state: startState,
        parent: this.$refs.editor
      });
    },

    // Convert model to YAML
    modelToYaml() {
      try {
        this.yamlConfig = jsYaml.dump(this.model, {
          indent: 2,
          lineWidth: -1,
          noRefs: true
        });

        // Update editor content if it exists and content is different
        if (this.editor && this.editor.state.doc.toString() !== this.yamlConfig) {
          this.editor.dispatch({
            changes: {
              from: 0,
              to: this.editor.state.doc.length,
              insert: this.yamlConfig
            }
          });
        }
        this.yamlError = null;
      } catch (err) {
        console.error('Failed to convert model to YAML:', err);
        this.yamlError = 'Error converting configuration to YAML: ' + err.message;
      }
    },

    // Convert YAML to model
    yamlToModel() {
      try {
        const parsed = jsYaml.load(this.yamlConfig);
        if (parsed && typeof parsed === 'object') {
          // Preserve existing structure while updating values
          this.mergeConfig(this.model, parsed);
          this.updateConfig();
          this.yamlError = null;
        } else {
          this.yamlError = 'Invalid YAML configuration format';
        }
      } catch (err) {
        console.error('Failed to parse YAML:', err);
        this.yamlError = 'YAML syntax error: ' + err.message;
      }
    },

    // Recursively merge configs
    mergeConfig(target, source) {
      for (const key in source) {
        if (key in target) {
          if (source[key] !== null && typeof source[key] === 'object' && typeof target[key] === 'object') {
            this.mergeConfig(target[key], source[key]);
          } else {
            target[key] = source[key];
          }
        } else {
          target[key] = source[key];
        }
      }
    },

    updateConfig() {
      this.config = JSON.stringify(this.model, null, 2);
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

            json.id = Math.random().toString(36).substring(2, 15)

            // append to results, or update existing entry if it has the same file, line and column
            if (json.data.nesting >= 0) {
              // Find or create TestFile
              let testFile = this.testFiles.find(tf => tf.file === json.data.file);
              if (!testFile) {
                testFile = new TestFile(json.data.file);
                this.testFiles.push(testFile);
              }

              // Find or create TestResult
              let existing = testFile.findResult(
                json.data.line,
                json.data.column,
                json.data.name ?? json.data.message?.test_name
              );

              if (existing) {
                existing.messages.push(json);
              } else {
                let r = new TestResult(
                  json.data.file,
                  json.data.line,
                  json.data.column,
                  json.data.name ?? json.data.message?.test_name
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

      // Format authentication based on the selected scheme
      let authHeader = '';

      if (this.authScheme === 'basic') {
        // Create Base64 encoded basic auth
        const base64Auth = btoa(`${this.basicAuth.username}:${this.basicAuth.password}`);
        authHeader = `Basic ${base64Auth}`;
      } else if (this.authScheme === 'bearer') {
        authHeader = `Bearer ${this.bearerToken}`;
      } else if (this.authScheme === 'custom') {
        authHeader = this.customAuth;
      }

      const configObject = {
        url: this.url,
        authHeader: authHeader, // Send the formatted auth header
        ...this.model,
        turnstileToken: this.turnstileToken
      };

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

input[type="password"],
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
  align-items: flex-start;
  /* Changed from center to flex-start */
  flex-wrap: wrap;
  /* Added to allow wrapping for longer elements */

  label {
    display: inline-block;
    font-weight: 400;
    cursor: pointer;
    color: #3c4043;
    user-select: none;
    width: 300px;
    font-size: 14px;
    margin-bottom: 8px;
    /* Added margin bottom */
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

  span {
    display: inline-block;
    font-size: 0.75rem;
    color: #6b7280;
    margin-left: 8px;
    padding: 2px 6px;
    background-color: #f3f4f6;
    border-radius: 4px;
    font-weight: normal;
    vertical-align: middle;
  }

  &.no-details {
    cursor: default;



    span {
      display: none;
    }
  }

  h2,
  h3 {
    display: inline;
    margin: 0;
    padding: 0;
    font-weight: 600;
    font-size: 1rem;
  }

  &:hover {
    background-color: #f5f5f5;
  }

  &.no-details:hover {
    background-color: #fafafa;
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.3);
  }

  &.no-details:focus {
    box-shadow: none;
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
pre,
.http-request {
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
details[open]>summary~* {
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
  max-height: 2000px;
  /* Large enough to contain all content */
  opacity: 1;
}

/* YAML Editor styling */
.editor-label {
  margin-bottom: 12px;
}

.editor-hint {
  font-size: 12px;
  color: #5f6368;
  margin-top: 4px;
}

.yaml-editor {
  height: 400px;
  border-radius: 4px;
  overflow: hidden;
  font-family: 'SF Mono', SFMono-Regular, ui-monospace, Consolas, Menlo, monospace;
  border: 1px solid #dadce0;
}

.yaml-editor :deep(.cm-editor) {
  height: 100%;
}

.yaml-editor :deep(.cm-scroller) {
  overflow: auto;
}

.yaml-error {
  color: #ef4444;
  font-size: 14px;
  margin-top: 8px;
  padding: 8px 12px;
  background-color: rgba(239, 68, 68, 0.05);
  border-radius: 4px;
  border-left: 3px solid #ef4444;
}

/* Advanced settings animation */
.advanced-settings {
  max-height: 0;
  opacity: 0;
  overflow: hidden;
  transition: max-height 0.3s ease-out, opacity 0.2s ease-out;
}

.advanced-settings.show {
  max-height: 500px;
  /* Adjust to fit the YAML editor */
  opacity: 1;
}

select {
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
}

.input-hint {
  font-size: 12px;
  color: #5f6368;
  margin-top: 4px;
  margin-bottom: 10px;
}
</style>
