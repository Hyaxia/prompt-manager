import React, { useState, useEffect } from 'react';
import { Save, Trash2, Plus, Search, Copy, Check, Download, Edit } from 'lucide-react';
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

  useEffect(() => {
    // Load saved prompts from storage
    storage.get(['prompts']).then((result) => {
      if (result.prompts) {
        setPrompts(result.prompts);
      }
    });
  }, []);

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
  };

  const startEditing = (prompt: Prompt) => {
    setTitle(prompt.title);
    setContent(prompt.content);
    setEditingPromptId(prompt.id);
    // Switch to Add Prompt tab
    const addPromptTab = document.querySelector('[role="tab"]:first-child') as HTMLElement;
    if (addPromptTab) {
      addPromptTab.click();
    }
  };

  const cancelEditing = () => {
    setTitle('');
    setContent('');
    setEditingPromptId(null);
    // Switch back to Browse Prompts tab
    const browseTab = document.querySelector('[role="tab"]:last-child') as HTMLElement;
    if (browseTab) {
      browseTab.click();
    }
  };

  const deletePrompt = async (id: string) => {
    const updatedPrompts = prompts.filter(prompt => prompt.id !== id);
    setPrompts(updatedPrompts);
    await storage.set({ prompts: updatedPrompts });
  };

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

  return (
    <div className="w-[400px] min-h-[500px] bg-gray-50 p-4">
      <h1 className="text-2xl font-bold text-gray-800 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Save className="w-6 h-6" />
          Prompt Manager
        </div>
        <button
          onClick={exportToCSV}
          className="text-sm flex items-center gap-1 text-gray-600 hover:text-gray-800"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </h1>

      <Tab.Group>
        <Tab.List className="flex space-x-1 rounded-xl bg-blue-900/20 p-1 mb-4">
          <Tab className={({ selected }) =>
            `w-full rounded-lg py-2.5 text-sm font-medium leading-5 
            ${selected 
              ? 'bg-white text-blue-700 shadow'
              : 'text-blue-500 hover:bg-white/[0.12] hover:text-blue-600'
            }`
          }>
            {editingPromptId ? 'Change Prompt' : 'Add Prompt'}
          </Tab>
          <Tab className={({ selected }) =>
            `w-full rounded-lg py-2.5 text-sm font-medium leading-5 
            ${selected 
              ? 'bg-white text-blue-700 shadow'
              : 'text-blue-500 hover:bg-white/[0.12] hover:text-blue-600'
            }`
          }>
            Browse Prompts
          </Tab>
        </Tab.List>

        <Tab.Panels>
          <Tab.Panel>
            {/* Add Prompt Panel */}
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <input
                type="text"
                placeholder="Prompt Title"
                className="w-full mb-2 p-2 border rounded-md"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <div className="relative">
                <textarea
                  placeholder="Enter your prompt... (Markdown supported)"
                  className="w-full h-64 p-2 border rounded-md mb-2"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onFocus={() => setPreview(false)}
                />
                {content && (
                  <button
                    className="absolute top-2 right-2 px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
                    onClick={() => setPreview(!preview)}
                  >
                    {preview ? 'Edit' : 'Preview'}
                  </button>
                )}
                {preview && content && (
                  <div className="w-full min-h-[96px] p-2 border rounded-md mb-2 prose prose-sm max-w-none">
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
                    className="bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </Tab.Panel>

          <Tab.Panel>
            {/* Browse Prompts Panel */}
            <div>
              <div className="relative mb-4">
                <input
                  type="text"
                  placeholder="Search prompts..."
                  className="w-full p-2 pr-8 border rounded-md"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Search className="w-4 h-4 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>

              <div className="space-y-3">
                {filteredPrompts.map((prompt) => (
                  <div key={prompt.id} className="bg-white p-3 rounded-lg shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-gray-800">{prompt.title}</h3>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyToClipboard(prompt.content, prompt.id)}
                          className="text-gray-500 hover:text-gray-600"
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
                          className="text-blue-500 hover:text-blue-600"
                          title="Edit prompt"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deletePrompt(prompt.id)}
                          className="text-red-500 hover:text-red-600"
                          title="Delete prompt"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="prose prose-sm max-w-none text-gray-600 max-h-[300px] overflow-y-auto">
                      <ReactMarkdown>{prompt.content}</ReactMarkdown>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(prompt.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
                {filteredPrompts.length === 0 && searchQuery && (
                  <div className="text-center text-gray-500 py-4">
                    No prompts found matching your search
                  </div>
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