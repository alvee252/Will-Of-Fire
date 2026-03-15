/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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
  FileText,
  Save
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

// --- App Component ---

export default function App() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('topic-tree-data');
    if (saved) {
      try {
        setTopics(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved data', e);
      }
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem('topic-tree-data', JSON.stringify(topics));
  }, [topics]);

  // --- Handlers ---

  const addTopic = () => {
    const newTopic: Topic = {
      id: crypto.randomUUID(),
      text: `New Topic ${topics.length + 1}`,
      checked: false,
      expanded: true,
      subtopics: []
    };
    setTopics([...topics, newTopic]);
    startEditing(newTopic.id, newTopic.text);
  };

  const addSubtopic = (topicId: string) => {
    setTopics(topics.map(t => {
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
    }));
  };

  const deleteTopic = (id: string) => {
    setTopics(topics.filter(t => t.id !== id));
  };

  const deleteSubtopic = (topicId: string, subId: string) => {
    setTopics(topics.map(t => {
      if (t.id === topicId) {
        return { ...t, subtopics: t.subtopics.filter(s => s.id !== subId) };
      }
      return t;
    }));
  };

  const toggleTopicChecked = (id: string) => {
    setTopics(topics.map(t => t.id === id ? { ...t, checked: !t.checked } : t));
  };

  const toggleSubtopicChecked = (topicId: string, subId: string) => {
    setTopics(topics.map(t => {
      if (t.id === topicId) {
        return {
          ...t,
          subtopics: t.subtopics.map(s => s.id === subId ? { ...s, checked: !s.checked } : s)
        };
      }
      return t;
    }));
  };

  const toggleExpand = (id: string) => {
    setTopics(topics.map(t => t.id === id ? { ...t, expanded: !t.expanded } : t));
  };

  const startEditing = (id: string, text: string) => {
    setEditingId(id);
    setEditText(text);
  };

  const saveEdit = () => {
    if (!editingId) return;
    setTopics(topics.map(t => {
      if (t.id === editingId) return { ...t, text: editText };
      return {
        ...t,
        subtopics: t.subtopics.map(s => s.id === editingId ? { ...s, text: editText } : s)
      };
    }));
    setEditingId(null);
  };

  const exportData = () => {
    const dataStr = JSON.stringify(topics, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = 'topics.json';

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
        setTopics(json);
      } catch (err) {
        alert('Invalid JSON file');
      }
    };
    reader.readAsText(file);
  };

  // --- Render Helpers ---

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#1A1A1A] font-sans p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <FolderTree className="text-orange-600" size={32} />
              Will Of Fire
            </h1>
            <p className="text-sm text-gray-500 mt-1">Organize your thoughts hierarchically</p>
          </div>
          <div className="flex items-center gap-2">
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
        <main className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-bottom border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              {topics.length} {topics.length === 1 ? 'Topic' : 'Topics'}
            </span>
            <button 
              onClick={addTopic}
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-sm active:scale-95"
            >
              <Plus size={18} />
              Add Topic
            </button>
          </div>

          <div className="divide-y divide-gray-100 max-h-[70vh] overflow-y-auto scrollbar-hide">
            {topics.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                  <FolderTree size={32} />
                </div>
                <div>
                  <p className="text-gray-900 font-medium">No topics yet</p>
                  <p className="text-sm text-gray-500">Click "Add Topic" to get started</p>
                </div>
              </div>
            ) : (
              topics.map((topic) => (
                <div key={topic.id} className="group">
                  {/* Topic Row */}
                  <div className="flex items-center p-4 hover:bg-gray-50 transition-colors gap-3">
                    <button 
                      onClick={() => toggleExpand(topic.id)}
                      className="p-1 hover:bg-gray-200 rounded transition-colors text-gray-400"
                    >
                      {topic.expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </button>
                    
                    <div 
                      onClick={() => toggleTopicChecked(topic.id)}
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
                          <button onClick={() => setEditingId(null)} className="text-red-600 hover:bg-red-50 p-1 rounded"><X size={16}/></button>
                        </div>
                      ) : (
                        <span className={`text-sm font-medium truncate ${topic.checked ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                          {topic.text}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => addSubtopic(topic.id)}
                        className="p-1.5 hover:bg-orange-50 text-orange-600 rounded-lg transition-colors"
                        title="Add Subtopic"
                      >
                        <Plus size={16} />
                      </button>
                      <button 
                        onClick={() => startEditing(topic.id, topic.text)}
                        className="p-1.5 hover:bg-gray-100 text-gray-500 rounded-lg transition-colors"
                        title="Rename"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => deleteTopic(topic.id)}
                        className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                        title="Delete"
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
                        <div className="pl-12 pr-4 pb-2">
                          {topic.subtopics.map((sub) => (
                            <div key={sub.id} className="flex items-center py-2 group/sub gap-3 border-l-2 border-gray-100 ml-2 pl-4">
                              <div 
                                onClick={() => toggleSubtopicChecked(topic.id, sub.id)}
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
                                  onClick={() => deleteSubtopic(topic.id, sub.id)}
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
          </div>
        </main>

        <footer className="mt-8 text-center">
          <p className="text-xs text-gray-400">
            Data is automatically saved to your browser's local storage.
          </p>
        </footer>
      </div>
    </div>
  );
}
