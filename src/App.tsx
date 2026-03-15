import React, { useState, useRef, useEffect } from 'react';
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
  ArrowUp,
  ArrowDown,
  Layout
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
  expanded: boolean;
  topics: Topic[];
}

// --- App Component ---

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('will-of-fire-v2-data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Migration check: if it's the old structure (array of topics), wrap it in a default project
        if (Array.isArray(parsed) && parsed.length > 0 && !('topics' in parsed[0])) {
           setProjects([{
             id: 'default-project',
             name: 'My First Project',
             expanded: true,
             topics: parsed
           }]);
        } else {
          setProjects(parsed);
        }
      } catch (e) {
        console.error('Failed to parse saved data', e);
      }
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem('will-of-fire-v2-data', JSON.stringify(projects));
  }, [projects]);

  // --- Handlers ---

  const addProject = () => {
    const newProject: Project = {
      id: crypto.randomUUID(),
      name: `New Project ${projects.length + 1}`,
      expanded: true,
      topics: []
    };
    setProjects([...projects, newProject]);
    startEditing(newProject.id, newProject.name);
  };

  const addTopic = (projectId: string) => {
    setProjects(projects.map(p => {
      if (p.id === projectId) {
        const newTopic: Topic = {
          id: crypto.randomUUID(),
          text: `New Topic ${p.topics.length + 1}`,
          checked: false,
          expanded: true,
          subtopics: []
        };
        return {
          ...p,
          expanded: true,
          topics: [...p.topics, newTopic]
        };
      }
      return p;
    }));
  };

  const addSubtopic = (projectId: string, topicId: string) => {
    setProjects(projects.map(p => {
      if (p.id === projectId) {
        return {
          ...p,
          topics: p.topics.map(t => {
            if (t.id === topicId) {
              const newSub: Subtopic = {
                id: crypto.randomUUID(),
                text: `New Subtopic ${t.subtopics.length + 1}`,
                checked: false
              };
              return {
                ...t,
                expanded: true,
                subtopics: [...t.subtopics, newSub]
              };
            }
            return t;
          })
        };
      }
      return p;
    }));
  };

  const deleteProject = (id: string) => {
    setProjects(projects.filter(p => p.id !== id));
  };

  const deleteTopic = (projectId: string, topicId: string) => {
    setProjects(projects.map(p => {
      if (p.id === projectId) {
        return { ...p, topics: p.topics.filter(t => t.id !== topicId) };
      }
      return p;
    }));
  };

  const deleteSubtopic = (projectId: string, topicId: string, subId: string) => {
    setProjects(projects.map(p => {
      if (p.id === projectId) {
        return {
          ...p,
          topics: p.topics.map(t => {
            if (t.id === topicId) {
              return { ...t, subtopics: t.subtopics.filter(s => s.id !== subId) };
            }
            return t;
          })
        };
      }
      return p;
    }));
  };

  const toggleTopicChecked = (projectId: string, topicId: string) => {
    setProjects(projects.map(p => {
      if (p.id === projectId) {
        return {
          ...p,
          topics: p.topics.map(t => t.id === topicId ? { ...t, checked: !t.checked } : t)
        };
      }
      return p;
    }));
  };

  const toggleSubtopicChecked = (projectId: string, topicId: string, subId: string) => {
    setProjects(projects.map(p => {
      if (p.id === projectId) {
        return {
          ...p,
          topics: p.topics.map(t => {
            if (t.id === topicId) {
              return {
                ...t,
                subtopics: t.subtopics.map(s => s.id === subId ? { ...s, checked: !s.checked } : s)
              };
            }
            return t;
          })
        };
      }
      return p;
    }));
  };

  const toggleProjectExpand = (id: string) => {
    setProjects(projects.map(p => p.id === id ? { ...p, expanded: !p.expanded } : p));
  };

  const toggleTopicExpand = (projectId: string, topicId: string) => {
    setProjects(projects.map(p => {
      if (p.id === projectId) {
        return {
          ...p,
          topics: p.topics.map(t => t.id === topicId ? { ...t, expanded: !t.expanded } : t)
        };
      }
      return p;
    }));
  };

  const moveTopic = (projectId: string, topicId: string, direction: 'up' | 'down') => {
    setProjects(projects.map(p => {
      if (p.id === projectId) {
        const index = p.topics.findIndex(t => t.id === topicId);
        if (index === -1) return p;
        if (direction === 'up' && index === 0) return p;
        if (direction === 'down' && index === p.topics.length - 1) return p;

        const newTopics = [...p.topics];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        [newTopics[index], newTopics[targetIndex]] = [newTopics[targetIndex], newTopics[index]];
        
        return { ...p, topics: newTopics };
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

  const exportData = () => {
    const dataStr = JSON.stringify(projects, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = 'will_of_fire_projects.json';

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
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
      } catch (err) {
        alert('Invalid JSON file');
      }
    };
    reader.readAsText(file);
  };

  // --- Render Helpers ---

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#1A1A1A] font-sans p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <FolderTree className="text-orange-600" size={32} />
              Will Of Fire
            </h1>
            <p className="text-sm text-gray-500 mt-1">Project-based hierarchical organization</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={addProject}
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-sm active:scale-95"
            >
              <Plus size={18} />
              Add Project
            </button>
            <div className="h-8 w-[1px] bg-gray-200 mx-2 hidden sm:block"></div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-2 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-gray-200 flex items-center gap-2 text-sm font-medium"
              title="Import JSON"
            >
              <Upload size={18} />
              <span className="hidden sm:inline">Import</span>
            </button>
            <button 
              onClick={exportData}
              className="p-2 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-gray-200 flex items-center gap-2 text-sm font-medium"
              title="Export JSON"
            >
              <Download size={18} />
              <span className="hidden sm:inline">Export</span>
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={importData} 
              className="hidden" 
              accept=".json"
            />
          </div>
        </header>

        {/* Main Content */}
        <div className="space-y-6">
          {projects.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                <Layout size={32} />
              </div>
              <div>
                <p className="text-gray-900 font-medium">No projects yet</p>
                <p className="text-sm text-gray-500">Click "Add Project" to organize your topics</p>
              </div>
            </div>
          ) : (
            projects.map((project) => (
              <section key={project.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Project Header */}
                <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex items-center gap-3 group">
                  <button 
                    onClick={() => toggleProjectExpand(project.id)}
                    className="p-1 hover:bg-gray-200 rounded transition-colors text-gray-400"
                  >
                    {project.expanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  </button>
                  
                  <div className="flex-1 min-w-0">
                    {editingId === project.id ? (
                      <div className="flex items-center gap-2">
                        <input 
                          autoFocus
                          className="w-full bg-white border border-orange-300 rounded px-2 py-1 text-base font-bold focus:outline-none ring-2 ring-orange-100"
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                        />
                        <button onClick={saveEdit} className="text-green-600 hover:bg-green-50 p-1 rounded"><Check size={18}/></button>
                        <button onClick={() => setEditingId(null)} className="text-red-600 hover:bg-red-50 p-1 rounded"><X size={18}/></button>
                      </div>
                    ) : (
                      <h2 className="text-lg font-bold text-gray-900 truncate">
                        {project.name}
                      </h2>
                    )}
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => addTopic(project.id)}
                      className="bg-orange-100 text-orange-700 px-3 py-1 rounded-lg text-xs font-bold hover:bg-orange-200 transition-colors flex items-center gap-1"
                    >
                      <Plus size={14} />
                      Add Topic
                    </button>
                    <button 
                      onClick={() => startEditing(project.id, project.name)}
                      className="p-1.5 hover:bg-gray-200 text-gray-500 rounded-lg transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => deleteProject(project.id)}
                      className="p-1.5 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Topics inside Project */}
                <AnimatePresence>
                  {project.expanded && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="divide-y divide-gray-50"
                    >
                      {project.topics.length === 0 ? (
                        <div className="p-8 text-center text-sm text-gray-400 italic">
                          No topics in this project.
                        </div>
                      ) : (
                        project.topics.map((topic, index) => (
                          <div key={topic.id} className="group/topic">
                            {/* Topic Row */}
                            <div className="flex items-center p-4 hover:bg-gray-50/50 transition-colors gap-3">
                              <div className="flex flex-col gap-0.5 opacity-0 group-hover/topic:opacity-100 transition-opacity mr-1">
                                <button 
                                  disabled={index === 0}
                                  onClick={() => moveTopic(project.id, topic.id, 'up')}
                                  className={`p-0.5 rounded hover:bg-gray-200 ${index === 0 ? 'text-gray-200 cursor-not-allowed' : 'text-gray-400'}`}
                                >
                                  <ArrowUp size={14} />
                                </button>
                                <button 
                                  disabled={index === project.topics.length - 1}
                                  onClick={() => moveTopic(project.id, topic.id, 'down')}
                                  className={`p-0.5 rounded hover:bg-gray-200 ${index === project.topics.length - 1 ? 'text-gray-200 cursor-not-allowed' : 'text-gray-400'}`}
                                >
                                  <ArrowDown size={14} />
                                </button>
                              </div>

                              <button 
                                onClick={() => toggleTopicExpand(project.id, topic.id)}
                                className="p-1 hover:bg-gray-200 rounded transition-colors text-gray-400"
                              >
                                {topic.expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                              </button>
                              
                              <div 
                                onClick={() => toggleTopicChecked(project.id, topic.id)}
                                className={`w-5 h-5 rounded border flex items-center justify-center cursor-pointer transition-all ${
                                  topic.checked 
                                    ? 'bg-orange-600 border-orange-600 text-white' 
                                    : 'bg-white border-gray-300 hover:border-orange-400'
                                }`}
                              >
                                {topic.checked && <Check size={14} strokeWidth={3} />}
                              </div>

                              <div className="flex-1 min-w-0">
                                {editingId === topic.id ? (
                                  <div className="flex items-center gap-2">
                                    <input 
                                      autoFocus
                                      className="w-full bg-white border border-orange-300 rounded px-2 py-1 text-sm focus:outline-none ring-2 ring-orange-100"
                                      value={editText}
                                      onChange={(e) => setEditText(e.target.value)}
                                      onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                                    />
                                    <button onClick={saveEdit} className="text-green-600 hover:bg-green-50 p-1 rounded"><Check size={16}/></button>
                                  </div>
                                ) : (
                                  <span className={`text-sm font-medium truncate ${topic.checked ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                                    {topic.text}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1 opacity-0 group-hover/topic:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => addSubtopic(project.id, topic.id)}
                                  className="p-1.5 hover:bg-orange-50 text-orange-600 rounded-lg transition-colors"
                                  title="Add Subtopic"
                                >
                                  <Plus size={16} />
                                </button>
                                <button 
                                  onClick={() => startEditing(topic.id, topic.text)}
                                  className="p-1.5 hover:bg-gray-100 text-gray-500 rounded-lg transition-colors"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button 
                                  onClick={() => deleteTopic(project.id, topic.id)}
                                  className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>

                            {/* Subtopics List */}
                            <AnimatePresence>
                              {topic.expanded && (
                                <motion.div 
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden bg-gray-50/30"
                                >
                                  <div className="pl-16 pr-4 pb-2">
                                    {topic.subtopics.map((sub) => (
                                      <div key={sub.id} className="flex items-center py-2 group/sub gap-3 border-l-2 border-gray-100 ml-2 pl-4">
                                        <div 
                                          onClick={() => toggleSubtopicChecked(project.id, topic.id, sub.id)}
                                          className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer transition-all ${
                                            sub.checked 
                                              ? 'bg-red-500 border-red-500 text-white' 
                                              : 'bg-white border-gray-300 hover:border-red-400'
                                          }`}
                                        >
                                          {sub.checked && <Check size={12} strokeWidth={3} />}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                          {editingId === sub.id ? (
                                            <div className="flex items-center gap-2">
                                              <input 
                                                autoFocus
                                                className="w-full bg-white border border-red-300 rounded px-2 py-0.5 text-xs focus:outline-none ring-2 ring-red-100"
                                                value={editText}
                                                onChange={(e) => setEditText(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                                              />
                                              <button onClick={saveEdit} className="text-green-600 hover:bg-green-50 p-1 rounded"><Check size={14}/></button>
                                            </div>
                                          ) : (
                                            <span className={`text-xs font-medium truncate ${sub.checked ? 'text-gray-400 line-through' : 'text-gray-600'}`}>
                                              {sub.text}
                                            </span>
                                          )}
                                        </div>

                                        <div className="flex items-center gap-1 opacity-0 group-hover/sub:opacity-100 transition-opacity">
                                          <button 
                                            onClick={() => startEditing(sub.id, sub.text)}
                                            className="p-1 hover:bg-gray-200 text-gray-500 rounded transition-colors"
                                          >
                                            <Edit2 size={14} />
                                          </button>
                                          <button 
                                            onClick={() => deleteSubtopic(project.id, topic.id, sub.id)}
                                            className="p-1 hover:bg-red-100 text-red-600 rounded transition-colors"
                                          >
                                            <Trash2 size={14} />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                    {topic.subtopics.length === 0 && (
                                      <p className="text-[10px] text-gray-400 italic py-2 ml-6">No subtopics yet</p>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        ))
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>
            ))
          )}
        </div>

        <footer className="mt-12 text-center pb-8">
          <p className="text-xs text-gray-400">
            Will Of Fire v2.0 • Data is saved to local storage.
          </p>
        </footer>
      </div>
    </div>
  );
}
