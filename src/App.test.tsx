import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import storage from './storage';

// Extend Window interface for test environment
declare global {
  interface Window {
    URL: {
      createObjectURL: jest.Mock;
      revokeObjectURL: jest.Mock;
    };
  }
}

// Mock ReactMarkdown component
jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({ children }: { children: string }) => <div>{children}</div>,
}));

// Mock the storage module
jest.mock('./storage', () => ({
  get: jest.fn(),
  set: jest.fn(),
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(),
  },
});

describe('Prompt Manager', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    // Setup default storage mock returns
    (storage.get as jest.Mock).mockResolvedValue({ prompts: [], folders: [] });
  });

  describe('Tab Navigation', () => {
    test('should show Add Prompt tab by default', () => {
      render(<App />);
      
      // Verify Add Prompt tab is visible and active
      const addPromptTab = screen.getByRole('tab', { name: 'Add Prompt' });
      expect(addPromptTab).toHaveAttribute('aria-selected', 'true');
      
      // Verify form elements are visible
      expect(screen.getByPlaceholderText('Prompt Title')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Enter your prompt/)).toBeInTheDocument();
    });

    test('should switch between tabs', async () => {
      render(<App />);
      
      // Switch to Browse Prompts tab
      await userEvent.click(screen.getByRole('tab', { name: 'Browse Prompts' }));
      
      // Verify Browse Prompts tab is active
      const browseTab = screen.getByRole('tab', { name: 'Browse Prompts' });
      expect(browseTab).toHaveAttribute('aria-selected', 'true');
      
      // Verify browse elements are visible
      expect(screen.getByPlaceholderText('Search prompts...')).toBeInTheDocument();
      expect(screen.getByText('New Folder')).toBeInTheDocument();
      
      // Switch back to Add Prompt tab
      await userEvent.click(screen.getByRole('tab', { name: 'Add Prompt' }));
      
      // Verify Add Prompt tab is active again
      const addPromptTab = screen.getByRole('tab', { name: 'Add Prompt' });
      expect(addPromptTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('Prompt Management', () => {
    test('should create a new prompt', async () => {
      render(<App />);
      
      // Ensure we're on the Add Prompt tab
      await userEvent.click(screen.getByRole('tab', { name: 'Add Prompt' }));
      
      // Fill in the prompt details
      await userEvent.type(screen.getByPlaceholderText('Prompt Title'), 'Test Prompt');
      await userEvent.type(screen.getByPlaceholderText(/Enter your prompt/), 'Test Content');
      
      // Save the prompt
      await userEvent.click(screen.getByText('Save Prompt'));
      
      // Verify storage was called with the new prompt
      expect(storage.set).toHaveBeenCalledWith(expect.objectContaining({
        prompts: expect.arrayContaining([
          expect.objectContaining({
            title: 'Test Prompt',
            content: 'Test Content',
          }),
        ]),
      }));
      
      // Verify the form is cleared
      expect(screen.getByPlaceholderText('Prompt Title')).toHaveValue('');
      expect(screen.getByPlaceholderText(/Enter your prompt/)).toHaveValue('');
    });

    test('should not save prompt with empty title or content', async () => {
      render(<App />);
      
      // Ensure we're on the Add Prompt tab
      await userEvent.click(screen.getByRole('tab', { name: 'Add Prompt' }));
      
      // Try to save without title and content
      await userEvent.click(screen.getByText('Save Prompt'));
      
      // Verify storage was not called
      expect(storage.set).not.toHaveBeenCalled();
    });

    test('should delete a prompt', async () => {
      const mockPrompts = [{
        id: '1',
        title: 'Test Prompt',
        content: 'Test Content',
        createdAt: new Date().toISOString(),
        folderId: null,
      }];
      
      (storage.get as jest.Mock).mockResolvedValue({ prompts: mockPrompts, folders: [] });
      
      render(<App />);
      
      // Switch to Browse Prompts tab
      await userEvent.click(screen.getByRole('tab', { name: 'Browse Prompts' }));
      
      // Wait for the prompt to be rendered
      await screen.findByText('Test Prompt');
      
      // Delete the prompt
      const deleteButton = screen.getByTitle('Delete prompt');
      await userEvent.click(deleteButton);
      
      // Verify storage was called with empty prompts array
      expect(storage.set).toHaveBeenCalledWith({ prompts: [] });
    });

    test('should copy prompt content to clipboard', async () => {
      const mockPrompts = [{
        id: '1',
        title: 'Test Prompt',
        content: 'Test Content',
        createdAt: new Date().toISOString(),
        folderId: null,
      }];
      
      (storage.get as jest.Mock).mockResolvedValue({ prompts: mockPrompts, folders: [] });
      
      render(<App />);
      
      // Switch to Browse Prompts tab
      await userEvent.click(screen.getByRole('tab', { name: 'Browse Prompts' }));
      
      // Wait for the prompt to be rendered
      await screen.findByText('Test Prompt');
      
      // Click copy button
      const copyButton = screen.getByTitle('Copy to clipboard');
      await userEvent.click(copyButton);
      
      // Verify clipboard API was called
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Test Content');
      
      // Verify success icon appears
      expect(screen.getByTestId('check-icon')).toBeInTheDocument();
    });
  });

  describe('Folder Management', () => {
    test('should create a new folder', async () => {
      render(<App />);
      
      // Switch to Browse Prompts tab
      await userEvent.click(screen.getByRole('tab', { name: 'Browse Prompts' }));
      
      // Click new folder button
      await userEvent.click(screen.getByText('New Folder'));
      
      // Fill in folder name
      await userEvent.type(screen.getByPlaceholderText('Folder name'), 'Test Folder');
      
      // Save the folder
      await userEvent.click(screen.getByText('Add'));
      
      // Verify storage was called with the new folder
      expect(storage.set).toHaveBeenCalledWith(expect.objectContaining({
        folders: expect.arrayContaining([
          expect.objectContaining({
            name: 'Test Folder',
          }),
        ]),
      }));
    });

    test('should delete a folder and move its prompts to root', async () => {
      const mockFolders = [{
        id: '1',
        name: 'Test Folder',
        createdAt: new Date().toISOString(),
      }];
      
      const mockPrompts = [{
        id: '1',
        title: 'Test Prompt',
        content: 'Test Content',
        createdAt: new Date().toISOString(),
        folderId: '1',
      }];
      
      (storage.get as jest.Mock).mockResolvedValue({ 
        prompts: mockPrompts, 
        folders: mockFolders 
      });
      
      render(<App />);
      
      // Switch to Browse Prompts tab
      await userEvent.click(screen.getByRole('tab', { name: 'Browse Prompts' }));
      
      // Wait for folder to be rendered and click it
      await userEvent.click(await screen.findByText('Test Folder'));
      
      // Delete the folder
      const deleteButton = screen.getByTitle('Delete folder');
      await userEvent.click(deleteButton);
      
      // Verify storage was called with updated data
      expect(storage.set).toHaveBeenCalledWith({
        folders: [],
        prompts: expect.arrayContaining([
          expect.objectContaining({
            id: '1',
            folderId: null,
          }),
        ]),
      });
    });
  });

  describe('Search and Filter', () => {
    test('should filter prompts by search query', async () => {
      const mockPrompts = [
        {
          id: '1',
          title: 'Test Prompt 1',
          content: 'First content',
          createdAt: new Date().toISOString(),
          folderId: null,
        },
        {
          id: '2',
          title: 'Test Prompt 2',
          content: 'Second content',
          createdAt: new Date().toISOString(),
          folderId: null,
        },
      ];
      
      (storage.get as jest.Mock).mockResolvedValue({ prompts: mockPrompts, folders: [] });
      
      render(<App />);
      
      // Switch to Browse Prompts tab
      await userEvent.click(screen.getByRole('tab', { name: 'Browse Prompts' }));
      
      // Wait for prompts to be rendered
      await screen.findByText('Test Prompt 1');
      await screen.findByText('Test Prompt 2');
      
      // Search for "First"
      await userEvent.type(screen.getByPlaceholderText('Search prompts...'), 'First');
      
      // Verify only the matching prompt is shown
      expect(screen.getByText('Test Prompt 1')).toBeInTheDocument();
      expect(screen.queryByText('Test Prompt 2')).not.toBeInTheDocument();
    });

    test('should filter prompts by folder', async () => {
      const mockFolders = [{
        id: '1',
        name: 'Test Folder',
        createdAt: new Date().toISOString(),
      }];
      
      const mockPrompts = [
        {
          id: '1',
          title: 'Folder Prompt',
          content: 'In folder',
          createdAt: new Date().toISOString(),
          folderId: '1',
        },
        {
          id: '2',
          title: 'Root Prompt',
          content: 'In root',
          createdAt: new Date().toISOString(),
          folderId: null,
        },
      ];
      
      (storage.get as jest.Mock).mockResolvedValue({ 
        prompts: mockPrompts, 
        folders: mockFolders 
      });
      
      render(<App />);
      
      // Switch to Browse Prompts tab
      await userEvent.click(screen.getByRole('tab', { name: 'Browse Prompts' }));
      
      // Wait for all content to be rendered
      await screen.findByText('Test Folder');
      await screen.findByText('Folder Prompt');
      await screen.findByText('Root Prompt');
      
      // Click the folder
      await userEvent.click(screen.getByText('Test Folder'));
      
      // Verify only folder prompts are shown
      expect(screen.getByText('Folder Prompt')).toBeInTheDocument();
      expect(screen.queryByText('Root Prompt')).not.toBeInTheDocument();
      
      // Click show all
      await userEvent.click(screen.getByText('Show All'));
      
      // Verify all prompts are shown
      expect(screen.getByText('Folder Prompt')).toBeInTheDocument();
      expect(screen.getByText('Root Prompt')).toBeInTheDocument();
    });
  });

  describe('CSV Export', () => {
    let originalCreateObjectURL: typeof URL.createObjectURL;
    let originalRevokeObjectURL: typeof URL.revokeObjectURL;

    beforeEach(() => {
      // Store original methods
      originalCreateObjectURL = URL.createObjectURL;
      originalRevokeObjectURL = URL.revokeObjectURL;
      // Mock URL methods
      URL.createObjectURL = jest.fn();
      URL.revokeObjectURL = jest.fn();
    });

    afterEach(() => {
      // Restore original methods
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
    });

    test('should export prompts to CSV with correct format', async () => {
      const mockDate = new Date('2024-01-01');
      const mockPrompts = [
        {
          id: '1',
          title: 'Test Prompt 1',
          content: 'Content with "quotes"',
          createdAt: mockDate.toISOString(),
          folderId: null,
        },
        {
          id: '2',
          title: 'Test Prompt 2',
          content: 'Content in folder',
          createdAt: mockDate.toISOString(),
          folderId: 'folder1',
        },
      ];

      const mockFolders = [
        {
          id: 'folder1',
          name: 'Test Folder',
          createdAt: mockDate.toISOString(),
        },
      ];

      (storage.get as jest.Mock).mockResolvedValue({ 
        prompts: mockPrompts, 
        folders: mockFolders 
      });

      render(<App />);

      // Switch to Browse Prompts tab
      await userEvent.click(screen.getByRole('tab', { name: 'Browse Prompts' }));

      // Mock document.createElement to capture the download attributes
      const mockAnchor = { click: jest.fn(), href: '', download: '' } as Partial<HTMLAnchorElement>;
      const originalCreateElement = document.createElement.bind(document);
      jest.spyOn(document, 'createElement').mockImplementation((tag): HTMLElement => {
        if (tag === 'a') return mockAnchor as HTMLAnchorElement;
        return originalCreateElement(tag);
      });

      // Click export button
      await userEvent.click(screen.getByText('Export CSV'));

      // Verify Blob creation with correct CSV content
      const createObjectURLCalls = (URL.createObjectURL as jest.Mock).mock.calls;
      expect(createObjectURLCalls).toHaveLength(1);
      const [blob] = createObjectURLCalls[0];
      
      // Read blob content
      const reader = new FileReader();
      const csvText = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsText(blob);
      });
      
      expect(csvText).toContain('"Title","Content","Created At","Folder"');
      expect(csvText).toContain('"Test Prompt 1","Content with ""quotes""",');
      expect(csvText).toContain('"Test Prompt 2","Content in folder",');
      expect(csvText).toContain('"root"');
      expect(csvText).toContain('"Test Folder"');

      // Verify download attributes
      expect(mockAnchor.download).toMatch(/^prompts_\d{4}-\d{2}-\d{2}\.csv$/);
      expect(mockAnchor.click).toHaveBeenCalled();

      // Verify URL cleanup
      expect(URL.revokeObjectURL).toHaveBeenCalled();
    });

    test('should show export button only in Browse Prompts tab', async () => {
      render(<App />);

      // Should not be visible in Add Prompt tab
      expect(screen.queryByText('Export CSV')).not.toBeInTheDocument();

      // Switch to Browse Prompts tab
      await userEvent.click(screen.getByRole('tab', { name: 'Browse Prompts' }));

      // Should be visible in Browse Prompts tab
      expect(screen.getByText('Export CSV')).toBeInTheDocument();
    });
  });
}); 