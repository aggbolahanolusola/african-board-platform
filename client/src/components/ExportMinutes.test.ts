import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExportMinutes } from './ExportMinutes';
import React from 'react';

describe('ExportMinutes Component', () => {
  const mockActionItems = [
    {
      id: '1',
      description: 'Review compliance documents',
      assignee: 'John Doe',
      dueDate: '2026-02-15',
      status: 'open' as const,
    },
    {
      id: '2',
      description: 'Update board policies',
      assignee: 'Jane Smith',
      dueDate: '2026-02-20',
      status: 'inProgress' as const,
    },
  ];

  const mockProps = {
    meetingId: 1,
    title: 'Board Meeting - January 2026',
    date: '2026-01-23',
    attendees: ['John Doe', 'Jane Smith', 'Bob Johnson'],
    content: 'Meeting discussion about Q1 governance initiatives...',
    actionItems: mockActionItems,
    speakers: [
      { name: 'John Doe', speakTime: 300 },
      { name: 'Jane Smith', speakTime: 450 },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders export component with all format options', () => {
    const { container } = render(
      React.createElement(ExportMinutes, mockProps)
    );

    expect(screen.getByText('Export Meeting Minutes')).toBeDefined();
    expect(screen.getByText('Plain Text (.txt)')).toBeDefined();
    expect(screen.getByText('HTML (.html)')).toBeDefined();
    expect(screen.getByText('PDF (.pdf)')).toBeDefined();
  });

  it('allows format selection via radio buttons', async () => {
    const user = userEvent.setup();
    const { container } = render(
      React.createElement(ExportMinutes, mockProps)
    );

    const htmlRadio = container.querySelector(
      'input[value="html"]'
    ) as HTMLInputElement;
    const pdfRadio = container.querySelector(
      'input[value="pdf"]'
    ) as HTMLInputElement;

    expect(htmlRadio.checked).toBe(true);

    await user.click(pdfRadio);
    expect(pdfRadio.checked).toBe(true);
    expect(htmlRadio.checked).toBe(false);
  });

  it('toggles preview visibility', async () => {
    const user = userEvent.setup();
    const { container } = render(
      React.createElement(ExportMinutes, mockProps)
    );

    const toggleButton = screen.getByText('Show Preview');
    expect(toggleButton).toBeDefined();

    await user.click(toggleButton);
    expect(screen.getByText('Hide Preview')).toBeDefined();

    // Preview should be visible
    expect(screen.getByText(/Preview \(HTML/)).toBeDefined();
  });

  it('displays preview content when toggled', async () => {
    const user = userEvent.setup();
    const { container } = render(
      React.createElement(ExportMinutes, mockProps)
    );

    const toggleButton = screen.getByText('Show Preview');
    await user.click(toggleButton);

    // Check for preview content
    expect(screen.getByText(mockProps.title)).toBeDefined();
    expect(screen.getByText(/Meeting ID:/)).toBeDefined();
  });

  it('calls onExport callback when download button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnExport = vi.fn().mockResolvedValue(undefined);

    const { container } = render(
      React.createElement(ExportMinutes, {
        ...mockProps,
        onExport: mockOnExport,
      })
    );

    const downloadButton = screen.getByText(/Download as HTML/);
    await user.click(downloadButton);

    await waitFor(() => {
      expect(mockOnExport).toHaveBeenCalledWith('html');
    });
  });

  it('displays loading state while exporting', async () => {
    const user = userEvent.setup();
    const mockOnExport = vi.fn(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    const { container } = render(
      React.createElement(ExportMinutes, {
        ...mockProps,
        onExport: mockOnExport,
      })
    );

    const downloadButton = screen.getByText(/Download as HTML/);
    await user.click(downloadButton);

    expect(screen.getByText('Exporting...')).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText(/Download as HTML/)).toBeDefined();
    });
  });

  it('displays success message after export', async () => {
    const user = userEvent.setup();
    const mockOnExport = vi.fn().mockResolvedValue(undefined);

    const { container } = render(
      React.createElement(ExportMinutes, {
        ...mockProps,
        onExport: mockOnExport,
      })
    );

    const downloadButton = screen.getByText(/Download as HTML/);
    await user.click(downloadButton);

    await waitFor(() => {
      expect(
        screen.getByText('Minutes exported successfully and downloaded!')
      ).toBeDefined();
    });
  });

  it('displays error message on export failure', async () => {
    const user = userEvent.setup();
    const mockOnExport = vi.fn().mockRejectedValue(new Error('Export failed'));

    const { container } = render(
      React.createElement(ExportMinutes, {
        ...mockProps,
        onExport: mockOnExport,
      })
    );

    const downloadButton = screen.getByText(/Download as HTML/);
    await user.click(downloadButton);

    await waitFor(() => {
      expect(screen.getByText('Export failed')).toBeDefined();
    });
  });

  it('updates button text based on selected format', async () => {
    const user = userEvent.setup();
    const { container } = render(
      React.createElement(ExportMinutes, mockProps)
    );

    expect(screen.getByText(/Download as HTML/)).toBeDefined();

    const textRadio = container.querySelector(
      'input[value="text"]'
    ) as HTMLInputElement;
    await user.click(textRadio);

    expect(screen.getByText(/Download as Plain/)).toBeDefined();
  });

  it('includes action items in preview', async () => {
    const user = userEvent.setup();
    const { container } = render(
      React.createElement(ExportMinutes, mockProps)
    );

    const toggleButton = screen.getByText('Show Preview');
    await user.click(toggleButton);

    expect(
      screen.getByText('Review compliance documents')
    ).toBeDefined();
    expect(screen.getByText('Update board policies')).toBeDefined();
  });

  it('includes attendee list in preview', async () => {
    const user = userEvent.setup();
    const { container } = render(
      React.createElement(ExportMinutes, mockProps)
    );

    const toggleButton = screen.getByText('Show Preview');
    await user.click(toggleButton);

    expect(screen.getByText(/Attendees:/)).toBeDefined();
    mockProps.attendees.forEach((attendee) => {
      expect(screen.getByText(attendee)).toBeDefined();
    });
  });

  it('displays preview character count', async () => {
    const user = userEvent.setup();
    const { container } = render(
      React.createElement(ExportMinutes, mockProps)
    );

    const toggleButton = screen.getByText('Show Preview');
    await user.click(toggleButton);

    expect(screen.getByText(/characters/)).toBeDefined();
  });

  it('renders format descriptions', () => {
    const { container } = render(
      React.createElement(ExportMinutes, mockProps)
    );

    expect(
      screen.getByText('Simple text format, suitable for email and archiving')
    ).toBeDefined();
    expect(
      screen.getByText('Formatted HTML with styling, best for web viewing')
    ).toBeDefined();
    expect(
      screen.getByText('Professional PDF document, ready for printing and sharing')
    ).toBeDefined();
  });

  it('displays helpful tip about format selection', () => {
    const { container } = render(
      React.createElement(ExportMinutes, mockProps)
    );

    expect(
      screen.getByText(/Choose HTML for web viewing with full formatting/)
    ).toBeDefined();
  });

  it('handles export with different formats', async () => {
    const user = userEvent.setup();
    const mockOnExport = vi.fn().mockResolvedValue(undefined);

    const { container, rerender } = render(
      React.createElement(ExportMinutes, {
        ...mockProps,
        onExport: mockOnExport,
      })
    );

    // Test text export
    const textRadio = container.querySelector(
      'input[value="text"]'
    ) as HTMLInputElement;
    await user.click(textRadio);

    const downloadButton = screen.getByText(/Download as Plain/);
    await user.click(downloadButton);

    await waitFor(() => {
      expect(mockOnExport).toHaveBeenCalledWith('text');
    });
  });

  it('disables download button while exporting', async () => {
    const user = userEvent.setup();
    const mockOnExport = vi.fn(
      () => new Promise((resolve) => setTimeout(resolve, 200))
    );

    const { container } = render(
      React.createElement(ExportMinutes, {
        ...mockProps,
        onExport: mockOnExport,
      })
    );

    const downloadButton = screen.getByText(/Download as HTML/) as HTMLButtonElement;
    await user.click(downloadButton);

    expect(downloadButton.disabled).toBe(true);

    await waitFor(() => {
      expect(downloadButton.disabled).toBe(false);
    });
  });

  it('renders without speakers prop', () => {
    const { container } = render(
      React.createElement(ExportMinutes, {
        ...mockProps,
        speakers: undefined,
      })
    );

    expect(screen.getByText('Export Meeting Minutes')).toBeDefined();
  });
});
