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
    <div className="flex flex-col h-full w-full bg-[var(--color-surface-container-lowest)] text-[var(--color-on-surface)] items-center overflow-hidden">
      <div className="flex flex-col h-full w-full max-w-[var(--spacing-container-max)] border-x border-[var(--color-outline-variant)] relative">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between px-8 py-6 border-b border-[var(--color-outline-variant)] shrink-0 bg-[var(--color-surface-container-lowest)] gap-4">
          <div>
            <h2 className="font-title-md text-[32px] font-medium tracking-tight text-[var(--color-primary-fixed)]">
              Core Identity
            </h2>
            <p className="font-label-sm text-[11px] text-[var(--color-outline)] uppercase tracking-widest mt-1 font-bold">
              VISION • PRINCIPLES • ALIGNMENT
            </p>
          </div>
          
          <div className="flex items-center gap-10">
            <div className="flex flex-col items-end">
              <span className="font-label-sm text-[10px] text-[var(--color-outline)] uppercase tracking-widest mb-1 font-bold">Pillars</span>
              <span className="font-label-sm text-[28px] text-[var(--color-on-surface)] font-normal tracking-tight leading-none">{coreValues.length}</span>
            </div>
            <div className="w-px h-10 bg-[var(--color-outline-variant)] self-center" />
            <div className="flex flex-col items-end">
              <span className="font-label-sm text-[10px] text-[var(--color-outline)] uppercase tracking-widest mb-1 font-bold">Bucket</span>
              <span className="font-label-sm text-[28px] text-[var(--color-on-surface)] font-normal tracking-tight leading-none">{bucketList.length}</span>
            </div>
            <div className="w-px h-10 bg-[var(--color-outline-variant)] self-center" />
            <div className="flex flex-col items-end">
              <span className="font-label-sm text-[10px] text-[var(--color-outline)] uppercase tracking-widest mb-1 font-bold">Focus</span>
              <span className="font-label-sm text-[28px] text-[var(--color-primary)] font-normal tracking-tight leading-none">{focusAreas.length}</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar bg-[var(--color-surface-container-low)] pb-32">
          <div className="p-8 flex flex-col gap-8">
            
            {/* Identity Statement */}
            <section className="bg-[var(--color-surface-container)] p-12 border border-[var(--color-outline-variant)] flex flex-col items-center justify-center text-center relative group">
              <span className="material-symbols-outlined text-[24px] text-[var(--color-primary)] mb-6 absolute top-6 right-6 opacity-30 group-hover:opacity-100 transition-opacity" style={{ fontVariationSettings: "'FILL' 1" }}>electric_bolt</span>
              
              {isEditingIdentity ? (
                <div className="w-full max-w-2xl flex flex-col items-center gap-6 z-10">
                  <input 
                    value={identityStmt}
                    onChange={(e) => setIdentityStmt(e.target.value)}
                    autoFocus
                    className="w-full bg-transparent border-b-2 border-[var(--color-primary)] text-center font-title-md text-[24px] md:text-[32px] text-[var(--color-on-surface)] focus:outline-none pb-4"
                  />
                  <button onClick={saveIdentity} className="px-6 py-2 bg-[var(--color-primary)] text-black font-label-sm text-[11px] font-bold uppercase tracking-widest hover:bg-[var(--color-primary-fixed)] transition-colors">
                    Commit Directive
                  </button>
                </div>
              ) : (
                <div className="cursor-pointer group/text z-10 w-full" onClick={() => setIsEditingIdentity(true)}>
                  <h2 className="font-title-md text-[24px] md:text-[36px] text-[var(--color-on-surface)] tracking-tight leading-tight transition-colors group-hover:text-[var(--color-primary)]">
                    {identityStmt}
                  </h2>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-6 text-[var(--color-outline)] flex items-center justify-center gap-2 font-label-sm text-[10px] uppercase tracking-widest font-bold">
                    <span className="material-symbols-outlined text-[14px]">edit</span> Recalibrate Alignment
                  </div>
                </div>
              )}
            </section>

            {/* Radar & Values Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
              
              {/* Interactive Radar Chart */}
              <section className="xl:col-span-5 bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] flex flex-col h-full">
                <div className="p-4 px-6 border-b border-[var(--color-surface-variant)] bg-[var(--color-surface-container-lowest)]">
                  <h3 className="font-label-sm text-[11px] font-bold uppercase tracking-widest text-[var(--color-on-surface)] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">radar</span>
                    Life Balance
                  </h3>
                </div>
                
                <div className="flex-1 flex flex-col items-center justify-center p-8 relative min-h-[350px]">
                  <svg className="w-full max-w-[300px] h-auto" viewBox="0 0 200 200">
                    {/* Background Grid */}
                    {[20, 40, 60].map(_r => (
                      <polygon key={_r} fill="none" points={getRadarPoints(_r, true)} stroke="var(--color-outline-variant)" strokeWidth="1" opacity="0.3" />
                    ))}
                    
                    {/* Axes */}
                    {focusAreas.map((_fa, i) => {
                      const angle = (i * ((Math.PI * 2) / focusAreas.length)) - Math.PI / 2;
                      return <line key={i} x1="100" y1="100" x2={100 + 70 * Math.cos(angle)} y2={100 + 70 * Math.sin(angle)} stroke="var(--color-outline-variant)" strokeWidth="1" opacity="0.3" />
                    })}

                    {/* Target Score Polygon */}
                    {focusAreas.length > 0 && (
                      <polygon fill="none" points={getRadarPoints(70, true)} stroke="var(--color-outline)" strokeWidth="1" strokeDasharray="2 2" opacity="0.6"/>
                    )}

                    {/* Current Score Polygon */}
                    {focusAreas.length > 0 && (
                      <polygon fill="color-mix(in srgb, var(--color-primary) 10%, transparent)" points={getRadarPoints(70, false)} stroke="var(--color-primary)" strokeWidth="2" className="transition-all duration-700"></polygon>
                    )}

                    {/* Interactive Nodes */}
                    {focusAreas.map((fa, i) => {
                      const angle = (i * ((Math.PI * 2) / focusAreas.length)) - Math.PI / 2;
                      const r = (Math.max(fa.current_score, 1) / 10) * 70;
                      const cx = 100 + r * Math.cos(angle);
                      const cy = 100 + r * Math.sin(angle);
                      
                      const labelR = 90;
                      const lx = 100 + labelR * Math.cos(angle);
                      const ly = 100 + labelR * Math.sin(angle);

                      return (
                        <g key={fa.id}>
                          <text x={lx} y={ly} fontSize="7" fill="var(--color-on-surface)" textAnchor="middle" alignmentBaseline="middle" className="pointer-events-none font-bold uppercase tracking-widest font-mono">{fa.name}</text>
                          
                          {[2, 4, 6, 8, 10].map(score => {
                            const clickR = (score / 10) * 70;
                            return (
                              <circle 
                                key={score} 
                                cx={100 + clickR * Math.cos(angle)} 
                                cy={100 + clickR * Math.sin(angle)} 
                                r="8" 
                                fill="transparent" 
                                className="cursor-pointer hover:fill-[var(--color-primary)] hover:opacity-40 transition-colors"
                                onClick={() => handleRadarClick(fa.id, score)}
                              />
                            )
                          })}
                          
                          <circle cx={cx} cy={cy} r="4" fill="var(--color-primary)" className="pointer-events-none transition-all duration-700" />
                        </g>
                      );
                    })}
                  </svg>
                  <p className="font-label-sm text-[9px] text-[var(--color-outline)] font-bold uppercase tracking-widest mt-6">Click axis nodes to recalibrate balance</p>
                </div>
              </section>

              {/* Draggable Core Values */}
              <div className="xl:col-span-7 flex flex-col">
                <div className="flex justify-between items-center px-6 py-4 bg-[var(--color-surface-container-lowest)] border border-[var(--color-outline-variant)] border-b-0">
                  <h3 className="font-label-sm text-[11px] font-bold uppercase tracking-widest text-[var(--color-on-surface)] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">account_balance</span>
                    Core Pillars
                  </h3>
                  <button 
                    onClick={() => isEditingValues ? saveCoreValues() : setIsEditingValues(true)}
                    className="font-label-sm text-[10px] uppercase tracking-widest font-bold text-[var(--color-primary)] border border-[var(--color-primary)]/30 px-3 py-1 hover:bg-[var(--color-primary)] hover:text-black transition-colors"
                  >
                    {isEditingValues ? 'Lock Order' : 'Reorder'}
                  </button>
                </div>
                
                <div className="flex flex-col border border-[var(--color-outline-variant)] border-t-0 bg-[var(--color-surface-container)]">
                  {coreValues.map((cv, idx) => {
                    const colorVar = idx === 0 ? 'var(--color-primary)' : idx === 1 ? 'var(--color-secondary)' : 'var(--color-tertiary)';
                    
                    return (
                      <div 
                        key={cv.id}
                        draggable={isEditingValues}
                        onDragStart={(e) => onDragStart(e, idx)}
                        onDragOver={(e) => { e.preventDefault(); onDragOver(idx); }}
                        onDragEnd={onDragEnd}
                        className={`p-5 flex items-start gap-5 border-t border-[var(--color-surface-variant)] transition-colors duration-150 hover:bg-[var(--color-surface-container-high)] ${isEditingValues ? 'cursor-grab active:cursor-grabbing border-dashed border-[var(--color-primary)]' : ''}`}
                      >
                        {isEditingValues && (
                          <span className="material-symbols-outlined text-[var(--color-outline)] mt-1">drag_indicator</span>
                        )}
                        
                        <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center border" style={{ backgroundColor: `color-mix(in srgb, ${colorVar} 10%, transparent)`, color: colorVar, borderColor: colorVar }}>
                          <span className="material-symbols-outlined">{idx === 0 ? 'fitness_center' : idx === 1 ? 'palette' : 'public'}</span>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-1">
                            <h4 className="font-title-md text-[16px] text-[var(--color-on-surface)]/80 font-semibold">{cv.name}</h4>
                            <span className="font-label-sm text-[10px] font-bold px-2 py-0.5 border" style={{ backgroundColor: `color-mix(in srgb, ${colorVar} 10%, transparent)`, color: colorVar, borderColor: `color-mix(in srgb, ${colorVar} 30%, transparent)` }}>
                              LVL {cv.level}
                            </span>
                          </div>
                          <p className="font-body-md text-[13px] text-[var(--color-on-surface-variant)] leading-relaxed">{cv.description}</p>
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
              <section className="bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] flex flex-col h-full focus-within:border-[var(--color-primary)] transition-colors">
                <div className="p-4 px-6 border-b border-[var(--color-surface-variant)] bg-[var(--color-surface-container-lowest)]">
                  <h3 className="font-label-sm text-[11px] font-bold uppercase tracking-widest text-[var(--color-on-surface)] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">visibility</span>
                    Future Self Projection
                  </h3>
                </div>
                <div className="p-6 flex flex-col flex-1 gap-4">
                  <p className="font-label-sm text-[10px] font-bold text-[var(--color-outline)] uppercase tracking-widest">Write your reality 1 year from now. State it as truth.</p>
                  
                  <textarea
                    value={futureSelf}
                    onChange={(e) => handleFutureSelfChange(e.target.value)}
                    placeholder="It is December 2027. I am..."
                    className="flex-1 w-full bg-transparent text-[var(--color-on-surface)] font-body-md text-[14px] leading-relaxed outline-none resize-none hide-scrollbar placeholder:text-[var(--color-outline)]"
                    style={{ minHeight: '200px' }}
                  />
                </div>
              </section>

              {/* Dynamic Bucket List */}
              <section className="bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] flex flex-col h-full max-h-[500px]">
                <div className="p-4 px-6 border-b border-[var(--color-surface-variant)] bg-[var(--color-surface-container-lowest)]">
                  <h3 className="font-label-sm text-[11px] font-bold uppercase tracking-widest text-[var(--color-on-surface)] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">format_list_bulleted</span>
                    Bucket List
                  </h3>
                </div>
                
                <div className="p-6 flex flex-col flex-1 overflow-hidden">
                  <form onSubmit={handleAddBucket} className="flex gap-2 mb-6 shrink-0 border border-[var(--color-surface-variant)] p-2 bg-[var(--color-surface-container-lowest)]">
                    <select 
                      value={newBucketCategory} 
                      onChange={(e) => setNewBucketCategory(e.target.value)}
                      className="bg-transparent text-[var(--color-on-surface)] font-label-sm text-[10px] font-bold uppercase tracking-widest border-r border-[var(--color-surface-variant)] px-2 outline-none"
                    >
                      {BUCKET_CATEGORIES.map(cat => <option key={cat} value={cat} className="bg-[var(--color-surface-container)]">{cat}</option>)}
                    </select>
                    <input 
                      type="text" 
                      value={newBucketTitle}
                      onChange={(e) => setNewBucketTitle(e.target.value)}
                      placeholder="Add objective..." 
                      className="flex-1 bg-transparent text-[var(--color-on-surface)] px-2 font-body-md text-[13px] outline-none"
                    />
                    <button type="submit" className="bg-[var(--color-primary)] text-black px-4 py-1.5 font-label-sm text-[10px] font-bold uppercase tracking-widest hover:bg-[var(--color-primary-fixed)] transition-colors">
                      Add
                    </button>
                  </form>

                  <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col border border-[var(--color-outline-variant)]">
                    {bucketList.map(item => (
                      <div key={item.id} className={`group flex items-center gap-4 p-4 border-b border-[var(--color-surface-variant)] last:border-b-0 transition-colors ${item.is_completed ? 'bg-[var(--color-surface-container-lowest)] opacity-60' : 'bg-[var(--color-surface-container)] hover:bg-[var(--color-surface-container-high)]'}`}>
                        
                        <button 
                          onClick={() => handleToggleBucket(item.id)}
                          className={`w-5 h-5 flex shrink-0 items-center justify-center transition-colors border ${item.is_completed ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-black' : 'border-[var(--color-outline-variant)] text-transparent hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]'}`}
                        >
                          <span className="material-symbols-outlined text-[14px]">check</span>
                        </button>
                        
                        <div className="flex-1 min-w-0">
                          <p className={`font-body-md text-[14px] font-semibold truncate ${item.is_completed ? 'text-[var(--color-outline)] line-through' : 'text-[var(--color-on-surface)]/80'}`}>
                            {item.title}
                          </p>
                          <span className="font-label-sm text-[9px] font-bold uppercase tracking-wider text-[var(--color-secondary)] inline-block mt-1 border border-[var(--color-secondary)]/30 px-1.5 py-0.5 bg-[var(--color-secondary)]/10">
                            {item.category}
                          </span>
                        </div>

                        <button 
                          onClick={() => handleDeleteBucket(item.id)}
                          className="w-8 h-8 flex shrink-0 items-center justify-center text-[var(--color-outline)] hover:text-[var(--color-error)] opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--color-error)]/10 border border-transparent hover:border-[var(--color-error)]/30"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
                    ))}
                    {bucketList.length === 0 && (
                      <div className="p-8 text-center text-[var(--color-outline)] font-label-sm text-[10px] font-bold uppercase tracking-widest">
                        NO OBJECTIVES LOGGED.
                      </div>
                    )}
                  </div>
                </div>
              </section>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
