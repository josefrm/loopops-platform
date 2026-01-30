import React from 'react';
import ReactMarkdown from 'react-markdown';
import { DocxViewer, XlsxViewer } from './OfficeViewers';

export interface FileRenderer {
  canHandle: (fileName: string, content: string) => boolean;
  render: (content: string, fileName: string) => React.ReactNode;
  getLanguage?: (fileName: string) => string;
}

export const markdownRenderer: FileRenderer = {
  canHandle: (fileName: string, content: string) => {
    if (fileName.match(/\.md$/i)) return true;

    const markdownPatterns = [
      /^#{1,6}\s+.+$/m,
      /\*\*[^*]+\*\*/,
      /\[.+?\]\(.+?\)/,
      /```[\s\S]*?```/,
      /^\s*[-*+]\s+/m,
      /^\s*\d+\.\s+/m,
    ];

    const matches = markdownPatterns.filter((pattern) =>
      pattern.test(content),
    ).length;
    return matches >= 2;
  },

  render: (content: string) => (
    <div className="prose prose-sm max-w-none text-neutral-grayscale-100">
      <ReactMarkdown
        components={{
          p: ({ children }) => (
            <p className="mb-4 last:mb-0 text-sm leading-relaxed">{children}</p>
          ),
          h1: ({ children }) => (
            <h1 className="text-xl font-bold mb-4 mt-6 first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-bold mb-3 mt-5">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-bold mb-2 mt-4">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-sm font-bold mb-2 mt-3">{children}</h4>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-6 mb-4 space-y-2">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-6 mb-4 space-y-2">{children}</ol>
          ),
          li: ({ children }) => <li className="text-sm">{children}</li>,
          code: ({ children, ...props }) => {
            const isInline = !props.className;
            return isInline ? (
              <code className="bg-neutral-grayscale-10 px-1.5 py-0.5 rounded text-xs font-mono text-neutral-grayscale-100">
                {children}
              </code>
            ) : (
              <pre className="bg-neutral-grayscale-10 p-4 rounded-md text-xs font-mono overflow-x-auto mb-4">
                <code className="text-neutral-grayscale-100">{children}</code>
              </pre>
            );
          },
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-brand-accent-50 pl-4 italic my-4 text-neutral-grayscale-80">
              {children}
            </blockquote>
          ),
          strong: ({ children }) => (
            <strong className="font-bold">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          a: ({ children, href }) => (
            <a
              href={href}
              className="text-brand-accent-50 hover:text-brand-accent-60 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          hr: () => <hr className="my-6 border-neutral-grayscale-20" />,
          table: ({ children }) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full divide-y divide-neutral-grayscale-20">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-neutral-grayscale-5">{children}</thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-neutral-grayscale-20">
              {children}
            </tbody>
          ),
          tr: ({ children }) => <tr>{children}</tr>,
          th: ({ children }) => (
            <th className="px-4 py-2 text-left text-xs font-semibold text-neutral-grayscale-100">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2 text-sm text-neutral-grayscale-80">
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  ),
};

export const codeRenderer: FileRenderer = {
  canHandle: (fileName: string) => {
    const codeExtensions =
      /\.(js|jsx|ts|tsx|py|java|cpp|c|h|cs|php|rb|go|rs|swift|kt|css|scss|sass|html|sql|sh|bash)$/i;
    return codeExtensions.test(fileName);
  },

  getLanguage: (fileName: string) => {
    const ext = fileName.match(/\.([^.]+)$/)?.[1]?.toLowerCase();
    const languageMap: { [key: string]: string } = {
      js: 'JavaScript',
      jsx: 'JavaScript React',
      ts: 'TypeScript',
      tsx: 'TypeScript React',
      py: 'Python',
      java: 'Java',
      cpp: 'C++',
      c: 'C',
      cs: 'C#',
      php: 'PHP',
      rb: 'Ruby',
      go: 'Go',
      rs: 'Rust',
      swift: 'Swift',
      kt: 'Kotlin',
      css: 'CSS',
      scss: 'SCSS',
      sass: 'Sass',
      html: 'HTML',
      sql: 'SQL',
      sh: 'Shell',
      bash: 'Bash',
    };
    return languageMap[ext || ''] || ext?.toUpperCase() || 'Code';
  },

  render: (content: string, fileName: string) => {
    const language = codeRenderer.getLanguage?.(fileName) || 'Code';
    return (
      <div className="space-y-loop-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold text-neutral-grayscale-60 uppercase tracking-wide">
            {language}
          </div>
          <div className="text-xs text-neutral-grayscale-60">
            {content.split('\n').length} lines
          </div>
        </div>
        <div className="bg-neutral-grayscale-5 rounded-lg p-loop-4 overflow-x-auto border border-neutral-grayscale-20">
          <pre className="text-xs font-mono leading-relaxed text-neutral-grayscale-100">
            <code>{content}</code>
          </pre>
        </div>
      </div>
    );
  },
};

export const jsonRenderer: FileRenderer = {
  canHandle: (fileName: string, content: string) => {
    if (fileName.match(/\.json$/i)) return true;

    try {
      JSON.parse(content);
      return true;
    } catch {
      return false;
    }
  },

  render: (content: string) => {
    try {
      const parsed = JSON.parse(content);
      const formatted = JSON.stringify(parsed, null, 2);

      return (
        <div className="space-y-loop-3">
          <div className="text-xs font-semibold text-neutral-grayscale-60 uppercase tracking-wide">
            JSON
          </div>
          <div className="bg-neutral-grayscale-5 rounded-lg p-loop-4 overflow-x-auto border border-neutral-grayscale-20">
            <pre className="text-xs font-mono leading-relaxed text-neutral-grayscale-100">
              <code>{formatted}</code>
            </pre>
          </div>
        </div>
      );
    } catch {
      return codeRenderer.render(content, 'file.json');
    }
  },
};

export const xmlRenderer: FileRenderer = {
  canHandle: (fileName: string) => {
    return /\.(xml|html|svg)$/i.test(fileName);
  },

  render: (content: string, fileName: string) => {
    const language = fileName.match(/\.html$/i)
      ? 'HTML'
      : fileName.match(/\.svg$/i)
      ? 'SVG'
      : 'XML';

    return (
      <div className="space-y-loop-3">
        <div className="text-xs font-semibold text-neutral-grayscale-60 uppercase tracking-wide">
          {language}
        </div>
        <div className="bg-neutral-grayscale-5 rounded-lg p-loop-4 overflow-x-auto border border-neutral-grayscale-20">
          <pre className="text-xs font-mono leading-relaxed text-neutral-grayscale-100">
            <code>{content}</code>
          </pre>
        </div>
      </div>
    );
  },
};

export const textRenderer: FileRenderer = {
  canHandle: () => true,

  render: (content: string) => (
    <div className="text-neutral-grayscale-100">
      <div className="text-sm leading-relaxed whitespace-pre-wrap font-mono">
        {content}
      </div>
    </div>
  ),
};

export const imageRenderer: FileRenderer = {
  canHandle: (fileName: string, content: string) => {
    if (fileName.match(/\.(png|jpg|jpeg|gif|webp|svg|bmp|ico)$/i)) return true;

    if (content.startsWith('data:image/')) return true;

    if (content.startsWith('blob:')) return true;

    return false;
  },

  render: (content: string, fileName: string) => {
    const isUrl =
      content.startsWith('data:') ||
      content.startsWith('blob:') ||
      content.startsWith('http');
    const imageSrc = isUrl ? content : `data:image/png;base64,${content}`;

    return (
      <div className="p-6 flex items-center justify-center min-h-[400px] bg-neutral-grayscale-5">
        <div className="max-w-full max-h-[80vh] flex flex-col items-center gap-4">
          <img
            src={imageSrc}
            alt={fileName}
            className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const errorDiv = target.nextElementSibling as HTMLDivElement;
              if (errorDiv) errorDiv.style.display = 'block';
            }}
          />
          <div
            className="text-center p-6 bg-red-50 rounded-lg hidden"
            style={{ display: 'none' }}
          >
            <p className="text-red-600 font-medium mb-2">
              Failed to load image
            </p>
            <p className="text-sm text-neutral-grayscale-60">{fileName}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-neutral-grayscale-60">{fileName}</p>
          </div>
        </div>
      </div>
    );
  },
};

export const docxRenderer: FileRenderer = {
  canHandle: (fileName: string) => {
    return fileName?.toLowerCase().endsWith('.docx') ?? false;
  },

  render: (content: string) => <DocxViewer content={content} />,
};

export const xlsxRenderer: FileRenderer = {
  canHandle: (fileName: string) => {
    const lowerName = fileName?.toLowerCase();
    return lowerName?.endsWith('.xlsx') || lowerName?.endsWith('.xls') || false;
  },

  render: (content: string) => <XlsxViewer content={content} />,
};

export const pdfRenderer: FileRenderer = {
  canHandle: (fileName: string, content: string) => {
    if (fileName?.toLowerCase().endsWith('.pdf')) return true;
    if (
      content.startsWith('blob:') ||
      content.startsWith('data:application/pdf')
    )
      return true;
    if (
      (content.startsWith('http') || content.startsWith('/')) &&
      content.includes('.pdf')
    )
      return true;
    return false;
  },

  render: (content: string, fileName: string) => {
    const isDataUrl = content.startsWith('data:');
    const isRemoteUrl =
      content.startsWith('blob:') ||
      content.startsWith('http://') ||
      content.startsWith('https://') ||
      content.startsWith('/') ||
      content.includes('supabase.co');

    let pdfUrl: string;
    if (isDataUrl) {
      pdfUrl = content;
    } else if (isRemoteUrl) {
      pdfUrl = `${content}#view=FitH`;
    } else {
      pdfUrl = `data:application/pdf;base64,${btoa(content)}`;
    }

    return (
      <div className="w-full h-full min-h-[600px] flex flex-col bg-neutral-grayscale-5 rounded-lg overflow-hidden">
        <iframe
          src={pdfUrl}
          className="w-full flex-1 border-0"
          title={fileName}
          style={{ minHeight: '600px' }}
        />
      </div>
    );
  },
};

export const unknownFileRenderer: FileRenderer = {
  canHandle: (fileName: string) => {
    // Explicit list of known binary formats we can't render inline but want a nice placeholder for
    const binaryExtensions =
      /\.(docx|doc|pptx|ppt|xlsx|xls|zip|rar|7z|tar|gz|exe|dll|bin|iso)$/i;
    return binaryExtensions.test(fileName);
  },

  render: (content: string, fileName: string) => {
    const ext = fileName.split('.').pop()?.toUpperCase() || 'FILE';

    return (
      <div className="flex flex-col items-center justify-center p-loop-12 bg-neutral-grayscale-5 rounded-lg min-h-[400px] border border-neutral-grayscale-20">
        <div className="w-24 h-24 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-6">
          <span className="text-2xl font-bold text-brand-accent-50">{ext}</span>
        </div>
        <h3 className="text-xl font-semibold text-neutral-grayscale-90 mb-2">
          {fileName}
        </h3>
        <p className="text-neutral-grayscale-60 mb-6 text-center max-w-md">
          This file type cannot be previewed directly in LoopOps.
          <br />
          You can download it to view it locally.
        </p>
        {/* We rely on the header download button, but we could add one here too if needed */}
        <div className="text-xs text-neutral-grayscale-40 mt-4">
          {/* Debug info if needed, or valid file size if we had it */}
          {/* {content.startsWith('http') ? 'File hosted remotely' : 'Local file'} */}
        </div>
      </div>
    );
  },
};

export const fileRenderers: FileRenderer[] = [
  docxRenderer,
  xlsxRenderer,
  pdfRenderer,
  imageRenderer,
  unknownFileRenderer, // Try to catch office docs before they hit code/text
  jsonRenderer,
  xmlRenderer,
  codeRenderer,
  markdownRenderer,
  textRenderer,
];

export const getFileRenderer = (
  fileName: string,
  content: string,
): FileRenderer => {
  return (
    fileRenderers.find((renderer) => renderer.canHandle(fileName, content)) ||
    textRenderer
  );
};
