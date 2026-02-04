/**
 * Shared utility for interacting with the external Knowledge Base API
 */

export interface ExtractMetadataRequest {
  storage_key: string;
  bucket_name: string;
  project_id: string;
  stage_id: string;
  workspace_id?: string | null;
}

export interface ExtractMetadataResponse {
  summary: string;
  tags: string[];
  category: string;
}

export interface ProcessDocumentRequest {
  storage_key: string;
  project_id: string;
  stage_id: string;
  bucket_name: string;
  summary: string;
  tags: string[];
  category: string;
  workspace_id?: string | null;
}

export interface ProcessDocumentResponse {
  document_id: string;
  status: string;
  message: string;
  processed_at: string;
  bucket_name: string;
}

const B2B_API_BASE_URL = Deno.env.get('VITE_BACKEND_API_URL') || '';

if (!B2B_API_BASE_URL && Deno.env.get('NODE_ENV') !== 'test') {
  console.warn('Warning: VITE_BACKEND_API_URL is not set in environment variables');
}

/**
 * Call external API to extract metadata (summary, tags, category) from a document
 */
export async function extractMetadata(
  request: ExtractMetadataRequest,
): Promise<ExtractMetadataResponse> {
  console.log(`Extracting metadata for: ${request.storage_key}`);
  console.log('Full request payload:', JSON.stringify(request, null, 2));

  const response = await fetch(
    `${B2B_API_BASE_URL}/api/v1/mindspace/metadata/extract`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Metadata extraction failed: ${response.status}`, errorText);
    console.error('Failed request was:', JSON.stringify(request, null, 2));
    throw new Error(
      `Metadata extraction failed: ${response.status} ${errorText}`,
    );
  }

  return await response.json();
}

/**
 * Call external API to process and vectorize a document
 */
export async function processDocument(
  request: ProcessDocumentRequest,
): Promise<ProcessDocumentResponse> {
  console.log(`Processing document for knowledge base: ${request.storage_key}`);
  console.log('Full request payload:', JSON.stringify(request, null, 2));

  const response = await fetch(
    `${B2B_API_BASE_URL}/api/v1/mindspace/knowledge-base`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Document processing failed: ${response.status}`, errorText);
    console.error('Failed request was:', JSON.stringify(request, null, 2));
    throw new Error(
      `Document processing failed: ${response.status} ${errorText}`,
    );
  }

  return await response.json();
}

/**
 * Legacy function for backward compatibility (if needed)
 * @deprecated Use extractMetadata and processDocument instead
 */
export async function setupKnowledgeBase(request: any) {
  console.warn(
    'setupKnowledgeBase is deprecated. Use extractMetadata and processDocument.',
  );
  return processDocument({
    ...request,
    summary: request.summary || 'Legacy processing',
    tags: request.tags || [],
    category: request.category || 'General',
  });
}
