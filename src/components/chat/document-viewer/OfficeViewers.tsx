import mammoth from 'mammoth';
import React from 'react';
import * as XLSX from 'xlsx';

interface OfficeViewerProps {
  content: string;
}

export const DocxViewer: React.FC<OfficeViewerProps> = ({ content }) => {
  const [html, setHtml] = React.useState<string>('');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const loadDocx = async () => {
      try {
        setLoading(true);

        // Fetch the content if it's a data URL
        let arrayBuffer: ArrayBuffer;
        if (content.startsWith('data:')) {
          const base64Data = content.split(',')[1];
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          arrayBuffer = bytes.buffer;
        } else {
          const response = await fetch(content);
          arrayBuffer = await response.arrayBuffer();
        }

        const result = await mammoth.convertToHtml({ arrayBuffer });
        setHtml(result.value);
      } catch (err) {
        console.error('Error loading DOCX:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to load document',
        );
      } finally {
        setLoading(false);
      }
    };

    loadDocx();
  }, [content]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-neutral-grayscale-60">Loading document...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="prose prose-sm max-w-none p-6">
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
};

export const XlsxViewer: React.FC<OfficeViewerProps> = ({ content }) => {
  const [sheets, setSheets] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [activeSheet, setActiveSheet] = React.useState(0);

  React.useEffect(() => {
    const loadXlsx = async () => {
      try {
        setLoading(true);

        // Fetch the content if it's a data URL
        let arrayBuffer: ArrayBuffer;
        if (content.startsWith('data:')) {
          const base64Data = content.split(',')[1];
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          arrayBuffer = bytes.buffer;
        } else {
          const response = await fetch(content);
          arrayBuffer = await response.arrayBuffer();
        }

        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetsData = workbook.SheetNames.map((name) => ({
          name,
          data: XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1 }),
        }));
        setSheets(sheetsData);
      } catch (err) {
        console.error('Error loading XLSX:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to load spreadsheet',
        );
      } finally {
        setLoading(false);
      }
    };

    loadXlsx();
  }, [content]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-neutral-grayscale-60">Loading spreadsheet...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  const currentSheet = sheets[activeSheet];

  return (
    <div className="space-y-4 p-4">
      {sheets.length > 1 && (
        <div className="flex gap-2 border-b border-neutral-grayscale-20 pb-2">
          {sheets.map((sheet, idx) => (
            <button
              key={idx}
              onClick={() => setActiveSheet(idx)}
              className={`px-4 py-2 rounded-t text-sm font-medium transition-colors ${
                idx === activeSheet
                  ? 'bg-brand-accent-50 text-white'
                  : 'bg-neutral-grayscale-10 text-neutral-grayscale-70 hover:bg-neutral-grayscale-20'
              }`}
            >
              {sheet.name}
            </button>
          ))}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-neutral-grayscale-20 border border-neutral-grayscale-20">
          <tbody className="divide-y divide-neutral-grayscale-20">
            {(currentSheet?.data || []).map((row: any[], rowIdx: number) => (
              <tr
                key={rowIdx}
                className={
                  rowIdx === 0 ? 'bg-neutral-grayscale-5 font-semibold' : ''
                }
              >
                {row.map((cell: any, cellIdx: number) => (
                  <td
                    key={cellIdx}
                    className="px-4 py-2 text-sm text-neutral-grayscale-80 border-r border-neutral-grayscale-20 last:border-r-0"
                  >
                    {cell !== null && cell !== undefined ? String(cell) : ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
