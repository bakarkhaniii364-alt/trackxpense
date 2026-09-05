import React from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  if (!content) return null;

  // Clean any reasoning tags (closed or unclosed) to ensure clean UI presentation
  const sanitized = content
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<think>[\s\S]*$/gi, '')
    .trim();

  if (!sanitized) return null;

  // Split lines to parse blocks
  const lines = sanitized.split('\n');
  const elements: React.ReactNode[] = [];

  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  let codeBlockLang = '';
  let inList = false;
  let listItems: React.ReactNode[] = [];
  let isNumberedList = false;
  let inTable = false;
  let tableRows: string[][] = [];

  const flushList = () => {
    if (inList && listItems.length > 0) {
      if (isNumberedList) {
        elements.push(
          <ol key={`ol-${elements.length}`} className="list-decimal list-outside pl-4 space-y-1 my-1.5 text-[13px] text-[var(--text-primary)]">
            {listItems}
          </ol>
        );
      } else {
        elements.push(
          <ul key={`ul-${elements.length}`} className="list-disc list-outside pl-4 space-y-1 my-1.5 text-[13px] text-[var(--text-primary)]">
            {listItems}
          </ul>
        );
      }
      inList = false;
      listItems = [];
    }
  };

  const flushTable = () => {
    if (inTable && tableRows.length > 0) {
      const headerRow = tableRows[0];
      const bodyRows = tableRows.slice(1).filter(r => !r.every(cell => cell.match(/^:?-+:?$/)));

      elements.push(
        <div key={`table-${elements.length}`} className="overflow-x-auto my-2 rounded-[6px] border border-[var(--border-default)] bg-[var(--bg-surface)]">
          <table className="w-full text-[12px] text-left border-collapse">
            {headerRow && (
              <thead>
                <tr className="border-b border-[var(--border-default)] bg-[var(--bg-subtle)] text-[var(--text-muted)] uppercase text-[10px] font-semibold">
                  {headerRow.map((cell, idx) => (
                    <th key={idx} className="px-3 py-1.5">{renderInline(cell.trim())}</th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {bodyRows.map((row, rIdx) => (
                <tr key={rIdx} className="border-b last:border-b-0 border-[var(--border-default)] hover:bg-[var(--bg-surface-hover)]">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-3 py-1.5 text-[var(--text-primary)] font-mono">{renderInline(cell.trim())}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      inTable = false;
      tableRows = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code blocks ```
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        // End code block
        elements.push(
          <div key={`code-${elements.length}`} className="my-2 rounded-[6px] bg-[#09090b] border border-[var(--border-default)] overflow-hidden">
            {codeBlockLang && (
              <div className="px-3 py-1 bg-[var(--bg-subtle)] border-b border-[var(--border-default)] text-[10px] font-mono text-[var(--text-muted)] uppercase">
                {codeBlockLang}
              </div>
            )}
            <pre className="p-3 text-[12px] font-mono text-[var(--text-primary)] overflow-x-auto whitespace-pre leading-relaxed">
              <code>{codeBlockContent.join('\n')}</code>
            </pre>
          </div>
        );
        inCodeBlock = false;
        codeBlockContent = [];
        codeBlockLang = '';
      } else {
        flushList();
        flushTable();
        inCodeBlock = true;
        codeBlockLang = line.trim().slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    // Tables: starts and ends with |
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      flushList();
      inTable = true;
      const cells = line.trim().slice(1, -1).split('|');
      tableRows.push(cells);
      continue;
    } else if (inTable) {
      flushTable();
    }

    // Headings
    if (line.startsWith('### ')) {
      flushList();
      elements.push(
        <h4 key={`h4-${elements.length}`} className="text-[13px] font-semibold text-[var(--text-primary)] mt-3 mb-1 tracking-tight">
          {renderInline(line.slice(4))}
        </h4>
      );
      continue;
    }
    if (line.startsWith('## ')) {
      flushList();
      elements.push(
        <h3 key={`h3-${elements.length}`} className="text-[14px] font-semibold text-[var(--text-primary)] mt-3.5 mb-1.5 tracking-tight">
          {renderInline(line.slice(3))}
        </h3>
      );
      continue;
    }
    if (line.startsWith('# ')) {
      flushList();
      elements.push(
        <h2 key={`h2-${elements.length}`} className="text-[15px] font-bold text-[var(--text-primary)] mt-4 mb-2 tracking-tight">
          {renderInline(line.slice(2))}
        </h2>
      );
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      flushList();
      elements.push(
        <blockquote key={`quote-${elements.length}`} className="border-l-2 border-[var(--accent-solid)] pl-3 my-2 text-[12px] text-[var(--text-secondary)] italic">
          {renderInline(line.slice(2))}
        </blockquote>
      );
      continue;
    }

    // Unordered List (- or *)
    const bulletMatch = line.match(/^(\s*)([-*])\s+(.+)$/);
    if (bulletMatch) {
      if (!inList || isNumberedList) {
        flushList();
        inList = true;
        isNumberedList = false;
      }
      listItems.push(
        <li key={`li-${listItems.length}`} className="leading-snug">
          {renderInline(bulletMatch[3])}
        </li>
      );
      continue;
    }

    // Numbered List (1. or 2.)
    const numMatch = line.match(/^(\s*)(\d+)\.\s+(.+)$/);
    if (numMatch) {
      if (!inList || !isNumberedList) {
        flushList();
        inList = true;
        isNumberedList = true;
      }
      listItems.push(
        <li key={`li-${listItems.length}`} className="leading-snug">
          {renderInline(numMatch[3])}
        </li>
      );
      continue;
    }

    // Empty line / paragraph break
    if (!line.trim()) {
      flushList();
      flushTable();
      continue;
    }

    // Regular Paragraph
    flushList();
    flushTable();
    elements.push(
      <p key={`p-${elements.length}`} className="leading-relaxed my-1">
        {renderInline(line)}
      </p>
    );
  }

  flushList();
  flushTable();

  return <div className={`space-y-1 text-[13px] break-words max-w-full overflow-hidden ${className}`}>{elements}</div>;
};

/**
 * Parses inline formatting: **bold**, *italic*, `code`, ~~strikethrough~~, [link](url)
 */
function renderInline(text: string): React.ReactNode {
  if (!text) return '';

  const tokens: React.ReactNode[] = [];
  // Regex to match bold, italic, code, strikethrough, links
  const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`|~~.*?~~|\[.*?\]\(.*?\))/g;
  const parts = text.split(regex);

  parts.forEach((part, index) => {
    if (!part) return;

    // Bold **text**
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      tokens.push(
        <strong key={index} className="font-semibold text-[var(--text-primary)]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    // Italic *text*
    else if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      tokens.push(
        <em key={index} className="italic text-[var(--text-primary)]">
          {part.slice(1, -1)}
        </em>
      );
    }
    // Inline code `code`
    else if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      tokens.push(
        <code key={index} className="font-mono text-[11px] bg-[var(--bg-surface)] px-1 py-0.5 rounded border border-[var(--border-default)] text-[var(--text-primary)]">
          {part.slice(1, -1)}
        </code>
      );
    }
    // Strikethrough ~~text~~
    else if (part.startsWith('~~') && part.endsWith('~~') && part.length >= 4) {
      tokens.push(
        <del key={index} className="line-through opacity-70">
          {part.slice(2, -2)}
        </del>
      );
    }
    // Links [text](url)
    else if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
      const match = part.match(/^\[(.*?)\]\((.*?)\)$/);
      if (match) {
        tokens.push(
          <a
            key={index}
            href={match[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent-solid)] underline hover:opacity-80"
          >
            {match[1]}
          </a>
        );
      } else {
        tokens.push(part);
      }
    } else {
      tokens.push(part);
    }
  });

  return <>{tokens}</>;
}
