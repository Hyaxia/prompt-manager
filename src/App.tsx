import React, { useState, useEffect } from 'react';
import { Save, Trash2, Plus, Search, Folder, FolderPlus, Move, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
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

  const filteredPrompts = prompts.filter(prompt => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = prompt.title.toLowerCase().includes(query) ||
                         prompt.content.toLowerCase().includes(query);
    const matchesFolder = !selectedFolderId || prompt.folderId === selectedFolderId;
    return matchesSearch && matchesFolder;
  });

  return (
    <div className="w-[400px] min-h-[500px] bg-gray-50 p-4">
      <h1 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        <Save className="w-6 h-6" />
        Prompt Saver
      </h1>

      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => setIsAddingFolder(true)}
          className="text-sm flex items-center gap-1 text-gray-600 hover:text-gray-800"
        >
          <FolderPlus className="w-4 h-4" />
          New Folder
        </button>
        {selectedFolderId && (
          <button
            onClick={() => setSelectedFolderId(null)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Show All
          </button>
        )}
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
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mb-6 bg-white p-4 rounded-lg shadow-sm">
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
            className="w-full h-24 p-2 border rounded-md mb-2"
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
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => setMovingPromptId(movingPromptId === prompt.id ? null : prompt.id)}
                  className="text-gray-500 hover:text-gray-600"
                >
                  <Move className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deletePrompt(prompt.id)}
                  className="text-red-500 hover:text-red-600"
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
            <div className="prose prose-sm max-w-none text-gray-600">
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
  );
}

export default App;