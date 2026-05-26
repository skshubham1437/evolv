import { useState, useEffect } from 'react';
import { fetchAnalytics, type AnalyticsSummary } from '../api';

const MOOD_INFO: Record<number, { label: string; color: string }> = {
  1: { label: 'Stressed', color: 'var(--color-error)' },
  2: { label: 'Tired',    color: 'var(--color-outline)' },
  3: { label: 'Calm',     color: 'var(--color-secondary)' },
  4: { label: 'Good',     color: 'var(--color-primary-fixed-dim)' },
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

  if (loading) return <div className="p-8 text-[var(--color-outline)]">Loading Analytics...</div>;

  return (
    <div className="flex-1 w-full px-[var(--spacing-margin-mobile)] md:px-[var(--spacing-margin-desktop)] py-6 md:py-10 pb-24 md:pb-10 overflow-y-auto overflow-x-hidden">
      <div className="max-w-[var(--spacing-container-max)] mx-auto flex flex-col gap-8 relative">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[var(--color-secondary)]/5 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-[var(--color-primary)]/5 rounded-full blur-[120px] pointer-events-none"></div>
        
        {/* Header & Filters */}
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            #printable-analytics, #printable-analytics * {
              visibility: visible;
            }
            #printable-analytics {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              background: transparent !important;
              color: var(--color-on-surface) !important;
              padding: 20px !important;
              margin: 0 !important;
            }
            .no-print {
              display: none !important;
            }
            .glass-panel {
              background: var(--color-surface-container-low) !important;
              border-color: var(--color-outline-variant) !important;
              box-shadow: none !important;
            }
          }
        `}</style>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[var(--color-outline-variant)]/10 pb-8 relative z-10">
          <div>
            <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-[var(--color-on-surface)] mb-2">Analytics &amp; Insights</h1>
            <p className="font-body-md text-body-md text-[var(--color-on-surface-variant)] opacity-70 uppercase tracking-widest text-[11px]">Your performance telemetry driven by AI correlations.</p>
          </div>
          
          <div className="flex items-center gap-3 no-print">
            {/* Export PDF Button */}
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-4 py-2 bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)]/20 rounded-full font-label-sm text-[11px] uppercase tracking-widest hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)] transition-all press-scale"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              Export Report
            </button>

            {/* Time Filters */}
            <div className="flex bg-[var(--color-surface-container-high)] rounded-full p-1 border border-[var(--color-outline-variant)]/20">
              <button 
                onClick={() => setRange('7d')}
                className={`px-6 py-2 rounded-full font-label-sm text-label-sm transition-all ${range === '7d' ? 'bg-[var(--color-primary)] text-[var(--color-background)] shadow-[0_0_10px_rgba(210,187,255,0.3)]' : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]'}`}
              >
                7D
              </button>
              <button 
                onClick={() => setRange('30d')}
                className={`px-6 py-2 rounded-full font-label-sm text-label-sm transition-all ${range === '30d' ? 'bg-[var(--color-primary)] text-[var(--color-background)] shadow-[0_0_10px_rgba(210,187,255,0.3)]' : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]'}`}
              >
                30D
              </button>
              <button 
                onClick={() => setRange('all')}
                className={`px-6 py-2 rounded-full font-label-sm text-label-sm transition-all ${range === 'all' ? 'bg-[var(--color-primary)] text-[var(--color-background)] shadow-[0_0_10px_rgba(210,187,255,0.3)]' : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]'}`}
              >
                ALL
              </button>
            </div>
          </div>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          
          {/* Hero Metric / Productivity Trend (Spans 2 columns on large) */}
          <div className="glass-panel rounded-xl p-6 lg:col-span-2 flex flex-col relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[var(--color-primary)] to-transparent opacity-50"></div>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="font-title-md text-title-md text-[var(--color-on-surface)] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[var(--color-primary)] text-[20px]">monitoring</span>
                  Productivity Trend
                </h2>
                <p className="font-label-sm text-label-sm text-[var(--color-secondary)] mt-1 uppercase tracking-wider">+14% vs last period</p>
              </div>
              <button className="text-[var(--color-outline)] hover:text-[var(--color-primary)] transition-colors">
                <span className="material-symbols-outlined">more_horiz</span>
              </button>
            </div>
            
            {/* Mobile Optimized Bar Chart Mockup */}
            <div className="flex-1 flex items-end justify-between gap-2 md:gap-4 mt-8 h-48 relative">
              {/* Background grid lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-5">
                <div className="w-full border-t border-[var(--color-outline)]"></div>
                <div className="w-full border-t border-[var(--color-outline)]"></div>
                <div className="w-full border-t border-[var(--color-outline)]"></div>
                <div className="w-full border-t border-[var(--color-outline)]"></div>
              </div>
              
              {/* Bars */}
              {chartBars.map((h, i) => (
                <div key={i} 
                  className={`w-full rounded-t-xl transition-all duration-500 hover:scale-y-105 cursor-pointer relative group/bar ${
                    i === 6 ? 'bg-gradient-to-t from-[var(--color-primary)] to-[var(--color-primary-fixed)] shadow-[0_0_20px_rgba(210,187,255,0.4)]' : 
                    h > 0 ? 'bg-gradient-to-t from-[var(--color-secondary)] to-[var(--color-secondary-fixed)] shadow-[0_0_20px_rgba(90,218,206,0.2)]' : 
                    'bg-[var(--color-surface-container-highest)]/40 hover:bg-[var(--color-surface-variant)]'
                  }`} 
                  style={{ height: `${Math.max(h, 5)}%` }} // Minimum height to show the bar
                >
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)]/30 text-[var(--color-on-surface)] font-label-sm text-[10px] px-2 py-1 rounded-lg opacity-0 group-hover/bar:opacity-100 transition-all scale-75 group-hover/bar:scale-100 shadow-xl backdrop-blur-md whitespace-nowrap z-20">
                    {productivityData[i]} Tasks
                  </div>
                </div>
              ))}
            </div>
            
            {/* X Axis Labels */}
            <div className="flex justify-between items-center mt-3 font-label-sm text-[10px] text-[var(--color-outline)] px-1">
              {range === '7d' ? (
                <><span>-6d</span><span>-5d</span><span>-4d</span><span>-3d</span><span>-2d</span><span>-1d</span><span>Today</span></>
              ) : range === '30d' ? (
                <><span>-29d</span><span>-20d</span><span>-10d</span><span>Today</span></>
              ) : (
                <><span>Past Year</span><span>Today</span></>
              )}
            </div>
          </div>

          {/* Time Allocation Breakdown */}
          <div className="glass-panel rounded-xl p-6 flex flex-col relative">
            <div className="absolute top-0 right-0 w-16 h-16 bg-[var(--color-secondary)]/10 blur-2xl rounded-full pointer-events-none"></div>
            <h2 className="font-title-md text-title-md text-[var(--color-on-surface)] mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-[var(--color-secondary)] text-[20px]">pie_chart</span>
              Time Allocation
            </h2>
            <div className="flex flex-col gap-5 flex-1 justify-center">
              {/* Work */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between font-label-sm text-label-sm">
                  <span className="text-[var(--color-on-surface-variant)] flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[var(--color-primary)]"></span> Deep Work</span>
                  <span className="text-[var(--color-on-surface)]">{data?.time_allocation?.deep_work || 0}%</span>
                </div>
                <div className="h-1.5 w-full bg-[var(--color-surface-container-high)] rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--color-primary)] shadow-[0_0_10px_rgba(210,187,255,0.5)] rounded-full transition-all duration-1000" style={{ width: `${data?.time_allocation?.deep_work || 0}%` }}></div>
                </div>
              </div>
              
              {/* Personal */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between font-label-sm text-label-sm">
                  <span className="text-[var(--color-on-surface-variant)] flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[var(--color-secondary)]"></span> Creative/Personal</span>
                  <span className="text-[var(--color-on-surface)]">{data?.time_allocation?.personal || 0}%</span>
                </div>
                <div className="h-1.5 w-full bg-[var(--color-surface-container-high)] rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--color-secondary)] shadow-[0_0_10px_rgba(90,218,206,0.5)] rounded-full transition-all duration-1000" style={{ width: `${data?.time_allocation?.personal || 0}%` }}></div>
                </div>
              </div>
              
              {/* Health */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between font-label-sm text-label-sm">
                  <span className="text-[var(--color-on-surface-variant)] flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[var(--color-tertiary)]"></span> Health &amp; Recovery</span>
                  <span className="text-[var(--color-on-surface)]">{data?.time_allocation?.health || 0}%</span>
                </div>
                <div className="h-1.5 w-full bg-[var(--color-surface-container-high)] rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--color-tertiary)] rounded-full transition-all duration-1000" style={{ width: `${data?.time_allocation?.health || 0}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Mood vs. Productivity Correlation Chart */}
          <div className="glass-panel rounded-xl p-6 flex flex-col justify-between h-80 relative overflow-hidden group">
            <h3 className="font-title-md text-title-md text-[var(--color-on-surface)] flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-[var(--color-primary)]">query_stats</span>
              Mood vs. Productivity
            </h3>
            <div className="flex-1 flex items-end justify-between gap-3 mt-4 h-40">
              {(data?.mood_productivity_correlation || []).map(item => {
                const info = MOOD_INFO[item.mood] || { label: 'Unknown', color: 'var(--color-outline)' };
                const maxVal = Math.max(...(data?.mood_productivity_correlation || []).map(c => c.avg_completions), 4);
                const heightPct = Math.round((item.avg_completions / maxVal) * 100);
                return (
                  <div key={item.mood} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group/bar">
                    <span className="font-label-sm text-[10px] text-[var(--color-on-surface-variant)] opacity-0 group-hover/bar:opacity-100 transition-opacity">
                      {item.avg_completions.toFixed(1)}
                    </span>
                    <div 
                      className="w-full rounded-t-lg transition-all duration-500 shadow-sm"
                      style={{ 
                        height: `${Math.max(heightPct, 5)}%`,
                        backgroundColor: info.color,
                        boxShadow: `0 0 15px color-mix(in srgb, ${info.color} 20%, transparent)`
                      }}
                    />
                    <span className="font-label-sm text-[9px] text-[var(--color-outline)] uppercase tracking-wider text-center mt-1 truncate w-full">
                      {info.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Circadian Energy Heatmap (Spans 2 columns) */}
          <div className="glass-panel rounded-xl p-6 lg:col-span-2 flex flex-col justify-between h-80 relative overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-title-md text-title-md text-[var(--color-on-surface)] flex items-center gap-2">
                <span className="material-symbols-outlined text-[var(--color-secondary)]">insights</span>
                Circadian Energy Heatmap
              </h3>
              <span className="font-label-sm text-[10px] uppercase text-[var(--color-secondary)] tracking-widest bg-[var(--color-secondary)]/10 px-2.5 py-1 rounded-full border border-[var(--color-secondary)]/20">Waking Rhythm</span>
            </div>
            
            <div className="flex-1 flex flex-col justify-between mt-2 overflow-x-auto no-scrollbar">
              <div className="min-w-[420px] flex flex-col gap-1.5">
                {/* Header row: hours */}
                <div className="flex items-center gap-1.5 mb-1.5 pl-8">
                  {["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"].map(h => (
                    <div key={h} className="flex-1 text-center font-label-sm text-[9px] text-[var(--color-outline)] tracking-wider">
                      {h}
                    </div>
                  ))}
                </div>
                
                {/* Days rows */}
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => {
                  return (
                    <div key={day} className="flex items-center gap-1.5">
                      {/* Day label */}
                      <div className="w-8 font-label-sm text-[10px] text-[var(--color-on-surface-variant)] uppercase tracking-wider text-left">
                        {day}
                      </div>
                      {/* Cells */}
                      {["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"].map((hour) => {
                        const cell = data?.energy_heatmap?.find(c => c.day === day && c.hour === hour);
                        const val = cell ? cell.value : 60; // default 60%
                        const opacity = Math.max(val / 100, 0.08);
                        
                        return (
                          <div 
                            key={hour} 
                            className="flex-1 aspect-video rounded-md transition-all duration-300 relative group/cell cursor-help"
                            style={{
                              backgroundColor: `color-mix(in srgb, var(--color-secondary) ${val}%, var(--color-surface-container-highest))`,
                              boxShadow: val > 75 ? `0 0 8px rgba(90, 218, 206, ${opacity * 0.4})` : 'none'
                            }}
                          >
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)]/30 text-[var(--color-on-surface)] font-label-sm text-[9px] px-2 py-0.5 rounded opacity-0 group-hover/cell:opacity-100 scale-75 group-hover/cell:scale-100 transition-all pointer-events-none whitespace-nowrap z-20 shadow-lg">
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
  );
}
