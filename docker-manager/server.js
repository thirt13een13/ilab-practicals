const express = require('express');
const { exec } = require('child_process');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Start experiment container
app.post('/api/start-experiment', async (req, res) => {
    const { image, port } = req.body;
    
    console.log(`Starting experiment: ${image} on port ${port}`);
    
    // Check if container is already running on this port
    exec(`docker ps --filter "publish=${port}" --format "{{.Names}}"`, (error, stdout) => {
        if (stdout.trim()) {
            console.log(`Container already running on port ${port}: ${stdout.trim()}`);
            return res.json({ 
                success: true,
                message: 'Container already running', 
                port,
                url: `http://localhost:${port}`
            });
        }
        
        // Try to start container with this image
        const containerName = `experiment-${port}`;
        
        // First check if container exists but is stopped
        exec(`docker ps -a --filter "name=${containerName}" --format "{{.Names}}"`, (err, existingContainer) => {
            if (existingContainer.trim()) {
                // Container exists, start it
                exec(`docker start ${containerName}`, (startErr) => {
                    if (startErr) {
                        console.error('Error starting container:', startErr);
                        return res.status(500).json({ 
                            success: false,
                            error: `Failed to start container: ${startErr.message}` 
                        });
                    }
                    console.log(`Started existing container: ${containerName}`);
                    res.json({ 
                        success: true,
                        message: 'Container started', 
                        port,
                        url: `http://localhost:${port}`
                    });
                });
            } else {
                // Container doesn't exist, create new one
                const cmd = `docker run -d -p ${port}:80 --name ${containerName} ${image}`;
                console.log('Running:', cmd);
                
                exec(cmd, (runErr) => {
                    if (runErr) {
                        console.error('Error running container:', runErr);
                        
                        let errorMsg = runErr.message;
                        if (runErr.message.includes('No such image')) {
                            errorMsg = `Image '${image}' not found. Build it with: docker build -t ${image} .`;
                        } else if (runErr.message.includes('port is already allocated')) {
                            errorMsg = `Port ${port} is already in use.`;
                        }
                        
                        return res.status(500).json({ 
                            success: false,
                            error: errorMsg
                        });
                    }
                    
                    console.log(`Created and started container: ${containerName}`);
                    res.json({ 
                        success: true,
                        message: 'Container created and started', 
                        port,
                        url: `http://localhost:${port}`
                    });
                });
            }
        });
    });
});

// Stop experiment container
app.post('/api/stop-experiment', async (req, res) => {
    const { port } = req.body;
    
    exec(`docker ps --filter "publish=${port}" --format "{{.Names}}"`, (error, stdout) => {
        if (stdout.trim()) {
            const containerName = stdout.trim();
            exec(`docker stop ${containerName}`, (stopErr) => {
                if (stopErr) {
                    return res.status(500).json({ success: false, error: stopErr.message });
                }
                res.json({ success: true, message: `Container ${containerName} stopped` });
            });
        } else {
            res.json({ success: true, message: 'No container found on this port' });
        }
    });
});

// List running experiments
app.get('/api/experiments', async (req, res) => {
    exec('docker ps --filter "name=experiment" --format "{{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Status}}"', (error, stdout) => {
        if (error) {
            return res.json({ success: true, experiments: [] });
        }
        
        const experiments = stdout.trim().split('\n').filter(line => line).map(line => {
            const parts = line.split('\t');
            return {
                name: parts[0],
                image: parts[1],
                ports: parts[2],
                status: parts[3]
            };
        });
        
        res.json({ success: true, experiments });
    });
});

app.listen(PORT, () => {
    console.log(`Docker Manager API running on http://localhost:${PORT}`);
    console.log('Using shell commands to manage Docker containers');
});