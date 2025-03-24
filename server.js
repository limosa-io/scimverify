import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import { run } from 'node:test';
import { ndjson } from './reporters/ndjson-reporter.js';
import { Writable } from 'stream';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Function to verify Turnstile token
async function verifyTurnstileToken(token, remoteip) {
    try {
        const response = await axios.post('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            secret: process.env.TURNSTILE_SECRET_KEY,
            response: token,
            remoteip: remoteip
        });
        return response.data.success === true;
    } catch (error) {
        console.error('Turnstile verification error:', error);
        return false;
    }
}

// HTTP endpoint for running tests with streaming response
app.post('/run-tests', async (req, res) => {

    if (process.env.TURNSTILE_ENABLED === 'true') {
        const token = req.headers['cf-challenge-token'];
        const remoteip = req.headers['cf-connecting-ip'];
        if (!token || !remoteip) {
            return res.status(400).json({ error: 'Missing Turnstile token or remote IP' });
        }
        if (!await verifyTurnstileToken(token, remoteip)) {
            return res.status(403).json({ error: 'Invalid Turnstile token' });
        }
    }

    // Set environment variables from the request
    process.env.BASE_URL = req.body.url;
    process.env.AUTH_HEADER = req.body.authHeader;
    process.env.CONFIG = JSON.stringify(req.body);

    // Create a writable stream that forwards to the HTTP response
    const responseStream = new Writable({
        write(chunk, encoding, callback) {
            res.write(chunk);
            callback();
        }
    });

    // Run tests directly and pipe output to response
    const testRun = run({
        files: [path.resolve(__dirname, 'scim.test.js')],
        concurrency: 1,
    });
    
    testRun.on('test:fail', () => {
        process.exitCode = 1;
    });

    testRun.on('end', () => {
        res.end();
    });

    testRun.pipe(ndjson()).pipe(responseStream);
});

// For traditional server
if (process.env.SERVER_MODE !== 'function') {
    const httpServer = createServer(app);
    
    const PORT = process.env.PORT || 3000;
    httpServer.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

// Export for serverless function use - Digital Ocean Functions will use this
export default async function(req, res) {
    return app(req, res);
}
