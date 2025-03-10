import React, { useState, useEffect } from 'react';
import { Save, Trash2, Plus, Search, Folder, FolderPlus, Move, Copy, Check, Download } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Tab } from '@headlessui/react';
import storage from './storage';

interface Prompt {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  folderId: string | null;
}

interface Folder {
  id: string;
  name: string;
  createdAt: string;
}

function App() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [preview, setPreview] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [movingPromptId, setMovingPromptId] = useState<string | null>(null);
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);

  useEffect(() => {
    // Load saved prompts and folders from storage
    storage.get(['prompts', 'folders']).then((result) => {
      if (result.prompts) {
        setPrompts(result.prompts);
      }
      if (result.folders) {
        setFolders(result.folders);
      }
    });
  }, []);

  const savePrompt = async () => {
    if (!title || !content) return;

    const newPrompt: Prompt = {
      id: Date.now().toString(),
      title,
      content,
      createdAt: new Date().toISOString(),
      folderId: selectedFolderId,
    };

    const updatedPrompts = [...prompts, newPrompt];
    setPrompts(updatedPrompts);
    await storage.set({ prompts: updatedPrompts });
    setTitle('');
    setContent('');
  };

  const deletePrompt = async (id: string) => {
    const updatedPrompts = prompts.filter(prompt => prompt.id !== id);
    setPrompts(updatedPrompts);
    await storage.set({ prompts: updatedPrompts });
  };

  const addFolder = async () => {
    if (!newFolderName.trim()) return;

    const newFolder: Folder = {
      id: Date.now().toString(),
      name: newFolderName.trim(),
      createdAt: new Date().toISOString(),
    };

    const updatedFolders = [...folders, newFolder];
    setFolders(updatedFolders);
    await storage.set({ folders: updatedFolders });
    setNewFolderName('');
    setIsAddingFolder(false);
  };

  const deleteFolder = async (folderId: string) => {
    // Remove folder
    const updatedFolders = folders.filter(f => f.id !== folderId);
    setFolders(updatedFolders);
    
    // Move prompts from deleted folder to root
    const updatedPrompts = prompts.map(p => 
      p.folderId === folderId ? { ...p, folderId: null } : p
    );
    setPrompts(updatedPrompts);
    
    await storage.set({ 
      folders: updatedFolders,
      prompts: updatedPrompts
    });

    if (selectedFolderId === folderId) {
      setSelectedFolderId(null);
    }
  };

  const movePrompt = async (promptId: string, targetFolderId: string | null) => {
    const updatedPrompts = prompts.map(p =>
      p.id === promptId ? { ...p, folderId: targetFolderId } : p
    );
    setPrompts(updatedPrompts);
    await storage.set({ prompts: updatedPrompts });
    setMovingPromptId(null);
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
      ['Title', 'Content', 'Created At', 'Folder'], // CSV header
      ...prompts.map(prompt => [
        prompt.title,
        prompt.content,
        new Date(prompt.createdAt).toLocaleDateString(),
        prompt.folderId ? folders.find(f => f.id === prompt.folderId)?.name || 'root' : 'root'
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
    
    // Check if prompt content or title matches
    const matchesPrompt = prompt.title.toLowerCase().includes(query) ||
                         prompt.content.toLowerCase().includes(query);
    
    // Check if folder name matches (if prompt is in a folder)
    const matchesFolder = prompt.folderId
      ? folders.find(f => f.id === prompt.folderId)?.name.toLowerCase().includes(query)
      : query.includes('root'); // Match root prompts if searching for "root"
    
    // Check if prompt is in the currently selected folder (if any)
    const matchesSelectedFolder = !selectedFolderId || prompt.folderId === selectedFolderId;
    
    return (matchesPrompt || matchesFolder) && matchesSelectedFolder;
  });

  const getPromptPath = (prompt: Prompt): string => {
    if (!prompt.folderId) {
      return `/root/${prompt.title}`;
    }
    const folder = folders.find(f => f.id === prompt.folderId);
    return folder ? `/${folder.name}/${prompt.title}` : `/root/${prompt.title}`;
  };

  return (
    <div className="w-[400px] min-h-[500px] bg-gray-50 p-4">
      <h1 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        <Save className="w-6 h-6" />
        Prompt Saver
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
            Add Prompt
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
              <button
                onClick={savePrompt}
                className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Save Prompt
              </button>
            </div>
          </Tab.Panel>

          <Tab.Panel>
            {/* Browse Prompts Panel */}
            <div>
              <div className="mb-4 flex items-center justify-between">
                <button
                  onClick={() => setIsAddingFolder(true)}
                  className="text-sm flex items-center gap-1 text-gray-600 hover:text-gray-800"
                >
                  <FolderPlus className="w-4 h-4" />
                  New Folder
                </button>
                <div className="flex items-center gap-4">
                  {selectedFolderId && (
                    <button
                      onClick={() => setSelectedFolderId(null)}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Show All
                    </button>
                  )}
                  <button
                    onClick={exportToCSV}
                    className="text-sm flex items-center gap-1 text-gray-600 hover:text-gray-800"
                  >
                    <Download className="w-4 h-4" />
                    Export CSV
                  </button>
                </div>
              </div>

              {isAddingFolder && (
                <div className="mb-4 flex gap-2">
                  <input
                    type="text"
                    placeholder="Folder name"
                    className="flex-1 p-2 border rounded-md"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addFolder()}
                  />
                  <button
                    onClick={addFolder}
                    className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setIsAddingFolder(false);
                      setNewFolderName('');
                    }}
                    className="px-3 py-2 bg-gray-200 text-gray-600 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {folders.length > 0 && (
                <div className="mb-4 space-y-1">
                  {folders.map((folder) => (
                    <div
                      key={folder.id}
                      className={`flex items-center justify-between p-2 rounded-md cursor-pointer ${
                        selectedFolderId === folder.id ? 'bg-blue-50' : 'hover:bg-gray-100'
                      }`}
                      onClick={() => setSelectedFolderId(folder.id)}
                    >
                      <div className="flex items-center gap-2">
                        <Folder className="w-4 h-4 text-gray-600" />
                        <span className="text-sm">{folder.name}</span>
                      </div>
                      {selectedFolderId === folder.id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteFolder(folder.id);
                          }}
                          className="text-red-500 hover:text-red-600"
                          title="Delete folder"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

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
                      <div className="flex flex-col">
                        <h3 className="font-semibold text-gray-800">{prompt.title}</h3>
                        <span className="text-xs text-gray-500 font-mono">Path: {getPromptPath(prompt)}</span>
                      </div>
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
                          onClick={() => setMovingPromptId(movingPromptId === prompt.id ? null : prompt.id)}
                          className="text-gray-500 hover:text-gray-600"
                          title="Move prompt"
                        >
                          <Move className="w-4 h-4" />
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
                    {movingPromptId === prompt.id && (
                      <div className="mb-2 p-2 bg-gray-50 rounded-md">
                        <div className="text-sm font-medium mb-1">Move to:</div>
                        <button
                          onClick={() => movePrompt(prompt.id, null)}
                          className="block w-full text-left px-2 py-1 text-sm hover:bg-gray-100 rounded"
                        >
                          Root
                        </button>
                        {folders.map(folder => (
                          <button
                            key={folder.id}
                            onClick={() => movePrompt(prompt.id, folder.id)}
                            className="block w-full text-left px-2 py-1 text-sm hover:bg-gray-100 rounded"
                          >
                            {folder.name}
                          </button>
                        ))}
                      </div>
                    )}
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