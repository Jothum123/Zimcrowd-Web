require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const querystring = require('querystring');
const nodemailer = require('nodemailer');

// Newsletter subscribers storage
const SUBSCRIBERS_FILE = path.join(__dirname, 'subscribers.json');

// Initialize subscribers file if it doesn't exist
if (!fs.existsSync(SUBSCRIBERS_FILE)) {
    fs.writeFileSync(SUBSCRIBERS_FILE, JSON.stringify([], null, 2));
}

// Email configuration - Update these with your actual email credentials
const emailConfig = {
    service: 'gmail',
    auth: {
        user: 'support@zimcrowd.co.zw', // Your email
        pass: process.env.EMAIL_PASSWORD || 'your-app-password' // Use app password for Gmail
    }
};

// Create email transporter
const transporter = nodemailer.createTransporter(emailConfig);

// Function to send notification email
async function sendSubscriptionNotification(subscriberEmail, subscriberData) {
    try {
        const mailOptions = {
            from: emailConfig.auth.user,
            to: emailConfig.auth.user, // Send to yourself
            subject: 'New Newsletter Subscriber - ZimCrowd',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #38e07b;">New Newsletter Subscriber!</h2>
                    <p><strong>Email:</strong> ${subscriberEmail}</p>
                    <p><strong>Subscribed At:</strong> ${subscriberData.subscribedAt}</p>
                    <p><strong>IP Address:</strong> ${subscriberData.ip}</p>
                    <hr>
                    <p>You now have a new subscriber to your ZimCrowd newsletter.</p>
                    <p>Total subscribers: Check your subscribers.json file for the complete list.</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`Notification email sent for subscriber: ${subscriberEmail}`);
    } catch (error) {
        console.error('Failed to send notification email:', error);
        // Don't fail the subscription if email fails
    }
}

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // Handle newsletter subscription POST request
    if (req.method === 'POST' && pathname === '/api/newsletter/subscribe') {
        let body = '';

        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', () => {
            try {
                const postData = querystring.parse(body);
                const email = postData.email;

                if (!email || !email.includes('@')) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'Invalid email address' }));
                    return;
                }

                // Read existing subscribers
                const subscribers = JSON.parse(fs.readFileSync(SUBSCRIBERS_FILE, 'utf8'));

                // Check if email already exists
                if (subscribers.some(sub => sub.email === email)) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'Email already subscribed' }));
                    return;
                }

                // Add new subscriber
                const newSubscriber = {
                    email: email,
                    subscribedAt: new Date().toISOString(),
                    ip: req.connection.remoteAddress
                };

                subscribers.push(newSubscriber);

                // Save to file
                fs.writeFileSync(SUBSCRIBERS_FILE, JSON.stringify(subscribers, null, 2));

                // Send notification email to admin
                sendSubscriptionNotification(email, newSubscriber);

                console.log(`New newsletter subscriber: ${email}`);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, message: 'Successfully subscribed to newsletter!' }));

            } catch (error) {
                console.error('Newsletter subscription error:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: 'Server error occurred' }));
            }
        });

        return;
    }

    // Get the file path
    let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);

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
