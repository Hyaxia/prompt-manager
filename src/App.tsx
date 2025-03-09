import React, { useState, useEffect } from 'react';
import { Save, Trash2, Plus, Search } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import storage from './storage';

interface Prompt {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

function App() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [preview, setPreview] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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

    const newPrompt: Prompt = {
      id: Date.now().toString(),
      title,
      content,
      createdAt: new Date().toISOString(),
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

  const filteredPrompts = prompts.filter(prompt => {
    const query = searchQuery.toLowerCase();
    return (
      prompt.title.toLowerCase().includes(query) ||
      prompt.content.toLowerCase().includes(query)
    );
  });

  return (
    <div className="w-[400px] min-h-[500px] bg-gray-50 p-4">
      <h1 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        <Save className="w-6 h-6" />
        Prompt Saver
      </h1>

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
              <button
                onClick={() => deletePrompt(prompt.id)}
                className="text-red-500 hover:text-red-600"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
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