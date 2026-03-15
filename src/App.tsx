import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  Plus, 
  Trash2, 
  Edit2, 
  Download, 
  Upload, 
  Check,
  X,
  FolderTree,
  GripVertical,
  Layout,
  Settings,
  Menu,
  ChevronLeft,
  Circle,
  CheckCircle2,
  MoreVertical
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
  DragStartEvent,
  defaultDropAnimationSideEffects
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
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={cn("relative group", className)}>
      <div {...attributes} {...listeners} className="absolute left-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing p-1 text-gray-500 hover:text-gray-300 transition-opacity z-10">
        <GripVertical size={16} />
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
  const [mobileView, setMobileView] = useState<'projects' | 'topics' | 'subtopics'>('projects');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const subtopicInputRef = useRef<HTMLInputElement>(null);

  // Derived state
  const activeProject = useMemo(() => projects.find(p => p.id === activeProjectId), [projects, activeProjectId]);
  const activeTopic = useMemo(() => activeProject?.topics.find(t => t.id === activeTopicId), [activeProject, activeTopicId]);

  // Sensors for DnD
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('will-of-fire-v3-data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setProjects(parsed);
        if (parsed.length > 0) {
          setActiveProjectId(parsed[0].id);
        }
      } catch (e) {
        console.error('Failed to parse saved data', e);
      }
    } else {
      // Initial state
      const initialProject: Project = {
        id: 'welcome-project',
        name: 'Welcome Project',
        topics: [
          {
            id: 'welcome-topic',
            text: 'Getting Started',
            checked: false,
            expanded: true,
            subtopics: [
              { id: 'sub-1', text: 'Create your first project', checked: false },
              { id: 'sub-2', text: 'Add topics and subtopics', checked: false },
              { id: 'sub-3', text: 'Drag and drop to reorder', checked: false },
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
      localStorage.setItem('will-of-fire-v3-data', JSON.stringify(projects));
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
    setProjects(projects.map(p => {
      if (p.id === activeProjectId) {
        return { ...p, topics: [...p.topics, newTopic] };
      }
      return p;
    }));
    setActiveTopicId(newTopic.id);
    startEditing(newTopic.id, newTopic.text);
  };

  const addSubtopic = (text: string) => {
    if (!activeProjectId || !activeTopicId || !text.trim()) return;
    const newSub: Subtopic = {
      id: crypto.randomUUID(),
      text: text.trim(),
      checked: false
    };
    setProjects(projects.map(p => {
      if (p.id === activeProjectId) {
        return {
          ...p,
          topics: p.topics.map(t => {
            if (t.id === activeTopicId) {
              return { ...t, subtopics: [...t.subtopics, newSub] };
            }
            return t;
          })
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
    setProjects(projects.map(p => {
      if (p.id === activeProjectId) {
        return { ...p, topics: p.topics.filter(t => t.id !== id) };
      }
      return p;
    }));
    if (activeTopicId === id) setActiveTopicId(null);
  };

  const deleteSubtopic = (id: string) => {
    setProjects(projects.map(p => {
      if (p.id === activeProjectId) {
        return {
          ...p,
          topics: p.topics.map(t => {
            if (t.id === activeTopicId) {
              return { ...t, subtopics: t.subtopics.filter(s => s.id !== id) };
            }
            return t;
          })
        };
      }
      return p;
    }));
  };

  const toggleTopicChecked = (id: string) => {
    setProjects(projects.map(p => {
      if (p.id === activeProjectId) {
        return {
          ...p,
          topics: p.topics.map(t => t.id === id ? { ...t, checked: !t.checked } : t)
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
              return {
                ...t,
                subtopics: t.subtopics.map(s => s.id === id ? { ...s, checked: !s.checked } : s)
              };
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
            subtopics: t.subtopics.map(s => s.id === editingId ? { ...s, text: editText } : s)
          };
        })
      };
    }));
    setEditingId(null);
  };

  const handleProjectDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setProjects((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleTopicDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id && activeProjectId) {
      setProjects(prev => prev.map(p => {
        if (p.id === activeProjectId) {
          const oldIndex = p.topics.findIndex((i) => i.id === active.id);
          const newIndex = p.topics.findIndex((i) => i.id === over.id);
          return { ...p, topics: arrayMove(p.topics, oldIndex, newIndex) };
        }
        return p;
      }));
    }
  };

  const exportData = () => {
    const dataStr = JSON.stringify(projects, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', 'will_of_fire_v3.json');
    linkElement.click();
  };

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        setProjects(json);
        if (json.length > 0) setActiveProjectId(json[0].id);
      } catch (err) {
        alert('Invalid JSON file');
      }
    };
    reader.readAsText(file);
  };

  // --- Sub-components ---

  const TopicProgress = ({ topic }: { topic: Topic }) => {
    const total = topic.subtopics.length;
    const completed = topic.subtopics.filter(s => s.checked).length;
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
    
    return (
      <div className="mt-4 space-y-1">
        <div className="flex justify-between text-[10px] text-gray-400 font-medium uppercase tracking-wider">
          <span>Progress</span>
          <span>{percentage}%</span>
        </div>
        <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            className="h-full bg-accent"
          />
        </div>
      </div>
    );
  };

  // --- Render ---

  return (
    <div className="flex h-screen bg-background overflow-hidden selection:bg-accent/30">
      {/* Sidebar - Projects */}
      <aside className={cn(
        "bg-sidebar border-r border-gray-800/50 flex flex-col transition-all duration-300 z-30",
        isSidebarOpen ? "w-72" : "w-0 -translate-x-full md:w-16 md:translate-x-0",
        "fixed md:relative h-full",
        mobileView !== 'projects' && "hidden md:flex"
      )}>
        <div className="p-6 flex items-center justify-between">
          {isSidebarOpen && (
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2 text-white">
              <FolderTree className="text-accent" size={24} />
              Will Of Fire
            </h1>
          )}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-400 transition-colors"
          >
            {isSidebarOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 space-y-1 no-scrollbar">
          {isSidebarOpen && (
            <div className="px-3 mb-4">
              <button 
                onClick={addProject}
                className="w-full flex items-center gap-2 px-3 py-2 bg-accent hover:bg-accent/90 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-accent/10 active:scale-[0.98]"
              >
                <Plus size={18} />
                New Project
              </button>
            </div>
          )}

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleProjectDragEnd}>
            <SortableContext items={projects.map(p => p.id)} strategy={verticalListSortingStrategy}>
              {projects.map((project) => (
                <SortableItem key={project.id} id={project.id} disabled={!isSidebarOpen}>
                  <button
                    onClick={() => {
                      setActiveProjectId(project.id);
                      if (window.innerWidth < 768) setMobileView('topics');
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group/item",
                      activeProjectId === project.id 
                        ? "bg-gray-800 text-white" 
                        : "text-gray-400 hover:bg-gray-800/50 hover:text-gray-200"
                    )}
                  >
                    <Layout size={18} className={activeProjectId === project.id ? "text-accent" : "text-gray-500"} />
                    {isSidebarOpen && (
                      <span className="flex-1 text-left truncate">
                        {editingId === project.id ? (
                          <input 
                            autoFocus
                            className="bg-transparent border-none outline-none w-full"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onBlur={saveEdit}
                            onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                          />
                        ) : project.name}
                      </span>
                    )}
                    {isSidebarOpen && (
                      <div className="opacity-0 group-hover/item:opacity-100 flex items-center gap-1">
                        <button onClick={(e) => { e.stopPropagation(); startEditing(project.id, project.name); }} className="p-1 hover:text-white transition-colors">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); deleteProject(project.id); }} className="p-1 hover:text-red-400 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </button>
                </SortableItem>
              ))}
            </SortableContext>
          </DndContext>
        </div>

        {isSidebarOpen && (
          <div className="p-4 border-t border-gray-800/50 space-y-2">
            <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-xl transition-all">
              <Upload size={18} /> Import Data
            </button>
            <button onClick={exportData} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-xl transition-all">
              <Download size={18} /> Export Data
            </button>
            <input type="file" ref={fileInputRef} onChange={importData} className="hidden" accept=".json" />
          </div>
        )}
      </aside>

      {/* Main Workspace - Topics */}
      <main className={cn(
        "flex-1 flex flex-col min-w-0 bg-background transition-all duration-300",
        mobileView !== 'topics' && "hidden md:flex"
      )}>
        {/* Header */}
        <header className="h-16 border-b border-gray-800/50 flex items-center justify-between px-6 bg-background/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setMobileView('projects')}
              className="md:hidden p-2 hover:bg-gray-800 rounded-lg text-gray-400"
            >
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-lg font-bold text-white truncate max-w-[200px] md:max-w-md">
              {activeProject?.name || "Select a Project"}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={addTopic}
              disabled={!activeProjectId}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={18} />
              Add Topic
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
          {!activeProjectId ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-20 h-20 bg-gray-800/50 rounded-3xl flex items-center justify-center text-gray-600">
                <Layout size={40} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">No Project Selected</h3>
                <p className="text-gray-500 max-w-xs mx-auto mt-2">Select a project from the sidebar or create a new one to start organizing.</p>
              </div>
            </div>
          ) : activeProject?.topics.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-20 h-20 bg-gray-800/50 rounded-3xl flex items-center justify-center text-gray-600">
                <Plus size={40} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">No Topics Yet</h3>
                <p className="text-gray-500 max-w-xs mx-auto mt-2">Create your first topic to break down your project into manageable pieces.</p>
                <button onClick={addTopic} className="mt-6 text-accent font-semibold hover:underline">Add your first topic</button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleTopicDragEnd}>
                <SortableContext items={activeProject?.topics.map(t => t.id) || []} strategy={verticalListSortingStrategy}>
                  {activeProject?.topics.map((topic) => (
                    <SortableItem key={topic.id} id={topic.id}>
                      <motion.div 
                        layout
                        onClick={() => {
                          setActiveTopicId(topic.id);
                          if (window.innerWidth < 768) setMobileView('subtopics');
                        }}
                        className={cn(
                          "p-5 rounded-2xl border transition-all cursor-pointer group/card",
                          activeTopicId === topic.id 
                            ? "bg-card border-accent/50 shadow-lg shadow-accent/5" 
                            : "bg-card border-gray-800 hover:border-gray-700"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            {editingId === topic.id ? (
                              <input 
                                autoFocus
                                className="bg-transparent border-none outline-none w-full text-base font-bold text-white"
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                onBlur={saveEdit}
                                onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              <h3 className={cn(
                                "text-base font-bold truncate transition-colors",
                                activeTopicId === topic.id ? "text-white" : "text-gray-200 group-hover/card:text-white"
                              )}>
                                {topic.text}
                              </h3>
                            )}
                            <p className="text-xs text-gray-500 mt-1 font-medium">
                              {topic.subtopics.length} {topic.subtopics.length === 1 ? 'Subtopic' : 'Subtopics'}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                            <button onClick={(e) => { e.stopPropagation(); startEditing(topic.id, topic.text); }} className="p-1.5 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors">
                              <Edit2 size={14} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); deleteTopic(topic.id); }} className="p-1.5 hover:bg-red-900/30 rounded-lg text-gray-400 hover:text-red-400 transition-colors">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        <TopicProgress topic={topic} />
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
      <aside className={cn(
        "bg-sidebar border-l border-gray-800/50 flex flex-col transition-all duration-300 z-40",
        "w-full md:w-80 lg:w-96",
        "fixed md:relative h-full",
        mobileView !== 'subtopics' && "hidden md:flex"
      )}>
        {/* Header */}
        <header className="h-16 border-b border-gray-800/50 flex items-center justify-between px-6 bg-sidebar/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setMobileView('topics')}
              className="md:hidden p-2 hover:bg-gray-800 rounded-lg text-gray-400"
            >
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">
              Subtopics
            </h2>
          </div>
          {activeTopic && (
            <button 
              onClick={() => subtopicInputRef.current?.focus()}
              className="p-2 hover:bg-gray-800 rounded-lg text-accent transition-colors"
            >
              <Plus size={20} />
            </button>
          )}
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
          {!activeTopic ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
              <div className="w-16 h-16 bg-gray-800/50 rounded-2xl flex items-center justify-center text-gray-600">
                <CheckCircle2 size={32} />
              </div>
              <p className="text-sm text-gray-500 max-w-[200px]">Select a topic to view and manage its subtopics.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-white leading-tight">
                  {activeTopic.text}
                </h3>
                <p className="text-xs text-gray-500 font-medium">
                  {activeTopic.subtopics.filter(s => s.checked).length} of {activeTopic.subtopics.length} tasks completed
                </p>
              </div>

              <div className="space-y-2">
                <AnimatePresence initial={false}>
                  {activeTopic.subtopics.map((sub) => (
                    <motion.div 
                      key={sub.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="group/sub flex items-center gap-3 p-3 rounded-xl bg-gray-800/30 border border-transparent hover:border-gray-700 transition-all"
                    >
                      <button 
                        onClick={() => toggleSubtopicChecked(sub.id)}
                        className={cn(
                          "transition-colors",
                          sub.checked ? "text-success" : "text-gray-600 hover:text-gray-400"
                        )}
                      >
                        {sub.checked ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                      </button>
                      
                      <div className="flex-1 min-w-0">
                        {editingId === sub.id ? (
                          <input 
                            autoFocus
                            className="bg-transparent border-none outline-none w-full text-sm text-white"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onBlur={saveEdit}
                            onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                          />
                        ) : (
                          <span className={cn(
                            "text-sm transition-all truncate block",
                            sub.checked ? "text-gray-500 line-through" : "text-gray-200"
                          )}>
                            {sub.text}
                          </span>
                        )}
                      </div>

                      <div className="opacity-0 group-hover/sub:opacity-100 flex items-center gap-1">
                        <button onClick={() => startEditing(sub.id, sub.text)} className="p-1 text-gray-500 hover:text-white transition-colors">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => deleteSubtopic(sub.id)} className="p-1 text-gray-500 hover:text-red-400 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                <div className="pt-2">
                  <div className="relative group">
                    <Plus size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-accent transition-colors" />
                    <input 
                      ref={subtopicInputRef}
                      type="text"
                      placeholder="Add a subtopic..."
                      className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-accent/50 focus:bg-gray-800 transition-all"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          addSubtopic(e.currentTarget.value);
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-600 mt-2 px-1">Press <kbd className="bg-gray-800 px-1 rounded">Enter</kbd> to quickly add tasks</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
