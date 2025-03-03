const express = require('express');
const { exec } = require('child_process');
const { run } = require('node:test');
const { spec } = require('node:test/reporters');
const path = require('node:path');
const { setConfiguration } = require('./src/helpers');
const fs = require('fs');
const { spawn } = require('child_process');

const app = express();
app.use(express.json());

app.post('/run-tests', (req, res) => {
    const configuration = req.body;

    if (!configuration.url || !configuration.token) {
        return res.status(400).send('URL and token are required');
    }

    // write configuration to a file with a secure random name
    const configurationFilePath = path.resolve(__dirname, `config-${Math.random().toString(36).substring(7)}.json`);
    fs.writeFileSync(configurationFilePath, JSON.stringify(configuration));

    const testProcess = spawn('node', [
        path.resolve(__dirname, 'index.js'),
        configurationFilePath,
    ]);

    testProcess.stdout.on('data', (data) => {
        res.write(data);
    });

    testProcess.stderr.on('data', (data) => {
        res.write(data);
    });

    testProcess.on('close', (code) => {
        res.end();
        fs.unlinkSync(configurationFilePath); // clean up the configuration file
    });

    testProcess.on('error', (err) => {
        res.status(500).send(`Test execution failed: ${err.message}`);
        fs.unlinkSync(configurationFilePath); // clean up the configuration file
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
