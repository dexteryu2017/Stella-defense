import React, { useEffect, useRef, useState } from 'react';
import { Bullet, Enemy, EnemyType, GameStats, ItemType, Particle, PowerUpItem, Star } from '../types';
import { sound } from '../utils/audio';

interface SpaceCanvasProps {
  stats: GameStats;
  onStatsChange: (updater: (prev: GameStats) => GameStats) => void;
  onUnlockAchievement: (id: string, title: string) => void;
  onTripleShotTimerChange: (val: number) => void;
}

export const SpaceCanvas: React.FC<SpaceCanvasProps> = ({
  stats,
  onStatsChange,
  onUnlockAchievement,
  onTripleShotTimerChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastSyncedTimerRef = useRef(0);
  const lastSyncedDiagonalRef = useRef(0);
  const lastSyncedDroneRef = useRef(0);
  const lastSyncedLaserRef = useRef(0);
  const lastSyncedOverdriveRef = useRef(0);

  // Gameplay Constants
  const BASE_WIDTH = 600;
  const BASE_HEIGHT = 800;

  // Game references to keep mutable state out of render triggers to maximize FPS
  const gameStateRef = useRef({
    player: {
      x: BASE_WIDTH / 2,
      y: BASE_HEIGHT - 100,
      width: 48,
      height: 48,
      speed: 6.5,
      invulnerableTimer: 0, // flashes when hit
      targetX: BASE_WIDTH / 2, // for mouse/touch smooth drag
      targetY: BASE_HEIGHT - 100,
      isDragging: false,
      isMouseActive: false,
    },
    bullets: [] as Bullet[],
    enemies: [] as Enemy[],
    items: [] as PowerUpItem[],
    particles: [] as Particle[],
    stars: [] as Star[],
    keys: {} as Record<string, boolean>,
    fireCooldown: 0,
    tripleShotTimer: 0,
    diagonalShotTimer: 0,
    droneTimer: 0,
    laserTimer: 0,
    overdriveTimer: 0,
    secTimeTracker: 0,
    secondsWithoutDamaged: 0,
    tripleShotPickupStreak: 0,
    dodgesCount: 0,
    warningOverlayTimer: 0,
    bombFlashTimer: 0,
  });

  // Level Up overlay trigger in state
  const [levelUpMessage, setLevelUpMessage] = useState<string | null>(null);

  // Preload custom PNG assets for local vscode customization (loads from public/assets/)
  const imageAssetsRef = useRef<{
    player: HTMLImageElement | HTMLCanvasElement | null;
    enemy_base: HTMLImageElement | HTMLCanvasElement | null;
    enemy_fast: HTMLImageElement | HTMLCanvasElement | null;
    enemy_heavy: HTMLImageElement | HTMLCanvasElement | null;
    enemy_elite: HTMLImageElement | HTMLCanvasElement | null;
    enemy_scout: HTMLImageElement | HTMLCanvasElement | null;
    enemy_bomber: HTMLImageElement | HTMLCanvasElement | null;
    enemy_boss: HTMLImageElement | HTMLCanvasElement | null;
  }>({
    player: null,
    enemy_base: null,
    enemy_fast: null,
    enemy_heavy: null,
    enemy_elite: null,
    enemy_scout: null,
    enemy_bomber: null,
    enemy_boss: null,
  });

  useEffect(() => {
    // Assets inside the public folder can be fetched from absolute paths in Vite
    const assets = {
      player: '/assets/player.png',
      enemy_base: '/assets/enemy_basic.png',
      enemy_fast: '/assets/enemy_fast.png',
      enemy_heavy: '/assets/enemy_heavy.png',
      enemy_elite: '/assets/enemy_elite.png',
      enemy_scout: '/assets/enemy_scout.png',
      enemy_bomber: '/assets/enemy_bomber.png',
      enemy_boss: '/assets/enemy_boss.png',
    };

    // Helper to chroma-key out very dark or white background pixels to ensure transparent starfields
    const removeDarkBackground = (img: HTMLImageElement): HTMLCanvasElement | HTMLImageElement => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return img;
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        // Get corner pixel color as reference background color for dynamic chroma-keying
        const refR = data[0];
        const refG = data[1];
        const refB = data[2];
        const refA = data[3];

        // If the corner pixel is already transparent, no keying is needed
        if (refA < 50) {
          return img;
        }

        const threshold = 40; // Max color difference margin for compression artifacts
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          const diffR = Math.abs(r - refR);
          const diffG = Math.abs(g - refG);
          const diffB = Math.abs(b - refB);

          if (diffR < threshold && diffG < threshold && diffB < threshold) {
            data[i + 3] = 0; // Transparent
          }
        }
        ctx.putImageData(imgData, 0, 0);
        return canvas;
      } catch (err) {
        console.error("Failed chroma-key preprocessing:", err);
        return img;
      }
    };

    const loadedAssets = imageAssetsRef.current;
    
    Object.entries(assets).forEach(([key, src]) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        console.log(`Success preloading local skin asset for: ${key}`);
        loadedAssets[key as keyof typeof loadedAssets] = removeDarkBackground(img);
      };
      img.onerror = () => {
        // Soft fail allows fallback to vector graphics, which is standard behaviour online
      };
      loadedAssets[key as keyof typeof loadedAssets] = img;
    });
  }, []);

  // Initialize scrolling background starfield
  useEffect(() => {
    const stars: Star[] = [];
    const colors = ['#38bdf8', '#818cf8', '#ffffff', '#e2e8f0', '#7dd3fc'];
    for (let i = 0; i < 90; i++) {
      stars.push({
        x: Math.random() * BASE_WIDTH,
        y: Math.random() * BASE_HEIGHT,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 1.5 + 0.4,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
    gameStateRef.current.stars = stars;
  }, []);

  // Set up Keyboard Action Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const code = e.code;
      // Prevent scrolling behaviour with arrow keys or Space inside iframe
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(code)) {
        e.preventDefault();
      }
      gameStateRef.current.keys[code] = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      gameStateRef.current.keys[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Main Simulation & Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let lastTime = performance.now();

    const loop = (timestamp: number) => {
      const elapsed = timestamp - lastTime;
      // Limit physics updates to standard framerates to avoid fast/slow speeds
      const dt = Math.min(elapsed, 100); 
      lastTime = timestamp;

      // Draw Background Stars (always scroll, even during pauses)
      updateStars();

      if (stats.gameStarted && !stats.paused && !stats.gameOver) {
        updatePhysics(dt);
        checkCollisions();
      }

      render(ctx);

      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [stats.gameStarted, stats.paused, stats.gameOver, stats.level, stats.score]);

  // Handle Level Clear & Upgrades triggered by Level change
  useEffect(() => {
    if (stats.gameStarted && stats.level > 1 && !stats.gameOver) {
      sound.playLevelUp();
      setLevelUpMessage(`GALACTIC SECTOR LEVEL ${stats.level}`);
      
      // Flash glowing level text
      setTimeout(() => {
        setLevelUpMessage(null);
      }, 2500);

      // Clear common minor enemies on level up with neat particle bursts
      const currentEnemies = gameStateRef.current.enemies;
      currentEnemies.forEach(e => {
        spawnExplosion(e.x, e.y, e.color, 12);
      });
      gameStateRef.current.enemies = [];
    }
  }, [stats.level]);

  // RESET Game entities back to original state on restarting
  useEffect(() => {
    if (stats.gameStarted && stats.score === 0 && stats.level === 1 && stats.lives === 5) {
      const state = gameStateRef.current;
      state.player.x = BASE_WIDTH / 2;
      state.player.y = BASE_HEIGHT - 120;
      state.player.invulnerableTimer = 0;
      state.bullets = [];
      state.enemies = [];
      state.items = [];
      state.particles = [];
      state.fireCooldown = 0;
      state.tripleShotTimer = 0;
      state.diagonalShotTimer = 0;
      state.droneTimer = 0;
      state.laserTimer = 0;
      state.overdriveTimer = 0;
      state.secTimeTracker = 0;
      state.secondsWithoutDamaged = 0;
      state.tripleShotPickupStreak = 0;
      state.dodgesCount = 0;
      state.warningOverlayTimer = 0;
      state.bombFlashTimer = 0;
    }
  }, [stats.gameStarted, stats.score, stats.level, stats.lives, stats.gameOver]);

  // Core Physics state updater
  const updatePhysics = (dt: number) => {
    const state = gameStateRef.current;
    const keys = state.keys;
    const player = state.player;

    // 1. Double/Triple damage timer ticks
    if (state.tripleShotTimer > 0) {
      state.tripleShotTimer -= dt / 1000;
      if (state.tripleShotTimer < 0) state.tripleShotTimer = 0;
    }
    if (state.diagonalShotTimer > 0) {
      state.diagonalShotTimer -= dt / 1000;
      if (state.diagonalShotTimer < 0) state.diagonalShotTimer = 0;
    }
    if (state.droneTimer > 0) {
      state.droneTimer -= dt / 1000;
      if (state.droneTimer < 0) state.droneTimer = 0;
    }
    if (state.laserTimer > 0) {
      state.laserTimer -= dt / 1000;
      if (state.laserTimer < 0) state.laserTimer = 0;
    }
    if (state.overdriveTimer > 0) {
      state.overdriveTimer -= dt / 1000;
      if (state.overdriveTimer < 0) state.overdriveTimer = 0;
    }

    // Sync to parent occasionally to optimize rendering
    if (Math.abs(state.tripleShotTimer - lastSyncedTimerRef.current) > 0.05 || (state.tripleShotTimer === 0 && lastSyncedTimerRef.current > 0)) {
      onTripleShotTimerChange(state.tripleShotTimer);
      lastSyncedTimerRef.current = state.tripleShotTimer;
    }

    if (
      Math.abs(state.diagonalShotTimer - lastSyncedDiagonalRef.current) > 0.05 || (state.diagonalShotTimer === 0 && lastSyncedDiagonalRef.current > 0) ||
      Math.abs(state.droneTimer - lastSyncedDroneRef.current) > 0.05 || (state.droneTimer === 0 && lastSyncedDroneRef.current > 0) ||
      Math.abs(state.laserTimer - lastSyncedLaserRef.current) > 0.05 || (state.laserTimer === 0 && lastSyncedLaserRef.current > 0) ||
      Math.abs(state.overdriveTimer - lastSyncedOverdriveRef.current) > 0.05 || (state.overdriveTimer === 0 && lastSyncedOverdriveRef.current > 0)
    ) {
      onStatsChange(prev => ({
        ...prev,
        diagonalShotTimer: state.diagonalShotTimer,
        droneTimer: state.droneTimer,
        laserTimer: state.laserTimer,
        overdriveTimer: state.overdriveTimer,
      }));
      lastSyncedDiagonalRef.current = state.diagonalShotTimer;
      lastSyncedDroneRef.current = state.droneTimer;
      lastSyncedLaserRef.current = state.laserTimer;
      lastSyncedOverdriveRef.current = state.overdriveTimer;
    }

    // Tick invincibility frames
    if (player.invulnerableTimer > 0) {
      player.invulnerableTimer -= dt;
    }

    // Tick warning overlay timer
    if (state.warningOverlayTimer > 0) {
      state.warningOverlayTimer -= dt;
      if (state.warningOverlayTimer <= 0) {
        onStatsChange(p => ({ ...p, warningFlash: false }));
      }
    }

    // Tick bomb screen flash timer
    if (state.bombFlashTimer > 0) {
      state.bombFlashTimer -= dt;
    }

    // Periodical timer checks (once per second) for Time Counters and Achievements
    state.secTimeTracker += dt;
    if (state.secTimeTracker >= 1000) {
      state.secTimeTracker = 0;
      state.secondsWithoutDamaged++;

      // Trigger achievements based on running variables
      if (state.secondsWithoutDamaged >= 60) {
        onUnlockAchievement('survivor', '生存专家');
      }

      // Sync play timer in UI
      onStatsChange(prev => ({
        ...prev,
        playTime: prev.playTime + 1,
      }));
    }

    // 2. Spaceship Movement
    let dx = 0;
    let dy = 0;

    if (keys['KeyA'] || keys['ArrowLeft']) dx = -1;
    if (keys['KeyD'] || keys['ArrowRight']) dx = 1;
    if (keys['KeyW'] || keys['ArrowUp']) dy = -1;
    if (keys['KeyS'] || keys['ArrowDown']) dy = 1;

    // keyboard movements immediately override and deactivate active mouse following state
    if (dx !== 0 || dy !== 0) {
      player.isMouseActive = false;
    }

    // Handle smooth dragging or mouse-hovering transition for pointers
    const activeSpeed = state.overdriveTimer > 0 ? player.speed * 1.25 : player.speed;
    if (player.isDragging || player.isMouseActive) {
      const lerpFactor = 0.18; // smooth delay value
      player.x += (player.targetX - player.x) * lerpFactor;
      player.y += (player.targetY - player.y) * lerpFactor;
    } else {
      player.x += dx * activeSpeed * (dt / 13);
      player.y += dy * activeSpeed * (dt / 13);
    }

    // Enforce Boundaries restriction
    const padding = 15;
    player.x = Math.max(padding, Math.min(BASE_WIDTH - padding, player.x));
    player.y = Math.max(100, Math.min(BASE_HEIGHT - padding, player.y)); // allow flying higher while keeping HUD clear and readable

    // 3. Automated shooting on clicking / spacebar down
    if (state.fireCooldown > 0) {
      state.fireCooldown -= dt;
    }

    const isShootingRequested = keys['Space'] || player.isDragging || player.isMouseActive;
    if (isShootingRequested && state.fireCooldown <= 0) {
      spawnPlayerBullet();
      state.fireCooldown = state.overdriveTimer > 0 ? 65 : 160; // shoot rate speedup in overdrive!
    }

    // 4. Update bullets physics
    state.bullets.forEach((b) => {
      b.x += b.vx * (dt / 13);
      b.y += b.vy * (dt / 13);
    });
    // Filter out off-screen lasers
    state.bullets = state.bullets.filter(
      (b) => b.y > -20 && b.y < BASE_HEIGHT + 20 && b.x > -20 && b.x < BASE_WIDTH + 20
    );

    // 5. Update items scrolling
    state.items.forEach((item) => {
      item.y += item.speedY * (dt / 13);
      item.angle += 0.02 * (dt / 13); // rotation
    });
    // Remove off-screen items at bottom
    state.items = state.items.filter((i) => i.y < BASE_HEIGHT + 30);

    // 6. Update enemies kinematics
    const levelModifier = 1 + (stats.level - 1) * 0.15;
    state.enemies.forEach((enemy) => {
      enemy.pulseState += 0.05 * (dt / 13);
      
      if (enemy.type === 'fast') {
        // Fast interceptors dive straight and accelerate
        enemy.y += enemy.speed * (dt / 13);
      } else if (enemy.type === 'heavy') {
        // Heavy cruisers descend slowly in a diagonal weave
        enemy.y += enemy.speed * (dt / 13);
        enemy.x += Math.sin(enemy.angle) * 0.8 * (dt / 13);
        enemy.angle += 0.01 * (dt / 13);
      } else if (enemy.type === 'elite') {
        // Elite fighters slide in high-amplitude elegant lateral S-curves
        enemy.y += enemy.speed * (dt / 13);
        enemy.x += Math.sin(enemy.angle) * 2.5 * (dt / 13);
        enemy.angle += 0.05 * (dt / 13);

        // Elite firing patterns: shoots occasional double angled streams
        if (Math.random() < 0.012 && stats.gameStarted) {
          spawnEnemyBullet(enemy.x - 12, enemy.y + 15, -0.6, 3.6, '#d946ef');
          spawnEnemyBullet(enemy.x + 12, enemy.y + 15, 0.6, 3.6, '#d946ef');
        }
      } else if (enemy.type === 'scout') {
        // Scout ships zip extremely fast side-to-side in a tight, rapid wave
        enemy.y += enemy.speed * (dt / 13);
        enemy.x += Math.cos(enemy.angle) * 4.0 * (dt / 13);
        enemy.angle += 0.12 * (dt / 13);

        // Single high-speed sniper laser
        if (Math.random() < 0.009 && stats.gameStarted) {
          spawnEnemyBullet(enemy.x, enemy.y + 12, 0, 5.5, '#06b6d4');
        }
      } else if (enemy.type === 'bomber') {
        // Heavy bombers slide slowly downwards and fire a big heavy blast
        enemy.y += enemy.speed * (dt / 13);
        enemy.x += Math.sin(enemy.angle) * 0.3 * (dt / 13);
        enemy.angle += 0.008 * (dt / 13);

        // Heavy plasma mortar fire
        if (Math.random() < 0.015 && stats.gameStarted) {
          spawnEnemyBullet(enemy.x, enemy.y + 24, 0, 2.5, '#e11d48');
        }
      } else if (enemy.type === 'boss') {
        // Elite carrier moves in weaving s-shape patterns and stops at top-third coordinates
        if (enemy.y < 160) {
          enemy.y += 1 * (dt / 13);
        }
        enemy.x += Math.sin(enemy.angle) * 2.2 * (dt / 13);
        enemy.angle += 0.02 * (dt / 13);

        // Rare boss firing logic!
        if (Math.random() < 0.015 && stats.gameStarted) {
          spawnEnemyBullet(enemy.x, enemy.y + 35, 0, 4.5, '#ef4444');
          spawnEnemyBullet(enemy.x - 20, enemy.y + 20, -1, 4, '#ef4444');
          spawnEnemyBullet(enemy.x + 20, enemy.y + 20, 1, 4, '#ef4444');
        }
      } else {
        // Basic ships descend in a light sine-wave
        enemy.y += enemy.speed * (dt / 13);
        enemy.x += Math.sin(enemy.angle) * 1.0 * (dt / 13);
        enemy.angle += 0.03 * (dt / 13);
      }
    });

    // Handle Escaped enemies reaching bottom edge
    state.enemies.forEach((enemy) => {
      if (enemy.onScreen && enemy.y > BASE_HEIGHT + enemy.height / 2) {
        enemy.onScreen = false;
        // Escape penalty
        onStatsChange(p => ({
          ...p,
          score: Math.max(0, p.score - 15),
          warningFlash: true,
        }));
        // Subtract armor health if any non-boss enemy escapes (highly intuitive core arcade rule!)
        onStatsChange(p => ({
          ...p,
          lives: Math.max(0, p.lives - 1),
        }));
        sound.playHurt();
        state.warningOverlayTimer = 800; // blink danger screen
      }
    });
    // Filter out dead/escaped enemies
    state.enemies = state.enemies.filter((e) => e.y < BASE_HEIGHT + 50);

    // Spawning frequency of brand-new enemies
    const spawnChance = 0.007 + (stats.level * 0.003); // higher level spawns more
    if (Math.random() < spawnChance && state.enemies.length < 8 + stats.level) {
      spawnEnemy();
    }

    // Rare Spawning of upgrade items
    const itemChance = 0.002;
    if (Math.random() < itemChance && state.items.length < 2) {
      spawnPowerUp();
    }

    // 7. Update Particles
    state.particles.forEach((p) => {
      p.x += p.vx * (dt / 13);
      p.y += p.vy * (dt / 13);
      p.alpha -= p.decay * (dt / 13);
    });
    state.particles = state.particles.filter((p) => p.alpha > 0);
  };

  const updateStars = () => {
    const stars = gameStateRef.current.stars;
    stars.forEach((star) => {
      star.y += star.speed;
      if (star.y > BASE_HEIGHT) {
        star.y = 0;
        star.x = Math.random() * BASE_WIDTH;
      }
    });
  };

  // Triggering visual feedback and particle bursts
  const spawnExplosion = (x: number, y: number, color: string, count = 18) => {
    const list = gameStateRef.current.particles;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3.5 + 1.2;
      list.push({
        id: Math.random().toString(),
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: Math.random() * 2.8 + 1,
        color,
        alpha: 1.0,
        decay: Math.random() * 0.015 + 0.01,
      });
    }
  };

  // Set-up firing mechanics
  const spawnPlayerBullet = () => {
    const state = gameStateRef.current;
    const player = state.player;
    const bullets = state.bullets;

    sound.playLaser();
    onStatsChange(p => ({ ...p, bulletsFired: p.bulletsFired + 1 }));

    const isOverdrive = state.overdriveTimer > 0;
    const speedMultiplier = isOverdrive ? 1.3 : 1.0;
    const bulletSizeBonus = isOverdrive ? 1.0 : 0;
    const bulletColor = isOverdrive ? '#f43f5e' : '#22d3ee'; // Hot pink / red in overdrive!

    // 1. Diagonal/Spread shot (highly interactive, fans out 5 bullets)
    if (state.diagonalShotTimer > 0) {
      const spreadAngles = [-3, -1.5, 0, 1.5, 3];
      spreadAngles.forEach((vxVal) => {
        bullets.push({
          id: Math.random().toString(),
          x: player.x,
          y: player.y - 12,
          vx: vxVal * speedMultiplier,
          vy: -9.5 * speedMultiplier,
          radius: (2.8 + bulletSizeBonus),
          color: isOverdrive ? '#ec4899' : '#10b981', // green or hot pink
          damage: 1,
          isPlayer: true,
        });
      });
    }

    // 2. Triple or normal shot
    if (state.tripleShotTimer > 0) {
      // 3 vectors: Straight, Diagonal Left, Diagonal Right
      bullets.push({
        id: Math.random().toString(),
        x: player.x,
        y: player.y - 15,
        vx: 0,
        vy: -9.5 * speedMultiplier,
        radius: (3 + bulletSizeBonus),
        color: bulletColor,
        damage: 1,
        isPlayer: true,
      });
      bullets.push({
        id: Math.random().toString(),
        x: player.x - 10,
        y: player.y - 10,
        vx: -2.0 * speedMultiplier,
        vy: -8.8 * speedMultiplier,
        radius: (3 + bulletSizeBonus),
        color: isOverdrive ? '#facc15' : '#eab308', // gold/yellow
        damage: 1,
        isPlayer: true,
      });
      bullets.push({
        id: Math.random().toString(),
        x: player.x + 10,
        y: player.y - 10,
        vx: 2.0 * speedMultiplier,
        vy: -8.8 * speedMultiplier,
        radius: (3 + bulletSizeBonus),
        color: isOverdrive ? '#facc15' : '#eab308',
        damage: 1,
        isPlayer: true,
      });
    } else if (state.diagonalShotTimer <= 0) {
      // Standard dual bullet straight (only if diagonal was not fired to prevent over-cluttering screen)
      bullets.push({
        id: Math.random().toString(),
        x: player.x - 10,
        y: player.y - 12,
        vx: 0,
        vy: -9 * speedMultiplier,
        radius: (2.5 + bulletSizeBonus),
        color: bulletColor,
        damage: 1,
        isPlayer: true,
      });
      bullets.push({
        id: Math.random().toString(),
        x: player.x + 10,
        y: player.y - 12,
        vx: 0,
        vy: -9 * speedMultiplier,
        radius: (2.5 + bulletSizeBonus),
        color: bulletColor,
        damage: 1,
        isPlayer: true,
      });
    }

    // 3. Companion drones helper weapon (two custom satellites firing angled neon projectiles!)
    if (state.droneTimer > 0) {
      bullets.push({
        id: Math.random().toString(),
        x: player.x - 30,
        y: player.y + 5,
        vx: -0.5 * speedMultiplier,
        vy: -9.2 * speedMultiplier,
        radius: 2.2,
        color: '#c084fc', // purple light
        damage: 1,
        isPlayer: true,
      });
      bullets.push({
        id: Math.random().toString(),
        x: player.x + 30,
        y: player.y + 5,
        vx: 0.5 * speedMultiplier,
        vy: -9.2 * speedMultiplier,
        radius: 2.2,
        color: '#c084fc',
        damage: 1,
        isPlayer: true,
      });
    }
  };

  const spawnEnemyBullet = (x: number, y: number, vx: number, vy: number, color: string) => {
    gameStateRef.current.bullets.push({
      id: Math.random().toString(),
      x,
      y,
      vx,
      vy,
      radius: 3.5,
      color,
      damage: 1,
      isPlayer: false,
    });
  };

  // Generate randomized enemy ship types based on Level
  const spawnEnemy = () => {
    const state = gameStateRef.current;
    
    // Choose enemy type based on weights and level (7 distinct types of tactical enemy aircraft!)
    let type: EnemyType = 'basic';
    const rand = Math.random();

    if (stats.level >= 4) {
      const bossExists = state.enemies.some(e => e.type === 'boss');
      if (!bossExists && rand < 0.07) {
        type = 'boss';
      } else if (rand < 0.17) {
        type = 'elite'; // Slithering elite fighter
      } else if (rand < 0.31) {
        type = 'bomber'; // Heavy fortress bomber
      } else if (rand < 0.46) {
        type = 'heavy'; // Heavy cruiser
      } else if (rand < 0.61) {
        type = 'scout'; // Nimble tactical scout
      } else if (rand < 0.81) {
        type = 'fast'; // Swift interceptor
      } else {
        type = 'basic';
      }
    } else if (stats.level === 3) {
      if (rand < 0.12) type = 'bomber';
      else if (rand < 0.32) type = 'heavy';
      else if (rand < 0.52) type = 'scout';
      else if (rand < 0.72) type = 'fast';
      else type = 'basic';
    } else if (stats.level === 2) {
      if (rand < 0.20) type = 'scout';
      else if (rand < 0.50) type = 'fast';
      else type = 'basic';
    } else {
      // Level 1: Introduce occasional nimble scout
      if (rand < 0.12) type = 'scout';
      else type = 'basic';
    }

    let width = 36;
    let height = 36;
    let color = '#facc15'; // yellow basic
    let speed = Math.random() * 1.5 + 1.2;
    let hp = 1;
    let scoreValue = 100;

    if (type === 'fast') {
      width = 28;
      height = 28;
      color = '#f97316'; // glowing orange
      speed = Math.random() * 1.4 + 3.2; // very quick
      hp = 1;
      scoreValue = 150;
    } else if (type === 'heavy') {
      width = 54;
      height = 50;
      color = '#a855f7'; // pulsing purple
      speed = Math.random() * 0.4 + 1.0; // heavy slowing
      hp = 3;
      scoreValue = 300;
    } else if (type === 'elite') {
      width = 46;
      height = 46;
      color = '#d946ef'; // vibrant magenta
      speed = Math.random() * 0.7 + 1.8; // medium speed with slithering motion
      hp = 4;
      scoreValue = 450;
    } else if (type === 'scout') {
      width = 30;
      height = 30;
      color = '#06b6d4'; // bright glowing electric cyan
      speed = Math.random() * 1.5 + 4.2; // extremely fast and nimble
      hp = 1;
      scoreValue = 200;
    } else if (type === 'bomber') {
      width = 58;
      height = 54;
      color = '#e11d48'; // heavy tactical crimson
      speed = Math.random() * 0.3 + 0.8; // heavy armored bomber movement
      hp = 6;
      scoreValue = 500;
    } else if (type === 'boss') {
      width = 80;
      height = 70;
      color = '#ef4444'; // royal crimson red
      speed = 1.0;
      hp = 12;
      scoreValue = 1200;
    }

    state.enemies.push({
      id: Math.random().toString(),
      x: Math.random() * (BASE_WIDTH - 80) + 40,
      y: -50,
      width,
      height,
      type,
      color,
      speed: speed * (1 + (stats.level - 1) * 0.08), // lightly scale with level
      hp,
      maxHp: hp,
      scoreValue,
      angle: Math.random() * Math.PI,
      pulseState: Math.random() * 10,
    });
  };

  // Generate randomized item pickup boxes (8 unique variations of weapon tech!)
  const spawnPowerUp = () => {
    const list = gameStateRef.current.items;
    const types: ItemType[] = [
      'tripleShot', 'shield', 'heal', 'bomb',
      'diagonalShot', 'drone', 'laser', 'overdrive'
    ];
    const selected = types[Math.floor(Math.random() * types.length)];

    let color = '#eab308'; // triple yellow
    if (selected === 'shield') color = '#22d3ee'; // cyan
    if (selected === 'heal') color = '#22c55e'; // green
    if (selected === 'bomb') color = '#ef4444'; // red
    if (selected === 'diagonalShot') color = '#10b981'; // emerald green
    if (selected === 'drone') color = '#a855f7'; // violet purple
    if (selected === 'laser') color = '#f43f5e'; // deep neon orange/red
    if (selected === 'overdrive') color = '#ec4899'; // beautiful hot pink

    list.push({
      id: Math.random().toString(),
      x: Math.random() * (BASE_WIDTH - 60) + 30,
      y: -30,
      width: 25,
      height: 25,
      type: selected,
      color,
      speedY: Math.random() * 1.0 + 1.5,
      angle: 0,
    });
  };

  // Strict bounding-box or circular collision intersections
  const checkCollisions = () => {
    const state = gameStateRef.current;
    const player = state.player;

    // A. Player lasers vs. Enemies
    state.bullets.forEach((b) => {
      if (!b.isPlayer) return; // ignore enemy shots

      state.enemies.forEach((enemy) => {
        // Broad circle overlapping
        const dist = Math.hypot(b.x - enemy.x, b.y - enemy.y);
        if (dist < (enemy.width / 2 + b.radius)) {
          // Bullet hits!
          b.y = -100; // discard bullet
          enemy.hp -= b.damage;

          // Spark particle on hit
          spawnExplosion(b.x, b.y - 5, b.color, 4);

          if (enemy.hp <= 0) {
            enemy.y = BASE_HEIGHT + 200; // flag for deletion
            spawnExplosion(enemy.x, enemy.y, enemy.color, enemy.type === 'heavy' ? 24 : 12);
            sound.playExplosion(enemy.type);

            // Increment Scores and variables
            onStatsChange((prev) => {
              const newScore = prev.score + enemy.scoreValue;
              const newCount = prev.enemiesDestroyed + 1;
              const nextLevelScoreThreshold = prev.level * 1800; // Clear level conditions

              // Level up checks!
              let nextLevel = prev.level;
              if (newScore >= nextLevelScoreThreshold) {
                nextLevel = prev.level + 1;
              }

              return {
                ...prev,
                score: newScore,
                enemiesDestroyed: newCount,
                level: nextLevel,
              };
            });

            // Unlock First Blood achievement
            onUnlockAchievement('firstBlood', '第一滴血');

            // Ace Pilot check
            onStatsChange((prev) => {
              if (prev.score >= 10000) {
                onUnlockAchievement('acePilot', '王牌飞行员');
              }
              if (prev.level >= 2) {
                onUnlockAchievement('level2', '初试身手');
              }
              if (prev.level >= 5) {
                onUnlockAchievement('level5', '星际主宰');
              }
              return prev;
            });
          }
        }
      });
    });

    // Special: Pierce Solar Laser Beam tick damage vs. Enemies (damages everything in front of player)
    if (state.laserTimer > 0) {
      state.enemies.forEach((enemy) => {
        const inLaserColumn = Math.abs(enemy.x - player.x) < (enemy.width / 1.8 + 15);
        const abovePlayer = enemy.y < player.y && enemy.y > 0;
        if (inLaserColumn && abovePlayer && enemy.hp > 0) {
          // Continuous solar damage (approx 0.1 hp per tick)
          enemy.hp -= 0.15;
          
          if (Math.random() < 0.2) {
            spawnExplosion(enemy.x, enemy.y - 5, '#f43f5e', 2);
          }

          if (enemy.hp <= 0) {
            enemy.y = BASE_HEIGHT + 200; // delete flag
            spawnExplosion(enemy.x, enemy.y, enemy.color, enemy.type === 'heavy' ? 24 : 12);
            sound.playExplosion(enemy.type);

            // Score and achievements update
            onStatsChange((prev) => {
              const newScore = prev.score + enemy.scoreValue;
              const newCount = prev.enemiesDestroyed + 1;
              const nextLevelScoreThreshold = prev.level * 1800;
              let nextLevel = prev.level;
              if (newScore >= nextLevelScoreThreshold) {
                nextLevel = prev.level + 1;
              }
              return {
                ...prev,
                score: newScore,
                enemiesDestroyed: newCount,
                level: nextLevel,
              };
            });

            onUnlockAchievement('firstBlood', '第一滴血');
            onStatsChange((prev) => {
              if (prev.score >= 10000) onUnlockAchievement('acePilot', '王牌飞行员');
              if (prev.level >= 2) onUnlockAchievement('level2', '初试身手');
              if (prev.level >= 5) onUnlockAchievement('level5', '星际主宰');
              return prev;
            });
          }
        }
      });
    }

    // B. Enemy body or laser bullets vs. Player ship
    const itemsList = state.bullets.filter(b => !b.isPlayer);
    
    // Check Enemy lasers
    itemsList.forEach((eb) => {
      const dist = Math.hypot(eb.x - player.x, eb.y - player.y);
      if (dist < (player.width / 2.3 + eb.radius) && player.invulnerableTimer <= 0) {
        eb.y = BASE_HEIGHT + 300; // discard

        damagePlayer();
      }
    });

    // Check Enemy kamikaze ships collides with Player ship
    state.enemies.forEach((enemy) => {
      const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
      const isOverlapping = dist < (player.width / 2.2 + enemy.width / 2.2);
      if (isOverlapping && player.invulnerableTimer <= 0 && enemy.hp > 0) {
        // Destroy the enemy too
        enemy.y = BASE_HEIGHT + 200;
        spawnExplosion(enemy.x, enemy.y, enemy.color, 15);
        sound.playExplosion(enemy.type);

        damagePlayer();
      }
    });

    // C. Items pickups vs. Player
    state.items.forEach((item) => {
      const dist = Math.hypot(item.x - player.x, item.y - player.y);
      const hitboxRadius = player.width / 2.2 + item.width / 2;
      
      if (dist < hitboxRadius) {
        item.y = BASE_HEIGHT + 300; // pick up!
        sound.playPowerup();

        if (item.type === 'tripleShot') {
          state.tripleShotTimer = 12.0; // 12 seconds active duration
          state.tripleShotPickupStreak++;
          
          if (state.tripleShotPickupStreak >= 3) {
            onUnlockAchievement('fullFirepower', '火力全开');
          }

          onStatsChange(p => ({ ...p, tripleShotCount: p.tripleShotCount + 1 }));
        } else if (item.type === 'diagonalShot') {
          state.diagonalShotTimer = 12.0; // 12 seconds
          spawnExplosion(player.x, player.y, '#10b981', 12);
        } else if (item.type === 'drone') {
          state.droneTimer = 15.0; // 15 seconds helper wingmen
          spawnExplosion(player.x, player.y, '#a855f7', 15);
        } else if (item.type === 'laser') {
          state.laserTimer = 8.0; // 8 seconds intense photon laser
          spawnExplosion(player.x, player.y, '#f43f5e', 18);
        } else if (item.type === 'overdrive') {
          state.overdriveTimer = 12.0; // 12 seconds golden machine speed
          spawnExplosion(player.x, player.y, '#ec4899', 20);
        } else if (item.type === 'shield') {
          onStatsChange(p => ({
            ...p,
            shieldsUp: true,
            shieldsCount: p.shieldsCount + 1,
          }));
        } else if (item.type === 'heal') {
          onStatsChange(p => ({
            ...p,
            lives: Math.min(5, p.lives + 1),
          }));
          spawnExplosion(player.x, player.y, '#22c55e', 8);
        } else if (item.type === 'bomb') {
          // EMP shockwave clears screen minor enemies
          const currentEnemies = state.enemies;
          let detonateCount = 0;
          currentEnemies.forEach((e) => {
            if (e.type !== 'boss' && e.y > 0 && e.y < BASE_HEIGHT) {
              e.y = BASE_HEIGHT + 200; // flag deletion
              spawnExplosion(e.x, e.y, e.color, 12);
              sound.playExplosion(e.type);
              detonateCount++;
            }
          });
          onStatsChange(prev => ({
            ...prev,
            score: prev.score + (detonateCount * 120),
          }));
          // Set screen flash duration
          state.bombFlashTimer = 300;
        }
      }
    });
  };

  const damagePlayer = () => {
    const state = gameStateRef.current;
    
    // Check shield first
    if (stats.shieldsUp) {
      onStatsChange(p => ({ ...p, shieldsUp: false }));
      state.player.invulnerableTimer = 1000; // 1 second flash
      sound.playExplosion('player');
      onUnlockAchievement('invincibleShield', '金刚不坏');
      spawnExplosion(state.player.x, state.player.y, '#22d3ee', 15);
      return;
    }

    // Direct damage
    state.player.invulnerableTimer = 1800; // 1.8 seconds flash
    state.secondsWithoutDamaged = 0; // reset survival streaks
    sound.playHurt();
    spawnExplosion(state.player.x, state.player.y, '#f43f5e', 22);

    onStatsChange((p) => {
      const nextLives = Math.max(0, p.lives - 1);
      const isDead = nextLives <= 0;
      if (isDead) {
        sound.playExplosion('player');
        // Register high score immediately
        const finalHighScore = Math.max(p.highScore, p.score);
        localStorage.setItem('max_star_highscore', finalHighScore.toString());
        localStorage.setItem('tina_star_highscore', finalHighScore.toString());
        return {
          ...p,
          lives: 0,
          gameOver: true,
          highScore: finalHighScore,
        };
      }
      return {
        ...p,
        lives: nextLives,
      };
    });
  };

  // Modern procedural SVG/Canvas drawings for neat vector aesthetic
  const render = (ctx: CanvasRenderingContext2D) => {
    const state = gameStateRef.current;
    const player = state.player;

    // Primary refresh background with dense alpha black
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

    // Grid overlays for tech look
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.15)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < BASE_WIDTH; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, BASE_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y < BASE_HEIGHT; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(BASE_WIDTH, y);
      ctx.stroke();
    }

    // Draw active stars
    state.stars.forEach((star) => {
      ctx.fillStyle = star.color;
      ctx.fillRect(star.x, star.y, star.size, star.size);
    });

    // Draw item boxes
    state.items.forEach((item) => {
      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.rotate(item.angle);

      // Neon blur glow shadows
      ctx.shadowBlur = 10;
      ctx.shadowColor = item.color;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
      ctx.strokeStyle = item.color;
      ctx.lineWidth = 1.8;
      
      // Draw spinning diamonds
      ctx.beginPath();
      ctx.moveTo(0, -item.width / 2);
      ctx.lineTo(item.width / 2, 0);
      ctx.lineTo(0, item.width / 2);
      ctx.lineTo(-item.width / 2, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Small central insignia
      ctx.fillStyle = item.color;
      ctx.font = 'bold 11px font-mono';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      let letter = '?';
      if (item.type === 'tripleShot') letter = 'T';
      if (item.type === 'diagonalShot') letter = 'D';
      if (item.type === 'drone') letter = 'W';
      if (item.type === 'laser') letter = 'L';
      if (item.type === 'overdrive') letter = 'O';
      if (item.type === 'shield') letter = 'S';
      if (item.type === 'heal') letter = 'H';
      if (item.type === 'bomb') letter = 'B';
      
      ctx.fillText(letter, 0, 0);
      ctx.restore();
    });

    // Draw all laser bullets
    state.bullets.forEach((b) => {
      ctx.save();
      ctx.shadowBlur = 8;
      ctx.shadowColor = b.color;
      ctx.fillStyle = b.color;

      ctx.beginPath();
      if (b.isPlayer) {
        // Sleek elongated energy laser lines
        ctx.fillRect(b.x - b.radius, b.y - 7, b.radius * 2, 14);
      } else {
        // Bad hazard circles
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });

    // Draw Enemies
    state.enemies.forEach((enemy) => {
      ctx.save();
      ctx.translate(enemy.x, enemy.y);

      // Simple hovering engine flares
      const flareSize = (Math.sin(enemy.pulseState) + 1.2) * 4;
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(-6, -enemy.height / 2);
      ctx.lineTo(0, -enemy.height / 2 - flareSize);
      ctx.lineTo(6, -enemy.height / 2);
      ctx.closePath();
      ctx.fill();

      // Check if custom png visual has been uploaded in local workspace
      let assetKey: 'enemy_base' | 'enemy_fast' | 'enemy_heavy' | 'enemy_elite' | 'enemy_scout' | 'enemy_bomber' | 'enemy_boss' = 'enemy_base';
      if (enemy.type === 'fast') assetKey = 'enemy_fast';
      else if (enemy.type === 'heavy') assetKey = 'enemy_heavy';
      else if (enemy.type === 'elite') assetKey = 'enemy_elite';
      else if (enemy.type === 'scout') assetKey = 'enemy_scout';
      else if (enemy.type === 'bomber') assetKey = 'enemy_bomber';
      else if (enemy.type === 'boss') assetKey = 'enemy_boss';

      const customImg = imageAssetsRef.current[assetKey];
      const isCustomImgLoaded = customImg && (customImg instanceof HTMLCanvasElement || (customImg instanceof HTMLImageElement && customImg.complete && customImg.naturalWidth > 0));

      if (isCustomImgLoaded && customImg) {
        // Draw preloaded custom PNG asset!
        ctx.drawImage(customImg, -enemy.width / 2, -enemy.height / 2, enemy.width, enemy.height);

        // Sub HP bar indicators and overlays still render beautifully over the PNG
        if (enemy.type === 'heavy' || enemy.type === 'elite' || enemy.type === 'bomber') {
          ctx.restore();
          ctx.save();
          const barWidth = 32;
          const barHeight = 3;
          const hpPercent = enemy.hp / enemy.maxHp;
          ctx.fillStyle = '#374151';
          ctx.fillRect(enemy.x - barWidth / 2, enemy.y + enemy.height / 2 + 8, barWidth, barHeight);
          
          let hpColor = '#10b981'; // green for heavy
          if (enemy.type === 'elite') hpColor = '#d946ef'; // magenta
          else if (enemy.type === 'bomber') hpColor = '#e11d48'; // crimson red
          
          ctx.fillStyle = hpColor;
          ctx.fillRect(enemy.x - barWidth / 2, enemy.y + enemy.height / 2 + 8, barWidth * hpPercent, barHeight);
        } else if (enemy.type === 'boss') {
          ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
          ctx.beginPath();
          ctx.arc(0, 0, (Math.sin(enemy.pulseState) * 2 + 10), 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
          ctx.save();
          const barWidth = 60;
          const barHeight = 4;
          const hpPercent = enemy.hp / enemy.maxHp;
          ctx.fillStyle = '#374151';
          ctx.fillRect(enemy.x - barWidth / 2, enemy.y - enemy.height / 2 - 12, barWidth, barHeight);
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(enemy.x - barWidth / 2, enemy.y - enemy.height / 2 - 12, barWidth * hpPercent, barHeight);
        }
      } else {
        // Enemy styling based on taxonomy fallback vector models
        ctx.shadowBlur = 10;
        ctx.shadowColor = enemy.color;

        ctx.strokeStyle = enemy.color;
        ctx.lineWidth = 2.0;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';

        if (enemy.type === 'fast') {
          // Swift interceptor design: Arrowhead wing structure
          ctx.beginPath();
          ctx.moveTo(0, enemy.height / 1.8); // nose pointing down
          ctx.lineTo(-enemy.width / 2, -enemy.height / 2);
          ctx.lineTo(0, -enemy.height / 4);
          ctx.lineTo(enemy.width / 2, -enemy.height / 2);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else if (enemy.type === 'heavy') {
          // Space battleship look
          ctx.beginPath();
          ctx.moveTo(0, enemy.height / 2);
          ctx.lineTo(-enemy.width / 3, enemy.height / 3);
          ctx.lineTo(-enemy.width / 2, -enemy.height / 3);
          ctx.lineTo(-enemy.width / 3, -enemy.height / 2);
          ctx.lineTo(enemy.width / 3, -enemy.height / 2);
          ctx.lineTo(enemy.width / 2, -enemy.height / 3);
          ctx.lineTo(enemy.width / 3, enemy.height / 3);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Sub HP bar indicator for heavy craft
          ctx.restore();
          ctx.save();
          const barWidth = 32;
          const barHeight = 3;
          const hpPercent = enemy.hp / enemy.maxHp;
          ctx.fillStyle = '#374151';
          ctx.fillRect(enemy.x - barWidth / 2, enemy.y + enemy.height / 2 + 8, barWidth, barHeight);
          ctx.fillStyle = '#10b981';
          ctx.fillRect(enemy.x - barWidth / 2, enemy.y + enemy.height / 2 + 8, barWidth * hpPercent, barHeight);
        } else if (enemy.type === 'elite') {
          // Sharp double-wing elite fighter model
          ctx.beginPath();
          ctx.moveTo(0, enemy.height / 2);
          ctx.lineTo(-enemy.width / 2, -enemy.height / 4);
          ctx.lineTo(-enemy.width / 3, -enemy.height / 2);
          ctx.lineTo(0, -enemy.height / 3);
          ctx.lineTo(enemy.width / 3, -enemy.height / 2);
          ctx.lineTo(enemy.width / 2, -enemy.height / 4);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Sub HP bar for elite craft
          ctx.restore();
          ctx.save();
          const barWidth = 32;
          const barHeight = 3;
          const hpPercent = enemy.hp / enemy.maxHp;
          ctx.fillStyle = '#374151';
          ctx.fillRect(enemy.x - barWidth / 2, enemy.y + enemy.height / 2 + 8, barWidth, barHeight);
          ctx.fillStyle = '#d946ef';
          ctx.fillRect(enemy.x - barWidth / 2, enemy.y + enemy.height / 2 + 8, barWidth * hpPercent, barHeight);
        } else if (enemy.type === 'scout') {
          // Nimble forward-swept wing probe design (glowing cyan outline)
          ctx.beginPath();
          ctx.moveTo(0, enemy.height / 2.2); // nose
          ctx.lineTo(-enemy.width / 2, -enemy.height / 6); // wingtip L
          ctx.lineTo(-enemy.width / 4, -enemy.height / 2); // tail L
          ctx.lineTo(0, -enemy.height / 4); // inner engine node
          ctx.lineTo(enemy.width / 4, -enemy.height / 2); // tail R
          ctx.lineTo(enemy.width / 2, -enemy.height / 6); // wingtip R
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else if (enemy.type === 'bomber') {
          // Giant armored strategic bomber layout
          ctx.beginPath();
          ctx.moveTo(0, enemy.height / 1.8);
          ctx.lineTo(-enemy.width / 2, enemy.height / 4);
          ctx.lineTo(-enemy.width / 2, -enemy.height / 3);
          ctx.lineTo(-enemy.width / 3, -enemy.height / 2);
          ctx.lineTo(enemy.width / 3, -enemy.height / 2);
          ctx.lineTo(enemy.width / 2, -enemy.height / 3);
          ctx.lineTo(enemy.width / 2, enemy.height / 4);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Sub HP bar indicators and overlays still render beautifully over the PNG
          ctx.restore();
          ctx.save();
          const subBarWidth = 32;
          const subBarHeight = 3;
          const subHpPercent = enemy.hp / enemy.maxHp;
          ctx.fillStyle = '#374151';
          ctx.fillRect(enemy.x - subBarWidth / 2, enemy.y + enemy.height / 2 + 8, subBarWidth, subBarHeight);
          ctx.fillStyle = '#e11d48';
          ctx.fillRect(enemy.x - subBarWidth / 2, enemy.y + enemy.height / 2 + 8, subBarWidth * subHpPercent, subBarHeight);
        } else if (enemy.type === 'boss') {
          // Boss design - huge mothership
          ctx.beginPath();
          ctx.moveTo(0, enemy.height / 2);
          ctx.lineTo(-enemy.width / 3, enemy.height / 2);
          ctx.lineTo(-enemy.width / 2, 0);
          ctx.lineTo(-enemy.width / 2.5, -enemy.height / 2);
          ctx.lineTo(enemy.width / 2.5, -enemy.height / 2);
          ctx.lineTo(enemy.width / 2, 0);
          ctx.lineTo(enemy.width / 3, enemy.height / 2);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Boss core plasma orb glow
          ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
          ctx.beginPath();
          ctx.arc(0, 0, (Math.sin(enemy.pulseState) * 2 + 10), 0, Math.PI * 2);
          ctx.fill();

          // HP bar indicator for Boss
          ctx.restore();
          ctx.save();
          const barWidth = 60;
          const barHeight = 4;
          const hpPercent = enemy.hp / enemy.maxHp;
          ctx.fillStyle = '#374151';
          ctx.fillRect(enemy.x - barWidth / 2, enemy.y - enemy.height / 2 - 12, barWidth, barHeight);
          ctx.fillStyle = '#ef4444'; // Red for boss
          ctx.fillRect(enemy.x - barWidth / 2, enemy.y - enemy.height / 2 - 12, barWidth * hpPercent, barHeight);
        } else {
          // Basic fighter design: Shield/hexagon model
          ctx.beginPath();
          ctx.moveTo(0, enemy.height / 2);
          ctx.lineTo(-enemy.width / 2, 0);
          ctx.lineTo(-enemy.width / 3, -enemy.height / 2);
          ctx.lineTo(enemy.width / 3, -enemy.height / 2);
          ctx.lineTo(enemy.width / 2, 0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      }

      ctx.restore();
    });

    // Draw Particles dusts
    state.particles.forEach((p) => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.shadowBlur = 6;
      ctx.shadowColor = p.color;
      ctx.fillStyle = p.color;

      ctx.beginPath();
      // Draw tiny sparks
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Draw player ship (flickers if invulnerable)
    const isPlayerFlicker = player.invulnerableTimer > 0 && Math.floor(player.invulnerableTimer / 80) % 2 === 0;
    if (!isPlayerFlicker && stats.gameStarted) {
      ctx.save();
      ctx.translate(player.x, player.y);

      // Jet exhaust fire flames
      const flameHeight = (Math.sin(performance.now() * 0.05) + 1.5) * 6;
      const grad = ctx.createLinearGradient(0, player.height / 2, 0, player.height / 2 + flameHeight);
      grad.addColorStop(0, '#f59e0b'); // amber yellow
      grad.addColorStop(1, 'rgba(239, 68, 68, 0)'); // fade out
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(-8, player.height / 2 - 4);
      ctx.lineTo(0, player.height / 2 + flameHeight);
      ctx.lineTo(8, player.height / 2 - 4);
      ctx.closePath();
      ctx.fill();

      // Cyber ship visual drawing (custom image or elegant fallback vectors)
      const playerImg = imageAssetsRef.current.player;
      const isPlayerImgLoaded = playerImg && (playerImg instanceof HTMLCanvasElement || (playerImg instanceof HTMLImageElement && playerImg.complete && playerImg.naturalWidth > 0));

      if (isPlayerImgLoaded && playerImg) {
        // Render custom PNG image skinned locally
        ctx.drawImage(playerImg, -player.width / 2, -player.height / 2, player.width, player.height);
      } else {
        // Dynamic cyber ship vectors fallback
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#06b6d4'; // bright cyan glow
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 2.4;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';

        // High-grade Vanguard spaceship wings
        ctx.beginPath();
        ctx.moveTo(0, -player.height / 2); // sleek nose pointing up
        ctx.lineTo(-player.width / 2, player.height / 2);
        ctx.lineTo(-player.width / 6, player.height / 4);
        ctx.lineTo(player.width / 6, player.height / 4);
        ctx.lineTo(player.width / 2, player.height / 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Cockpit glowing crystal gem window
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.moveTo(0, -player.height / 4);
        ctx.lineTo(-4, 0);
        ctx.lineTo(0, player.height / 6);
        ctx.lineTo(4, 0);
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();

      // A. Draw active continuous giant Pierce Solar Laser Beam
      if (state.laserTimer > 0) {
        ctx.save();
        const laserWidth = 24 + Math.sin(performance.now() * 0.12) * 5;
        const grad = ctx.createLinearGradient(player.x - laserWidth / 2, 0, player.x + laserWidth / 2, 0);
        grad.addColorStop(0, 'rgba(239, 68, 68, 0.25)'); // glowing deep red/orange
        grad.addColorStop(0.3, 'rgba(239, 68, 68, 0.85)');
        grad.addColorStop(0.5, '#ffffff'); // bright pure core
        grad.addColorStop(0.7, 'rgba(239, 68, 68, 0.85)');
        grad.addColorStop(1, 'rgba(239, 68, 68, 0.25)');
        
        ctx.fillStyle = grad;
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ef4444';
        ctx.fillRect(player.x - laserWidth / 2, 0, laserWidth, player.y - 12);
        
        // Draw lightning/energy rays up the laser column for premium organic texture!
        ctx.strokeStyle = '#fecdd3';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(player.x, player.y - 12);
        for (let ly = player.y - 20; ly >= 10; ly -= 40) {
          const sparkOffset = (Math.random() - 0.5) * 14;
          ctx.lineTo(player.x + sparkOffset, ly);
        }
        ctx.stroke();
        ctx.restore();
      }

      // B. Draw Companion wing-drones flanking the player ship
      if (state.droneTimer > 0) {
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#c084fc';
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 1.8;
        ctx.fillStyle = '#0f172a';

        const droneOffset = 30;
        const pulseY = Math.sin(performance.now() * 0.01) * 3;

        // Left Drone satellite
        ctx.beginPath();
        ctx.arc(player.x - droneOffset, player.y + 10 + pulseY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#c084fc';
        ctx.beginPath();
        ctx.arc(player.x - droneOffset, player.y + 10 + pulseY, 2.8, 0, Math.PI * 2);
        ctx.fill();

        // Right Drone satellite
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(player.x + droneOffset, player.y + 10 + pulseY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#c084fc';
        ctx.beginPath();
        ctx.arc(player.x + droneOffset, player.y + 10 + pulseY, 2.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // C. Draw Overdrive speed field corona ring
      if (state.overdriveTimer > 0) {
        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ec4899';
        ctx.strokeStyle = 'rgba(236, 72, 153, 0.75)';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.width * 0.75 + Math.sin(performance.now() * 0.04) * 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Draw plasma shield ring around ship if active
      if (stats.shieldsUp) {
        ctx.save();
        ctx.shadowBlur = 16;
        ctx.shadowColor = '#22d3ee';
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.8)';
        ctx.lineWidth = 2.0;

        // Draw hexagonal neon ring
        ctx.translate(player.x, player.y);
        ctx.beginPath();
        const numSides = 6;
        const radiusVal = player.width * 0.95;
        const angleOffset = performance.now() * 0.001; // rotate ring!
        for (let idx = 0; idx <= numSides; idx++) {
          const currentAngle = (idx / numSides) * Math.PI * 2 + angleOffset;
          const sx = Math.cos(currentAngle) * radiusVal;
          const sy = Math.sin(currentAngle) * radiusVal;
          if (idx === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.stroke();
        ctx.restore();
      }
    }

    // Canvas boundary red warning flash
    if (stats.warningFlash) {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.08)';
      ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
      
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.lineWidth = 3;
      ctx.strokeRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
    }

    // Draw white shockwave EMP flash
    if (state.bombFlashTimer > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${state.bombFlashTimer / 340})`;
      ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
    }
  };

  // Modern Touch & Mouse Drag handlers for excellent responsive control
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!stats.gameStarted || stats.paused || stats.gameOver) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    
    // Convert touch positions
    const touchX = ((touch.clientX - rect.left) / rect.width) * BASE_WIDTH;
    const touchY = ((touch.clientY - rect.top) / rect.height) * BASE_HEIGHT;

    const state = gameStateRef.current;
    state.player.targetX = touchX;
    state.player.targetY = touchY;
    state.player.isDragging = true;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!stats.gameStarted || stats.paused || stats.gameOver) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];

    const touchX = ((touch.clientX - rect.left) / rect.width) * BASE_WIDTH;
    const touchY = ((touch.clientY - rect.top) / rect.height) * BASE_HEIGHT;

    const state = gameStateRef.current;
    state.player.targetX = touchX;
    state.player.targetY = touchY;
  };

  const handleTouchEnd = () => {
    gameStateRef.current.player.isDragging = false;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!stats.gameStarted || stats.paused || stats.gameOver) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    const mouseX = ((e.clientX - rect.left) / rect.width) * BASE_WIDTH;
    const mouseY = ((e.clientY - rect.top) / rect.height) * BASE_HEIGHT;

    const state = gameStateRef.current;
    state.player.targetX = mouseX;
    state.player.targetY = mouseY;
    state.player.isDragging = true;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!stats.gameStarted || stats.paused || stats.gameOver) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    const mouseX = ((e.clientX - rect.left) / rect.width) * BASE_WIDTH;
    const mouseY = ((e.clientY - rect.top) / rect.height) * BASE_HEIGHT;

    const state = gameStateRef.current;
    state.player.targetX = mouseX;
    state.player.targetY = mouseY;
    state.player.isMouseActive = true;
  };

  const handleMouseUp = () => {
    gameStateRef.current.player.isDragging = false;
  };

  const handleMouseLeave = () => {
    const state = gameStateRef.current;
    state.player.isDragging = false;
    state.player.isMouseActive = false;
  };

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center bg-slate-950/20 rounded-2xl border border-slate-700/40 overflow-hidden shadow-2xl overflow-hidden cursor-crosshair select-none aspect-[3/4]"
      style={{ width: '100%', maxWidth: `${BASE_WIDTH}px` }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      id="space-canvas-wrapper"
    >
      <canvas
        ref={canvasRef}
        width={BASE_WIDTH}
        height={BASE_HEIGHT}
        className="w-full h-full bg-slate-950 block object-contain"
        id="html5-game-canvas"
      />

      {/* Immediate temporary overlay for Sector Level Escalations */}
      {levelUpMessage && (
        <div className="absolute inset-0 bg-cyan-950/40 backdrop-blur-[2px] flex flex-col justify-center items-center pointer-events-none select-none z-20 animate-fade-in text-center p-4">
          <div className="text-cyan-400 font-mono text-xs uppercase tracking-widest bg-cyan-950/80 px-4 py-1.5 rounded-full border border-cyan-400/30 shadow-[0_0_12px_rgba(34,211,238,0.2)] animate-pulse mb-3">
            LEAP SUCCESSFUL
          </div>
          <h2 className="text-3xl font-black text-slate-100 font-mono tracking-widest drop-shadow-[0_0_10px_rgba(255,255,255,0.4)] uppercase">
            星域升级
          </h2>
          <div className="text-sm font-bold text-slate-300 mt-1 font-mono tracking-wide">
            Entering: Level {stats.level}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-4">
            太空障壁已重置 • 新生命能量箱已散落
          </div>
        </div>
      )}
    </div>
  );
};
