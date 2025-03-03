const express = require('express');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
app.use(express.json());

app.post('/run-tests', (req, res) => {
    const configuration = req.body;

    if (!configuration.url || !configuration.token) {
        return res.status(400).send('URL and token are required');
    }

    // Convert configuration to a single environment variable
    const env = {
        BASE_URL: configuration.url,
        TOKEN: configuration.token,
        CONFIG: JSON.stringify(configuration)
    };

    const testProcess = spawn('node', [
        path.resolve(__dirname, 'index.js')
    ], {
        env: env
    });

    testProcess.stdout.on('data', (data) => {
        res.write(data);
    });

    testProcess.stderr.on('data', (data) => {
        res.write(data);
    });

    testProcess.on('close', (code) => {
        res.end();
    });

    testProcess.on('error', (err) => {
        res.status(500).send(`Test execution failed: ${err.message}`);
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
