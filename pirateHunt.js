const CONFIG = {
            shipMaxSpeed: 4.5,
            acceleration: 0.1,
            friction: 0.98,
            baseTurnSpeed: 0.05,
            waterColor: '#000f38',
            cannonCooldown: 1000,
            worldRadius: 2500,
            noticeTime: 6000 
        };

        // LOAD SHUTTLE IMAGE
        const shuttleImg = new Image();
        shuttleImg.src = 'https://cdn-icons-png.flaticon.com/512/3768/3768291.png';

        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        const uiHud = document.getElementById('hud');
        const menuScreen = document.getElementById('menu-screen');
        const menuTitle = document.getElementById('menu-title');
        const startBtn = document.getElementById('start-btn');
        const btnText = document.getElementById('btn-text');
        const hullBar = document.getElementById('hull-bar');
        const hullPercent = document.getElementById('hull-percent');
        const reloadEl = document.getElementById('reload-indicator');
        const keyCountEl = document.getElementById('key-count');
        const coinCountEl = document.getElementById('coin-count');
        const compassCoin = document.getElementById('compass-arrow-coin');
        const compassKey = document.getElementById('compass-arrow-key');
        const midNotice = document.getElementById('mid-notice');

        let width, height, gameActive = false, monsterInterval;
        let keysCollected = 0, coinCount = 0, lastFire = 0;
        let gameStartTime = 0, noticeTriggered = false;
        
        let stars = [];
        let ship = { x: 0, y: 0, angle: -Math.PI / 2, vel: 0, targetAngle: -Math.PI / 2, hull: 100 };
        let camera = { x: 0, y: 0 }, input = { active: false };
        let monsters = [], cannonballs = [], keys = [], coins = [];

        function initStars() {
            stars = [];
            for (let i = 0; i < 250; i++) {
                stars.push({
                    x: Math.random(),
                    y: Math.random(),
                    size: Math.random() * 2 + 0.5,
                    twinkle: Math.random() * Math.PI * 2
                });
            }
        }

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            initStars();
        }
        window.addEventListener('resize', resize);
        resize();

        function updatePointer(x, y) {
            const dx = x - width / 2;
            const dy = y - height / 2;
            if (Math.hypot(dx, dy) > 20) ship.targetAngle = Math.atan2(dy, dx);
        }

        canvas.addEventListener('mousedown', e => {
            if (!gameActive) return;
            input.active = true;
            updatePointer(e.clientX, e.clientY);
            if (Date.now() - lastFire > CONFIG.cannonCooldown) fireCannons();
        });
        canvas.addEventListener('mousemove', e => { if(input.active) updatePointer(e.clientX, e.clientY) });
        canvas.addEventListener('mouseup', () => input.active = false);

        canvas.addEventListener('touchstart', e => {
            e.preventDefault();
            if (!gameActive) return;
            input.active = true;
            updatePointer(e.touches[0].clientX, e.touches[0].clientY);
            if (Date.now() - lastFire > CONFIG.cannonCooldown) fireCannons();
        }, {passive: false});
        canvas.addEventListener('touchmove', e => {
            e.preventDefault();
            updatePointer(e.touches[0].clientX, e.touches[0].clientY);
        }, {passive: false});
        canvas.addEventListener('touchend', () => input.active = false);

        function fireCannons() {
            lastFire = Date.now();
            reloadEl.style.opacity = "1";
            reloadEl.classList.add('active');
            setTimeout(() => {
                reloadEl.style.opacity = "0";
                reloadEl.classList.remove('active');
            }, CONFIG.cannonCooldown);
            
            [-1, 1].forEach(side => {
                const angle = ship.angle + (side * Math.PI/2);
                cannonballs.push({
                    x: ship.x + Math.cos(angle) * 15,
                    y: ship.y + Math.sin(angle) * 15,
                    vx: Math.cos(angle) * 10,
                    vy: Math.sin(angle) * 10,
                    life: 45
                });
            });
        }

        function initGame() {
            initStars();
            ship = { x: 0, y: 0, angle: -Math.PI/2, vel: 0, targetAngle: -Math.PI/2, hull: 100 };
            keysCollected = 0; coinCount = 0;
            keyCountEl.innerText = "0/3"; coinCountEl.innerText = "0";
            hullBar.style.width = "100%";
            monsters = []; cannonballs = []; keys = []; coins = [];
            
            gameStartTime = Date.now();
            noticeTriggered = false;
            midNotice.classList.replace('notice-visible', 'notice-hidden');

            for (let i = 0; i < 3; i++) {
                const a = Math.random() * Math.PI * 2;
                const d = 800 + Math.random() * (CONFIG.worldRadius - 1200);
                keys.push({ x: Math.cos(a) * d, y: Math.sin(a) * d });
            }

            for (let i = 0; i < 20; i++) {
                const a = Math.random() * Math.PI * 2;
                const d = 400 + Math.random() * (CONFIG.worldRadius - 600);
                coins.push({ x: Math.cos(a) * d, y: Math.sin(a) * d });
            }

            menuScreen.classList.add('opacity-0', 'pointer-events-none');
            uiHud.classList.remove('opacity-0');
            gameActive = true;
            if(monsterInterval) clearInterval(monsterInterval);
            monsterInterval = setInterval(() => {
                if(monsters.length < 6 && gameActive) {
                    const a = Math.random() * Math.PI * 2;
                    monsters.push({ x: ship.x + Math.cos(a) * 800, y: ship.y + Math.sin(a) * 800, hp: 2 });
                }
            }, 4000);
            requestAnimationFrame(gameLoop);
        }

        function triggerNotice() {
            noticeTriggered = true;
            midNotice.classList.replace('notice-hidden', 'notice-visible');
            setTimeout(() => {
                midNotice.classList.replace('notice-visible', 'notice-hidden');
            }, 5000); 
        }

        function updateCompass(items, element) {
            if (items.length === 0) { element.style.display = "none"; return; }
            element.style.display = "flex";
            let closest = items[0];
            let minDist = Math.hypot(items[0].x - ship.x, items[0].y - ship.y);
            items.forEach(item => {
                let d = Math.hypot(item.x - ship.x, item.y - ship.y);
                if (d < minDist) { minDist = d; closest = item; }
            });
            const angle = Math.atan2(closest.y - ship.y, closest.x - ship.x);
            element.style.transform = `rotate(${angle + Math.PI/2}rad)`;
        }

        function drawShip(ctx, s) {
            ctx.save();
            ctx.translate(s.x, s.y);
            
            // offset 90 derajat (Math.PI/2).
            ctx.rotate(s.angle + Math.PI / 2);

            // KEY INDICATOR (Arrow pointing to closest key)
            if (keys.length > 0) {
                let closestKey = keys[0];
                let minDist = Math.hypot(keys[0].x - s.x, keys[0].y - s.y);
                keys.forEach(k => {
                    let d = Math.hypot(k.x - s.x, k.y - s.y);
                    if (d < minDist) { minDist = d; closestKey = k; }
                });
                const angleToKey = Math.atan2(closestKey.y - s.y, closestKey.x - s.x);
                ctx.save();
                ctx.rotate(-(s.angle + Math.PI / 2)); 
                ctx.rotate(angleToKey);
                ctx.translate(65, 0); 
                ctx.fillStyle = '#22d3ee';
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#22d3ee';
                ctx.beginPath();
                ctx.moveTo(12, 0);
                ctx.lineTo(-6, -7);
                ctx.lineTo(-6, 7);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }

            // DRAW THE SPACE SHUTTLE ICON
            const shuttleSize = 60;
            if (shuttleImg.complete) {
                ctx.drawImage(shuttleImg, -shuttleSize/2, -shuttleSize/2, shuttleSize, shuttleSize);
            } else {
                ctx.fillStyle = 'white';
                ctx.fillRect(-10, -20, 20, 40);
            }
            
            ctx.restore();
        }

        function drawCoin(ctx, x, y) {
            ctx.save();
            const pulse = Math.sin(Date.now() / 200) * 2;
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(x, y, 8 + pulse, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#d97706';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
        }

        function drawKey(ctx, x, y) {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(Math.sin(Date.now()/500) * 0.5);
            ctx.fillStyle = '#22d3ee';
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#22d3ee';
            ctx.beginPath();
            ctx.arc(0, -8, 6, 0, Math.PI*2);
            ctx.fillRect(-2, -2, 4, 15);
            ctx.fillRect(2, 6, 4, 2);
            ctx.fillRect(2, 10, 4, 2);
            ctx.fill();
            ctx.restore();
        }

        function update() {
            if (!noticeTriggered && Date.now() - gameStartTime > CONFIG.noticeTime) {
                triggerNotice();
            }

            if (input.active) {
                let diff = ship.targetAngle - ship.angle;
                while (diff <= -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;
                ship.angle += diff * (Math.min(ship.vel / 1.5, 1) * CONFIG.baseTurnSpeed);
                ship.vel = Math.min(ship.vel + CONFIG.acceleration, CONFIG.shipMaxSpeed);
            }
            ship.vel *= CONFIG.friction;
            ship.x += Math.cos(ship.angle) * ship.vel;
            ship.y += Math.sin(ship.angle) * ship.vel;

            camera.x += (ship.x - width / 2 - camera.x) * 0.08;
            camera.y += (ship.y - height / 2 - camera.y) * 0.08;

            updateCompass(coins, compassCoin);
            updateCompass(keys, compassKey);

            coins.forEach((c, i) => {
                if (Math.hypot(c.x - ship.x, c.y - ship.y) < 40) {
                    coins.splice(i, 1); coinCount++; coinCountEl.innerText = coinCount;
                }
            });
            keys.forEach((k, i) => {
                if (Math.hypot(k.x - ship.x, k.y - ship.y) < 40) {
                    keys.splice(i, 1); keysCollected++; 
                    keyCountEl.innerText = `${keysCollected}/3`;
                    if(keysCollected >= 3) triggerVictory();
                }
            });

            cannonballs.forEach((b, i) => {
                b.x += b.vx; b.y += b.vy; b.life--;
                monsters.forEach((m, mi) => {
                    if (Math.hypot(b.x - m.x, b.y - m.y) < 35) {
                        m.hp--; b.life = 0;
                        if(m.hp <= 0) monsters.splice(mi, 1);
                    }
                });
                if(b.life <= 0) cannonballs.splice(i, 1);
            });

            monsters.forEach(m => {
                const ang = Math.atan2(ship.y - m.y, ship.x - m.x);
                m.x += Math.cos(ang) * 1.8; m.y += Math.sin(ang) * 1.8;
                if(Math.hypot(ship.x - m.x, ship.y - m.y) < 45) {
                    ship.hull -= 0.25;
                    hullBar.style.width = `${ship.hull}%`;
                    hullPercent.innerText = `${Math.ceil(ship.hull)}%`;
                    if(ship.hull <= 0) triggerGameOver();
                }
            });
        }

        function draw() {
            // Galaxy Background
            const grad = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, Math.max(width, height));
            grad.addColorStop(0, '#0c1233');
            grad.addColorStop(0.6, '#020617');
            grad.addColorStop(1, '#000000');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, width, height);

            // Subtle Nebula Clouds
            const nebulaGrad = ctx.createRadialGradient(width * 0.7, height * 0.3, 0, width * 0.7, height * 0.3, width * 0.6);
            nebulaGrad.addColorStop(0, 'rgba(46, 16, 101, 0.15)');
            nebulaGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = nebulaGrad;
            ctx.fillRect(0, 0, width, height);

            // Stars with Parallax Twinkle
            ctx.fillStyle = "white";
            stars.forEach(s => {
                let x = (s.x * width - camera.x * 0.05) % width;
                let y = (s.y * height - camera.y * 0.05) % height;
                if (x < 0) x += width;
                if (y < 0) y += height;
                
                const alpha = 0.2 + Math.abs(Math.sin(Date.now()/2000 + s.twinkle)) * 0.6;
                ctx.globalAlpha = alpha;
                ctx.fillRect(x, y, s.size, s.size);
            });
            ctx.globalAlpha = 1;
            
            ctx.save();
            ctx.translate(-camera.x, -camera.y);

            ctx.strokeStyle = '#ffffff05';
            ctx.lineWidth = 1;
            for(let x = -CONFIG.worldRadius; x < CONFIG.worldRadius; x+=200) {
                ctx.beginPath(); ctx.moveTo(x, -CONFIG.worldRadius); ctx.lineTo(x, CONFIG.worldRadius); ctx.stroke();
            }

            ctx.strokeStyle = '#ef444433';
            ctx.lineWidth = 4;
            ctx.beginPath(); ctx.arc(0, 0, CONFIG.worldRadius, 0, Math.PI*2); ctx.stroke();

            coins.forEach(c => drawCoin(ctx, c.x, c.y));
            keys.forEach(k => drawKey(ctx, k.x, k.y));
            
            monsters.forEach(m => {
                ctx.save();
                ctx.translate(m.x, m.y);
                
                const time = Date.now() * 0.002;
                const pulse = Math.sin(Date.now() / 200) * 8;
                
                // Ominous Crimson Glow
                ctx.shadowBlur = 15 + pulse;
                ctx.shadowColor = '#ef4444';
                
                // Sentinel Body (Diamond Shard)
                ctx.rotate(Math.sin(time * 0.5) * 0.3);
                ctx.fillStyle = '#1e1b4b'; // Deep void blue
                ctx.beginPath();
                ctx.moveTo(0, -30);
                ctx.lineTo(20, 0);
                ctx.lineTo(0, 30);
                ctx.lineTo(-20, 0);
                ctx.closePath();
                ctx.fill();
                
                // Pulsing Red Core
                ctx.fillStyle = '#ef4444';
                ctx.beginPath();
                ctx.arc(0, 0, 7 + Math.sin(time * 3) * 2, 0, Math.PI * 2);
                ctx.fill();
                
                // Orbiting Void Fragments
                ctx.rotate(time);
                for(let i=0; i<3; i++) {
                    ctx.rotate(Math.PI * 2 / 3);
                    ctx.fillStyle = '#ef4444aa';
                    ctx.fillRect(35 + Math.sin(time + i)*5, -2, 5, 5);
                }
                
                ctx.restore();
            });

            drawShip(ctx, ship);

            ctx.fillStyle = '#fbbf24';
            cannonballs.forEach(b => { ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI*2); ctx.fill(); });

            ctx.restore();
        }

        function triggerVictory() {
            gameActive = false;
            menuTitle.innerText = "TREASURE CLAIMED";
            menuTitle.className = "font-pirate text-6xl md:text-9xl text-transparent bg-clip-text bg-gradient-to-b from-white via-amber-400 to-amber-900 mb-4";
            btnText.innerText = "CONTINUE JOURNEY";
            startBtn.onclick = () => window.location.href = 'miniGM.html';
            menuScreen.classList.remove('opacity-0', 'pointer-events-none');
        }

        function triggerGameOver() {
            gameActive = false;
            menuTitle.innerText = "DEFEATED";
            btnText.innerText = "RESPAWN";
            startBtn.onclick = initGame;
            menuScreen.classList.remove('opacity-0', 'pointer-events-none');
        }

        function gameLoop() {
            if (gameActive) {
                update();
                draw();
                requestAnimationFrame(gameLoop);
            }
        }

        startBtn.onclick = initGame;