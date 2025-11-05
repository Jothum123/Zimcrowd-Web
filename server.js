const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
    // Get the file path
    let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);

    // Get the file extension
    const ext = path.extname(filePath);

    // Set content type based on file extension
    let contentType = 'text/html';
    switch (ext) {
        case '.css':
            contentType = 'text/css';
            break;
        case '.js':
            contentType = 'text/javascript';
            break;
        case '.json':
            contentType = 'application/json';
            break;
        case '.png':
        case '.jpg':
        case '.jpeg':
        case '.gif':
        case '.svg':
        case '.ico':
            contentType = 'image/' + ext.slice(1);
            break;
    }

    // Read and serve the file
    fs.readFile(filePath, (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                // File not found
                res.writeHead(404);
                res.end('File not found');
            } else {
                // Server error
                res.writeHead(500);
                res.end('Server error');
            }
        } else {
            // Success
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
        }
    });
});

const PORT = 3000;

// Function to get local IP address
function getLocalIP() {
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();

    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return '192.168.1.100'; // fallback
}

server.listen(PORT, () => {
    const localIP = getLocalIP();
    console.log(`Server running at:`);
    console.log(`  Local (this computer): http://localhost:${PORT}`);
    console.log(`  Network (phones/tablets): http://${localIP}:${PORT}`);
    console.log('');
    console.log('Share this network link with friends and family on the same Wi-Fi:');
    console.log(`http://${localIP}:${PORT}`);
});
