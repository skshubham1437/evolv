import { useState, useEffect, useRef } from 'react';
import { 
  fetchVision, updateVision, type Vision,
  fetchFocusAreas, updateFocusArea, type FocusArea,
  fetchBucketList, createBucketListItem, toggleBucketListItem, deleteBucketListItem, type BucketListItem
} from '../api';

const BUCKET_CATEGORIES = ["Experiences", "Career/Creation", "Travel", "Learning/Skill"];

interface CoreValue {
  id: string; // for drag and drop
  name: string;
  description: string;
  level: number;
}

export function VisionPage() {
  const [vision, setVision] = useState<Vision | null>(null);
  
  // Identity Statement
  const [identityStmt, setIdentityStmt] = useState('');
  const [isEditingIdentity, setIsEditingIdentity] = useState(false);
  
  // Core Values (Drag & Drop)
  const [coreValues, setCoreValues] = useState<CoreValue[]>([]);
  const [draggedItemIdx, setDraggedItemIdx] = useState<number | null>(null);
  const [isEditingValues, setIsEditingValues] = useState(false);

  // Future Self
  const [futureSelf, setFutureSelf] = useState('');
  const futureSelfTimer = useRef<number | null>(null);

  // Focus Areas & Radar
  const [focusAreas, setFocusAreas] = useState<FocusArea[]>([]);

  // Bucket List
  const [bucketList, setBucketList] = useState<BucketListItem[]>([]);
  const [newBucketTitle, setNewBucketTitle] = useState('');
  const [newBucketCategory, setNewBucketCategory] = useState(BUCKET_CATEGORIES[0]);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      const [vData, faData, blData] = await Promise.all([
        fetchVision(), fetchFocusAreas(), fetchBucketList()
      ]);

      setVision(vData);
      setFocusAreas(faData);
      setBucketList(blData);

      const statements = JSON.parse(vData.identity_statements || '[]');
      setIdentityStmt(statements.length > 0 ? statements[0] : '"I am a healthy, focused builder."');

      const values = JSON.parse(vData.core_values || '[]');
      if (values.length > 0) {
        setCoreValues(values.map((v: any, i: number) => ({ ...v, id: v.id || `cv-${i}` })));
      } else {
        setCoreValues([
          { id: 'cv-0', name: 'Discipline', description: 'Unwavering consistency in physical and mental conditioning.', level: 8 },
          { id: 'cv-1', name: 'Creativity', description: 'Designing elegant solutions and exploring generative frontiers.', level: 6 },
          { id: 'cv-2', name: 'Impact', description: 'Building scalable systems that elevate collective potential.', level: 7 }
        ]);
      }

      setFutureSelf(vData.future_self_text || '');
    } catch (e) {
      console.error("Failed to load vision data", e);
    } finally {
      setIsLoading(false);
    }
  };

  const saveIdentity = async () => {
    setIsEditingIdentity(false);
    if (!vision) return;
    await updateVision({ identity_statements: JSON.stringify([identityStmt]) });
  };

  const handleFutureSelfChange = (val: string) => {
    setFutureSelf(val);
    if (futureSelfTimer.current) window.clearTimeout(futureSelfTimer.current);
    futureSelfTimer.current = window.setTimeout(() => {
      updateVision({ future_self_text: val });
    }, 1000);
  };

  const handleRadarClick = async (areaId: number, score: number) => {
    setFocusAreas(prev => prev.map(fa => fa.id === areaId ? { ...fa, current_score: score } : fa));
    await updateFocusArea(areaId, { current_score: score });
  };

  const handleAddBucket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBucketTitle.trim()) return;
    const newItem = await createBucketListItem(newBucketTitle, newBucketCategory);
    setBucketList([newItem, ...bucketList]);
    setNewBucketTitle('');
  };

  const handleToggleBucket = async (id: number) => {
    setBucketList(prev => prev.map(item => item.id === id ? { ...item, is_completed: !item.is_completed } : item));
    await toggleBucketListItem(id);
  };

  const handleDeleteBucket = async (id: number) => {
    setBucketList(prev => prev.filter(item => item.id !== id));
    await deleteBucketListItem(id);
  };

  const onDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggedItemIdx(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", e.currentTarget.parentNode as any);
    e.dataTransfer.setDragImage(e.currentTarget, 20, 20);
  };

  const onDragOver = (index: number) => {
    if (draggedItemIdx === null || draggedItemIdx === index) return;
    const items = [...coreValues];
    const draggedItem = items[draggedItemIdx];
    items.splice(draggedItemIdx, 1);
    items.splice(index, 0, draggedItem);
    setDraggedItemIdx(index);
    setCoreValues(items);
  };

  const onDragEnd = async () => {
    setDraggedItemIdx(null);
    await updateVision({ core_values: JSON.stringify(coreValues) });
  };

  const saveCoreValues = async () => {
    setIsEditingValues(false);
    await updateVision({ core_values: JSON.stringify(coreValues) });
  };

  const getRadarPoints = (radius: number = 70, useTarget: boolean = false) => {
    if (!focusAreas.length) return "";
    const cx = 100, cy = 100;
    const angleStep = (Math.PI * 2) / focusAreas.length;
    
    return focusAreas.map((fa, i) => {
      const value = useTarget ? fa.target_score : fa.current_score;
      const r = (Math.max(value, 1) / 10) * radius;
      const angle = (i * angleStep) - Math.PI / 2;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      return `${x},${y}`;
    }).join(" ");
  };

  if (isLoading) return <div className="p-8 text-[var(--color-outline)] font-label-sm uppercase tracking-widest font-bold">Initializing Vision Sequence...</div>;

  return (
    <div className="flex-1 overflow-y-auto w-full no-scrollbar relative z-10 pb-24 md:pb-0">
      <div className="max-w-[var(--spacing-container-max)] mx-auto px-[var(--spacing-margin-mobile)] md:px-[var(--spacing-margin-desktop)] pt-5 md:pt-8 pb-12 flex flex-col gap-6 relative z-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between px-8 py-6 border-b border-[rgba(255,255,255,0.06)] shrink-0 bg-transparent gap-4">
          <div>
            <h2 className="text-[36px] font-black tracking-tighter text-[var(--color-on-surface)] leading-none select-none">
              Core Identity
            </h2>
            <p className="font-mono text-[9px] text-[var(--color-outline)] uppercase tracking-[0.25em] mt-2.5">
              VISION // PRINCIPLES // ALIGNMENT
            </p>
          </div>
          
          <div className="flex items-center gap-10">
            <div className="flex flex-col items-end">
              <span className="font-mono text-[9px] text-[var(--color-outline)] uppercase tracking-widest mb-1 font-bold">Pillars</span>
              <span className="font-mono text-[24px] text-[var(--color-on-surface)] font-bold tracking-tight leading-none">{coreValues.length}</span>
            </div>
            <div className="w-px h-8 bg-[rgba(255,255,255,0.08)] self-center" />
            <div className="flex flex-col items-end">
              <span className="font-mono text-[9px] text-[var(--color-outline)] uppercase tracking-widest mb-1 font-bold">Bucket</span>
              <span className="font-mono text-[24px] text-[var(--color-on-surface)] font-bold tracking-tight leading-none">{bucketList.length}</span>
            </div>
            <div className="w-px h-8 bg-[rgba(255,255,255,0.08)] self-center" />
            <div className="flex flex-col items-end">
              <span className="font-mono text-[9px] text-[var(--color-outline)] uppercase tracking-widest mb-1 font-bold">Focus</span>
              <span className="font-mono text-[24px] text-[var(--color-primary)] font-bold tracking-tight leading-none">{focusAreas.length}</span>
            </div>
          </div>
        </div>
            
        {/* Identity Statement */}
        <section className="glass-card rounded-2xl p-12 flex flex-col items-center justify-center text-center relative group border-[rgba(255,255,255,0.05)] shadow-lg bg-white/[0.005]">
          <span className="material-symbols-outlined text-[24px] text-[var(--color-primary)] mb-6 absolute top-6 right-6 opacity-20 group-hover:opacity-100 transition-all hover:scale-110" style={{ fontVariationSettings: "'FILL' 1" }}>electric_bolt</span>
          
          {isEditingIdentity ? (
            <div className="w-full max-w-2xl flex flex-col items-center gap-6 z-10">
              <input 
                value={identityStmt}
                onChange={(e) => setIdentityStmt(e.target.value)}
                autoFocus
                className="w-full bg-transparent border-b border-[var(--color-primary)] text-center font-title-md text-[24px] md:text-[32px] text-[var(--color-on-surface)] focus:outline-none pb-4"
              />
              <button onClick={saveIdentity} className="px-6 py-2.5 bg-[var(--color-primary)] text-black font-mono text-[10px] font-bold uppercase tracking-widest hover:brightness-110 rounded-xl active:scale-95 transition-all shadow-[0_0_12px_rgba(210,187,255,0.2)]">
                Commit Directive
              </button>
            </div>
          ) : (
            <div className="cursor-pointer group/text z-10 w-full" onClick={() => setIsEditingIdentity(true)}>
              <h2 className="font-title-md text-[24px] md:text-[32px] text-[var(--color-on-surface)] tracking-tight leading-snug transition-colors group-hover:text-[var(--color-primary)]">
                {identityStmt}
              </h2>
              <div className="opacity-0 group-hover:opacity-80 transition-all mt-6 text-[var(--color-outline)] flex items-center justify-center gap-2 font-mono text-[9px] uppercase tracking-widest font-bold">
                <span className="material-symbols-outlined text-[14px]">edit</span> Recalibrate Alignment
              </div>
            </div>
          )}
        </section>

            {/* Radar & Values Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
              
              {/* Interactive Radar Chart */}
              <section className="xl:col-span-5 glass-card rounded-2xl flex flex-col h-full overflow-hidden border-[rgba(255,255,255,0.05)] shadow-lg bg-white/[0.005]">
                <div className="p-4 px-6 border-b border-[rgba(255,255,255,0.05)] bg-white/[0.02]">
                  <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-on-surface)] font-bold flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">radar</span>
                    Life Balance
                  </h3>
                </div>
                
                <div className="flex-1 flex flex-col items-center justify-center p-8 relative min-h-[350px]">
                  <svg className="w-full max-w-[300px] h-auto animate-pulse-slow" viewBox="-30 -20 260 240">
                    <defs>
                      <filter id="radar-glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="2" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                    </defs>

                    {/* Background Grid */}
                    {[20, 40, 60].map(_r => (
                      <polygon key={_r} fill="none" points={getRadarPoints(_r, true)} stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" />
                    ))}
                    
                    {/* Axes */}
                    {focusAreas.map((_fa, i) => {
                      const angle = (i * ((Math.PI * 2) / focusAreas.length)) - Math.PI / 2;
                      return <line key={i} x1="100" y1="100" x2={100 + 70 * Math.cos(angle)} y2={100 + 70 * Math.sin(angle)} stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" />
                    })}

                    {/* Target Score Polygon */}
                    {focusAreas.length > 0 && (
                      <polygon fill="none" points={getRadarPoints(70, true)} stroke="rgba(255, 255, 255, 0.2)" strokeWidth="1" strokeDasharray="3 3" />
                    )}

                    {/* Current Score Polygon */}
                    {focusAreas.length > 0 && (
                      <polygon fill="color-mix(in srgb, var(--color-primary) 8%, transparent)" points={getRadarPoints(70, false)} stroke="var(--color-primary)" strokeWidth="2" filter="url(#radar-glow)" className="transition-all duration-700 animate-radar-pulse"></polygon>
                    )}

                    {/* Interactive Nodes */}
                    {focusAreas.map((fa, i) => {
                      const angle = (i * ((Math.PI * 2) / focusAreas.length)) - Math.PI / 2;
                      const r = (Math.max(fa.current_score, 1) / 10) * 70;
                      const cx = 100 + r * Math.cos(angle);
                      const cy = 100 + r * Math.sin(angle);
                      
                      const labelR = 95;
                      const lx = 100 + labelR * Math.cos(angle);
                      const ly = 100 + labelR * Math.sin(angle);

                      return (
                        <g key={fa.id}>
                          <text x={lx} y={ly} fontSize="7" fill="var(--color-outline)" textAnchor="middle" alignmentBaseline="middle" className="pointer-events-none font-bold uppercase tracking-wider font-mono opacity-80">{fa.name}</text>
                          
                          {[2, 4, 6, 8, 10].map(score => {
                            const clickR = (score / 10) * 70;
                            return (
                              <circle 
                                key={score} 
                                cx={100 + clickR * Math.cos(angle)} 
                                cy={100 + clickR * Math.sin(angle)} 
                                r="8" 
                                fill="transparent" 
                                className="cursor-pointer hover:fill-[var(--color-primary)]/20 transition-colors"
                                onClick={() => handleRadarClick(fa.id, score)}
                              />
                            )
                          })}
                          
                          {/* Pulsing glow ring */}
                          <circle cx={cx} cy={cy} r="5" fill="var(--color-primary)" opacity="0.3" className="pointer-events-none transition-all duration-700 animate-ping" />
                          <circle cx={cx} cy={cy} r="3" fill="var(--color-primary)" className="pointer-events-none transition-all duration-700" />
                        </g>
                      );
                    })}
                  </svg>
                  <p className="font-mono text-[9px] text-[var(--color-outline)] font-bold uppercase tracking-widest mt-6 opacity-60">Click axis nodes to recalibrate balance</p>
                </div>
              </section>

              {/* Draggable Core Values */}
              <div className="xl:col-span-7 glass-card rounded-2xl flex flex-col overflow-hidden h-full border-[rgba(255,255,255,0.05)] shadow-lg bg-white/[0.005]">
                <div className="flex justify-between items-center px-6 py-4 bg-white/[0.02] border-b border-[rgba(255,255,255,0.05)]">
                  <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-on-surface)] font-bold flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">account_balance</span>
                    Core Pillars
                  </h3>
                  <button 
                    onClick={() => isEditingValues ? saveCoreValues() : setIsEditingValues(true)}
                    className="font-mono text-[9px] uppercase tracking-widest font-bold text-[var(--color-primary)] border border-[var(--color-primary)]/30 rounded-full px-4 py-2 hover:bg-[var(--color-primary)] hover:text-black transition-all active:scale-95 shadow-sm"
                  >
                    {isEditingValues ? 'Lock Order' : 'Reorder'}
                  </button>
                </div>
                
                <div className="flex flex-col bg-transparent divide-y divide-[rgba(255,255,255,0.04)]">
                  {coreValues.map((cv, idx) => {
                    const colorVar = idx === 0 ? 'var(--color-primary)' : idx === 1 ? 'var(--color-secondary)' : 'var(--color-tertiary)';
                    
                    return (
                      <div 
                        key={cv.id}
                        draggable={isEditingValues}
                        onDragStart={(e) => onDragStart(e, idx)}
                        onDragOver={(e) => { e.preventDefault(); onDragOver(idx); }}
                        onDragEnd={onDragEnd}
                        className={`p-5 pl-7 flex items-start gap-5 relative overflow-hidden transition-all duration-300 hover:bg-white/[0.015] hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.15)] group/pillar
                          ${isEditingValues ? 'cursor-grab active:cursor-grabbing border-dashed border-[var(--color-primary)]/40 bg-[var(--color-primary)]/5' : ''}
                        `}
                      >
                        {/* Left Accent Bar */}
                        <div 
                          className="absolute left-0 top-0 bottom-0 w-[3px] transition-all duration-300 group-hover/pillar:w-[5px] rounded-r-full" 
                          style={{ backgroundColor: colorVar }} 
                        />

                        {isEditingValues && (
                          <span className="material-symbols-outlined text-[var(--color-outline)] mt-1.5 animate-pulse">drag_indicator</span>
                        )}
                        
                        <div className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center border transition-transform group-hover/pillar:scale-105" style={{ backgroundColor: `color-mix(in srgb, ${colorVar} 10%, transparent)`, color: colorVar, borderColor: `color-mix(in srgb, ${colorVar} 20%, transparent)` }}>
                          <span className="material-symbols-outlined">{idx === 0 ? 'fitness_center' : idx === 1 ? 'palette' : 'public'}</span>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-1.5">
                            <h4 className="font-body-md text-[16px] text-[var(--color-on-surface)] font-semibold leading-snug">{cv.name}</h4>
                            <span className="font-mono text-[9px] font-bold px-2.5 py-0.5 border rounded-full" style={{ backgroundColor: `color-mix(in srgb, ${colorVar} 10%, transparent)`, color: colorVar, borderColor: `color-mix(in srgb, ${colorVar} 30%, transparent)` }}>
                              LVL {cv.level}
                            </span>
                          </div>
                          <p className="font-body-md text-[13px] text-[var(--color-on-surface)] opacity-60 leading-relaxed">{cv.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Future Self & Bucket List */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Future Self Free-write */}
              <section className="glass-card rounded-2xl flex flex-col h-full focus-within:border-[var(--color-primary)]/40 transition-colors overflow-hidden border-[rgba(255,255,255,0.05)] shadow-lg bg-white/[0.005]">
                <div className="p-4 px-6 border-b border-[rgba(255,255,255,0.05)] bg-white/[0.02]">
                  <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-on-surface)] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">visibility</span>
                    Future Self Projection
                  </h3>
                </div>
                <div className="p-6 flex flex-col flex-1 gap-4">
                  <p className="font-mono text-[9px] text-[var(--color-outline)] uppercase tracking-wider font-bold opacity-60">Write your reality 1 year from now. State it as truth.</p>
                  
                  <textarea
                    value={futureSelf}
                    onChange={(e) => handleFutureSelfChange(e.target.value)}
                    placeholder="It is December 2027. I am..."
                    className="flex-1 w-full bg-transparent text-[var(--color-on-surface)] font-mono text-[13px] leading-relaxed outline-none resize-none hide-scrollbar placeholder:text-[var(--color-outline)]"
                    style={{ minHeight: '200px' }}
                  />
                </div>
              </section>

              {/* Dynamic Bucket List */}
              <section className="glass-card rounded-2xl flex flex-col h-full max-h-[500px] overflow-hidden border-[rgba(255,255,255,0.05)] shadow-lg bg-white/[0.005]">
                <div className="p-4 px-6 border-b border-[rgba(255,255,255,0.05)] bg-white/[0.02]">
                  <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-on-surface)] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">format_list_bulleted</span>
                    Bucket List
                  </h3>
                </div>
                
                <div className="p-6 flex flex-col flex-1 overflow-hidden">
                  <form onSubmit={handleAddBucket} className="flex gap-2 mb-6 shrink-0 border border-[rgba(255,255,255,0.08)] p-1 bg-white/[0.01] rounded-xl focus-within:border-[var(--color-primary)]/40 transition-all duration-300">
                    <select 
                      value={newBucketCategory} 
                      onChange={(e) => setNewBucketCategory(e.target.value)}
                      className="bg-transparent text-[var(--color-on-surface)] font-mono text-[9px] font-bold uppercase tracking-widest border-r border-[rgba(255,255,255,0.08)] px-3 outline-none cursor-pointer [color-scheme:dark]"
                    >
                      {BUCKET_CATEGORIES.map(cat => <option key={cat} value={cat} className="bg-[var(--color-surface-container)] text-[var(--color-on-surface)]">{cat}</option>)}
                    </select>
                    <input 
                      type="text" 
                      value={newBucketTitle}
                      onChange={(e) => setNewBucketTitle(e.target.value)}
                      placeholder="Add objective..." 
                      className="flex-1 bg-transparent text-[var(--color-on-surface)] px-2 font-body-md text-[13px] outline-none placeholder:text-[var(--color-outline)]"
                    />
                    <button type="submit" className="bg-[var(--color-primary)] text-black px-5 py-2 rounded-lg font-mono text-[9px] font-bold uppercase tracking-widest hover:brightness-110 transition-all duration-300 shadow-[0_0_12px_rgba(210,187,255,0.2)] hover:scale-[1.02] active:scale-[0.98]">
                      Add
                    </button>
                  </form>

                  <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col border border-[rgba(255,255,255,0.06)] rounded-xl overflow-hidden bg-white/[0.005]">
                    {bucketList.map(item => (
                      <div key={item.id} className={`group flex items-center gap-4 p-4 border-b border-[rgba(255,255,255,0.04)] last:border-b-0 transition-colors ${item.is_completed ? 'bg-white/[0.01] opacity-60' : 'bg-transparent hover:bg-white/[0.01]'}`}>
                        
                        <button 
                          type="button"
                          onClick={() => handleToggleBucket(item.id)}
                          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all duration-300 relative overflow-hidden
                            ${item.is_completed 
                              ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)] shadow-[0_0_8px_rgba(210,187,255,0.2)]' 
                              : 'border-[rgba(255,255,255,0.15)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 hover:scale-105 active:scale-95 text-transparent hover:text-[var(--color-primary)]/40'
                            }
                          `}
                        >
                          {item.is_completed ? (
                            <span className="material-symbols-outlined text-[12px] anim-check-pop" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                          ) : (
                            <span className="material-symbols-outlined text-[12px] opacity-0 group-hover:opacity-100 transition-opacity">check</span>
                          )}
                        </button>
                        
                        <div className="flex-1 min-w-0">
                          <p className={`font-body-md text-[14px] font-semibold truncate ${item.is_completed ? 'text-[var(--color-outline)] line-through' : 'text-[var(--color-on-surface)]/80'}`}>
                            {item.title}
                          </p>
                          <span className="font-mono text-[8px] font-bold uppercase tracking-wider text-[var(--color-secondary)] inline-block mt-1 border border-[var(--color-secondary)]/20 px-2 py-0.5 rounded-full bg-[var(--color-secondary)]/5">
                            {item.category}
                          </span>
                        </div>

                        <button 
                          onClick={() => handleDeleteBucket(item.id)}
                          className="w-8 h-8 flex shrink-0 items-center justify-center text-[var(--color-outline)] hover:text-[var(--color-error)] opacity-0 group-hover:opacity-100 transition-all hover:bg-[var(--color-error)]/10 border border-transparent hover:border-[var(--color-error)]/20 rounded-lg"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
                    ))}
                    {bucketList.length === 0 && (
                      <div className="p-8 text-center text-[var(--color-outline)] font-mono text-[9px] font-bold uppercase tracking-widest opacity-60">
                        NO OBJECTIVES LOGGED.
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      );
    }