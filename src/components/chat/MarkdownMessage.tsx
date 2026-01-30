import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MessageSkeleton } from './MessageSkeleton';

interface MarkdownMessageProps {
  content: string;
  isUser?: boolean;
  className?: string;
  isStreaming?: boolean;
  streamingSpeed?: number;
}

export const MarkdownMessage: React.FC<MarkdownMessageProps> = ({
  content,
  isUser = false,
  className = '',
  isStreaming = false,
  streamingSpeed = 2,
}) => {
  const [isLoading, setIsLoading] = useState(!content || isStreaming);
  const [renderedContent, setRenderedContent] = useState<string>(
    isStreaming ? '' : content,
  );
  const [displayedContent, setDisplayedContent] = useState<string>(
    isStreaming ? '' : content,
  );
  const [currentIndex, setCurrentIndex] = useState(
    isStreaming ? 0 : content.length,
  );
  const [contentHash, setContentHash] = useState<string>('');

  useEffect(() => {
    const newHash = JSON.stringify({ content, isStreaming });

    if (newHash !== contentHash) {
      setContentHash(newHash);

      if (isStreaming) {
        setRenderedContent(content);
        setDisplayedContent(content);
        setCurrentIndex(content.length);
        setIsLoading(false);
      } else {
        setRenderedContent(content);
        setDisplayedContent(content);
        setCurrentIndex(content.length);
        setIsLoading(false);
      }
    } else if (!isStreaming && isLoading) {
      setRenderedContent(content);
      setDisplayedContent(content);
      setCurrentIndex(content.length);
      setIsLoading(false);
    }
  }, [content, isStreaming, contentHash, isLoading]);

  // Typewriter effect for streaming messages
  useEffect(() => {
    if (!isStreaming || isLoading || currentIndex >= content.length) return;

    const timer = setTimeout(() => {
      const nextIndex = Math.min(currentIndex + streamingSpeed, content.length);
      setDisplayedContent(content.slice(0, nextIndex));
      setCurrentIndex(nextIndex);
    }, 15); // 15ms interval for smooth typing effect

    return () => clearTimeout(timer);
  }, [currentIndex, content, isStreaming, streamingSpeed, isLoading]);

  if (isLoading) {
    return <MessageSkeleton isUser={isUser} />;
  }

  if (!displayedContent && !isStreaming) {
    return null;
  }

  return (
    <div className={`${className}`}>
      <div className="prose prose-sm max-w-none prose-gray overflow-hidden">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            // Customize markdown components for better styling
            p: ({ children }) => (
              <p className="mb-2 last:mb-0 text-base leading-relaxed">
                {children}
              </p>
            ),
            h1: ({ children }) => (
              <h1 className="text-base font-bold mb-2 text-gray-900">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-base font-bold mb-2 text-gray-900">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-base font-semibold mb-1 text-gray-900">
                {children}
              </h3>
            ),
            ul: ({ children }) => (
              <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>
            ),
            li: ({ children }) => (
              <li className="text-base leading-relaxed">{children}</li>
            ),
            code: ({ node, children, ...props }) => {
              const isInline = !props.className || props.className === '';
              if (isInline) {
                return (
                  <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono text-gray-800 border break-words">
                    {children}
                  </code>
                );
              }
              return (
                <code className="text-gray-800 break-words whitespace-pre-wrap">
                  {children}
                </code>
              );
            },
            pre: ({ children }) => (
              <pre className="bg-gray-50 p-3 rounded-md text-xs font-mono overflow-x-auto mb-2 border border-gray-200 max-w-full">
                {children}
              </pre>
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-gray-300 pl-4 italic mb-2 text-gray-700 bg-gray-50 py-2 rounded-r">
                {children}
              </blockquote>
            ),
            strong: ({ children }) => (
              <strong className="font-semibold text-gray-900">
                {children}
              </strong>
            ),
            em: ({ children }) => (
              <em className="italic text-gray-700">{children}</em>
            ),
            a: ({ children, href }) => (
              <a
                href={href}
                className="text-blue-600 hover:text-blue-800 underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                {children}
              </a>
            ),
            // Table components for GFM table support
            table: ({ children }) => (
              <div className="overflow-x-auto mb-4">
                <table className="min-w-full border-collapse border border-gray-300 rounded-md">
                  {children}
                </table>
              </div>
            ),
            thead: ({ children }) => (
              <thead className="bg-gray-100">{children}</thead>
            ),
            tbody: ({ children }) => (
              <tbody className="divide-y divide-gray-200">{children}</tbody>
            ),
            tr: ({ children }) => (
              <tr className="hover:bg-gray-50 transition-colors">{children}</tr>
            ),
            th: ({ children }) => (
              <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900 border border-gray-300">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="px-4 py-2 text-sm text-gray-700 border border-gray-300">
                {children}
              </td>
            ),
          }}
        >
          {isStreaming ? displayedContent : renderedContent}
        </ReactMarkdown>
        {isStreaming && currentIndex < content.length && (
          <span className="inline-block w-0.5 h-4 bg-blue-500 animate-pulse ml-0.5 align-text-bottom" />
        )}
      </div>
    </div>
  );
};
