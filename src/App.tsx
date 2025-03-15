import React, { useState, useEffect } from 'react';
import { Save, Trash2, Plus, Search, Copy, Check, Download, Edit, ChevronDown, ChevronUp, Sun, Moon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Tab } from '@headlessui/react';
import storage from './storage';

interface Prompt {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
}

function App() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [preview, setPreview] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [lastDeletedPrompt, setLastDeletedPrompt] = useState<Prompt | null>(null);
  const [undoTimeout, setUndoTimeout] = useState<NodeJS.Timeout | null>(null);
  const [expandedPrompts, setExpandedPrompts] = useState<Set<string>>(new Set());
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Load prompts and theme preference
    const loadData = async () => {
      const data = await storage.get(['prompts', 'isDarkMode']);
      if (data.prompts) {
        setPrompts(data.prompts);
      }
      if (data.isDarkMode) {
        setIsDarkMode(data.isDarkMode);
        document.documentElement.classList.toggle('dark', data.isDarkMode);
      }
    };
    loadData();
  }, []);

  const toggleDarkMode = async () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    document.documentElement.classList.toggle('dark', newDarkMode);
    await storage.set({ isDarkMode: newDarkMode });
  };

  const savePrompt = async () => {
    if (!title || !content) return;

    if (editingPromptId) {
      // Update existing prompt
      const updatedPrompts = prompts.map(prompt =>
        prompt.id === editingPromptId
          ? { ...prompt, title, content, updatedAt: new Date().toISOString() }
          : prompt
      );
      setPrompts(updatedPrompts);
      await storage.set({ prompts: updatedPrompts });
    } else {
      // Create new prompt
      const newPrompt: Prompt = {
        id: Date.now().toString(),
        title,
        content,
        createdAt: new Date().toISOString(),
      };

      const updatedPrompts = [...prompts, newPrompt];
      setPrompts(updatedPrompts);
      await storage.set({ prompts: updatedPrompts });
    }

    // Reset form
    setTitle('');
    setContent('');
    setEditingPromptId(null);
    
    // Switch back to Browse Prompts tab
    const browseTab = document.querySelector('[role="tab"]:first-child') as HTMLElement;
    if (browseTab) {
      browseTab.click();
    }
  };

  const startEditing = (prompt: Prompt) => {
    setTitle(prompt.title);
    setContent(prompt.content);
    setEditingPromptId(prompt.id);
    // Switch to Add/Change Prompt tab (now it's the second tab)
    const addPromptTab = document.querySelector('[role="tab"]:nth-child(2)') as HTMLElement;
    if (addPromptTab) {
      addPromptTab.click();
    }
  };

  const cancelEditing = () => {
    setTitle('');
    setContent('');
    setEditingPromptId(null);
    // Switch back to Browse Prompts tab (now it's the first tab)
    const browseTab = document.querySelector('[role="tab"]:first-child') as HTMLElement;
    if (browseTab) {
      browseTab.click();
    }
  };

  const deletePrompt = async (id: string) => {
    const promptToDelete = prompts.find(prompt => prompt.id === id);
    if (!promptToDelete) return;

    // Clear any existing undo timeout
    if (undoTimeout) {
      clearTimeout(undoTimeout);
    }

    // Store the deleted prompt
    setLastDeletedPrompt(promptToDelete);

    // Remove the prompt from the list
    const updatedPrompts = prompts.filter(prompt => prompt.id !== id);
    setPrompts(updatedPrompts);
    await storage.set({ prompts: updatedPrompts });

    // Set a timeout to clear the last deleted prompt after 5 seconds
    const timeout = setTimeout(() => {
      setLastDeletedPrompt(null);
    }, 5000);
    setUndoTimeout(timeout);
  };

  const undoDelete = async () => {
    if (!lastDeletedPrompt) return;

    // Clear the undo timeout
    if (undoTimeout) {
      clearTimeout(undoTimeout);
      setUndoTimeout(null);
    }

    // Restore the deleted prompt
    const updatedPrompts = [...prompts, lastDeletedPrompt];
    setPrompts(updatedPrompts);
    await storage.set({ prompts: updatedPrompts });
    setLastDeletedPrompt(null);
  };

  // Cleanup timeout on component unmount
  useEffect(() => {
    return () => {
      if (undoTimeout) {
        clearTimeout(undoTimeout);
      }
    };
  }, [undoTimeout]);

  const copyToClipboard = async (text: string, promptId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedPromptId(promptId);
      setTimeout(() => setCopiedPromptId(null), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const exportToCSV = () => {
    // Create CSV content
    const csvContent = [
      ['Title', 'Content', 'Created At'], // CSV header
      ...prompts.map(prompt => [
        prompt.title,
        prompt.content,
        new Date(prompt.createdAt).toLocaleDateString(),
      ])
    ].map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');

    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `prompts_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const filteredPrompts = prompts.filter(prompt => {
    const query = searchQuery.toLowerCase();
    return prompt.title.toLowerCase().includes(query) ||
           prompt.content.toLowerCase().includes(query);
  });

  const togglePromptExpansion = (promptId: string) => {
    setExpandedPrompts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(promptId)) {
        newSet.delete(promptId);
      } else {
        newSet.add(promptId);
      }
      return newSet;
    });
  };

  return (
    <div className="w-[400px] min-h-[500px] bg-gray-50 dark:bg-gray-900 p-4">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Save className="w-6 h-6" />
          Prompt Manager
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
            title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button
            onClick={exportToCSV}
            className="text-sm flex items-center gap-1 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </h1>

      <Tab.Group>
        <Tab.List className="flex space-x-1 rounded-xl bg-blue-900/20 dark:bg-blue-900/40 p-1 mb-4">
          <Tab className={({ selected }) =>
            `w-full rounded-lg py-2.5 text-sm font-medium leading-5 
            ${selected 
              ? 'bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-400 shadow'
              : 'text-blue-500 dark:text-blue-400 hover:bg-white/[0.12] dark:hover:bg-gray-800/[0.12] hover:text-blue-600 dark:hover:text-blue-300'
            }`
          }>
            Browse Prompts
          </Tab>
          <Tab className={({ selected }) =>
            `w-full rounded-lg py-2.5 text-sm font-medium leading-5 
            ${selected 
              ? 'bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-400 shadow'
              : 'text-blue-500 dark:text-blue-400 hover:bg-white/[0.12] dark:hover:bg-gray-800/[0.12] hover:text-blue-600 dark:hover:text-blue-300'
            }`
          }>
            {editingPromptId ? 'Change Prompt' : 'Add Prompt'}
          </Tab>
        </Tab.List>

        <Tab.Panels>
          <Tab.Panel>
            {/* Browse Prompts Panel */}
            <div>
              <div className="relative mb-4">
                <input
                  type="text"
                  placeholder="Search prompts..."
                  className="w-full p-2 pr-8 border dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Search className="w-4 h-4 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {lastDeletedPrompt && (
                  <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg shadow-sm flex items-center justify-between">
                    <span className="text-blue-700 dark:text-blue-300">Prompt "{lastDeletedPrompt.title}" was deleted</span>
                    <button
                      onClick={undoDelete}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                    >
                      Undo
                    </button>
                  </div>
                )}
                {filteredPrompts.map((prompt) => (
                  <div key={prompt.id} className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-gray-800 dark:text-white">{prompt.title}</h3>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyToClipboard(prompt.content, prompt.id)}
                          className="text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          title="Copy to clipboard"
                        >
                          {copiedPromptId === prompt.id ? (
                            <Check className="w-4 h-4 text-green-500" data-testid="check-icon" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => startEditing(prompt)}
                          className="text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300"
                          title="Edit prompt"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deletePrompt(prompt.id)}
                          className="text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300"
                          title="Delete prompt"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-300">
                      <div 
                        data-testid="prompt-content"
                        className={`${prompt.content.length > 200 && !expandedPrompts.has(prompt.id) ? 'max-h-[100px]' : 'min-h-[100px]'} overflow-hidden relative`}
                      >
                        <ReactMarkdown>{prompt.content}</ReactMarkdown>
                        {prompt.content.length > 200 && !expandedPrompts.has(prompt.id) && (
                          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white dark:from-gray-800 to-transparent" />
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {new Date(prompt.createdAt).toLocaleDateString()}
                      </p>
                      {prompt.content.length > 200 && (
                        <button
                          onClick={() => togglePromptExpansion(prompt.id)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm flex items-center gap-1"
                        >
                          {expandedPrompts.has(prompt.id) ? (
                            <>
                              Show Less
                              <ChevronUp className="w-4 h-4" />
                            </>
                          ) : (
                            <>
                              Show More
                              <ChevronDown className="w-4 h-4" />
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {filteredPrompts.length === 0 && searchQuery && (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                    No prompts found matching your search
                  </div>
                )}
              </div>
            </div>
          </Tab.Panel>

          <Tab.Panel>
            {/* Add Prompt Panel */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
              <input
                type="text"
                placeholder="Prompt Title"
                className="w-full mb-2 p-2 border dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <div className="relative">
                <textarea
                  placeholder="Enter your prompt... (Markdown supported)"
                  className="w-full h-64 p-2 border dark:border-gray-600 rounded-md mb-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onFocus={() => setPreview(false)}
                />
                {content && (
                  <button
                    className="absolute top-2 right-2 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
                    onClick={() => setPreview(!preview)}
                  >
                    {preview ? 'Edit' : 'Preview'}
                  </button>
                )}
                {preview && content && (
                  <div className="w-full min-h-[96px] p-2 border dark:border-gray-600 rounded-md mb-2 prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{content}</ReactMarkdown>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={savePrompt}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  {editingPromptId ? (
                    <>
                      <Save className="w-4 h-4" />
                      Save Changes
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Save Prompt
                    </>
                  )}
                </button>
                {editingPromptId && (
                  <button
                    onClick={cancelEditing}
                    className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
}

export default App;