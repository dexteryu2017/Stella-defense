import React from 'react';
import { Shield, Zap, Sparkles, Heart, Crosshair, Award, ShieldAlert, ZapOff } from 'lucide-react';
import { Achievement } from '../types';

interface SidebarProps {
  achievements: Achievement[];
  highScore: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ achievements, highScore }) => {
  return (
    <aside className="w-80 ml-6 flex-shrink-0 hidden lg:flex flex-col gap-6" id="game-sidebar">
      {/* Visual Header */}
      <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-700/50 p-5 shadow-lg shadow-cyan-500/5 flex flex-col justify-center items-center text-center relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 opacity-30 group-hover:opacity-50 transition-opacity duration-500"></div>
        <div className="text-xs font-mono text-cyan-400 tracking-widest uppercase mb-1">High Score Database</div>
        <div className="text-3xl font-black text-slate-100 font-mono tracking-wider flex items-center gap-2 drop-shadow-[0_0_10px_rgba(34,211,238,0.3)]">
          <Award className="w-7 h-7 text-yellow-400 animate-pulse" />
          {highScore.toLocaleString()}
        </div>
      </div>

      {/* Operation Guide */}
      <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-700/50 p-5 shadow-lg shadow-cyan-500/5">
        <h3 className="text-sm font-mono font-bold text-cyan-400 border-b border-slate-800 pb-2 mb-4 flex items-center gap-2">
          <Crosshair className="w-4 h-4" /> 操作指南
        </h3>
        <div className="grid grid-cols-1 gap-3 text-xs text-slate-300 font-sans">
          <div className="flex justify-between items-center bg-slate-950/40 p-2 rounded-lg border border-slate-800/60">
            <span className="text-slate-400 font-mono">战机移动</span>
            <kbd className="px-2 py-1 bg-slate-800 rounded text-slate-100 border border-slate-700 shadow font-mono text-[10px]">W A S D / ↑ ↓ ← →</kbd>
          </div>
          <div className="flex justify-between items-center bg-slate-950/40 p-2 rounded-lg border border-slate-800/60">
            <span className="text-slate-400 font-mono">发射武器</span>
            <kbd className="px-2 py-1 bg-slate-800 rounded text-slate-100 border border-slate-700 shadow font-mono text-[10px]">空格键 Space</kbd>
          </div>
          <div className="flex justify-between items-center bg-slate-950/40 p-2 rounded-lg border border-slate-800/60">
            <span className="text-slate-400 font-mono">暂停 / 继续</span>
            <kbd className="px-1.5 py-1 bg-slate-800 rounded text-slate-100 border border-slate-700 shadow font-mono text-[10px]">P 键</kbd>
          </div>
          <div className="flex justify-between items-center bg-slate-950/40 p-2 rounded-lg border border-slate-800/60">
            <span className="text-slate-400 font-mono">移动端操作</span>
            <span className="text-[10px] text-cyan-400 font-mono">触控屏幕拖拽战机 (自动射击)</span>
          </div>
        </div>
      </div>

      {/* Item Descriptions */}
      <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-700/50 p-5 shadow-lg shadow-cyan-500/5">
        <h3 className="text-sm font-mono font-bold text-cyan-400 border-b border-slate-800 pb-2 mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4" /> 强化补给说明
        </h3>
        <div className="flex flex-col gap-3">
          {/* Triple Shot */}
          <div className="flex gap-3 items-start bg-slate-950/30 p-2.5 rounded-xl border border-slate-800/60">
            <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center border border-yellow-500/30 text-yellow-400 flex-shrink-0 shadow-[0_0_10px_rgba(234,179,8,0.15)]">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-yellow-400 font-mono">多路散弹 (Triple Shot)</div>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">获取后触发 3 向扇形攒射攻击，有效覆盖更大范围，持续 12 秒。</p>
            </div>
          </div>

          {/* Shield */}
          <div className="flex gap-3 items-start bg-slate-950/30 p-2.5 rounded-xl border border-slate-800/60">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/30 text-cyan-400 flex-shrink-0 shadow-[0_0_10px_rgba(6,182,212,0.15)]">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-cyan-400 font-mono">能量防护盾 (Shield)</div>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">激活一层亮蓝色等离子护盾，可百分百无死角抵挡一次任意敌机碰撞或子弹伤害。</p>
            </div>
          </div>

          {/* Heal */}
          <div className="flex gap-3 items-start bg-slate-950/30 p-2.5 rounded-xl border border-slate-800/60">
            <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center border border-green-500/30 text-green-400 flex-shrink-0 shadow-[0_0_10px_rgba(34,197,94,0.15)]">
              <Heart className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-green-400 font-mono">纳米能量核心 (Repair)</div>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">纳米机器人极速修复，立即恢复战机 1 点生命值（上限 5 点生命）。</p>
            </div>
          </div>

          {/* Bomb */}
          <div className="flex gap-3 items-start bg-slate-950/30 p-2.5 rounded-xl border border-slate-800/60">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center border border-red-500/30 text-red-500 flex-shrink-0 shadow-[0_0_10px_rgba(239,68,68,0.15)]">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-red-400 font-mono">超新星震荡波 (EMP Bomb)</div>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">引爆中子能量波动，消灭当前屏幕内的所有普通级和快速级敌机。</p>
            </div>
          </div>
        </div>
      </div>

      {/* Achievement Board */}
      <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-700/50 p-5 shadow-lg shadow-cyan-500/5 overflow-hidden flex-1 flex flex-col min-h-0">
        <h3 className="text-sm font-mono font-bold text-cyan-400 border-b border-slate-800 pb-2 mb-4 flex items-center gap-2">
          <Award className="w-4 h-4" /> 先锋星际勋章 ({achievements.filter(a => a.unlocked).length}/{achievements.length})
        </h3>
        <div className="flex1 overflow-y-auto space-y-2.5 pr-1 flex flex-col min-h-0 select-none">
          {achievements.map((ach) => (
            <div
              key={ach.id}
              className={`flex items-center gap-3 p-2.5 rounded-xl transition-all duration-300 border ${
                ach.unlocked
                  ? 'bg-slate-800/40 border-cyan-500/30 shadow-[0_0_12px_rgba(34,211,238,0.05)]'
                  : 'bg-slate-950/20 border-slate-900/60 opacity-50'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center border flex-shrink-0 text-[13px] ${
                  ach.unlocked
                    ? 'bg-gradient-to-br from-cyan-600/20 to-blue-600/20 border-cyan-400 text-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.2)]'
                    : 'bg-slate-900 border-slate-800 text-slate-600'
                }`}
              >
                <i className={ach.icon}></i>
              </div>
              <div className="min-w-0">
                <div className={`text-xs font-bold font-mono tracking-wide ${ach.unlocked ? 'text-slate-200' : 'text-slate-500'}`}>
                  {ach.title}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[180px]">
                  {ach.description}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};
