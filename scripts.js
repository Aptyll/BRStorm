class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = 1024;
        this.height = 768;
        this.tileSize = 64; // Increased tile size
        
        // Player properties
        this.player = {
            x: this.width / 2,
            y: this.height / 2,
            size: 50, // Increased player size
            speed: 3, // Slightly increased speed
            color: '#4a9eff',
            maxHealth: 22,
            currentHealth: 22,
            healthBarWidth: 160, // Doubled from 80
            healthBarHeight: 12  // Doubled from 6
        };

        // Generate storm zones
        this.stormZones = this.generateStormZones();
        
        // Storm properties
        this.storm = {
            currentSize: this.stormZones[0].size,
            targetSize: this.stormZones[1].size,
            shrinkDuration: 3000, // 3 seconds to shrink
            waitDuration: 2000,   // 2 seconds between shrinks
            damage: 1,            // Damage per second
            lastDamageTime: 0,    // Track last damage time
            state: 'waiting',     // 'waiting' or 'shrinking'
            stateStartTime: performance.now(),
            color: 'rgba(168, 100, 253, 0.2)', // Light purple
            timerElement: document.getElementById('stormTimer'),
            shrinkStartSize: null, // Store the start size when shrinking begins
            currentZoneIndex: 0,   // Current zone index
            centerX: this.stormZones[0].centerX,
            centerY: this.stormZones[0].centerY,
            targetCenterX: this.stormZones[1].centerX,
            targetCenterY: this.stormZones[1].centerY,
            closed: false         // Track if storm has fully closed
        };

        // Movement state
        this.keys = {
            w: false,
            a: false,
            s: false,
            d: false
        };

        // Performance monitoring elements
        this.fpsCounter = document.getElementById('fpsCounter');
        this.frameTimeElement = document.getElementById('frameTime');
        this.memoryUsageElement = document.getElementById('memoryUsage');
        
        // Performance monitoring
        this.fps = 0;
        this.frameTime = 0;
        this.lastFrameTime = performance.now();
        this.frameCount = 0;
        this.lastFpsUpdate = 0;

        this.setupEventListeners();
        this.gameLoop();
    }

    generateStormZones() {
        const zones = [];
        const totalShrinkZones = 6;
        const totalEndGameMoves = 4;
        let currentSize = Math.max(this.width, this.height);
        
        // First zone is centered on canvas
        zones.push({
            centerX: this.width / 2,
            centerY: this.height / 2,
            size: currentSize,
            type: 'shrink'
        });

        // Generate shrinking zones
        for (let i = 1; i < totalShrinkZones; i++) {
            const prevZone = zones[i - 1];
            const newSize = Math.max(100, prevZone.size * 0.6);
            const maxOffset = (prevZone.size - newSize) / 2;
            
            zones.push({
                centerX: prevZone.centerX + (Math.random() * maxOffset * 2 - maxOffset),
                centerY: prevZone.centerY + (Math.random() * maxOffset * 2 - maxOffset),
                size: newSize,
                type: 'shrink'
            });
        }

        // Generate end-game movement zones (keeping same final size)
        const finalSize = zones[zones.length - 1].size;
        const playableMargin = finalSize / 2;
        
        for (let i = 0; i < totalEndGameMoves; i++) {
            zones.push({
                centerX: playableMargin + Math.random() * (this.width - playableMargin * 2),
                centerY: playableMargin + Math.random() * (this.height - playableMargin * 2),
                size: finalSize,
                type: 'move'
            });
        }

        // Add final closing zone
        const lastZone = zones[zones.length - 1];
        zones.push({
            centerX: lastZone.centerX,
            centerY: lastZone.centerY,
            size: 0,
            type: 'final'
        });

        return zones;
    }

    setupEventListeners() {
        window.addEventListener('keydown', (e) => {
            if (this.keys.hasOwnProperty(e.key.toLowerCase())) {
                this.keys[e.key.toLowerCase()] = true;
            }
            
            // Health controls
            if (e.key.toLowerCase() === 'n') {
                this.healPlayer(1);
            } else if (e.key.toLowerCase() === 'm') {
                this.damagePlayer(1);
            }
            // Dev testing: Skip 3 seconds on 'b' key
            if (e.key.toLowerCase() === 'b') {
                this.storm.stateStartTime -= 3000;
            }
        });

        window.addEventListener('keyup', (e) => {
            if (this.keys.hasOwnProperty(e.key.toLowerCase())) {
                this.keys[e.key.toLowerCase()] = false;
            }
        });
    }

    healPlayer(amount) {
        this.player.currentHealth = Math.min(this.player.maxHealth, this.player.currentHealth + amount);
    }

    damagePlayer(amount) {
        this.player.currentHealth = Math.max(0, this.player.currentHealth - amount);
    }

    drawHealthBar() {
        const barX = this.player.x - this.player.healthBarWidth / 2;
        const barY = this.player.y - this.player.size / 2 - 25;
        
        // Draw glow effect for the bar
        const glow = this.ctx.createLinearGradient(barX, barY, barX, barY + this.player.healthBarHeight);
        glow.addColorStop(0, 'rgba(0, 255, 255, 0.1)');
        glow.addColorStop(0.5, 'rgba(0, 255, 255, 0.05)');
        glow.addColorStop(1, 'rgba(0, 255, 255, 0.1)');
        
        this.ctx.fillStyle = glow;
        this.ctx.fillRect(
            barX - 4,
            barY - 4,
            this.player.healthBarWidth + 8,
            this.player.healthBarHeight + 8
        );

        // Draw health bar background (darker)
        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.fillRect(barX, barY, this.player.healthBarWidth, this.player.healthBarHeight);
        
        // Draw current health with neon gradient
        const healthPercentage = this.player.currentHealth / this.player.maxHealth;
        const currentHealthWidth = this.player.healthBarWidth * healthPercentage;
        
        const healthGradient = this.ctx.createLinearGradient(barX, barY, barX, barY + this.player.healthBarHeight);
        healthGradient.addColorStop(0, '#00ffff'); // Cyan
        healthGradient.addColorStop(1, '#007777'); // Darker cyan
        this.ctx.fillStyle = healthGradient;
        this.ctx.fillRect(barX, barY, currentHealthWidth, this.player.healthBarHeight);

        // Add subtle inner shadow to the health bar
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        this.ctx.fillRect(barX, barY, this.player.healthBarWidth, 1);

        // Draw border with neon effect
        this.ctx.strokeStyle = '#00ffff';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(barX, barY, this.player.healthBarWidth, this.player.healthBarHeight);
        
        // Draw tick marks
        const tickSpacing = this.player.healthBarWidth / this.player.maxHealth;
        
        // Draw minor ticks (very subtle)
        this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
        for (let i = 1; i < this.player.maxHealth; i++) {
            if (i % 10 !== 0) {
                const tickX = barX + (i * tickSpacing);
                this.ctx.beginPath();
                this.ctx.lineWidth = 0.5;
                this.ctx.moveTo(tickX, barY + 2);
                this.ctx.lineTo(tickX, barY + this.player.healthBarHeight - 2);
                this.ctx.stroke();
            }
        }

        // Draw major ticks with neon effect
        for (let i = 0; i <= this.player.maxHealth; i += 10) {
            const tickX = barX + (i * tickSpacing);
            
            // Glow effect
            this.ctx.shadowColor = '#00ffff';
            this.ctx.shadowBlur = 4;
            
            // Main tick line
            this.ctx.beginPath();
            this.ctx.strokeStyle = '#00ffff';
            this.ctx.lineWidth = 1;
            this.ctx.moveTo(tickX, barY - 2);
            this.ctx.lineTo(tickX, barY + this.player.healthBarHeight + 2);
            this.ctx.stroke();

            // Reset shadow
            this.ctx.shadowBlur = 0;
        }

        // Draw final tick
        const finalTickX = barX + this.player.healthBarWidth;
        this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
        this.ctx.beginPath();
        this.ctx.lineWidth = 1;
        this.ctx.moveTo(finalTickX, barY - 2);
        this.ctx.lineTo(finalTickX, barY + this.player.healthBarHeight + 2);
        this.ctx.stroke();
    }

    drawBackground() {
        for (let x = 0; x < this.width; x += this.tileSize) {
            for (let y = 0; y < this.height; y += this.tileSize) {
                this.ctx.fillStyle = (Math.floor(x / this.tileSize) + Math.floor(y / this.tileSize)) % 2 === 0 
                    ? '#0f0f0f' 
                    : '#141414';
                this.ctx.fillRect(x, y, this.tileSize, this.tileSize);
            }
        }
    }

    drawPlayer() {
        // Draw the player as a rounded blue square
        this.ctx.fillStyle = '#4a9eff';
        this.ctx.beginPath();
        const radius = 8; // Corner radius
        const x = this.player.x - this.player.size / 2;
        const y = this.player.y - this.player.size / 2;
        const size = this.player.size;
        
        // Draw rounded rectangle path
        this.ctx.beginPath();
        this.ctx.moveTo(x + radius, y);
        this.ctx.lineTo(x + size - radius, y);
        this.ctx.quadraticCurveTo(x + size, y, x + size, y + radius);
        this.ctx.lineTo(x + size, y + size - radius);
        this.ctx.quadraticCurveTo(x + size, y + size, x + size - radius, y + size);
        this.ctx.lineTo(x + radius, y + size);
        this.ctx.quadraticCurveTo(x, y + size, x, y + size - radius);
        this.ctx.lineTo(x, y + radius);
        this.ctx.quadraticCurveTo(x, y, x + radius, y);
        this.ctx.closePath();
        
        // Fill the rounded square
        this.ctx.fill();
    }

    updatePlayer() {
        let dx = 0;
        let dy = 0;

        if (this.keys.w) dy -= 1;
        if (this.keys.s) dy += 1;
        if (this.keys.a) dx -= 1;
        if (this.keys.d) dx += 1;

        // Normalize diagonal movement
        if (dx !== 0 && dy !== 0) {
            const length = Math.sqrt(dx * dx + dy * dy);
            dx /= length;
            dy /= length;
        }

        // Update position with speed
        this.player.x += dx * this.player.speed;
        this.player.y += dy * this.player.speed;

        // Boundary collision
        this.player.x = Math.max(this.player.size / 2, Math.min(this.width - this.player.size / 2, this.player.x));
        this.player.y = Math.max(this.player.size / 2, Math.min(this.height - this.player.size / 2, this.player.y));
    }

    updateStorm() {
        const now = performance.now();
        const stateTime = now - this.storm.stateStartTime;

        // Get current and next zones
        const currentZone = this.stormZones[this.storm.currentZoneIndex];
        const nextZone = this.stormZones[this.storm.currentZoneIndex + 1];

        // Different timing for different phases
        const isEndGameMove = currentZone && currentZone.type === 'move';
        const isFinalPhase = currentZone && currentZone.type === 'final';
        
        const moveDuration = isFinalPhase ? 10000 : (isEndGameMove ? 5000 : this.storm.shrinkDuration);
        const waitDuration = isFinalPhase ? 5000 : (isEndGameMove ? 4000 : this.storm.waitDuration);

        // Update storm size based on state
        if (this.storm.state === 'shrinking') {
            if (stateTime >= moveDuration) {
                // Finished shrinking/moving, enter waiting state
                this.storm.state = 'waiting';
                this.storm.stateStartTime = now;
                
                // Move to next zone
                this.storm.currentZoneIndex++;
                const currentZone = this.stormZones[this.storm.currentZoneIndex];
                const nextZone = this.stormZones[this.storm.currentZoneIndex + 1];
                
                if (nextZone) {
                    this.storm.currentSize = currentZone.size;
                    this.storm.targetSize = nextZone.size;
                    this.storm.centerX = currentZone.centerX;
                    this.storm.centerY = currentZone.centerY;
                    this.storm.targetCenterX = nextZone.centerX;
                    this.storm.targetCenterY = nextZone.centerY;
                }
            } else {
                // Continue shrinking with easing
                const progress = stateTime / moveDuration;
                const easeProgress = isFinalPhase ? progress : (1 - Math.pow(1 - progress, 3)); // Linear for final, cubic for others
                
                // Store the start size when shrinking begins
                if (!this.storm.shrinkStartSize) {
                    this.storm.shrinkStartSize = this.storm.currentSize;
                }
                
                // Shrink from the stored start size to target
                const sizeDiff = this.storm.targetSize - this.storm.shrinkStartSize;
                this.storm.currentSize = this.storm.shrinkStartSize + (sizeDiff * easeProgress);
                
                // Move center point with same easing
                const currentZone = this.stormZones[this.storm.currentZoneIndex];
                const nextZone = this.stormZones[this.storm.currentZoneIndex + 1];
                if (nextZone) {
                    this.storm.centerX = currentZone.centerX + (nextZone.centerX - currentZone.centerX) * easeProgress;
                    this.storm.centerY = currentZone.centerY + (nextZone.centerY - currentZone.centerY) * easeProgress;
                }
            }
        } else if (this.storm.state === 'waiting') {
            if (stateTime >= waitDuration) {
                // Only start shrinking if there's a next zone
                if (this.storm.currentZoneIndex < this.stormZones.length - 1) {
                    this.storm.state = 'shrinking';
                    this.storm.stateStartTime = now;
                    this.storm.shrinkStartSize = null; // Reset the start size for next shrink
                }
            }
        }

        // Update timer display
        if (this.storm.closed) {
            this.storm.timerElement.style.color = '#ff4444';
            this.storm.timerElement.textContent = 'Storm Closed';
        } else if (this.storm.state === 'waiting') {
            const timeLeft = Math.ceil((waitDuration - stateTime) / 1000);
            if (timeLeft > 0) {
                // Check if next zone is final
                const nextZoneIsFinal = nextZone && nextZone.type === 'final';
                if (nextZoneIsFinal) {
                    this.storm.timerElement.style.color = '#ff4444';
                    this.storm.timerElement.textContent = `FINAL BATTLE - Storm will close completely in ${timeLeft}s!`;
                } else {
                    this.storm.timerElement.style.color = 'rgba(168, 100, 253, 1)';
                    const moveText = isEndGameMove ? "moves" : "shrinks";
                    this.storm.timerElement.textContent = `Storm ${moveText} in ${timeLeft}s`;
                }
            }
        } else {
            const shrinkProgress = Math.min(100, Math.round((stateTime / moveDuration) * 100));
            // Skip movement phase text for final battle
            if (nextZone && nextZone.type === 'final') {
                this.storm.timerElement.style.color = '#ff4444';
                this.storm.timerElement.textContent = `FINAL BATTLE - Storm will close completely in ${Math.ceil((moveDuration - stateTime) / 1000)}s!`;
            } else if (isFinalPhase && shrinkProgress >= 100) {
                this.storm.closed = true;
                this.storm.timerElement.style.color = '#ff4444';
                this.storm.timerElement.textContent = 'Storm Closed';
            } else if (isFinalPhase) {
                this.storm.timerElement.style.color = '#ff4444';
                this.storm.timerElement.textContent = `Storm closing ${shrinkProgress}%`;
            } else {
                this.storm.timerElement.style.color = 'rgba(168, 100, 253, 1)';
                const moveText = isEndGameMove ? "moving" : "shrinking";
                this.storm.timerElement.textContent = `Storm ${moveText} ${shrinkProgress}%`;
            }
        }

        // Check if player is outside storm and apply damage
        const stormLeft = this.storm.centerX - this.storm.currentSize / 2;
        const stormTop = this.storm.centerY - this.storm.currentSize / 2;
        
        if (this.player.x < stormLeft || 
            this.player.x > stormLeft + this.storm.currentSize ||
            this.player.y < stormTop ||
            this.player.y > stormTop + this.storm.currentSize) {
            
            // Apply damage every second
            if (now - this.storm.lastDamageTime >= 1000) {
                this.damagePlayer(this.storm.damage);
                this.storm.lastDamageTime = now;
            }
        }
    }

    drawStorm() {
        const stormLeft = this.storm.centerX - this.storm.currentSize / 2;
        const stormTop = this.storm.centerY - this.storm.currentSize / 2;

        // Draw storm overlay (everything outside safe zone)
        this.ctx.fillStyle = this.storm.color;
        
        // Calculate the actual safe area (area not covered by storm)
        const safeWidth = Math.max(0, this.storm.currentSize);
        const safeHeight = Math.max(0, this.storm.currentSize);
        const safeArea = safeWidth * safeHeight;

        // If safe area is zero, the storm has covered everything
        if (safeArea <= 0 && !this.storm.closed) {
            this.storm.closed = true;
            this.storm.timerElement.style.color = '#ff4444';
            this.storm.timerElement.textContent = 'Storm Closed';
        }
        
        // Top
        this.ctx.fillRect(0, 0, this.width, stormTop);
        // Bottom
        this.ctx.fillRect(0, stormTop + this.storm.currentSize, this.width, this.height);
        // Left
        this.ctx.fillRect(0, stormTop, stormLeft, this.storm.currentSize);
        // Right
        this.ctx.fillRect(stormLeft + this.storm.currentSize, stormTop, this.width, this.storm.currentSize);

        // Draw storm border
        this.ctx.strokeStyle = 'rgba(168, 100, 253, 0.8)';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(stormLeft, stormTop, this.storm.currentSize, this.storm.currentSize);
    }

    updatePerformanceMetrics() {
        const now = performance.now();
        const delta = now - this.lastFrameTime;
        this.frameTime = delta;
        this.frameCount++;

        if (now - this.lastFpsUpdate >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));
            this.frameCount = 0;
            this.lastFpsUpdate = now;
            
            // Update DOM elements
            this.fpsCounter.textContent = this.fps;
            this.frameTimeElement.textContent = Math.round(this.frameTime);
            
            // Update memory usage if available
            if (performance.memory) {
                const memoryMB = Math.round(performance.memory.usedJSHeapSize / (1024 * 1024));
                this.memoryUsageElement.textContent = memoryMB;
            }
        }

        this.lastFrameTime = now;
    }

    gameLoop() {
        this.updatePerformanceMetrics();
        this.updatePlayer();
        this.updateStorm();

        // Clear canvas
        this.ctx.clearRect(0, 0, this.width, this.height);

        // Draw game elements
        this.drawBackground();
        this.drawStorm();
        this.drawPlayer();
        this.drawHealthBar();

        requestAnimationFrame(() => this.gameLoop());
    }
}

// Start the game when the page loads
window.onload = () => new Game();
