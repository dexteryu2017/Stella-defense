import { useState, useEffect, useCallback } from 'react';
import { GameStats, Achievement } from './types';
import { GameUI } from './components/GameUI';
import { SpaceCanvas } from './components/SpaceCanvas';
import { Sidebar } from './components/Sidebar';
import { sound } from './utils/audio';
import { Crosshair, Award, RotateCw, Volume2, VolumeX, Shield, Play } from 'lucide-react';

const INITIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'firstBlood',
    title: '第一滴血',
    description: '成功拦截并歼灭第1架敌方战机',
    unlocked: false,
    icon: 'fa-solid fa-fire text-orange-500',
    conditionText: '击杀 1 架敌机',
  },
  {
    id: 'level2',
    title: '初试身手',
    description: '跨越虫洞壁垒，成功晋级至 Level 2',
    unlocked: false,
    icon: 'fa-solid fa-fighter-jet text-cyan-400',
    conditionText: '通关 1 关',
  },
  {
    id: 'level5',
    title: '星际主宰',
    description: '突破重重围困，最终突破至 Level 5',
    unlocked: false,
    icon: 'fa-solid fa-meteor text-violet-500',
    conditionText: '达到 Level 5',
  },
  {
    id: 'survivor',
    title: '生存专家',
    description: '在密集的火力阻击中连续生存达到 60 秒',
    unlocked: false,
    icon: 'fa-solid fa-hourglass-half text-emerald-400',
    conditionText: '生存 60 秒',
  },
  {
    id: 'fullFirepower',
    title: '火力全开',
    description: '连续三次叠加获取并触发多向三向子弹',
    unlocked: false,
    icon: 'fa-solid fa-wand-magic-sparkles text-yellow-500',
    conditionText: '获取三向子弹3次',
  },
  {
    id: 'invincibleShield',
    title: '金刚不坏',
    description: '利用等离子护盾完美豁免 1 次冲撞致死伤害',
    unlocked: false,
    icon: 'fa-solid fa-shield-halved text-blue-400',
    conditionText: '抵挡一次伤害',
  },
  {
    id: 'acePilot',
    title: '王牌飞行员',
    description: '在星海保卫阻击战中积累 10,000 以上积分',
    unlocked: false,
    icon: 'fa-solid fa-crown text-amber-400',
    conditionText: '积分达到10,000分',
  }
];

