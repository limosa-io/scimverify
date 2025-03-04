import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
// Allow all origins for the sake of simplicity
app.use(cors());
const io = new Server(httpServer, {
    cors: {
        origin: '*'
    }
});

app.use(express.json());

io.on('connection', (socket) => {
    console.log('Client connected');

    // Automatically close the socket after 1 minute
    const oneMinuteTimer = setTimeout(() => {
        console.log('Closing socket after 1 minute');
        socket.disconnect(true);
    }, 60000);
    
    socket.on('start-tests', (configuration) => {
        if (!configuration.url || !configuration.token) {
            socket.emit('error', 'URL and token are required');
            return;
        }

        const testProcess = spawn('node', [
            path.resolve(__dirname, 'index.js')
        ], {
            env: {
                BASE_URL: configuration.url,
                TOKEN: configuration.token,
                CONFIG: JSON.stringify(configuration)
            }
        });

        testProcess.stdout.on('data', (data) => {
            socket.emit('test-output', data.toString());
        });

        testProcess.stderr.on('data', (data) => {
            socket.emit('test-error', data.toString());
        });

        testProcess.on('close', (code) => {
            socket.emit('test-complete', { code });
        });

        testProcess.on('error', (err) => {
            socket.emit('error', `Test execution failed: ${err.message}`);
        });
    });

    // When the client disconnects, clear the timer
    socket.on('disconnect', () => {
        clearTimeout(oneMinuteTimer);
        console.log('Client disconnected');
    });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
