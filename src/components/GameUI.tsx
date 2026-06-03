import React from 'react';
import { Play, Pause, RotateCw, Trophy, Heart, Shield, Zap, Volume2, VolumeX, Sparkles, Award } from 'lucide-react';
import { GameStats, Achievement } from '../types';

interface GameUIProps {
  stats: GameStats;
  achievements: Achievement[];
  tripleShotTimer: number; // in seconds
  totalPlayTime: number;
  onStartGame: () => void;
  onResumeGame: () => void;
  onPauseGame: () => void;
  onRestartGame: () => void;
  onToggleMute: () => void;
  isMuted: boolean;
  activeToast: string | null;
}

export const GameUI: React.FC<GameUIProps> = ({
  stats,
  achievements,
  tripleShotTimer,
  totalPlayTime,
  onStartGame,
  onResumeGame,
  onPauseGame,
  onRestartGame,
  onToggleMute,
  isMuted,
  activeToast,
}) => {
  // Render Lives as high-tech shield battery items
  const renderLives = () => {
    const totalLives = 5;
    return (
      <div className="flex gap-1.5 items-center bg-slate-950/50 px-3 py-1.5 rounded-xl border border-slate-800/80">
        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mr-1">Armor</span>
        {Array.from({ length: totalLives }).map((_, idx) => {
          const active = idx < stats.lives;
          return (
            <div
              key={idx}
              className={`w-3.5 h-6 rounded-sm transition-all duration-300 transform ${
                active
                  ? 'bg-gradient-to-t from-red-600 via-rose-500 to-rose-400 border border-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.6)] animate-pulse'
                  : 'bg-slate-950/60 border border-slate-800/80'
              }`}
            />
          );
        })}
      </div>
    );
  };

  // Show active status/buff timers: Triple shot & Shielf active
  const renderActiveBuffs = () => {
    const showDiagonal = (stats.diagonalShotTimer || 0) > 0;
    const showDrone = (stats.droneTimer || 0) > 0;
    const showLaser = (stats.laserTimer || 0) > 0;
    const showOverdrive = (stats.overdriveTimer || 0) > 0;

    if (tripleShotTimer <= 0 && !stats.shieldsUp && !showDiagonal && !showDrone && !showLaser && !showOverdrive) return null;

    return (
      <div className="absolute top-20 left-4 flex flex-col gap-2 z-20 pointer-events-none select-none">
        {stats.shieldsUp && (
          <div className="flex items-center gap-2 bg-cyan-950/80 border border-cyan-500/50 px-3 py-1.5 rounded-xl text-cyan-400 text-xs font-mono shadow-[0_0_10px_rgba(34,211,238,0.2)] animate-pulse">
            <Shield className="w-4 h-4 animate-spin-slow text-cyan-300" />
            <div className="flex flex-col">
              <span className="font-bold text-[10px] tracking-wide uppercase">Plasma Shield</span>
              <span className="text-[9px] text-cyan-400/80">100% Core Load</span>
            </div>
          </div>
        )}
        {tripleShotTimer > 0 && (
          <div className="flex items-center gap-2 bg-yellow-950/80 border border-yellow-500/50 px-3 py-1.5 rounded-xl text-yellow-500 text-xs font-mono shadow-[0_0_10px_rgba(234,179,8,0.2)]">
            <Zap className="w-4 h-4 text-yellow-400" />
            <div className="flex flex-col w-20">
              <span className="font-bold text-[10px] tracking-wide uppercase">Triple Shot</span>
              <div className="w-full bg-slate-950 h-1 rounded-full overflow-hidden mt-0.5 border border-yellow-900/30">
                <div
                  className="bg-yellow-400 h-full transition-all duration-100 ease-linear"
                  style={{ width: `${(tripleShotTimer / 12) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}
        {showDiagonal && (
          <div className="flex items-center gap-2 bg-emerald-950/80 border border-emerald-500/50 px-3 py-1.5 rounded-xl text-emerald-400 text-xs font-mono shadow-[0_0_10px_rgba(16,185,129,0.2)]">
            <Zap className="w-4 h-4 text-emerald-400" />
            <div className="flex flex-col w-20">
              <span className="font-bold text-[10px] tracking-wide uppercase">Spread Shot</span>
              <div className="w-full bg-slate-950 h-1 rounded-full overflow-hidden mt-0.5 border border-emerald-900/30">
                <div
                  className="bg-emerald-400 h-full transition-all duration-100 ease-linear"
                  style={{ width: `${((stats.diagonalShotTimer || 0) / 12) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}
        {showDrone && (
          <div className="flex items-center gap-2 bg-purple-950/80 border border-purple-500/50 px-3 py-1.5 rounded-xl text-purple-400 text-xs font-mono shadow-[0_0_10px_rgba(168,85,247,0.2)]">
            <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
            <div className="flex flex-col w-20">
              <span className="font-bold text-[10px] tracking-wide uppercase">Side Drones</span>
              <div className="w-full bg-slate-950 h-1 rounded-full overflow-hidden mt-0.5 border border-purple-900/30">
                <div
                  className="bg-purple-400 h-full transition-all duration-100 ease-linear"
                  style={{ width: `${((stats.droneTimer || 0) / 15) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}
        {showLaser && (
          <div className="flex items-center gap-2 bg-rose-950/80 border border-rose-500/50 px-3 py-1.5 rounded-xl text-rose-400 text-xs font-mono shadow-[0_0_10px_rgba(244,63,94,0.2)] animate-pulse">
            <Zap className="w-4 h-4 text-rose-400" />
            <div className="flex flex-col w-20">
              <span className="font-bold text-[10px] tracking-wide uppercase">Solar Laser</span>
              <div className="w-full bg-slate-950 h-1 rounded-full overflow-hidden mt-0.5 border border-rose-900/30">
                <div
                  className="bg-rose-500 h-full transition-all duration-100 ease-linear"
                  style={{ width: `${((stats.laserTimer || 0) / 8) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}
        {showOverdrive && (
          <div className="flex items-center gap-2 bg-pink-950/80 border border-pink-500/50 px-3 py-1.5 rounded-xl text-pink-400 text-xs font-mono shadow-[0_0_10px_rgba(236,72,153,0.2)]">
            <Sparkles className="w-4 h-4 text-pink-400 animate-pulse" />
            <div className="flex flex-col w-20">
              <span className="font-bold text-[10px] tracking-wide uppercase">Overdrive</span>
              <div className="w-full bg-slate-955 h-1 rounded-full overflow-hidden mt-0.5 border border-pink-900/30">
                <div
                  className="bg-pink-400 h-full transition-all duration-100 ease-linear"
                  style={{ width: `${((stats.overdriveTimer || 0) / 12) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 z-10" id="game-ui-overlay">
      {/* 1. TOP STATUS HUD (Always visible during gameplay) */}
      {stats.gameStarted && !stats.gameOver && (
        <div className="w-full flex justify-between items-center z-15 pointer-events-auto select-none gap-4">
          {/* Top Left: Score and Highscore */}
          <div className="flex items-center gap-3 bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-700/50 shadow-md">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-mono tracking-widest text-cyan-400">Score</span>
              <span className="text-xl font-black text-slate-100 font-mono tracking-wider drop-shadow-[0_0_6px_rgba(34,211,238,0.3)]">
                {stats.score.toLocaleString()}
              </span>
            </div>
            <div className="h-6 w-[1px] bg-slate-800" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500">HI-SCORE</span>
              <span className="text-xs font-bold text-slate-400 font-mono">
                {stats.highScore.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Top Center: Current Level Indicator */}
          <div className="bg-gradient-to-r from-cyan-600/20 via-blue-600/20 to-indigo-600/20 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.1)] flex flex-col items-center">
            <div className="text-[10px] uppercase font-mono tracking-widest text-cyan-300">Galactic Sector</div>
            <div className="text-lg font-black text-slate-100 font-mono tracking-wider">
              LEVEL {stats.level}
            </div>
          </div>

          {/* Top Right: HP Armor and Control Toolbar */}
          <div className="flex items-center gap-3">
            {renderLives()}

            {/* Mute and Pause Controls */}
            <div className="flex gap-2 bg-slate-900/80 backdrop-blur-md p-1.5 rounded-2xl border border-slate-700/50">
              <button
                onClick={onToggleMute}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors cursor-pointer text-slate-400 hover:text-cyan-400 hover:bg-slate-800/60"
                title={isMuted ? '取消静音' : '静音'}
                id="btn-toggle-mute"
              >
                {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-cyan-400" />}
              </button>
              <button
                onClick={stats.paused ? onResumeGame : onPauseGame}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors cursor-pointer text-slate-400 hover:text-cyan-400 hover:bg-slate-800/60"
                id="btn-toggle-pause"
              >
                {stats.paused ? <Play className="w-4 h-4 text-green-400" /> : <Pause className="w-4 h-4 text-cyan-400" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Render Active Buff Badges */}
      {renderActiveBuffs()}

      {/* 2. OVERLAYS (Full coverage screen states) */}
      <div className="flex-1 flex justify-center items-center pointer-events-none z-35">
        {/* State A: Start Game Splash Screen */}
        {!stats.gameStarted && (
          <div
            className="w-full max-w-md glass p-8 rounded-3xl shadow-2xl flex flex-col items-center text-center relative overflow-hidden pointer-events-auto"
            id="start-screen"
          >
            {/* Visual Flare */}
            <div className="absolute -top-12 -left-12 w-32 h-32 bg-cyan-500/10 rounded-full filter blur-2xl" />
            <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-indigo-500/10 rounded-full filter blur-2xl" />

            {/* Game Logo with Animated Aura */}
            <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center border border-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.4)] mb-4 relative group animate-bounce-slow">
              <span className="text-2xl font-black text-slate-950 font-serif">M</span>
              <div className="absolute inset-0 bg-white/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>

            <h1 className="text-7xl font-black italic tracking-tighter neon-text uppercase leading-none mb-1">
              Max<br/>
              <span className="text-slate-300 text-5xl font-black italic block mt-1 tracking-tight">星际先锋</span>
            </h1>
            <p className="text-[11px] font-mono text-cyan-400 tracking-widest uppercase mt-2 mb-6 animate-pulse">
              PRESS SPACE TO START JOURNEY
            </p>

            {/* Game Description & Features */}
            <div className="w-full bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 text-left text-xs mb-8 space-y-2.5">
              <div className="flex items-center gap-2.5 text-slate-300">
                <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
                <span>控制传奇级<b>先锋战机</b>，拦截外星星体袭击！</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-300">
                <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
                <span>掠夺<b>三向子弹</b>、激活<b>等离子能量护盾</b>增强战绩。</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-300">
                <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
                <span>拦截不同形态敌机：<b>基础型</b>、<b>极速型</b>与<b>超重型</b>。</span>
              </div>
            </div>

            {/* Start CTA Button */}
            <button
              onClick={onStartGame}
              className="w-full py-4 px-6 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-full glass transition-all transform hover:scale-105 neon-border flex items-center justify-center gap-2 cursor-pointer border border-cyan-300/40 shadow-[0_0_20px_rgba(6,182,212,0.4)]"
              id="btn-start-game"
            >
              <Play className="w-5 h-5 fill-white" />
              进入宇宙
            </button>
            <div className="text-[10px] text-slate-500 font-mono mt-4">
              支持键盘 / 鼠标或手机触屏拖挂，随时战斗
            </div>
          </div>
        )}

        {/* State B: Paused Overlay */}
        {stats.gameStarted && stats.paused && !stats.gameOver && (
          <div
            className="w-full max-w-sm glass p-8 rounded-3xl shadow-2xl flex flex-col items-center text-center border border-slate-700/65 pointer-events-auto"
            id="pause-screen"
          >
            <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.25)] mb-4">
              <Pause className="w-7 h-7" />
            </div>
            <h2 className="text-3xl font-black text-slate-100 italic tracking-tighter uppercase mb-1">
              星海跳跃中
            </h2>
            <p className="text-[11px] font-mono text-cyan-400 tracking-wider mb-8">
              TACTICAL WARP PAUSED
            </p>

            <div className="w-full flex flex-col gap-3">
              <button
                onClick={onResumeGame}
                className="w-full py-3.5 px-5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-2xl glass transition-all transform duration-250 hover:scale-105 active:scale-95 shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 cursor-pointer border border-cyan-300/30 neon-border"
                id="btn-resume-game"
              >
                <Play className="w-4 h-4 fill-white" />
                继续跃迁
              </button>
              <button
                onClick={onRestartGame}
                className="w-full py-3 px-5 bg-slate-900/60 hover:bg-slate-800 text-slate-200 border border-slate-700/55 font-bold tracking-wider rounded-2xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
                id="btn-pause-restart"
              >
                <RotateCw className="w-4 h-4" />
                重启关卡
              </button>
            </div>
          </div>
        )}

        {/* State C: Game Over Overlay */}
        {stats.gameOver && (
          <div
            className="w-full max-w-md glass p-8 rounded-3xl shadow-[0_0_50px_rgba(239,68,68,0.25)] flex flex-col items-center text-center relative overflow-hidden border border-red-500/30 pointer-events-auto"
            id="gameover-screen"
          >
            {/* Red Pulsing Aura */}
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-500 via-rose-500 to-red-600 shadow-[0_0_15px_rgba(239,68,68,0.8)]" />

            {/* Broken Ship Skull icon */}
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)] mb-4">
              <i className="fa-solid fa-skull-crossbones text-2xl animate-pulse"></i>
            </div>

            <h2 className="text-4xl font-black italic tracking-tighter text-red-500 uppercase leading-none">
              战机已坠毁
            </h2>
            <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mt-1.5 mb-6">
              MISSION EVALUATION REPORT
            </p>

            {/* Stats Summary Panel */}
            <div className="grid grid-cols-2 gap-4 w-full mb-8">
              <div className="bg-slate-900/40 border border-slate-800 p-3 rounded-2xl flex flex-col items-center">
                <span className="text-[10px] uppercase font-mono text-slate-500">最终分数值</span>
                <span className="text-2.5xl font-black text-yellow-400 font-mono tracking-wide mt-1">
                  {stats.score.toLocaleString()}
                </span>
              </div>
              <div className="bg-slate-900/40 border border-slate-800 p-3 rounded-2xl flex flex-col items-center">
                <span className="text-[10px] uppercase font-mono text-slate-500">飞行扇区</span>
                <span className="text-2.5xl font-black text-cyan-400 font-mono tracking-wide mt-1">
                  LVL {stats.level}
                </span>
              </div>
              <div className="bg-slate-900/40 border border-slate-800 p-3 rounded-2xl flex flex-col items-center col-span-2">
                <span className="text-[10px] uppercase font-mono text-slate-500">歼灭敌机核心数</span>
                <span className="text-lg font-black text-rose-500 font-mono mt-1 flex items-center gap-1.5">
                  <i className="fa-solid fa-burst text-sm"></i>
                  {stats.enemiesDestroyed} 架次
                </span>
              </div>
            </div>

            {/* Achievements Gained This Run */}
            <div className="w-full bg-slate-900/30 rounded-2xl border border-slate-800/80 p-4 mb-8 text-left">
              <h4 className="text-[10px] uppercase tracking-wider text-slate-400 font-mono mb-2 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-cyan-400" /> 已解锁星标勋章 ({achievements.filter(a => a.unlocked).length}/{achievements.length})
              </h4>
              <div className="grid grid-cols-2 gap-2 max-h-24 overflow-y-auto pr-1">
                {achievements.filter(a => a.unlocked).length === 0 ? (
                  <div className="col-span-2 text-center text-slate-500 py-3 text-xs font-mono">
                    本次跃迁未解锁勋章，再接再厉！
                  </div>
                ) : (
                  achievements
                    .filter((a) => a.unlocked)
                    .map((ach) => (
                      <div
                        key={ach.id}
                        className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-950/50 border border-cyan-500/20"
                      >
                        <span className="text-cyan-400 text-xs flex-shrink-0">
                          <i className={ach.icon}></i>
                        </span>
                        <span className="text-[10px] font-bold text-slate-200 truncate">{ach.title}</span>
                      </div>
                    ))
                )}
              </div>
            </div>

            {/* Restart Button */}
            <button
              onClick={onRestartGame}
              className="w-full py-4 px-6 bg-gradient-to-r from-red-600 via-rose-500 to-orange-500 hover:from-red-500 hover:to-orange-400 text-slate-950 font-black tracking-widest rounded-2xl shadow-[0_4px_25px_rgba(239,68,68,0.3)] transition-all transform duration-300 hover:scale-105 active:scale-95 flex items-center justify-center gap-2 cursor-pointer border border-rose-300/30 font-mono"
              id="btn-restart-game"
            >
              <RotateCw className="w-5 h-5" />
              再次校准重飞
            </button>
          </div>
        )}
      </div>

      {/* 3. TOAST ACHIEVEMENT & ALERTS (Flashes temporarily) */}
      <div className="absolute top-[85px] left-1/2 transform -translate-x-1/2 flex flex-col gap-2 pointer-events-none select-none z-45">
        {/* Achievement unlocked toast */}
        {activeToast && (
          <div className="bg-slate-950/90 border border-cyan-400/60 shadow-[0_0_20px_rgba(34,211,238,0.3)] text-slate-200 font-mono rounded-2xl px-5 py-3 flex items-center gap-3 animate-slide-in">
            <div className="w-8 h-8 rounded-lg bg-cyan-400/10 border border-cyan-400 text-cyan-400 flex items-center justify-center text-sm shadow-[0_0_10px_rgba(34,211,238,0.2)]">
              <Award className="w-5 h-5 text-cyan-300 animate-bounce" />
            </div>
            <div>
              <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest">
                成就解锁 (ACHIEVEMENT UNLOCKED)
              </div>
              <div className="text-xs font-black text-slate-100 mt-0.5">{activeToast}</div>
            </div>
          </div>
        )}
      </div>

      {/* Screen bottom bar: time tracker or hint */}
      {stats.gameStarted && !stats.gameOver && (
        <div className="w-full flex justify-between items-center pointer-events-none text-slate-400 z-15 text-[10px] font-mono mt-auto relative">
          <div className="bg-slate-950/60 border border-slate-900 px-2.5 py-1 rounded-lg">
            <span>任务用时: </span>
            <span className="text-slate-100 font-bold">
              {Math.floor(totalPlayTime / 60)}m {Math.floor(totalPlayTime % 60)}s
            </span>
          </div>
          <div className="bg-slate-950/60 border border-slate-900 px-2.5 py-1 rounded-lg">
            <span>歼敌率: {stats.enemiesDestroyed} 架</span>
          </div>
        </div>
      )}
    </div>
  );
};
