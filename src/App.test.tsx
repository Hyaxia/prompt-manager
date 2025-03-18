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
      expect(screen.getByPlaceholderText('Enter prompt title')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter prompt content')).toBeInTheDocument();
      
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
      await userEvent.type(screen.getByPlaceholderText('Enter prompt title'), 'Test Prompt');
      await userEvent.type(screen.getByPlaceholderText('Enter prompt content'), 'Test Content');
      
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

    test('should limit title to 30 characters', async () => {
      render(<App />);
      
      // Ensure we're on the Add Prompt tab
      await userEvent.click(screen.getByRole('tab', { name: 'Add Prompt' }));
      
      // Get the title input
      const titleInput = screen.getByPlaceholderText('Enter prompt title');
      
      // Type a long title (more than 30 characters)
      const longTitle = 'This is a very long title that exceeds thirty characters';
      await userEvent.type(titleInput, longTitle);
      
      // Verify the input value is truncated to 30 characters
      expect(titleInput).toHaveValue(longTitle.slice(0, 30));
      
      // Verify the character counter shows 30/30
      expect(screen.getByText('30/30')).toBeInTheDocument();
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
      expect(screen.getByPlaceholderText('Enter prompt title')).toHaveValue('Test Prompt');
      expect(screen.getByPlaceholderText('Enter prompt content')).toHaveValue('Test Content');
      
      // Update the prompt
      await userEvent.clear(screen.getByPlaceholderText('Enter prompt title'));
      await userEvent.type(screen.getByPlaceholderText('Enter prompt title'), 'Updated Prompt');
      await userEvent.clear(screen.getByPlaceholderText('Enter prompt content'));
      await userEvent.type(screen.getByPlaceholderText('Enter prompt content'), 'Updated Content');
      
      // Save changes
      await userEvent.click(screen.getByText('Update Prompt'));
      
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
      expect(screen.getByPlaceholderText('Enter prompt title')).toHaveValue('Test Prompt');
      expect(screen.getByPlaceholderText('Enter prompt content')).toHaveValue('Test Content');
      
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
      expect(screen.getByPlaceholderText('Enter prompt title')).toHaveValue('Test Prompt');
      expect(screen.getByPlaceholderText('Enter prompt content')).toHaveValue('Test Content');
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
      await userEvent.clear(screen.getByPlaceholderText('Enter prompt title'));
      await userEvent.type(screen.getByPlaceholderText('Enter prompt title'), 'Updated Title');
      
      // Click Save Changes
      await userEvent.click(screen.getByText('Update Prompt'));
      
      // Verify we're automatically switched to Browse Prompts tab
      const browseTab = screen.getByRole('tab', { name: 'Browse Prompts' });
      expect(browseTab).toHaveAttribute('aria-selected', 'true');
      
      // Verify we can see the updated content in the browse view
      expect(screen.getByText('Updated Title')).toBeInTheDocument();
    });
  });

  describe('Tag Management', () => {
    test('should add tags to a new prompt', async () => {
      render(<App />);
      
      // Ensure we're on the Add Prompt tab
      await userEvent.click(screen.getByRole('tab', { name: 'Add Prompt' }));
      
      // Fill in the prompt details
      await userEvent.type(screen.getByPlaceholderText('Enter prompt title'), 'Test Prompt');
      await userEvent.type(screen.getByPlaceholderText('Enter prompt content'), 'Test Content');
      
      // Add tags
      const tagInput = screen.getByPlaceholderText('Add tags (press Enter)');
      await userEvent.type(tagInput, 'tag1{enter}');
      await userEvent.type(tagInput, 'tag2{enter}');
      
      // Verify tags are displayed
      expect(screen.getByText('tag1')).toBeInTheDocument();
      expect(screen.getByText('tag2')).toBeInTheDocument();
      
      // Save the prompt
      await userEvent.click(screen.getByText('Save Prompt'));
      
      // Verify storage was called with the new prompt including tags
      expect(storage.set).toHaveBeenCalledWith(expect.objectContaining({
        prompts: expect.arrayContaining([
          expect.objectContaining({
            title: 'Test Prompt',
            content: 'Test Content',
            tags: ['tag1', 'tag2'],
          }),
        ]),
      }));
      
      // Verify tags are visible in the browse view
      expect(screen.getByText('tag1')).toBeInTheDocument();
      expect(screen.getByText('tag2')).toBeInTheDocument();
    });

    test('should not add duplicate tags', async () => {
      render(<App />);
      
      // Ensure we're on the Add Prompt tab
      await userEvent.click(screen.getByRole('tab', { name: 'Add Prompt' }));
      
      // Add the same tag twice
      const tagInput = screen.getByPlaceholderText('Add tags (press Enter)');
      await userEvent.type(tagInput, 'tag1{enter}');
      await userEvent.type(tagInput, 'tag1{enter}');
      
      // Verify only one instance of the tag is displayed
      const tagElements = screen.getAllByText('tag1');
      expect(tagElements).toHaveLength(1);
    });

    test('should remove tags from a prompt', async () => {
      render(<App />);
      
      // Ensure we're on the Add Prompt tab
      await userEvent.click(screen.getByRole('tab', { name: 'Add Prompt' }));
      
      // Add a tag
      const tagInput = screen.getByPlaceholderText('Add tags (press Enter)');
      await userEvent.type(tagInput, 'tag1{enter}');
      
      // Remove the tag
      const removeButton = screen.getByText('×');
      await userEvent.click(removeButton);
      
      // Verify tag is removed
      expect(screen.queryByText('tag1')).not.toBeInTheDocument();
    });

    test('should edit tags of an existing prompt', async () => {
      const mockPrompts = [{
        id: '1',
        title: 'Test Prompt',
        content: 'Test Content',
        tags: ['old-tag'],
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
      
      // Verify existing tag is displayed
      expect(screen.getByText('old-tag')).toBeInTheDocument();
      
      // Remove old tag
      const removeButton = screen.getByText('×');
      await userEvent.click(removeButton);
      
      // Add new tag
      const tagInput = screen.getByPlaceholderText('Add tags (press Enter)');
      await userEvent.type(tagInput, 'new-tag{enter}');
      
      // Save changes
      await userEvent.click(screen.getByText('Update Prompt'));
      
      // Verify storage was called with updated tags
      expect(storage.set).toHaveBeenCalledWith({
        prompts: expect.arrayContaining([
          expect.objectContaining({
            id: '1',
            title: 'Test Prompt',
            content: 'Test Content',
            tags: ['new-tag'],
            updatedAt: expect.any(String),
          }),
        ]),
      });
      
      // Verify new tag is visible in the browse view
      expect(screen.getByText('new-tag')).toBeInTheDocument();
      expect(screen.queryByText('old-tag')).not.toBeInTheDocument();
    });

    test('should search prompts by tags', async () => {
      const mockPrompts = [
        {
          id: '1',
          title: 'Prompt 1',
          content: 'Content 1',
          tags: ['tag1', 'tag2'],
          createdAt: new Date().toISOString(),
        },
        {
          id: '2',
          title: 'Prompt 2',
          content: 'Content 2',
          tags: ['tag3'],
          createdAt: new Date().toISOString(),
        },
      ];
      
      (storage.get as jest.Mock).mockResolvedValue({ prompts: mockPrompts });
      
      render(<App />);
      
      // Switch to Browse Prompts tab
      await userEvent.click(screen.getByRole('tab', { name: 'Browse Prompts' }));
      
      // Wait for prompts to be rendered
      await screen.findByText('Prompt 1');
      await screen.findByText('Prompt 2');
      
      // Search by tag
      const searchInput = screen.getByPlaceholderText('Search prompts...');
      await userEvent.type(searchInput, 'tag1');
      
      // Verify only prompt with matching tag is shown
      expect(screen.getByText('Prompt 1')).toBeInTheDocument();
      expect(screen.queryByText('Prompt 2')).not.toBeInTheDocument();
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
      const longContent = 'A'.repeat(301);
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
      
      // Wait for and verify Show More button is present
      const showMoreButton = await screen.findByText('Show More');
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
      
      // Verify content is not truncated
      expect(screen.queryByTestId('fade-gradient')).not.toBeInTheDocument();
    });

    test('should toggle content visibility when clicking Show More/Less', async () => {
      const longContent = 'A'.repeat(301);
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
      
      // Wait for the content to be rendered and showMoreState to be calculated
      await screen.findByText('Long Prompt');
      
      // Initial state: content is truncated
      let contentContainer = screen.getByTestId('prompt-content');
      expect(contentContainer).toHaveClass('max-h-[100px]');
      
      // Wait for and click Show More
      const showMoreButton = await screen.findByText('Show More');
      await userEvent.click(showMoreButton);
      
      // Content should be expanded
      contentContainer = screen.getByTestId('prompt-content');
      expect(contentContainer).not.toHaveClass('max-h-[100px]');
      
      // Wait for and verify Show Less button is visible
      const showLessButton = await screen.findByText('Show Less');
      expect(showLessButton).toBeInTheDocument();
      
      // Click Show Less
      await userEvent.click(showLessButton);
      
      // Content should be truncated again
      contentContainer = screen.getByTestId('prompt-content');
      expect(contentContainer).toHaveClass('max-h-[100px]');
    });

    test('should maintain gradient overlay only when content is truncated', async () => {
      const longContent = 'A'.repeat(301);
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
      const gradientOverlay = screen.getByTestId('prompt-content').parentElement?.querySelector('.bg-gradient-to-t');
      expect(gradientOverlay).toBeInTheDocument();
      expect(gradientOverlay).toHaveClass('bg-gradient-to-t');
      
      // Wait for and click Show More
      const showMoreButton = await screen.findByText('Show More');
      await userEvent.click(showMoreButton);
      
      // Gradient overlay should be removed
      expect(screen.getByTestId('prompt-content').parentElement?.querySelector('.bg-gradient-to-t')).not.toBeInTheDocument();
      
      // Wait for and click Show Less
      const showLessButton = await screen.findByText('Show Less');
      await userEvent.click(showLessButton);
      
      // Gradient overlay should be back
      const gradientOverlayAfter = screen.getByTestId('prompt-content').parentElement?.querySelector('.bg-gradient-to-t');
      expect(gradientOverlayAfter).toBeInTheDocument();
      expect(gradientOverlayAfter).toHaveClass('bg-gradient-to-t');
    });
  });

  describe('Content Formatting', () => {
    test('should preserve multiple newlines in prompt content', async () => {
      const contentWithNewlines = 'Line 1\n\nLine 2\n\n\nLine 3';
      const mockPrompts = [{
        id: '1',
        title: 'Test Prompt',
        content: contentWithNewlines,
        createdAt: new Date().toISOString(),
        tags: []
      }];
      
      (storage.get as jest.Mock).mockResolvedValue({ prompts: mockPrompts });
      
      render(<App />);
      
      // Switch to Browse Prompts tab
      await userEvent.click(screen.getByRole('tab', { name: 'Browse Prompts' }));
      
      // Get the content container
      const contentContainer = screen.getByTestId('prompt-content');
      
      // Verify whitespace-pre-wrap class is present
      expect(contentContainer).toHaveClass('whitespace-pre-wrap');
      
      // Verify the content is rendered with preserved newlines
      // Instead of looking for <p>, we'll check the actual rendered content
      expect(contentContainer).toHaveTextContent('Line 1');
      expect(contentContainer).toHaveTextContent('Line 2');
      expect(contentContainer).toHaveTextContent('Line 3');
      
      // Test creating a new prompt with multiple newlines
      await userEvent.click(screen.getByRole('tab', { name: 'Add Prompt' }));
      await userEvent.type(screen.getByPlaceholderText('Enter prompt title'), 'New Prompt');
      await userEvent.type(screen.getByPlaceholderText('Enter prompt content'), contentWithNewlines);
      await userEvent.click(screen.getByText('Save Prompt'));
      
      // Verify the new prompt's content preserves newlines
      const newContentContainer = screen.getAllByTestId('prompt-content')[1];
      expect(newContentContainer).toHaveClass('whitespace-pre-wrap');
      expect(newContentContainer).toHaveTextContent('Line 1');
      expect(newContentContainer).toHaveTextContent('Line 2');
      expect(newContentContainer).toHaveTextContent('Line 3');
    });
  });
  describe('Show More for Repetitive Content', () => {
    // test('should show truncated content with Show More button for repetitive content', async () => {
    //   // Create content with many repeated lines
    //   const repetitiveContent = Array(20).fill('g\n');
    //   const mockPrompts = [{
    //     id: '1',
    //     title: 'Repetitive Prompt',
    //     content: repetitiveContent,
    //     createdAt: new Date().toISOString(),
    //   }];
      
    //   (storage.get as jest.Mock).mockResolvedValue({ prompts: mockPrompts });
      
    //   render(<App />);
      
    //   // Switch to Browse Prompts tab
    //   await userEvent.click(screen.getByRole('tab', { name: 'Browse Prompts' }));
      
    //   // Verify the content is truncated initially
    //   const contentContainer = screen.getByTestId('prompt-content');
    //   expect(contentContainer).toHaveClass('max-h-[100px]');
      
    //   // Wait for and verify Show More button is present
    //   const showMoreButton = await screen.findByText('Show More');
    //   expect(showMoreButton).toBeInTheDocument();
      
    //   // Click Show More
    //   await userEvent.click(showMoreButton);
      
    //   // Verify content is expanded
    //   expect(contentContainer).not.toHaveClass('max-h-[100px]');
      
    //   // Wait for and verify Show Less button is now present
    //   const showLessButton = await screen.findByText('Show Less');
    //   expect(showLessButton).toBeInTheDocument();
      
    //   // Click Show Less
    //   await userEvent.click(showLessButton);
      
    //   // Verify content is truncated again
    //   expect(contentContainer).toHaveClass('max-h-[100px]');
    // });
  });
}); 