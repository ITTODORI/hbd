const CONFIG = {
            shipMaxSpeed: 5,
            acceleration: 0.1,
            friction: 0.98,
            baseTurnSpeed: 0.04,
            waterColor: '#070b14',
            cannonCooldown: 1200,
            monsterHealth: 2,
            maxHull: 100,
            barrierDamage: 10,
            worldRadius: 2500 // Ukuran batas area (sedang)
        };

        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        const uiHud = document.getElementById('hud');
        const menuScreen = document.getElementById('menu-screen');
        const startBtn = document.getElementById('start-btn');
        const hullBar = document.getElementById('hull-bar');
        const reloadEl = document.getElementById('reload-indicator');
        const keyCountEl = document.getElementById('key-count');
        const coinCountEl = document.getElementById('coin-count');
        const compassArrowCoin = document.getElementById('compass-arrow-coin');
        const compassArrowKey = document.getElementById('compass-arrow-key');

        let width, height, animationId, monsterInterval;
        let lastTime = 0, gameActive = false;
        let keysCollected = 0, coinCount = 0, lastFire = 0;
        
        let ship = { x: 0, y: 0, angle: -Math.PI / 2, vel: 0, targetAngle: -Math.PI / 2, hull: 100, radius: 15 };
        let camera = { x: 0, y: 0 }, input = { active: false, x: 0, y: 0 };
        let monsters = [], cannonballs = [], keys = [], coins = [], barriers = [];

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }
        window.addEventListener('resize', resize);
        resize();

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
                cannonballs.push({ x: ship.x + Math.cos(angle) * 20, y: ship.y + Math.sin(angle) * 20, vx: Math.cos(angle) * 10, vy: Math.sin(angle) * 10, life: 60 });
            });
        }

        function spawnMonster() {
            if (!gameActive) return;
            const angle = Math.random() * Math.PI * 2;
            const dist = 800;
            monsters.push({ x: ship.x + Math.cos(angle) * dist, y: ship.y + Math.sin(angle) * dist, angle: angle + Math.PI, hp: CONFIG.monsterHealth });
        }

        function initGame() {
            Object.assign(ship, { x: 0, y: 0, vel: 0, angle: -Math.PI/2, hull: 100 });
            keysCollected = 0; coinCount = 0;
            keyCountEl.innerText = "0/3"; coinCountEl.innerText = "0";
            hullBar.style.width = "100%";
            monsters = []; cannonballs = []; keys = []; coins = []; barriers = [];
            
            // Spawn Barriers (Ghost Reefs)
            for (let i = 0; i < 20; i++) {
                const a = Math.random() * Math.PI * 2;
                const d = 400 + Math.random() * (CONFIG.worldRadius - 600);
                let points = [];
                const radius = 30 + Math.random() * 50;
                for(let p=0; p<8; p++) {
                    const ang = (p/8) * Math.PI * 2;
                    points.push({x: Math.cos(ang) * radius * (0.7 + Math.random() * 0.6), y: Math.sin(ang) * radius * (0.7 + Math.random() * 0.6)});
                }
                barriers.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, radius: radius, points: points });
            }

            // Spawn Items within world radius
            for (let i = 0; i < 3; i++) {
                const a = Math.random() * Math.PI * 2;
                const d = 500 + Math.random() * (CONFIG.worldRadius - 1000);
                keys.push({ x: Math.cos(a) * d, y: Math.sin(a) * d });
            }
            for (let i = 0; i < 15; i++) {
                const a = Math.random() * Math.PI * 2;
                const d = 300 + Math.random() * (CONFIG.worldRadius - 500);
                coins.push({ x: Math.cos(a) * d, y: Math.sin(a) * d });
            }

            menuScreen.classList.add('opacity-0', 'pointer-events-none');
            uiHud.classList.remove('opacity-0');
            gameActive = true;
            monsterInterval = setInterval(spawnMonster, 4000);
            animationId = requestAnimationFrame(gameLoop);
        }

        function updatePhysics() {
            if (input.active) {
                let diff = ship.targetAngle - ship.angle;
                while (diff <= -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;
                ship.angle += diff * (Math.min(ship.vel / 2, 1) * CONFIG.baseTurnSpeed);
                ship.vel = Math.min(ship.vel + CONFIG.acceleration, CONFIG.shipMaxSpeed);
            }
            
            ship.vel *= CONFIG.friction;
            let nextX = ship.x + Math.cos(ship.angle) * ship.vel;
            let nextY = ship.y + Math.sin(ship.angle) * ship.vel;

            // WORLD BORDER CHECK
            const distFromCenter = Math.hypot(nextX, nextY);
            if (distFromCenter > CONFIG.worldRadius) {
                ship.vel *= 0.5; // Melambatkan kapal saat menabrak batas
                const angleToCenter = Math.atan2(nextY, nextX);
                nextX = Math.cos(angleToCenter) * CONFIG.worldRadius;
                nextY = Math.sin(angleToCenter) * CONFIG.worldRadius;
            }

            // REEF COLLISION
            let hitBarrier = false;
            for (let b of barriers) {
                if (Math.hypot(nextX - b.x, nextY - b.y) < b.radius + ship.radius) {
                    hitBarrier = true; break;
                }
            }

            if (!hitBarrier) { ship.x = nextX; ship.y = nextY; } 
            else { if (ship.vel > 1) ship.hull -= 5; ship.vel = 0; hullBar.style.width = `${Math.max(0, ship.hull)}%`; if (ship.hull <= 0) endGame(); }

            camera.x += (ship.x - width / 2 - camera.x) * 0.1;
            camera.y += (ship.y - height / 2 - camera.y) * 0.1;

            cannonballs.forEach((b, i) => {
                b.x += b.vx; b.y += b.vy; b.life--;
                barriers.forEach(bar => { if (Math.hypot(b.x - bar.x, b.y - bar.y) < bar.radius) b.life = 0; });
                if (b.life <= 0) cannonballs.splice(i, 1);
            });

            monsters.forEach((m, mi) => {
                const targetA = Math.atan2(ship.y - m.y, ship.x - m.x);
                let d = targetA - m.angle;
                while (d <= -Math.PI) d += Math.PI * 2;
                while (d > Math.PI) d -= Math.PI * 2;
                m.angle += d * 0.03;
                m.x += Math.cos(m.angle) * 2; m.y += Math.sin(m.angle) * 2;

                cannonballs.forEach((b, bi) => {
                    if (Math.hypot(m.x - b.x, m.y - b.y) < 30) {
                        m.hp--; cannonballs.splice(bi, 1);
                        if (m.hp <= 0) monsters.splice(mi, 1);
                    }
                });

                if (Math.hypot(m.x - ship.x, m.y - ship.y) < 40) {
                    ship.hull -= 0.5; hullBar.style.width = `${ship.hull}%`;
                    if (ship.hull <= 0) endGame();
                }
            });

            for (let i = coins.length - 1; i >= 0; i--) {
                if (Math.hypot(coins[i].x - ship.x, coins[i].y - ship.y) < 40) {
                    coins.splice(i, 1); coinCount++; coinCountEl.innerText = coinCount;
                }
            }
            for (let i = keys.length - 1; i >= 0; i--) {
                if (Math.hypot(keys[i].x - ship.x, keys[i].y - ship.y) < 50) {
                    keys.splice(i, 1); keysCollected++; keyCountEl.innerText = `${keysCollected}/3`;
                }
            }
        }

        function draw() {
            ctx.fillStyle = CONFIG.waterColor;
            ctx.fillRect(0, 0, width, height);
            ctx.save();
            ctx.translate(-camera.x, -camera.y);

            // DRAW WORLD BORDER (THE FOG)
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 15;
            ctx.setLineDash([20, 20]);
            ctx.beginPath();
            ctx.arc(0, 0, CONFIG.worldRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);

            // DRAW REEFS
            barriers.forEach(b => {
                ctx.fillStyle = '#0f172a'; ctx.strokeStyle = '#334155'; ctx.lineWidth = 2;
                ctx.beginPath();
                b.points.forEach((p, i) => { if(i===0) ctx.moveTo(b.x + p.x, b.y + p.y); else ctx.lineTo(b.x + p.x, b.y + p.y); });
                ctx.closePath(); ctx.fill(); ctx.stroke();
            });

            // DRAW SHIP
            ctx.save(); ctx.translate(ship.x, ship.y); ctx.rotate(ship.angle);
            ctx.fillStyle = '#3e2723'; ctx.beginPath();
            ctx.moveTo(35, 0); ctx.lineTo(-25, -15); ctx.lineTo(-30, 0); ctx.lineTo(-25, 15);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#f8fafc'; ctx.fillRect(-10, - (5 + ship.vel * 2) - 10, 5, (5 + ship.vel * 2) * 2 + 20);
            ctx.restore();

            cannonballs.forEach(b => { ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI*2); ctx.fill(); });
            coins.forEach(c => { ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.arc(c.x, c.y, 6, 0, Math.PI*2); ctx.fill(); });
            keys.forEach(k => { ctx.fillStyle = '#22d3ee'; ctx.beginPath(); ctx.arc(k.x, k.y, 8, 0, Math.PI*2); ctx.fill(); });
            monsters.forEach(m => {
                ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(m.angle);
                ctx.fillStyle = '#475569'; ctx.beginPath(); ctx.ellipse(0, 0, 25, 10, 0, 0, Math.PI*2); ctx.fill();
                ctx.restore();
            });
            ctx.restore();
        }

        function endGame() {
            gameActive = false; clearInterval(monsterInterval);
            menuScreen.classList.remove('opacity-0', 'pointer-events-none');
            startBtn.querySelector('span').innerText = "TRY AGAIN";
        }

        function gameLoop() { if (gameActive) { updatePhysics(); draw(); requestAnimationFrame(gameLoop); } }
        startBtn.addEventListener('click', initGame);