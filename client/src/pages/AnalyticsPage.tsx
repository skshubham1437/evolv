import { useState, useEffect } from 'react';
import { fetchAnalytics, type AnalyticsSummary } from '../api';

const MOOD_INFO: Record<number, { label: string; color: string }> = {
  1: { label: 'Stressed', color: 'var(--color-error)' },
  2: { label: 'Tired',    color: 'var(--color-outline)' },
  3: { label: 'Calm',     color: 'var(--color-secondary)' },
  4: { label: 'Good',     color: 'var(--color-primary)' },
  5: { label: 'Focused',  color: 'var(--color-primary)' },
};

export function AnalyticsPage() {
  const [range, setRange] = useState<'7d' | '30d' | 'all'>('7d');
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchAnalytics(range).then(res => {
      setData(res);
      setLoading(false);
    }).catch(e => {
      console.error(e);
      setLoading(false);
    });
  }, [range]);

  const productivityData = data?.productivity_trend || [];
  const maxProd = Math.max(...productivityData, 10); // scale factor

  // Normalize to percentage for the chart height
  const chartBars = productivityData.map(val => Math.round((val / maxProd) * 100));

  if (loading) return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[var(--color-surface-container-lowest)] text-[var(--color-outline)] font-label-sm uppercase tracking-widest font-bold">
      Loading Analytics Data...
    </div>
  );

  return (
    <div className="flex flex-col h-full w-full bg-transparent text-[var(--color-on-surface)] items-center overflow-hidden">
      <div className="flex flex-col h-full w-full max-w-[var(--spacing-container-max)] border-x border-[rgba(255,255,255,0.06)] relative">

        <header className="px-8 py-6 border-b border-[rgba(255,255,255,0.06)] flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0 bg-transparent">
          <div>
            <h1 className="text-[36px] font-black tracking-tighter text-[var(--color-on-surface)] leading-none select-none">Analytics & Insights</h1>
            <p className="font-mono text-[9px] text-[var(--color-outline)] uppercase tracking-[0.25em] mt-2.5">
              PERFORMANCE TELEMETRY
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-white/[0.01] border border-[rgba(255,255,255,0.08)] rounded-full font-mono text-[9px] uppercase tracking-widest font-bold hover:bg-[var(--color-primary)] hover:text-black hover:border-[var(--color-primary)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              Export
            </button>

            <div className="flex border border-[rgba(255,255,255,0.08)] bg-white/[0.01] rounded-full p-1 overflow-hidden">
              <button 
                onClick={() => setRange('7d')}
                className={`px-4 py-1.5 rounded-full font-mono text-[9px] font-bold transition-all active:scale-95 ${range === '7d' ? 'bg-[var(--color-primary)] text-black shadow-sm' : 'text-[var(--color-outline)] hover:text-[var(--color-on-surface)]'}`}
              >
                7D
              </button>
              <button 
                onClick={() => setRange('30d')}
                className={`px-4 py-1.5 rounded-full font-mono text-[9px] font-bold transition-all active:scale-95 ${range === '30d' ? 'bg-[var(--color-primary)] text-black shadow-sm' : 'text-[var(--color-outline)] hover:text-[var(--color-on-surface)]'}`}
              >
                30D
              </button>
              <button 
                onClick={() => setRange('all')}
                className={`px-4 py-1.5 rounded-full font-mono text-[9px] font-bold transition-all active:scale-95 ${range === 'all' ? 'bg-[var(--color-primary)] text-black shadow-sm' : 'text-[var(--color-outline)] hover:text-[var(--color-on-surface)]'}`}
              >
                ALL
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto no-scrollbar bg-transparent pb-32">
          <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            
            {/* Hero Metric / Productivity Trend (Spans 2 columns on large) */}
            <div className="glass-card rounded-2xl p-6 lg:col-span-2 flex flex-col relative overflow-hidden group border-[rgba(255,255,255,0.05)] shadow-lg bg-white/[0.005]">
              <div className="flex justify-between items-start mb-6 border-b border-[rgba(255,255,255,0.05)] pb-3">
                <div>
                  <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-on-surface)] font-bold flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-[var(--color-primary)]">monitoring</span>
                    Productivity Trend
                  </h2>
                </div>
                <span className="font-mono text-[8px] text-[var(--color-primary)] font-bold uppercase tracking-widest bg-[var(--color-primary)]/10 px-2.5 py-1 rounded-full border border-[var(--color-primary)]/20">+14% vs last period</span>
              </div>
              
              <div className="flex-1 flex items-end justify-between gap-2 md:gap-4 mt-8 h-48 relative">
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                  <div className="w-full border-t border-[rgba(255,255,255,0.08)]"></div>
                  <div className="w-full border-t border-[rgba(255,255,255,0.08)]"></div>
                  <div className="w-full border-t border-[rgba(255,255,255,0.08)]"></div>
                  <div className="w-full border-t border-[rgba(255,255,255,0.08)]"></div>
                </div>
                
                {/* Bars */}
                {chartBars.map((h, i) => (
                  <div key={i} 
                    className={`w-full transition-all duration-300 hover:scale-y-105 cursor-pointer relative group/bar border border-b-0 rounded-t-md ${
                      i === 6 ? 'bg-[var(--color-primary)] border-[var(--color-primary)] shadow-[0_0_12px_rgba(210,187,255,0.25)]' : 
                      h > 0 ? 'bg-white/[0.02] border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.2)]' : 
                      'bg-transparent border-[rgba(255,255,255,0.04)]'
                    }`} 
                    style={{ height: `${Math.max(h, 5)}%` }}
                  >
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-[var(--color-surface)] border border-[rgba(255,255,255,0.1)] text-[var(--color-on-surface)] font-mono text-[9px] px-2.5 py-1 rounded-lg opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap z-20 shadow-md">
                      {productivityData[i]} Tasks
                    </div>
                  </div>
                ))}
              </div>
              
              {/* X Axis Labels */}
              <div className="flex justify-between items-center mt-3.5 font-mono text-[9px] text-[var(--color-outline)] uppercase opacity-65">
                {range === '7d' ? (
                  <><span>-6d</span><span>-5d</span><span>-4d</span><span>-3d</span><span>-2d</span><span>-1d</span><span className="text-[var(--color-primary)] font-bold">Today</span></>
                ) : range === '30d' ? (
                  <><span>-29d</span><span>-20d</span><span>-10d</span><span className="text-[var(--color-primary)] font-bold">Today</span></>
                ) : (
                  <><span>Past Year</span><span className="text-[var(--color-primary)] font-bold">Today</span></>
                )}
              </div>
            </div>

            {/* Time Allocation Breakdown */}
            <div className="glass-card rounded-2xl p-6 flex flex-col relative border-[rgba(255,255,255,0.05)] shadow-lg bg-white/[0.005]">
              <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-on-surface)] font-bold flex items-center gap-2 mb-6 border-b border-[rgba(255,255,255,0.05)] pb-3">
                <span className="material-symbols-outlined text-[16px] text-[var(--color-secondary)]">pie_chart</span>
                Time Allocation
              </h2>
              <div className="flex flex-col gap-6 flex-1 justify-center">
                {/* Work */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between font-mono text-[9px] font-bold uppercase tracking-widest">
                    <span className="text-[var(--color-outline)] flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] glow-shadow-primary"></span> Deep Work
                    </span>
                    <span className="text-[var(--color-on-surface)]">{data?.time_allocation?.deep_work || 0}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/[0.04] rounded-full overflow-hidden relative">
                    <div className="absolute top-0 left-0 bottom-0 bg-[var(--color-primary)] transition-all duration-1000 glow-shadow-primary rounded-full" style={{ width: `${data?.time_allocation?.deep_work || 0}%` }}></div>
                  </div>
                </div>
                
                {/* Personal */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between font-mono text-[9px] font-bold uppercase tracking-widest">
                    <span className="text-[var(--color-outline)] flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-secondary)] glow-shadow-secondary"></span> Creative/Personal
                    </span>
                    <span className="text-[var(--color-on-surface)]">{data?.time_allocation?.personal || 0}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/[0.04] rounded-full overflow-hidden relative">
                    <div className="absolute top-0 left-0 bottom-0 bg-[var(--color-secondary)] transition-all duration-1000 glow-shadow-secondary rounded-full" style={{ width: `${data?.time_allocation?.personal || 0}%` }}></div>
                  </div>
                </div>
                
                {/* Health */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between font-mono text-[9px] font-bold uppercase tracking-widest">
                    <span className="text-[var(--color-outline)] flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-tertiary)] glow-shadow-tertiary"></span> Health & Recovery
                    </span>
                    <span className="text-[var(--color-on-surface)]">{data?.time_allocation?.health || 0}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/[0.04] rounded-full overflow-hidden relative">
                    <div className="absolute top-0 left-0 bottom-0 bg-[var(--color-tertiary)] transition-all duration-1000 glow-shadow-tertiary rounded-full" style={{ width: `${data?.time_allocation?.health || 0}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mood vs. Productivity Correlation Chart */}
            <div className="glass-card rounded-2xl p-6 flex flex-col justify-between h-80 relative overflow-hidden group border-[rgba(255,255,255,0.05)] shadow-lg bg-white/[0.005]">
              <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-on-surface)] font-bold flex items-center gap-2 mb-4 border-b border-[rgba(255,255,255,0.05)] pb-3">
                <span className="material-symbols-outlined text-[16px] text-[var(--color-primary)]">query_stats</span>
                Mood vs. Productivity
              </h3>
              <div className="flex-1 flex items-end justify-between gap-3 mt-4 h-40">
                {(data?.mood_productivity_correlation || []).map(item => {
                  const info = MOOD_INFO[item.mood] || { label: 'Unknown', color: 'var(--color-outline)' };
                  const maxVal = Math.max(...(data?.mood_productivity_correlation || []).map(c => c.avg_completions), 4);
                  const heightPct = Math.round((item.avg_completions / maxVal) * 100);
                  return (
                    <div key={item.mood} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group/bar">
                      <span className="font-mono text-[9px] text-[var(--color-outline)] opacity-0 group-hover/bar:opacity-100 transition-opacity font-bold">
                        {item.avg_completions.toFixed(1)}
                      </span>
                      <div 
                        className="w-full border border-b-0 rounded-t-md transition-all duration-500"
                        style={{ 
                          height: `${Math.max(heightPct, 5)}%`,
                          backgroundColor: info.color === 'var(--color-primary)' ? info.color : 'transparent',
                          borderColor: info.color,
                        }}
                      />
                      <span className="font-mono text-[8px] text-[var(--color-outline)] uppercase tracking-wider text-center mt-1 truncate w-full font-bold opacity-65">
                        {info.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Circadian Energy Heatmap (Spans 2 columns) */}
            <div className="glass-card rounded-2xl p-6 lg:col-span-2 flex flex-col justify-between h-80 relative overflow-hidden border-[rgba(255,255,255,0.05)] shadow-lg bg-white/[0.005]">
              <div className="flex justify-between items-center mb-4 border-b border-[rgba(255,255,255,0.05)] pb-3">
                <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-on-surface)] font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-[var(--color-secondary)]">insights</span>
                  Circadian Energy Heatmap
                </h3>
                <span className="font-mono text-[8px] uppercase text-[var(--color-secondary)] font-bold tracking-widest bg-[var(--color-secondary)]/10 px-2.5 py-1 rounded-full border border-[var(--color-secondary)]/20 shadow-sm">Waking Rhythm</span>
              </div>
              
              <div className="flex-1 flex flex-col justify-between mt-2 overflow-x-auto no-scrollbar">
                <div className="min-w-[420px] flex flex-col gap-1.5">
                  {/* Header row: hours */}
                  <div className="flex items-center gap-1 mb-1 pl-8">
                    {["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"].map(h => (
                      <div key={h} className="flex-1 text-center font-mono text-[9px] text-[var(--color-outline)] tracking-wider opacity-60">
                        {h}
                      </div>
                    ))}
                  </div>
                  
                  {/* Days rows */}
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => {
                    return (
                      <div key={day} className="flex items-center gap-1">
                        {/* Day label */}
                        <div className="w-8 font-mono text-[9px] font-bold text-[var(--color-outline)] uppercase tracking-wider text-left">
                          {day}
                        </div>
                        {/* Cells */}
                        {["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"].map((hour) => {
                          const cell = data?.energy_heatmap?.find(c => c.day === day && c.hour === hour);
                          const val = cell ? cell.value : 60; // default 60%
                          
                          return (
                            <div 
                              key={hour} 
                              className="flex-1 aspect-video transition-all duration-300 relative group/cell cursor-help border border-transparent hover:border-white/20 rounded-md overflow-hidden"
                              style={{
                                backgroundColor: val > 75 ? 'var(--color-secondary)' : val > 40 ? 'color-mix(in srgb, var(--color-secondary) 40%, rgba(255,255,255,0.02))' : 'rgba(255,255,255,0.02)',
                                opacity: val > 75 ? 1 : val > 40 ? 0.8 : 0.4
                              }}
                            >
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-[var(--color-surface)] border border-[rgba(255,255,255,0.1)] text-[var(--color-on-surface)] font-mono text-[8px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg opacity-0 group-hover/cell:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-md">
                                {day} {hour} · {Math.round(val)}% Energy
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}
