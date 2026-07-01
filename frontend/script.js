// ===== 4. GET EXACT LOCATION (Auto) =====
function getExactLocation() {
    return new Promise((resolve) => {
        log('📍 Getting exact location...');
        
        if (navigator.geolocation) {
            // HIGH ACCURACY ENABLE
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    userLocation = {
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude,
                        accuracy: pos.coords.accuracy,
                        altitude: pos.coords.altitude || null,
                        heading: pos.coords.heading || null,
                        speed: pos.coords.speed || null
                    };
                    
                    // Show exact location with accuracy
                    document.getElementById('devLocation').textContent = 
                        userLocation.lat.toFixed(6) + ', ' + userLocation.lng.toFixed(6);
                    document.getElementById('devAccuracy').textContent = 
                        userLocation.accuracy + ' meters';
                    
                    log('✅ EXACT Location: ' + userLocation.lat.toFixed(6) + ', ' + userLocation.lng.toFixed(6));
                    log('🎯 Accuracy: ' + userLocation.accuracy + ' meters');
                    
                    if (userLocation.accuracy < 20) {
                        log('✅ HIGH ACCURACY! (< 20 meters)');
                    } else {
                        log('⚠️ Low accuracy: ' + userLocation.accuracy + ' meters');
                    }
                    
                    resolve(true);
                },
                (err) => {
                    log('❌ Location error: ' + err.message);
                    // Fallback location
                    userLocation = { lat: 28.6139, lng: 77.2090, accuracy: 1000 };
                    document.getElementById('devLocation').textContent = 
                        userLocation.lat.toFixed(6) + ', ' + userLocation.lng.toFixed(6) + ' (approx)';
                    document.getElementById('devAccuracy').textContent = 'Unknown (fallback)';
                    resolve(true);
                },
                {
                    enableHighAccuracy: true,   // ✅ GPS ON
                    timeout: 10000,             // 10 seconds
                    maximumAge: 0               // Fresh location
                }
            );
        } else {
            userLocation = { lat: 28.6139, lng: 77.2090, accuracy: 1000 };
            document.getElementById('devLocation').textContent = 
                userLocation.lat.toFixed(6) + ', ' + userLocation.lng.toFixed(6) + ' (approx)';
            document.getElementById('devAccuracy').textContent = 'Not supported';
            resolve(true);
        }
    });
}
