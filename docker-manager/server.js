const express = require('express');
const Docker = require('dockerode');
const cors = require('cors');

const app = express();
const docker = new Docker({ socketPath: '/var/run/docker.sock' });
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start experiment container
app.post('/api/start-experiment', async (req, res) => {
    const { image, port } = req.body;
    
    console.log(`Starting experiment: ${image} on port ${port}`);
    
    try {
        // Check if container already exists
        const containers = await docker.listContainers({ all: true });
        const existingContainer = containers.find(c => 
            c.Names.includes(`/experiment-${port}`) || 
            c.Ports.some(p => p.PublicPort === port)
        );

        if (existingContainer) {
            console.log('Container already exists, starting it...');
            const container = docker.getContainer(existingContainer.Id);
            const state = await container.inspect();
            
            if (!state.State.Running) {
                await container.start();
                console.log('Container started successfully');
            } else {
                console.log('Container is already running');
            }
            
            return res.json({ 
                success: true,
                message: 'Container started', 
                port,
                url: `http://localhost:${port}`
            });
        }

        // Create and start new container
        console.log('Creating new container...');
        const container = await docker.createContainer({
            Image: image,
            name: `experiment-${port}`,
            ExposedPorts: { 
                [`${port}/tcp`]: {} 
            },
            HostConfig: {
                PortBindings: {
                    [`${port}/tcp`]: [{ 
                        HostPort: port.toString() 
                    }]
                },
                RestartPolicy: {
                    Name: 'unless-stopped'
                }
            }
        });

        await container.start();
        console.log('Container created and started successfully');
        
        // Wait for container to be ready
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        res.json({ 
            success: true,
            message: 'Container created and started', 
            port,
            url: `http://localhost:${port}`
        });
    } catch (error) {
        console.error('Docker error:', error);
        
        // Check if image exists
        if (error.message.includes('No such image')) {
            return res.status(404).json({ 
                success: false,
                error: `Image ${image} not found. Please build the image first.`,
                details: error.message 
            });
        }
        
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// Stop experiment container
app.post('/api/stop-experiment', async (req, res) => {
    const { port } = req.body;
    
    console.log(`Stopping experiment on port ${port}`);
    
    try {
        const containers = await docker.listContainers({ all: true });
        const container = containers.find(c => 
            c.Names.includes(`/experiment-${port}`) || 
            c.Ports.some(p => p.PublicPort === port)
        );

        if (container) {
            const dockerContainer = docker.getContainer(container.Id);
            await dockerContainer.stop();
            console.log('Container stopped successfully');
            res.json({ 
                success: true,
                message: 'Container stopped' 
            });
        } else {
            res.status(404).json({ 
                success: false,
                error: 'Container not found' 
            });
        }
    } catch (error) {
        console.error('Error stopping container:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// List running experiments
app.get('/api/experiments', async (req, res) => {
    try {
        const containers = await docker.listContainers({
            filters: {
                name: ['experiment']
            }
        });
        
        const experiments = containers.map(c => ({
            id: c.Id,
            name: c.Names[0].replace('/', ''),
            image: c.Image,
            status: c.Status,
            ports: c.Ports,
            created: c.Created
        }));
        
        res.json({ success: true, experiments });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Docker manager API running on http://localhost:${PORT}`);
});