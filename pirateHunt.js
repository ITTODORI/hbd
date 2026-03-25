 const CONFIG = {
            shipMaxSpeed: 5,
            acceleration: 0.1,
            friction: 0.98,
            baseTurnSpeed: 0.04,
            waterColor: '#070b14',
            cannonCooldown: 1200,
            monsterHealth: 2,
            maxHull: 100
        };

        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        const uiHud = document.getElementById('hud');
        const menuScreen = document.getElementById('menu-screen');
        const menuTitle = document.getElementById('menu-title');
        const menuSubtitle = document.getElementById('menu-subtitle');
        const startBtn = document.getElementById('start-btn');
        const scoreEl = document.getElementById('score');
        const hullBar = document.getElementById('hull-bar');
        const reloadEl = document.getElementById('reload-indicator');
        const keyCountEl = document.getElementById('key-count');
        const coinCountEl = document.getElementById('coin-count');

        let width, height, animationId, monsterInterval;
        let lastTime = 0, gameActive = false, score = 0;
        let keysCollected = 0, coinCount = 0, lastFire = 0;
        
        let ship = { x: 0, y: 0, angle: -Math.PI / 2, vel: 0, targetAngle: -Math.PI / 2, hull: 100 };
        let camera = { x: 0, y: 0 }, input = { active: false, x: 0, y: 0 };
        let particles = [], treasures = [], monsters = [], cannonballs = [], waves = [], keys = [], coins = [];

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }
        window.addEventListener('resize', resize);
        resize();

        // --- Interaction ---
        function handleStart(x, y) {
            if (!gameActive) return;
            if (Date.now() - lastFire > CONFIG.cannonCooldown) fireCannons();
            input.active = true;
            updateInput(x, y);
        }

        function updateInput(x, y) {
            const dx = x - width / 2;
            const dy = y - height / 2;
            if (Math.hypot(dx, dy) > 20) ship.targetAngle = Math.atan2(dy, dx);
        }

        canvas.addEventListener('touchstart', e => handleStart(e.touches[0].clientX, e.touches[0].clientY));
        canvas.addEventListener('touchmove', e => updateInput(e.touches[0].clientX, e.touches[0].clientY));
        canvas.addEventListener('touchend', () => input.active = false);
        canvas.addEventListener('mousedown', e => handleStart(e.clientX, e.clientY));
        canvas.addEventListener('mousemove', e => { if(input.active) updateInput(e.clientX, e.clientY) });
        canvas.addEventListener('mouseup', () => input.active = false);

        function fireCannons() {
            lastFire = Date.now();
            reloadEl.style.opacity = "1";
            setTimeout(() => reloadEl.style.opacity = "0", CONFIG.cannonCooldown);

            [-Math.PI/2, Math.PI/2].forEach(offset => {
                const angle = ship.angle + offset;
                cannonballs.push({
                    x: ship.x + Math.cos(angle) * 20,
                    y: ship.y + Math.sin(angle) * 20,
                    vx: Math.cos(angle) * 10,
                    vy: Math.sin(angle) * 10,
                    life: 60
                });
            });
        }

        function spawnMonster() {
            if (!gameActive) return;
            const angle = Math.random() * Math.PI * 2;
            const dist = 1000;
            monsters.push({
                x: ship.x + Math.cos(angle) * dist,
                y: ship.y + Math.sin(angle) * dist,
                angle: angle + Math.PI,
                hp: CONFIG.monsterHealth
            });
        }

        function initGame() {
            Object.assign(ship, { x: 0, y: 0, vel: 0, angle: -Math.PI/2, hull: 100 });
            score = 0; keysCollected = 0; coinCount = 0;
            scoreEl.innerText = score;
            keyCountEl.innerText = "0/3";
            coinCountEl.innerText = "0";
            hullBar.style.width = "100%";
            monsters = []; cannonballs = []; particles = []; waves = []; keys = []; coins = [];
            
            for (let i = 0; i < 3; i++) {
                const a = Math.random() * Math.PI * 2;
                const d = 1500 + Math.random() * 1000;
                keys.push({ x: Math.cos(a) * d, y: Math.sin(a) * d });
            }

            for (let i = 0; i < 12; i++) {
                const a = Math.random() * Math.PI * 2;
                const d = 1000 + Math.random() * 1200;
                coins.push({ x: Math.cos(a) * d, y: Math.sin(a) * d });
            }

            menuScreen.classList.add('opacity-0', 'pointer-events-none');
            uiHud.classList.remove('opacity-0');
            gameActive = true;
            monsterInterval = setInterval(spawnMonster, 4000);
            lastTime = performance.now();
            animationId = requestAnimationFrame(gameLoop);
        }

        function updatePhysics() {
            // Sailing Physics: Turning speed depends on velocity (momentum)
            if (input.active) {
                let diff = ship.targetAngle - ship.angle;
                while (diff <= -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;
                
                // Ship turns slower at high speeds and can't turn at 0 speed
                const turningAgility = Math.min(ship.vel / 2, 1) * CONFIG.baseTurnSpeed;
                ship.angle += diff * turningAgility;
                ship.vel = Math.min(ship.vel + CONFIG.acceleration, CONFIG.shipMaxSpeed);
            }
            
            ship.vel *= CONFIG.friction;
            ship.x += Math.cos(ship.angle) * ship.vel;
            ship.y += Math.sin(ship.angle) * ship.vel;

            camera.x += (ship.x - width / 2 - camera.x) * 0.1;
            camera.y += (ship.y - height / 2 - camera.y) * 0.1;

            // Cannonballs
            cannonballs.forEach((b, i) => {
                b.x += b.vx; b.y += b.vy; b.life--;
                if (b.life <= 0) cannonballs.splice(i, 1);
            });

            // Monsters
            monsters.forEach((m, mi) => {
                const targetA = Math.atan2(ship.y - m.y, ship.x - m.x);
                let d = targetA - m.angle;
                while (d <= -Math.PI) d += Math.PI * 2;
                while (d > Math.PI) d -= Math.PI * 2;
                m.angle += d * 0.03;
                m.x += Math.cos(m.angle) * 3;
                m.y += Math.sin(m.angle) * 3;

                // Hit by cannon
                cannonballs.forEach((b, bi) => {
                    if (Math.hypot(m.x - b.x, m.y - b.y) < 30) {
                        m.hp--;
                        cannonballs.splice(bi, 1);
                        if (m.hp <= 0) {
                            score += 250;
                            scoreEl.innerText = score;
                            monsters.splice(mi, 1);
                        }
                    }
                });

                // Hit player
                if (Math.hypot(m.x - ship.x, m.y - ship.y) < 40) {
                    ship.hull -= 0.5;
                    hullBar.style.width = `${ship.hull}%`;
                    if (ship.hull <= 0) endGame();
                }
            });

            // Keys
            keys.forEach((k, i) => {
                if (Math.hypot(k.x - ship.x, k.y - ship.y) < 50) {
                    keys.splice(i, 1);
                    keysCollected++;
                    keyCountEl.innerText = `${keysCollected}/3`;
                    score += 1000;
                    scoreEl.innerText = score;
                }
            });

            // Coins
            coins.forEach((c, i) => {
                if (Math.hypot(c.x - ship.x, c.y - ship.y) < 40) {
                    coins.splice(i, 1);
                    coinCount++;
                    coinCountEl.innerText = coinCount;
                    score += 150;
                    scoreEl.innerText = score;
                }
            });
        }

        function endGame() {
            gameActive = false;
            clearInterval(monsterInterval);
            menuScreen.classList.remove('opacity-0', 'pointer-events-none');
            menuTitle.innerText = "SHIPWRECKED";
            menuSubtitle.innerText = `Loot Recovered: ${score}`;
            startBtn.querySelector('span').innerText = "REBUILD SHIP";
        }

        function draw() {
            ctx.fillStyle = CONFIG.waterColor;
            ctx.fillRect(0, 0, width, height);

            ctx.save();
            ctx.translate(-camera.x, -camera.y);

            // Draw Ship
            ctx.save();
            ctx.translate(ship.x, ship.y);
            ctx.rotate(ship.angle);
            
            // Hull
            ctx.fillStyle = '#3e2723';
            ctx.beginPath();
            ctx.moveTo(35, 0);
            ctx.lineTo(-25, -15);
            ctx.lineTo(-30, 0);
            ctx.lineTo(-25, 15);
            ctx.closePath();
            ctx.fill();

            // Sails
            const sailWidth = 5 + (ship.vel * 2);
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(-10, - sailWidth - 10, 5, sailWidth * 2 + 20);
            ctx.restore();

            // Draw Cannonballs
            ctx.fillStyle = '#fbbf24';
            cannonballs.forEach(b => {
                ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI*2); ctx.fill();
            });

            // Draw Coins
            coins.forEach(c => {
                ctx.fillStyle = '#facc15';
                ctx.shadowBlur = 15; ctx.shadowColor = '#facc15';
                ctx.beginPath(); ctx.arc(c.x, c.y, 6, 0, Math.PI*2); ctx.fill();
                ctx.shadowBlur = 0;
                ctx.fillStyle = '#ffffff';
                ctx.beginPath(); ctx.arc(c.x-2, c.y-2, 2, 0, Math.PI*2); ctx.fill();
            });

            // Draw Keys
            keys.forEach(k => {
                ctx.fillStyle = '#22d3ee';
                ctx.shadowBlur = 15; ctx.shadowColor = '#22d3ee';
                ctx.beginPath(); ctx.arc(k.x, k.y, 8, 0, Math.PI*2); ctx.fill();
                ctx.shadowBlur = 0;
            });

            // Draw Monsters
            monsters.forEach(m => {
                ctx.save();
                ctx.translate(m.x, m.y); ctx.rotate(m.angle);
                ctx.fillStyle = '#475569';
                ctx.beginPath(); ctx.ellipse(0, 0, 25, 10, 0, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#ef4444'; ctx.fillRect(10, -5, 4, 2); ctx.fillRect(10, 3, 4, 2);
                ctx.restore();
            });

            ctx.restore();
        }

        function gameLoop(t) {
            if (!gameActive) return;
            updatePhysics();
            draw();
            requestAnimationFrame(gameLoop);
        }

        startBtn.addEventListener('click', initGame);