import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCopyToClipboard } from './useCopyToClipboard';

describe('useCopyToClipboard Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(),
      },
    });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('initializes with correct default state', () => {
    const { result } = renderHook(() => useCopyToClipboard());

    expect(result.current.isCopied).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('copies text to clipboard successfully', async () => {
    const { result } = renderHook(() => useCopyToClipboard());
    const testText = 'Test content to copy';

    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator.clipboard, { writeText: mockWriteText });

    let copyResult: boolean = false;
    await act(async () => {
      copyResult = await result.current.copy(testText);
    });

    expect(copyResult).toBe(true);
    expect(mockWriteText).toHaveBeenCalledWith(testText);
  });

  it('sets isCopied to true after successful copy', async () => {
    const { result } = renderHook(() => useCopyToClipboard());

    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator.clipboard, { writeText: mockWriteText });

    await act(async () => {
      await result.current.copy('test');
    });

    expect(result.current.isCopied).toBe(true);
  });

  it('resets isCopied after timeout', async () => {
    const { result } = renderHook(() => useCopyToClipboard({ timeout: 1000 }));

    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator.clipboard, { writeText: mockWriteText });

    await act(async () => {
      await result.current.copy('test');
    });

    expect(result.current.isCopied).toBe(true);

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.isCopied).toBe(false);
  });

  it('handles clipboard API errors', async () => {
    const { result } = renderHook(() => useCopyToClipboard());

    const mockError = new Error('Clipboard error');
    const mockWriteText = vi.fn().mockRejectedValue(mockError);
    Object.assign(navigator.clipboard, { writeText: mockWriteText });

    let copyResult: boolean = false;
    await act(async () => {
      copyResult = await result.current.copy('test');
    });

    expect(copyResult).toBe(false);
    expect(result.current.error).not.toBe(null);
  });

  it('uses custom timeout', async () => {
    const customTimeout = 500;
    const { result } = renderHook(() =>
      useCopyToClipboard({ timeout: customTimeout })
    );

    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator.clipboard, { writeText: mockWriteText });

    await act(async () => {
      await result.current.copy('test');
    });

    expect(result.current.isCopied).toBe(true);

    await act(async () => {
      vi.advanceTimersByTime(customTimeout);
    });

    expect(result.current.isCopied).toBe(false);
  });

  it('handles fallback for older browsers without Clipboard API', async () => {
    const { result } = renderHook(() => useCopyToClipboard());

    // Remove clipboard API to test fallback
    const originalClipboard = navigator.clipboard;
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
    });

    // Mock execCommand
    const mockExecCommand = vi.fn().mockReturnValue(true);
    Object.assign(document, { execCommand: mockExecCommand });

    let copyResult: boolean = false;
    await act(async () => {
      copyResult = await result.current.copy('test');
    });

    expect(copyResult).toBe(true);
    expect(mockExecCommand).toHaveBeenCalledWith('copy');

    // Restore clipboard
    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
      configurable: true,
    });
  });

  it('returns false and sets error on copy failure', async () => {
    const { result } = renderHook(() => useCopyToClipboard());

    const mockWriteText = vi.fn().mockRejectedValue(new Error('Copy failed'));
    Object.assign(navigator.clipboard, { writeText: mockWriteText });

    let copyResult: boolean = false;
    await act(async () => {
      copyResult = await result.current.copy('test');
    });

    expect(copyResult).toBe(false);
    expect(result.current.error).not.toBe(null);
  });
});
