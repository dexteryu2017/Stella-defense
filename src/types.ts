export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  icon: string; // FontAwesome class or name
  conditionText: string;
}

export type EnemyType = 'basic' | 'fast' | 'heavy' | 'elite' | 'boss' | 'scout' | 'bomber';

export interface Enemy {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: EnemyType;
  color: string;
  speed: number;
  hp: number;
  maxHp: number;
  scoreValue: number;
  angle: number;
  pulseState: number; // For neon pulsing animations
}

export type ItemType = 'tripleShot' | 'shield' | 'heal' | 'bomb' | 'diagonalShot' | 'drone' | 'laser' | 'overdrive';

export interface PowerUpItem {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: ItemType;
  color: string;
  speedY: number;
  angle: number;
}

export interface Bullet {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  damage: number;
  isPlayer: boolean;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  decay: number;
}

export interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  color: string;
}

export interface GameStats {
  score: number;
  highScore: number;
  lives: number;
  level: number;
  enemiesDestroyed: number;
  playTime: number; // in seconds
  bulletsFired: number;
  tripleShotCount: number;
  shieldsUp: boolean;
  shieldsCount: number; // number of shields active/unbroken
  gameOver: boolean;
  gameStarted: boolean;
  paused: boolean;
  warningFlash: boolean; // triggers red overlay when enemy passes
  diagonalShotTimer?: number;
  droneTimer?: number;
  laserTimer?: number;
  overdriveTimer?: number;
}
