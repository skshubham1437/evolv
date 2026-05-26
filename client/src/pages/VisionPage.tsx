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
        fetchVision(),
        fetchFocusAreas(),
        fetchBucketList()
      ]);

      setVision(vData);
      setFocusAreas(faData);
      setBucketList(blData);

      const statements = JSON.parse(vData.identity_statements || '[]');
      setIdentityStmt(statements.length > 0 ? statements[0] : '"I am a healthy, focused builder."');

      const values = JSON.parse(vData.core_values || '[]');
      if (values.length > 0) {
        // Ensure they have string IDs for D&D tracking
        setCoreValues(values.map((v: any, i: number) => ({ ...v, id: v.id || `cv-${i}` })));
      } else {
        setCoreValues([
          { id: 'cv-0', name: 'Discipline', description: 'Unwavering consistency in physical and mental conditioning.', level: 8 },
          { id: 'cv-1', name: 'Creativity', description: 'Designing elegant solutions and exploring generative frontiers.', level: 6 },
          { id: 'cv-2', name: 'Impact', description: 'Building scalable systems that elevate collective potential.', level: 7 }
        ]);
      }

      setFutureSelf(vData.future_self_text || '');
      
      // Vision images handling placeholder
      // Images state was removed due to being unused in current view
      // if (imgs.length > 0) setImages(imgs);

    } catch (e) {
      console.error("Failed to load vision data", e);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Handlers: Identity ---
  const saveIdentity = async () => {
    setIsEditingIdentity(false);
    if (!vision) return;
    await updateVision({ identity_statements: JSON.stringify([identityStmt]) });
  };

  // --- Handlers: Future Self ---
  const handleFutureSelfChange = (val: string) => {
    setFutureSelf(val);
    if (futureSelfTimer.current) window.clearTimeout(futureSelfTimer.current);
    futureSelfTimer.current = window.setTimeout(() => {
      updateVision({ future_self_text: val });
    }, 1000);
  };

  // --- Handlers: Focus Areas (Radar) ---
  const handleRadarClick = async (areaId: number, score: number) => {
    // Optimistic UI update
    setFocusAreas(prev => prev.map(fa => fa.id === areaId ? { ...fa, current_score: score } : fa));
    await updateFocusArea(areaId, { current_score: score });
  };

  // --- Handlers: Bucket List ---
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

  // --- Handlers: Core Values D&D ---
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

  // --- Render Helpers ---

  // Generate SVG Polygon points based on values
  const getRadarPoints = (radius: number = 70, useTarget: boolean = false) => {
    if (!focusAreas.length) return "";
    const cx = 100, cy = 100;
    const angleStep = (Math.PI * 2) / focusAreas.length;
    
    return focusAreas.map((fa, i) => {
      const value = useTarget ? fa.target_score : fa.current_score;
      // scale value 1-10 to the radius
      const r = (Math.max(value, 1) / 10) * radius;
      // -Math.PI/2 to start from top
      const angle = (i * angleStep) - Math.PI / 2;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      return `${x},${y}`;
    }).join(" ");
  };

  if (isLoading) return <div className="p-8 text-[var(--color-outline)]">Loading Vision Sequence...</div>;

  return (
    <div className="flex-1 overflow-y-auto pb-32 md:pb-12 hide-scrollbar page-enter relative">
      <div className="absolute top-[15%] left-[10%] w-96 h-96 bg-[var(--color-primary)]/10 rounded-full blur-[140px] pointer-events-none -z-10 animate-pulse"></div>
      <div className="absolute bottom-[30%] right-[15%] w-[600px] h-[600px] bg-[var(--color-secondary)]/5 rounded-full blur-[160px] pointer-events-none -z-10"></div>
      
      <div className="px-[var(--spacing-margin-mobile)] md:px-[var(--spacing-margin-desktop)] py-8 max-w-[var(--spacing-container-max)] mx-auto w-full space-y-[var(--spacing-gutter)] relative z-10">
        
        {/* Identity Statement */}
        <section className="bg-[var(--color-surface-container-low)]/60 backdrop-blur-[30px] rounded-3xl p-10 md:p-16 relative overflow-hidden flex flex-col items-center justify-center text-center border border-[var(--color-outline-variant)]/20 shadow-xl group transition-all duration-700 hover:border-[var(--color-primary)]/20">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)]/10 via-transparent to-[var(--color-secondary)]/5 opacity-50"></div>
          <span className="material-symbols-outlined text-5xl text-[var(--color-primary)] mb-8 relative z-10 text-glow-primary animate-pulse" style={{ fontVariationSettings: "'FILL' 1" }}>electric_bolt</span>
          
          {isEditingIdentity ? (
            <div className="relative z-10 w-full max-w-2xl flex flex-col items-center gap-6">
              <input 
                value={identityStmt}
                onChange={(e) => setIdentityStmt(e.target.value)}
                autoFocus
                className="w-full bg-transparent border-b-2 border-[var(--color-primary)] text-center font-headline-lg text-[32px] md:text-[48px] text-[var(--color-on-surface)] focus:outline-none pb-4 tracking-tight"
              />
              <button onClick={saveIdentity} className="px-10 py-4 bg-[var(--color-primary)] text-black font-bold rounded-2xl hover:scale-105 transition-all shadow-[0_10px_30px_rgba(210,187,255,0.4)] uppercase tracking-widest text-sm">
                Commit Directive
              </button>
            </div>
          ) : (
            <div className="relative z-10 cursor-pointer group/text" onClick={() => setIsEditingIdentity(true)}>
              <h2 className="font-display-lg text-[36px] md:text-[56px] text-[var(--color-on-surface)] font-light tracking-tight leading-tight transition-all duration-700 group-hover:text-glow-primary">
                {identityStmt}
              </h2>
              <div className="opacity-0 group-hover:opacity-60 transition-all mt-8 text-[var(--color-outline)] flex items-center justify-center gap-2 font-label-sm text-[11px] uppercase tracking-[0.3em] font-bold">
                <span className="material-symbols-outlined text-[18px]">edit</span> recalibrate alignment
              </div>
            </div>
          )}
        </section>

        {/* Radar & Values Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-[var(--spacing-gutter)]">
          
          {/* Interactive Radar Chart */}
          <section className="lg:col-span-5 bg-[var(--color-surface-container-low)]/60 backdrop-blur-[20px] border border-[var(--color-outline-variant)]/10 rounded-2xl p-6 flex flex-col h-full hover:border-[var(--color-secondary)]/30 transition-colors duration-500">
            <h3 className="font-title-md text-title-md text-[var(--color-on-surface)] mb-6">Life Balance</h3>
            <div className="flex-1 flex items-center justify-center relative min-h-[300px]">
              <svg className="w-full max-w-[300px] h-auto drop-shadow-[0_0_15px_rgba(90,218,206,0.3)]" viewBox="0 0 200 200">
                {/* Background Grid (Octagon or Hexagon depending on FocusAreas length) */}
                {[20, 40, 60].map(_r => (
                  <polygon key={_r} fill="none" points={getRadarPoints(_r, true)} stroke="rgba(149, 142, 157, 0.15)" strokeWidth="1" />
                ))}
                
                {/* Axes */}
                {focusAreas.map((_fa, i) => {
                  const angle = (i * ((Math.PI * 2) / focusAreas.length)) - Math.PI / 2;
                  return <line key={i} x1="100" y1="100" x2={100 + 70 * Math.cos(angle)} y2={100 + 70 * Math.sin(angle)} stroke="rgba(149, 142, 157, 0.2)" strokeWidth="1" />
                })}

                {/* Target Score Polygon */}
                {focusAreas.length > 0 && (
                  <polygon fill="none" points={getRadarPoints(70, true)} stroke="var(--color-outline-variant)" strokeWidth="1" strokeDasharray="4 4" opacity="0.5"/>
                )}

                {/* Current Score Polygon */}
                {focusAreas.length > 0 && (
                  <polygon fill="rgba(210, 187, 255, 0.2)" points={getRadarPoints(70, false)} stroke="var(--color-primary)" strokeWidth="2" className="transition-all duration-700"></polygon>
                )}

                {/* Interactive Nodes */}
                {focusAreas.map((fa, i) => {
                  const angle = (i * ((Math.PI * 2) / focusAreas.length)) - Math.PI / 2;
                  const r = (Math.max(fa.current_score, 1) / 10) * 70;
                  const cx = 100 + r * Math.cos(angle);
                  const cy = 100 + r * Math.sin(angle);
                  
                  // Label Position
                  const labelR = 90;
                  const lx = 100 + labelR * Math.cos(angle);
                  const ly = 100 + labelR * Math.sin(angle);

                  return (
                    <g key={fa.id}>
                      <text x={lx} y={ly} fontSize="7" fill="var(--color-on-surface-variant)" textAnchor="middle" alignmentBaseline="middle" className="pointer-events-none font-bold uppercase tracking-widest">{fa.name}</text>
                      
                      {/* Invisible clickable axis area for updating score */}
                      {[2, 4, 6, 8, 10].map(score => {
                        const clickR = (score / 10) * 70;
                        return (
                          <circle 
                            key={score} 
                            cx={100 + clickR * Math.cos(angle)} 
                            cy={100 + clickR * Math.sin(angle)} 
                            r="8" 
                            fill="transparent" 
                            className="cursor-pointer hover:fill-[var(--color-primary)] hover:opacity-50 transition-colors"
                            onClick={() => handleRadarClick(fa.id, score)}
                          />
                        )
                      })}
                      
                      {/* The visible point */}
                      <circle cx={cx} cy={cy} r="4" fill="var(--color-secondary)" className="pointer-events-none transition-all duration-700" />
                    </g>
                  );
                })}
              </svg>
            </div>
            <p className="font-label-sm text-label-sm text-center text-[var(--color-outline)] mt-4">Click axis nodes to recalibrate balance</p>
          </section>

          {/* Draggable Core Values */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="flex justify-between items-center px-2">
              <h3 className="font-title-md text-title-md text-[var(--color-on-surface)]">Core Pillars</h3>
              <button 
                onClick={() => isEditingValues ? saveCoreValues() : setIsEditingValues(true)}
                className="text-[var(--color-primary)] font-label-sm text-label-sm uppercase tracking-wider hover:bg-[var(--color-primary)]/10 px-3 py-1 rounded"
              >
                {isEditingValues ? 'Save Order' : 'Reorder'}
              </button>
            </div>
            
            <div className="flex flex-col gap-3">
              {coreValues.map((cv, idx) => {
                const colorVar = idx === 0 ? 'var(--color-primary)' : idx === 1 ? 'var(--color-secondary)' : 'var(--color-tertiary)';
                
                return (
                  <div 
                    key={cv.id}
                    draggable={isEditingValues}
                    onDragStart={(e) => onDragStart(e, idx)}
                    onDragOver={(e) => { e.preventDefault(); onDragOver(idx); }}
                    onDragEnd={onDragEnd}
                    className={`bg-[var(--color-surface-container-low)]/80 backdrop-blur-[20px] border border-[var(--color-outline-variant)]/10 rounded-xl p-4 flex items-center gap-4 transition-all duration-300 ${isEditingValues ? 'cursor-grab active:cursor-grabbing hover:border-[var(--color-primary)]/50 border-dashed' : 'card-hover'}`}
                  >
                    {isEditingValues && (
                      <span className="material-symbols-outlined text-[var(--color-outline)]">drag_indicator</span>
                    )}
                    
                    <div className="w-10 h-10 flex-shrink-0 rounded-lg flex items-center justify-center border" style={{ backgroundColor: `color-mix(in srgb, ${colorVar} 10%, transparent)`, color: colorVar, borderColor: `color-mix(in srgb, ${colorVar} 20%, transparent)` }}>
                      <span className="material-symbols-outlined">{idx === 0 ? 'fitness_center' : idx === 1 ? 'palette' : 'public'}</span>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <h4 className="font-title-md text-title-md text-[var(--color-on-surface)]">{cv.name}</h4>
                        <span className="font-label-sm text-label-sm px-2 py-0.5 rounded" style={{ backgroundColor: `color-mix(in srgb, ${colorVar} 10%, transparent)`, color: colorVar }}>LVL {cv.level}</span>
                      </div>
                      <p className="font-body-md text-body-md text-[var(--color-on-surface-variant)] text-sm">{cv.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Future Self & Bucket List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--spacing-gutter)] mt-4">
          
          {/* Future Self Free-write */}
          <section className="bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)]/10 rounded-2xl p-6 flex flex-col h-full focus-within:border-[var(--color-primary)]/50 transition-colors">
            <h3 className="font-title-md text-title-md text-[var(--color-on-surface)] mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-[var(--color-primary)]">auto_awesome</span> 
              Future Self Projection
            </h3>
            <p className="font-body-md text-sm text-[var(--color-on-surface-variant)] mb-4">Write your reality 1 year from now. State it as truth.</p>
            
            <textarea
              value={futureSelf}
              onChange={(e) => handleFutureSelfChange(e.target.value)}
              placeholder="It is December 2027. I am..."
              className="flex-1 bg-transparent text-[var(--color-on-surface)] font-body-md leading-relaxed outline-none resize-none hide-scrollbar placeholder:text-[var(--color-outline)]"
            />
          </section>

          {/* Dynamic Bucket List */}
          <section className="bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)]/10 rounded-2xl p-6 flex flex-col h-full max-h-[500px]">
             <h3 className="font-title-md text-title-md text-[var(--color-on-surface)] mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[var(--color-secondary)]">format_list_bulleted</span> 
              Bucket List
            </h3>
            
            <form onSubmit={handleAddBucket} className="flex gap-2 mb-6">
              <select 
                value={newBucketCategory} 
                onChange={(e) => setNewBucketCategory(e.target.value)}
                className="bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] rounded-lg px-2 py-2 font-label-sm border border-[var(--color-outline-variant)]/20 outline-none"
              >
                {BUCKET_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
              <input 
                type="text" 
                value={newBucketTitle}
                onChange={(e) => setNewBucketTitle(e.target.value)}
                placeholder="Add new objective..." 
                className="flex-1 bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] rounded-lg px-4 py-2 font-body-md border border-[var(--color-outline-variant)]/20 focus:border-[var(--color-secondary)] outline-none"
              />
              <button type="submit" className="bg-[var(--color-secondary)] text-[var(--color-background)] rounded-lg px-4 flex items-center justify-center hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[20px]">add</span>
              </button>
            </form>

            <div className="flex-1 overflow-y-auto hide-scrollbar flex flex-col gap-2">
              {bucketList.map(item => (
                <div key={item.id} className={`group flex items-center gap-3 p-3 rounded-lg border transition-all ${item.is_completed ? 'bg-[var(--color-surface-container)]/30 border-transparent opacity-60' : 'bg-[var(--color-surface-container-high)] border-[var(--color-outline-variant)]/20 hover:border-[var(--color-secondary)]/40'}`}>
                  
                  <div 
                    onClick={() => handleToggleBucket(item.id)}
                    className={`w-5 h-5 rounded-md flex items-center justify-center cursor-pointer transition-all ${item.is_completed ? 'bg-[var(--color-secondary)] text-[var(--color-background)]' : 'border-2 border-[var(--color-outline)] hover:border-[var(--color-secondary)]'}`}
                  >
                    {item.is_completed && <span className="material-symbols-outlined text-[14px] font-bold">check</span>}
                  </div>
                  
                  <div className="flex-1">
                    <p className={`font-body-md text-sm ${item.is_completed ? 'text-[var(--color-outline)] line-through' : 'text-[var(--color-on-surface)]'}`}>
                      {item.title}
                    </p>
                    <span className="font-label-sm text-[10px] uppercase tracking-wider text-[var(--color-secondary)]">{item.category}</span>
                  </div>

                  <button 
                    onClick={() => handleDeleteBucket(item.id)}
                    className="text-[var(--color-outline)] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              ))}
              {bucketList.length === 0 && (
                <p className="text-[var(--color-outline)] font-body-md text-center mt-10">No objectives logged. Add one above.</p>
              )}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
