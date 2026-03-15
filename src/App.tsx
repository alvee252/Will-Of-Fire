import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Download, 
  Upload, 
  Folder,
  Bookmark,
  CheckCircle2,
  Search,
  ChevronLeft,
  Menu,
  GripVertical,
  Circle,
  X,
  Check,
  Layout,
  MoreHorizontal,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Utility for Tailwind class merging */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---

interface Subtopic {
  id: string;
  text: string;
  checked: boolean;
}

interface Topic {
  id: string;
  text: string;
  checked: boolean;
  expanded: boolean;
  subtopics: Subtopic[];
}

interface Project {
  id: string;
  name: string;
  topics: Topic[];
}

// --- Sortable Item Component ---

interface SortableItemProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  key?: string | number;
}

function SortableItem({ id, children, className, disabled }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={cn("relative group", className)}>
      <div 
        {...attributes} 
        {...listeners} 
        className="absolute -left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing p-1 text-slate-300 hover:text-slate-500 transition-opacity z-10"
      >
        <GripVertical size={14} />
      </div>
      {children}
    </div>
  );
}

// --- App Component ---

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileView, setMobileView] = useState<'projects' | 'topics' | 'subtopics'>('projects');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const subtopicInputRef = useRef<HTMLInputElement>(null);

  // Derived state
  const activeProject = useMemo(() => projects.find(p => p.id === activeProjectId), [projects, activeProjectId]);
  const activeTopic = useMemo(() => activeProject?.topics.find(t => t.id === activeTopicId), [activeProject, activeTopicId]);

  const filteredProjects = useMemo(() => {
    if (!searchQuery) return projects;
    return projects.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.topics.some(t => t.text.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [projects, searchQuery]);

  // Sensors for DnD
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('will-of-fire-v4-data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setProjects(parsed);
        if (parsed.length > 0) setActiveProjectId(parsed[0].id);
      } catch (e) {
        console.error('Failed to parse saved data', e);
      }
    } else {
      const initialProject: Project = {
        id: 'p1',
        name: 'Getting Started',
        topics: [
          {
            id: 't1',
            text: 'Welcome to Will Of Fire',
            checked: false,
            expanded: true,
            subtopics: [
              { id: 's1', text: 'Create your first project', checked: false },
              { id: 's2', text: 'Add topics and tasks', checked: false },
            ]
          }
        ]
      };
      setProjects([initialProject]);
      setActiveProjectId(initialProject.id);
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    if (projects.length > 0) {
      localStorage.setItem('will-of-fire-v4-data', JSON.stringify(projects));
    }
  }, [projects]);

  // --- Handlers ---

  const addProject = () => {
    const newProject: Project = {
      id: crypto.randomUUID(),
      name: 'New Project',
      topics: []
    };
    setProjects([...projects, newProject]);
    setActiveProjectId(newProject.id);
    startEditing(newProject.id, newProject.name);
    if (window.innerWidth < 768) setMobileView('topics');
  };

  const addTopic = () => {
    if (!activeProjectId) return;
    const newTopic: Topic = {
      id: crypto.randomUUID(),
      text: 'New Topic',
      checked: false,
      expanded: true,
      subtopics: []
    };
    setProjects(projects.map(p => p.id === activeProjectId ? { ...p, topics: [...p.topics, newTopic] } : p));
    setActiveTopicId(newTopic.id);
    startEditing(newTopic.id, newTopic.text);
  };

  const addSubtopic = (text: string) => {
    if (!activeProjectId || !activeTopicId || !text.trim()) return;
    const newSub: Subtopic = { id: crypto.randomUUID(), text: text.trim(), checked: false };
    setProjects(projects.map(p => {
      if (p.id === activeProjectId) {
        return {
          ...p,
          topics: p.topics.map(t => t.id === activeTopicId ? { ...t, subtopics: [...t.subtopics, newSub] } : t)
        };
      }
      return p;
    }));
  };

  const deleteProject = (id: string) => {
    const newProjects = projects.filter(p => p.id !== id);
    setProjects(newProjects);
    if (activeProjectId === id) {
      setActiveProjectId(newProjects[0]?.id || null);
      setActiveTopicId(null);
    }
  };

  const deleteTopic = (id: string) => {
    setProjects(projects.map(p => p.id === activeProjectId ? { ...p, topics: p.topics.filter(t => t.id !== id) } : p));
    if (activeTopicId === id) setActiveTopicId(null);
  };

  const deleteSubtopic = (id: string) => {
    setProjects(projects.map(p => {
      if (p.id === activeProjectId) {
        return {
          ...p,
          topics: p.topics.map(t => t.id === activeTopicId ? { ...t, subtopics: t.subtopics.filter(s => s.id !== id) } : t)
        };
      }
      return p;
    }));
  };

  const toggleSubtopicChecked = (id: string) => {
    setProjects(projects.map(p => {
      if (p.id === activeProjectId) {
        return {
          ...p,
          topics: p.topics.map(t => {
            if (t.id === activeTopicId) {
              return { ...t, subtopics: t.subtopics.map(s => s.id === id ? { ...s, checked: !s.checked } : s) };
            }
            return t;
          })
        };
      }
      return p;
    }));
  };

  const startEditing = (id: string, text: string) => {
    setEditingId(id);
    setEditText(text);
  };

  const saveEdit = () => {
    if (!editingId) return;
    setProjects(projects.map(p => {
      if (p.id === editingId) return { ...p, name: editText };
      return {
        ...p,
        topics: p.topics.map(t => {
          if (t.id === editingId) return { ...t, text: editText };
          return {
            ...t,
            subtopics: p.topics.some(tp => tp.id === activeTopicId) 
              ? t.subtopics.map(s => s.id === editingId ? { ...s, text: editText } : s)
              : t.subtopics
          };
        })
      };
    }));
    setEditingId(null);
  };

  const handleDragEnd = (event: DragEndEvent, type: 'project' | 'topic') => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      if (type === 'project') {
        setProjects((items) => {
          const oldIndex = items.findIndex((i) => i.id === active.id);
          const newIndex = items.findIndex((i) => i.id === over.id);
          return arrayMove(items, oldIndex, newIndex);
        });
      } else if (activeProjectId) {
        setProjects(prev => prev.map(p => {
          if (p.id === activeProjectId) {
            const oldIndex = p.topics.findIndex((i) => i.id === active.id);
            const newIndex = p.topics.findIndex((i) => i.id === over.id);
            return { ...p, topics: arrayMove(p.topics, oldIndex, newIndex) };
          }
          return p;
        }));
      }
    }
  };

  const exportData = () => {
    const dataStr = JSON.stringify(projects, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', 'will_of_fire_v4.json');
    link.click();
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string);
        setProjects(json);
        if (json.length > 0) setActiveProjectId(json[0].id);
      } catch (err) { alert('Invalid JSON'); }
    };
    reader.readAsText(file);
  };

  // --- Sub-components ---

  const ProgressBar = ({ topic }: { topic: Topic }) => {
    const total = topic.subtopics.length;
    const completed = topic.subtopics.filter(s => s.checked).length;
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
    return (
      <div className="mt-3 space-y-1.5">
        <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
          <span>Progress</span>
          <span>{percentage}%</span>
        </div>
        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            className="h-full bg-primary-accent"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden font-sans">
      {/* Sidebar - Projects */}
      <aside className={cn(
        "bg-sidebar border-r border-border flex flex-col transition-all duration-300 z-30",
        isSidebarOpen ? "w-72" : "w-0 -translate-x-full md:w-16 md:translate-x-0",
        "fixed md:relative h-full",
        mobileView !== 'projects' && "hidden md:flex"
      )}>
        <div className="p-6 flex items-center justify-between">
          {isSidebarOpen && (
            <h1 className="text-xl font-black tracking-tight flex items-center gap-2 text-slate-900">
              <div className="w-8 h-8 bg-primary-accent rounded-lg flex items-center justify-center text-white">
                <Folder size={18} fill="currentColor" />
              </div>
              Will Of Fire
            </h1>
          )}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 transition-colors">
            {isSidebarOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 space-y-1 no-scrollbar">
          {isSidebarOpen && (
            <div className="px-3 mb-4">
              <button onClick={addProject} className="w-full flex items-center gap-2 px-4 py-2.5 bg-primary-accent hover:bg-primary-accent/90 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-primary-accent/20 active:scale-[0.98]">
                <Plus size={18} /> New Project
              </button>
            </div>
          )}

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, 'project')}>
            <SortableContext items={projects.map(p => p.id)} strategy={verticalListSortingStrategy}>
              {filteredProjects.map((project) => (
                <SortableItem key={project.id} id={project.id} disabled={!isSidebarOpen}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => { setActiveProjectId(project.id); if (window.innerWidth < 768) setMobileView('topics'); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setActiveProjectId(project.id); if (window.innerWidth < 768) setMobileView('topics'); } }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all group/item cursor-pointer outline-none",
                      activeProjectId === project.id ? "bg-primary-accent/10 text-primary-accent" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    <Folder size={18} className={activeProjectId === project.id ? "text-primary-accent" : "text-slate-400"} />
                    {isSidebarOpen && (
                      <span className="flex-1 text-left truncate">
                        {editingId === project.id ? (
                          <input autoFocus className="bg-transparent border-none outline-none w-full" value={editText} onChange={(e) => setEditText(e.target.value)} onBlur={saveEdit} onKeyDown={(e) => e.key === 'Enter' && saveEdit()} onClick={(e) => e.stopPropagation()} />
                        ) : project.name}
                      </span>
                    )}
                    {isSidebarOpen && (
                      <div className="opacity-0 group-hover/item:opacity-100 flex items-center gap-1">
                        <button onClick={(e) => { e.stopPropagation(); startEditing(project.id, project.name); }} className="p-1 hover:text-slate-900"><Edit2 size={14} /></button>
                        <button onClick={(e) => { e.stopPropagation(); deleteProject(project.id); }} className="p-1 hover:text-red-500"><Trash2 size={14} /></button>
                      </div>
                    )}
                  </div>
                </SortableItem>
              ))}
            </SortableContext>
          </DndContext>
        </div>

        {isSidebarOpen && (
          <div className="p-4 border-t border-border space-y-1">
            <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all"><Upload size={16} /> IMPORT</button>
            <button onClick={exportData} className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all"><Download size={16} /> EXPORT</button>
            <input type="file" ref={fileInputRef} onChange={importData} className="hidden" accept=".json" />
          </div>
        )}
      </aside>

      {/* Main Workspace - Topics */}
      <main className={cn("flex-1 flex flex-col min-w-0 bg-background transition-all duration-300", mobileView !== 'topics' && "hidden md:flex")}>
        <header className="h-20 border-b border-border flex items-center justify-between px-8 bg-white/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-4 flex-1">
            <button onClick={() => setMobileView('projects')} className="md:hidden p-2 hover:bg-slate-100 rounded-lg text-slate-400"><ChevronLeft size={20} /></button>
            <div className="relative max-w-md w-full group">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-accent transition-colors" />
              <input type="text" placeholder="Search projects or topics..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-slate-100/50 border-none rounded-2xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary-accent/20 focus:bg-white transition-all" />
            </div>
          </div>
          <div className="flex items-center gap-3 ml-4">
            <button onClick={addTopic} disabled={!activeProjectId} className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-sm font-bold transition-all disabled:opacity-30 shadow-lg shadow-slate-900/10"><Plus size={18} /> Add Topic</button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 no-scrollbar">
          {!activeProjectId ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40"><div className="w-24 h-24 bg-slate-100 rounded-[2.5rem] flex items-center justify-center text-slate-400"><Layout size={48} /></div><h3 className="text-xl font-bold text-slate-900">Select a Project</h3></div>
          ) : activeProject?.topics.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40"><div className="w-24 h-24 bg-slate-100 rounded-[2.5rem] flex items-center justify-center text-slate-400"><Plus size={48} /></div><h3 className="text-xl font-bold text-slate-900">No Topics Yet</h3></div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, 'topic')}>
                <SortableContext items={activeProject?.topics.map(t => t.id) || []} strategy={verticalListSortingStrategy}>
                  {activeProject?.topics.map((topic) => (
                    <SortableItem key={topic.id} id={topic.id}>
                      <motion.div layout onClick={() => { setActiveTopicId(topic.id); if (window.innerWidth < 768) setMobileView('subtopics'); }} className={cn("p-6 rounded-[2rem] bg-white border border-border transition-all cursor-pointer card-shadow card-shadow-hover group/card", activeTopicId === topic.id && "ring-2 ring-primary-accent ring-offset-4")}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="w-12 h-12 bg-secondary-accent/10 rounded-2xl flex items-center justify-center text-secondary-accent mb-4 group-hover/card:scale-110 transition-transform"><Bookmark size={24} fill="currentColor" /></div>
                          <div className="flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                            <button onClick={(e) => { e.stopPropagation(); startEditing(topic.id, topic.text); }} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-900"><Edit2 size={14} /></button>
                            <button onClick={(e) => { e.stopPropagation(); deleteTopic(topic.id); }} className="p-2 hover:bg-red-50 rounded-xl text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
                          </div>
                        </div>
                        <div className="space-y-1">
                          {editingId === topic.id ? (
                            <input autoFocus className="bg-transparent border-none outline-none w-full text-lg font-black text-slate-900" value={editText} onChange={(e) => setEditText(e.target.value)} onBlur={saveEdit} onKeyDown={(e) => e.key === 'Enter' && saveEdit()} onClick={(e) => e.stopPropagation()} />
                          ) : (
                            <h3 className="text-lg font-black text-slate-900 truncate leading-tight">{topic.text}</h3>
                          )}
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{topic.subtopics.length} Tasks</p>
                        </div>
                        <ProgressBar topic={topic} />
                      </motion.div>
                    </SortableItem>
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          )}
        </div>
      </main>

      {/* Right Panel - Subtopics */}
      <aside className={cn("bg-sidebar border-l border-border flex flex-col transition-all duration-300 z-40 w-full md:w-80 lg:w-96 fixed md:relative h-full", mobileView !== 'subtopics' && "hidden md:flex")}>
        <header className="h-20 border-b border-border flex items-center justify-between px-8 bg-white/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button onClick={() => setMobileView('topics')} className="md:hidden p-2 hover:bg-slate-100 rounded-lg text-slate-400"><ChevronLeft size={20} /></button>
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Checklist</h2>
          </div>
          {activeTopic && <button onClick={() => subtopicInputRef.current?.focus()} className="p-2 hover:bg-slate-50 rounded-xl text-primary-accent transition-colors"><Plus size={20} /></button>}
        </header>

        <div className="flex-1 overflow-y-auto p-8 no-scrollbar">
          {!activeTopic ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-30"><div className="w-20 h-20 bg-slate-100 rounded-[2rem] flex items-center justify-center text-slate-400"><CheckCircle2 size={32} /></div><p className="text-sm font-bold text-slate-500">Select a topic to view tasks</p></div>
          ) : (
            <div className="space-y-8">
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-900 leading-tight">{activeTopic.text}</h3>
                <div className="flex items-center gap-2 text-xs font-bold text-success uppercase tracking-wider"><CheckCircle2 size={14} /> {activeTopic.subtopics.filter(s => s.checked).length} of {activeTopic.subtopics.length} Done</div>
              </div>

              <div className="space-y-3">
                <AnimatePresence initial={false}>
                  {activeTopic.subtopics.map((sub) => (
                    <motion.div key={sub.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, x: -20 }} className="group/sub flex items-center gap-4 p-4 rounded-2xl bg-slate-50/50 border border-transparent hover:border-border hover:bg-white transition-all">
                      <button onClick={() => toggleSubtopicChecked(sub.id)} className={cn("transition-all", sub.checked ? "text-success scale-110" : "text-slate-300 hover:text-slate-400")}>
                        {sub.checked ? <CheckCircle2 size={22} fill="currentColor" className="text-white bg-success rounded-full" /> : <Circle size={22} />}
                      </button>
                      <div className="flex-1 min-w-0">
                        {editingId === sub.id ? (
                          <input autoFocus className="bg-transparent border-none outline-none w-full text-sm font-semibold text-slate-900" value={editText} onChange={(e) => setEditText(e.target.value)} onBlur={saveEdit} onKeyDown={(e) => e.key === 'Enter' && saveEdit()} />
                        ) : (
                          <span className={cn("text-sm font-semibold transition-all truncate block", sub.checked ? "text-slate-400 line-through" : "text-slate-700")}>{sub.text}</span>
                        )}
                      </div>
                      <div className="opacity-0 group-hover/sub:opacity-100 flex items-center gap-1">
                        <button onClick={() => startEditing(sub.id, sub.text)} className="p-1.5 text-slate-400 hover:text-slate-900"><Edit2 size={14} /></button>
                        <button onClick={() => deleteSubtopic(sub.id)} className="p-1.5 text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                <div className="pt-4">
                  <div className="relative group">
                    <Plus size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-accent transition-colors" />
                    <input ref={subtopicInputRef} type="text" placeholder="Add a task..." className="w-full bg-slate-100/50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-primary-accent/20 focus:bg-white transition-all" onKeyDown={(e) => { if (e.key === 'Enter') { addSubtopic(e.currentTarget.value); e.currentTarget.value = ''; } }} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