export default function App() {
  // Load initial highscore value from localStorage securely
  const getStoredHighScore = (): number => {
    try {
      const stored = localStorage.getItem('max_star_highscore') || localStorage.getItem('tina_star_highscore');
      return stored ? parseInt(stored, 10) : 0;
    } catch {
      return 0;
    }
  };

  const [stats, setStats] = useState<GameStats>({
    score: 0,
    highScore: getStoredHighScore(),
    lives: 5,
    level: 1,
    enemiesDestroyed: 0,
    playTime: 0,
    bulletsFired: 0,
    tripleShotCount: 0,
    shieldsUp: false,
    shieldsCount: 0,
    gameOver: false,
    gameStarted: false,
    paused: false,
    warningFlash: false,
    diagonalShotTimer: 0,
    droneTimer: 0,
    laserTimer: 0,
    overdriveTimer: 0,
  });

  const [achievements, setAchievements] = useState<Achievement[]>(INITIAL_ACHIEVEMENTS);
  const [tripleShotTimer, setTripleShotTimer] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(sound.getMuted());
  const [activeToast, setActiveToast] = useState<string | null>(null);

  // Auto shoot control or instructions key hooks for P (Pause), Enter (Restart)
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      if (e.code === 'KeyP') {
        if (stats.gameStarted && !stats.gameOver) {
          setStats((prev) => ({ ...prev, paused: !prev.paused }));
        }
      }
      if (e.code === 'Enter') {
        if (stats.gameOver || !stats.gameStarted) {
          handleStartGame();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeys);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeys);
    };
  }, [stats.gameStarted, stats.gameOver]);

  // Handle Game Initializations
  const handleStartGame = () => {
    sound.playPowerup();
    setStats({
      score: 0,
      highScore: getStoredHighScore(),
      lives: 5,
      level: 1,
      enemiesDestroyed: 0,
      playTime: 0,
      bulletsFired: 0,
      tripleShotCount: 0,
      shieldsUp: false,
      shieldsCount: 0,
      gameOver: false,
      gameStarted: true,
      paused: false,
      warningFlash: false,
    });
    setAchievements(INITIAL_ACHIEVEMENTS.map(a => ({ ...a, unlocked: false })));
    setTripleShotTimer(0);
  };

  const handlePauseGame = () => {
    setStats((prev) => ({ ...prev, paused: true }));
  };

  const handleResumeGame = () => {
    setStats((prev) => ({ ...prev, paused: false }));
  };

  const handleRestartGame = () => {
    handleStartGame();
  };

  const handleToggleMute = () => {
    const nextMuted = sound.toggleMute();
    setIsMuted(nextMuted);
  };

  // Safe callback to unlock achievement triggers
  const handleUnlockAchievement = useCallback((id: string, title: string) => {
    setAchievements((prev) => {
      const match = prev.find((a) => a.id === id);
      if (match && !match.unlocked) {
        sound.playAchievement();
        
        // Push floating toast alert
        setActiveToast(title);
        setTimeout(() => {
          setActiveToast(null);
        }, 3500);

        return prev.map((a) => (a.id === id ? { ...a, unlocked: true } : a));
      }
      return prev;
    });
  }, []);

  const handleTripleShotTimerChange = useCallback((time: number) => {
    setTripleShotTimer(time);
  }, []);

  return (
    <div className="min-h-screen bg-[#020617] bg-radial-at-t from-[#0f172a] via-[#020617] to-[#020617] flex flex-col items-center p-3 sm:p-6 text-slate-100 font-sans relative overflow-hidden select-none">
      
      {/* Dynamic Cosmic Background glow dots */}
      <div className="absolute top-[10%] left-[15%] w-[40vw] h-[40vh] rounded-full bg-cyan-900/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[15%] right-[10%] w-[35vw] h-[35vh] rounded-full bg-indigo-900/10 blur-[130px] pointer-events-none" />

      {/* Top Banner Navigation Header */}
      <header className="w-full max-w-5xl flex justify-between items-center bg-slate-900/40 backdrop-blur-md rounded-2xl border border-slate-800 px-4 py-3 mb-6 shadow-xl relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 font-black shadow-[0_0_15px_rgba(6,182,212,0.3)]">
            <i className="fa-solid fa-space-shuttle transform -rotate-45 text-lg"></i>
          </div>
          <div>
            <div className="text-sm font-bold tracking-widest text-slate-100 font-mono flex items-center gap-1.5 uppercase">
              Max 星际先锋 <span className="text-[9px] text-cyan-400 font-mono px-1.5 py-0.5 bg-cyan-950/60 border border-cyan-800/40 rounded">Alpha</span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono">STELLAR DEFENSE SECTOR INTERCEPTOR v1.0.0</div>
          </div>
        </div>

        {/* Global Volume Mute helper quickly accessible */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleMute}
            className="px-3 py-1.5 bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 hover:text-cyan-400 rounded-xl border border-slate-700/50 text-xs font-mono transition-colors flex items-center gap-2 cursor-pointer"
            id="global-mute-shortcut"
          >
            {isMuted ? (
              <>
                <VolumeX className="w-4 h-4 text-red-400" />
                <span>静音</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4 text-cyan-400" />
                <span>音效开</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Outer Game Sandbox Arena */}
      <main className="w-full max-w-5xl flex flex-1 items-stretch justify-center relative z-10 mb-4 min-h-0">
        <div className="flex-1 flex justify-center items-center relative">
          
          {/* Central Space Container Console */}
          <div className="w-full max-w-[600px] flex flex-col relative" id="central-reactor-container">
            {/* The Floating UI Screens Overlay */}
            <GameUI
              stats={stats}
              achievements={achievements}
              tripleShotTimer={tripleShotTimer}
              totalPlayTime={stats.playTime}
              onStartGame={handleStartGame}
              onResumeGame={handleResumeGame}
              onPauseGame={handlePauseGame}
              onRestartGame={handleRestartGame}
              onToggleMute={handleToggleMute}
              isMuted={isMuted}
              activeToast={activeToast}
            />

            {/* The High-Performance Canvas */}
            <SpaceCanvas
              stats={stats}
              onStatsChange={setStats}
              onUnlockAchievement={handleUnlockAchievement}
              onTripleShotTimerChange={handleTripleShotTimerChange}
            />
          </div>
        </div>

        {/* Tactical Right Sidebar Panel (auto hidden on mobile sizes) */}
        <Sidebar achievements={achievements} highScore={stats.highScore} />
      </main>

      {/* Footer System Lines */}
      <footer className="text-center text-[10px] text-slate-600 font-mono tracking-widest uppercase mt-3">
        © 2026 MAX SPACE CO. • PROTECT THE SECTOR AT ALL COST
      </footer>
    </div>
  );
}
