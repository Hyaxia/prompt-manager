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
    (storage.get as jest.Mock).mockResolvedValue({ prompts: [] });
  });

  describe('Tab Navigation', () => {
    test('should show Browse Prompts tab by default', () => {
      render(<App />);
      
      // Verify Browse Prompts tab is visible and active
      const browseTab = screen.getByRole('tab', { name: 'Browse Prompts' });
      expect(browseTab).toHaveAttribute('aria-selected', 'true');
      
      // Verify browse elements are visible
      expect(screen.getByPlaceholderText('Search prompts...')).toBeInTheDocument();
    });

    test('should switch between tabs', async () => {
      render(<App />);
      
      // Switch to Add Prompt tab
      await userEvent.click(screen.getByRole('tab', { name: 'Add Prompt' }));
      
      // Verify Add Prompt tab is active
      const addPromptTab = screen.getByRole('tab', { name: 'Add Prompt' });
      expect(addPromptTab).toHaveAttribute('aria-selected', 'true');
      
      // Verify form elements are visible
      expect(screen.getByPlaceholderText('Prompt Title')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Enter your prompt/)).toBeInTheDocument();
      
      // Switch back to Browse Prompts tab
      await userEvent.click(screen.getByRole('tab', { name: 'Browse Prompts' }));
      
      // Verify Browse Prompts tab is active again
      const browseTab = screen.getByRole('tab', { name: 'Browse Prompts' });
      expect(browseTab).toHaveAttribute('aria-selected', 'true');
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
      
      // Verify we're back on the Browse Prompts tab
      const browseTab = screen.getByRole('tab', { name: 'Browse Prompts' });
      expect(browseTab).toHaveAttribute('aria-selected', 'true');
      
      // Verify the new prompt is visible in the browse view
      expect(screen.getByText('Test Prompt')).toBeInTheDocument();
      expect(screen.getByText('Test Content')).toBeInTheDocument();
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
      }];
      
      (storage.get as jest.Mock).mockResolvedValue({ prompts: mockPrompts });
      
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
      }];
      
      (storage.get as jest.Mock).mockResolvedValue({ prompts: mockPrompts });
      
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

    test('should edit an existing prompt', async () => {
      const mockPrompts = [{
        id: '1',
        title: 'Test Prompt',
        content: 'Test Content',
        createdAt: new Date().toISOString(),
      }];
      
      (storage.get as jest.Mock).mockResolvedValue({ prompts: mockPrompts });
      
      render(<App />);
      
      // Switch to Browse Prompts tab
      await userEvent.click(screen.getByRole('tab', { name: 'Browse Prompts' }));
      
      // Wait for the prompt to be rendered
      await screen.findByText('Test Prompt');
      
      // Click edit button
      const editButton = screen.getByTitle('Edit prompt');
      await userEvent.click(editButton);
      
      // Verify we're on the Change Prompt tab
      const changePromptTab = screen.getByRole('tab', { name: 'Change Prompt' });
      expect(changePromptTab).toHaveAttribute('aria-selected', 'true');
      
      // Verify form is populated with prompt data
      expect(screen.getByPlaceholderText('Prompt Title')).toHaveValue('Test Prompt');
      expect(screen.getByPlaceholderText(/Enter your prompt/)).toHaveValue('Test Content');
      
      // Update the prompt
      await userEvent.clear(screen.getByPlaceholderText('Prompt Title'));
      await userEvent.type(screen.getByPlaceholderText('Prompt Title'), 'Updated Prompt');
      await userEvent.clear(screen.getByPlaceholderText(/Enter your prompt/));
      await userEvent.type(screen.getByPlaceholderText(/Enter your prompt/), 'Updated Content');
      
      // Save changes
      await userEvent.click(screen.getByText('Save Changes'));
      
      // Verify storage was called with updated prompt
      expect(storage.set).toHaveBeenCalledWith({
        prompts: expect.arrayContaining([
          expect.objectContaining({
            id: '1',
            title: 'Updated Prompt',
            content: 'Updated Content',
            updatedAt: expect.any(String),
          }),
        ]),
      });
      
      // Verify we're back on the Browse Prompts tab
      const browseTab = screen.getByRole('tab', { name: 'Browse Prompts' });
      expect(browseTab).toHaveAttribute('aria-selected', 'true');
      
      // Verify the updated prompt is visible in the browse view
      expect(screen.getByText('Updated Prompt')).toBeInTheDocument();
      expect(screen.getByText('Updated Content')).toBeInTheDocument();
    });

    test('should cancel editing a prompt', async () => {
      const mockPrompts = [{
        id: '1',
        title: 'Test Prompt',
        content: 'Test Content',
        createdAt: new Date().toISOString(),
      }];
      
      (storage.get as jest.Mock).mockResolvedValue({ prompts: mockPrompts });
      
      render(<App />);
      
      // Switch to Browse Prompts tab
      await userEvent.click(screen.getByRole('tab', { name: 'Browse Prompts' }));
      
      // Wait for the prompt to be rendered
      await screen.findByText('Test Prompt');
      
      // Click edit button
      const editButton = screen.getByTitle('Edit prompt');
      await userEvent.click(editButton);
      
      // Verify we're on the Change Prompt tab
      const changePromptTab = screen.getByRole('tab', { name: 'Change Prompt' });
      expect(changePromptTab).toHaveAttribute('aria-selected', 'true');
      
      // Verify form is populated with prompt data
      expect(screen.getByPlaceholderText('Prompt Title')).toHaveValue('Test Prompt');
      expect(screen.getByPlaceholderText(/Enter your prompt/)).toHaveValue('Test Content');
      
      // Click cancel button
      await userEvent.click(screen.getByText('Cancel'));
      
      // Verify we're back on the Browse Prompts tab
      const browseTab = screen.getByRole('tab', { name: 'Browse Prompts' });
      expect(browseTab).toHaveAttribute('aria-selected', 'true');
      
      // Verify the original prompt is still visible and unchanged
      expect(screen.getByText('Test Prompt')).toBeInTheDocument();
      expect(screen.getByText('Test Content')).toBeInTheDocument();
      
      // Verify storage was not called
      expect(storage.set).not.toHaveBeenCalled();
    });

    test('should automatically switch to Change Prompt tab when editing', async () => {
      const mockPrompts = [{
        id: '1',
        title: 'Test Prompt',
        content: 'Test Content',
        createdAt: new Date().toISOString(),
      }];
      
      (storage.get as jest.Mock).mockResolvedValue({ prompts: mockPrompts });
      
      render(<App />);
      
      // Switch to Browse Prompts tab
      await userEvent.click(screen.getByRole('tab', { name: 'Browse Prompts' }));
      
      // Wait for the prompt to be rendered
      await screen.findByText('Test Prompt');
      
      // Verify we're on Browse Prompts tab
      const browseTab = screen.getByRole('tab', { name: 'Browse Prompts' });
      expect(browseTab).toHaveAttribute('aria-selected', 'true');
      
      // Click edit button
      const editButton = screen.getByTitle('Edit prompt');
      await userEvent.click(editButton);
      
      // Verify we're automatically switched to Change Prompt tab
      const changePromptTab = screen.getByRole('tab', { name: 'Change Prompt' });
      expect(changePromptTab).toHaveAttribute('aria-selected', 'true');
      
      // Verify form is populated with prompt data
      expect(screen.getByPlaceholderText('Prompt Title')).toHaveValue('Test Prompt');
      expect(screen.getByPlaceholderText(/Enter your prompt/)).toHaveValue('Test Content');
    });

    test('should switch to Browse Prompts tab after saving changes', async () => {
      const mockPrompts = [{
        id: '1',
        title: 'Test Prompt',
        content: 'Test Content',
        createdAt: new Date().toISOString(),
      }];
      
      (storage.get as jest.Mock).mockResolvedValue({ prompts: mockPrompts });
      
      render(<App />);
      
      // Switch to Browse Prompts tab first
      await userEvent.click(screen.getByRole('tab', { name: 'Browse Prompts' }));
      
      // Wait for the prompt to be rendered
      await screen.findByText('Test Prompt');
      
      // Start editing an existing prompt
      const editButton = screen.getByTitle('Edit prompt');
      await userEvent.click(editButton);
      
      // Verify we're on the Change Prompt tab
      const changePromptTab = screen.getByRole('tab', { name: 'Change Prompt' });
      expect(changePromptTab).toHaveAttribute('aria-selected', 'true');
      
      // Make some changes
      await userEvent.clear(screen.getByPlaceholderText('Prompt Title'));
      await userEvent.type(screen.getByPlaceholderText('Prompt Title'), 'Updated Title');
      
      // Click Save Changes
      await userEvent.click(screen.getByText('Save Changes'));
      
      // Verify we're automatically switched to Browse Prompts tab
      const browseTab = screen.getByRole('tab', { name: 'Browse Prompts' });
      expect(browseTab).toHaveAttribute('aria-selected', 'true');
      
      // Verify we can see the updated content in the browse view
      expect(screen.getByText('Updated Title')).toBeInTheDocument();
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
        },
        {
          id: '2',
          title: 'Test Prompt 2',
          content: 'Second content',
          createdAt: new Date().toISOString(),
        },
      ];
      
      (storage.get as jest.Mock).mockResolvedValue({ prompts: mockPrompts });
      
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

    test('should show scrollbar when there are many prompts', async () => {
      // Create 20 mock prompts to ensure scrolling is needed
      const mockPrompts = Array.from({ length: 20 }, (_, index) => ({
        id: index.toString(),
        title: `Test Prompt ${index + 1}`,
        content: `Content for prompt ${index + 1}`,
        createdAt: new Date().toISOString(),
      }));
      
      (storage.get as jest.Mock).mockResolvedValue({ prompts: mockPrompts });
      
      render(<App />);
      
      // Switch to Browse Prompts tab
      await userEvent.click(screen.getByRole('tab', { name: 'Browse Prompts' }));
      
      // Wait for prompts to be rendered
      await screen.findByText('Test Prompt 1');
      
      // Find the scrollable container (the div with space-y-3 class)
      const promptsContainer = screen.getByText('Test Prompt 1')
        .closest('.space-y-3');
      
      // Verify the container has the correct classes for scrolling
      expect(promptsContainer).toHaveClass('overflow-y-auto');
      expect(promptsContainer).toHaveClass('max-h-[500px]');
      
      // Verify all prompts are rendered
      mockPrompts.forEach(prompt => {
        expect(screen.getByText(prompt.title)).toBeInTheDocument();
      });
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

    test('should export prompts to CSV', async () => {
      const mockPrompts = [
        {
          id: '1',
          title: 'Test Prompt 1',
          content: 'First content',
          createdAt: new Date().toISOString(),
        },
        {
          id: '2',
          title: 'Test Prompt 2',
          content: 'Second content',
          createdAt: new Date().toISOString(),
        },
      ];
      
      (storage.get as jest.Mock).mockResolvedValue({ prompts: mockPrompts });
      
      render(<App />);
      
      // Click export button
      await userEvent.click(screen.getByText('Export CSV'));
      
      // Verify URL.createObjectURL was called
      expect(URL.createObjectURL).toHaveBeenCalled();
      
      // Verify URL.revokeObjectURL was called
      expect(URL.revokeObjectURL).toHaveBeenCalled();
    });
  });

  describe('Show More/Less Functionality', () => {
    test('should show truncated content with Show More button for long prompts', async () => {
      const longContent = 'A'.repeat(300);
      const mockPrompts = [{
        id: '1',
        title: 'Long Prompt',
        content: longContent,
        createdAt: new Date().toISOString(),
      }];
      
      (storage.get as jest.Mock).mockResolvedValue({ prompts: mockPrompts });
      
      render(<App />);
      
      // Switch to Browse Prompts tab
      await userEvent.click(screen.getByRole('tab', { name: 'Browse Prompts' }));
      
      // Verify the content is truncated
      const contentContainer = screen.getByTestId('prompt-content');
      expect(contentContainer).toHaveClass('max-h-[100px]');
      
      // Verify Show More button is present
      const showMoreButton = screen.getByText('Show More');
      expect(showMoreButton).toBeInTheDocument();
    });

    test('should not show Show More button for short prompts', async () => {
      const shortContent = 'Short content';
      const mockPrompts = [{
        id: '1',
        title: 'Short Prompt',
        content: shortContent,
        createdAt: new Date().toISOString(),
      }];
      
      (storage.get as jest.Mock).mockResolvedValue({ prompts: mockPrompts });
      
      render(<App />);
      
      // Switch to Browse Prompts tab
      await userEvent.click(screen.getByRole('tab', { name: 'Browse Prompts' }));
      
      // Verify Show More button is not present
      expect(screen.queryByText('Show More')).not.toBeInTheDocument();
      expect(screen.queryByText('Show Less')).not.toBeInTheDocument();
    });

    test('should toggle content visibility when clicking Show More/Less', async () => {
      const longContent = 'A'.repeat(300);
      const mockPrompts = [{
        id: '1',
        title: 'Long Prompt',
        content: longContent,
        createdAt: new Date().toISOString(),
      }];
      
      (storage.get as jest.Mock).mockResolvedValue({ prompts: mockPrompts });
      
      render(<App />);
      
      // Switch to Browse Prompts tab
      await userEvent.click(screen.getByRole('tab', { name: 'Browse Prompts' }));
      
      // Initial state: content is truncated
      let contentContainer = screen.getByTestId('prompt-content');
      expect(contentContainer).toHaveClass('max-h-[100px]');
      
      // Click Show More
      await userEvent.click(screen.getByText('Show More'));
      
      // Content should be expanded
      contentContainer = screen.getByTestId('prompt-content');
      expect(contentContainer).toHaveClass('min-h-[100px]');
      expect(contentContainer).not.toHaveClass('max-h-[100px]');
      
      // Show Less button should be visible
      expect(screen.getByText('Show Less')).toBeInTheDocument();
      
      // Click Show Less
      await userEvent.click(screen.getByText('Show Less'));
      
      // Content should be truncated again
      contentContainer = screen.getByTestId('prompt-content');
      expect(contentContainer).toHaveClass('max-h-[100px]');
    });

    test('should maintain gradient overlay only when content is truncated', async () => {
      const longContent = 'A'.repeat(300);
      const mockPrompts = [{
        id: '1',
        title: 'Long Prompt',
        content: longContent,
        createdAt: new Date().toISOString(),
      }];
      
      (storage.get as jest.Mock).mockResolvedValue({ prompts: mockPrompts });
      
      render(<App />);
      
      // Switch to Browse Prompts tab
      await userEvent.click(screen.getByRole('tab', { name: 'Browse Prompts' }));
      
      // Initial state: gradient overlay should be present
      expect(screen.getByText(longContent).closest('div')?.nextSibling).toHaveClass('bg-gradient-to-t');
      
      // Click Show More
      await userEvent.click(screen.getByText('Show More'));
      
      // Gradient overlay should be removed
      expect(screen.getByText(longContent).closest('div')?.nextSibling).toBeFalsy();
      
      // Click Show Less
      await userEvent.click(screen.getByText('Show Less'));
      
      // Gradient overlay should be back
      expect(screen.getByText(longContent).closest('div')?.nextSibling).toHaveClass('bg-gradient-to-t');
    });
  });
}); 