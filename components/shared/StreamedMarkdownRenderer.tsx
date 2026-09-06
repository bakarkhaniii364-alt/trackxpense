import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MarkdownRenderer } from './MarkdownRenderer';

export interface StreamedMarkdownRendererProps {
  content: string;
  className?: string;
  isStreaming?: boolean;
  onComplete?: () => void;
  charsPerTick?: number;
  tickIntervalMs?: number;
}

const StreamedMarkdownContent: React.FC<{
  content: string;
  className: string;
  onComplete?: () => void;
  charsPerTick: number;
  tickIntervalMs: number;
}> = ({
  content,
  className,
  onComplete,
  charsPerTick,
  tickIntervalMs
}) => {
  // Pre-sanitize content to match MarkdownRenderer reasoning filter
  const targetContent = useMemo(() => {
    return (content || '')
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .replace(/<think>[\s\S]*$/gi, '')
      .trim();
  }, [content]);

  const [displayedChars, setDisplayedChars] = useState(() =>
    Math.min(charsPerTick, targetContent.length)
  );

  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const isFinished = displayedChars >= targetContent.length;
  const hasCalledCompleteRef = useRef(false);

  // Typewriter timer: runs only while streaming has not reached the end
  useEffect(() => {
    if (displayedChars >= targetContent.length) {
      return;
    }

    const timer = setInterval(() => {
      setDisplayedChars(prev => {
        const next = prev + charsPerTick;
        return next >= targetContent.length ? targetContent.length : next;
      });
    }, tickIntervalMs);

    return () => clearInterval(timer);
  }, [targetContent.length, charsPerTick, tickIntervalMs, displayedChars >= targetContent.length]);

  // Safe completion effect: fires once after render commit when fully streamed
  useEffect(() => {
    if (isFinished && !hasCalledCompleteRef.current) {
      hasCalledCompleteRef.current = true;
      onCompleteRef.current?.();
    }
  }, [isFinished]);

  // Clicking the message instantly completes the typewriter
  const handleInstantComplete = () => {
    if (!isFinished) {
      setDisplayedChars(targetContent.length);
    }
  };

  if (!targetContent) return null;

  const currentSlice = targetContent.slice(0, displayedChars);

  return (
    <div 
      onClick={handleInstantComplete}
      className={`relative cursor-default ${className}`}
      title={!isFinished ? "Click to reveal full response" : undefined}
    >
      <MarkdownRenderer content={currentSlice} />
      {!isFinished && (
        <span 
          className="inline-block w-1.5 h-3.5 bg-[var(--accent)] ml-0.5 rounded-[1px] animate-pulse align-middle select-none pointer-events-none" 
          aria-hidden="true"
        />
      )}
    </div>
  );
};

/**
 * StreamedMarkdownRenderer provides a high-speed, live typewriter effect
 * for assistant responses while preserving rich markdown syntax formatting.
 * Designed per TrackXpense design system standards.
 */
export const StreamedMarkdownRenderer: React.FC<StreamedMarkdownRendererProps> = ({
  content,
  className = '',
  isStreaming = false,
  onComplete,
  charsPerTick = 5,
  tickIntervalMs = 24
}) => {
  // If not streaming, bypass typewriter completely and render instantly
  if (!isStreaming) {
    return <MarkdownRenderer content={content} className={className} />;
  }

  return (
    <StreamedMarkdownContent
      content={content}
      className={className}
      onComplete={onComplete}
      charsPerTick={charsPerTick}
      tickIntervalMs={tickIntervalMs}
    />
  );
};
