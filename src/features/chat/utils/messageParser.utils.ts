import { Message, MessageAction, MessageAttachment } from '@/models/Message';
interface BackendFile {
  id: string;
  filename?: string;
  file_name?: string;
  file_id?: string;
  format?: string;
  mime_type: string;
  content?: string;
  url?: string;
  object_key?: string;
  storage_key?: string;
  [key: string]: any; // Allow other properties
}

interface BackendImage {
  id: string;
  format: string;
  mime_type: string;
  content: string;
}

export interface BackendAttachment {
  id?: string;
  file_id?: string;
  name?: string;
  file_name?: string;
  mime_type?: string;
  type?: string;
  size?: number;
  url?: string;
  object_key?: string;
  storage_key?: string;
  [key: string]: any; // Allow other properties
}

interface ParsedContent {
  agent_name?: string;
  team_name?: string;
  agent_id?: string;
  actions?: MessageAction[];
  attachments?: BackendAttachment[];
  agent_response?: string;
  response?: string;
  content?: string;
}

interface BackendMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string | ParsedContent;
  created_at?: number | string;
  files?: BackendFile[];
  images?: BackendImage[];
  attachments?: BackendAttachment[];
}

const isBase64Content = (content: string): boolean => {
  if (content.includes('%')) return false;
  return /^[A-Za-z0-9+/=]+$/.test(content);
};

const transformFileToAttachment = (file: BackendFile): MessageAttachment => {
  let url: string;

  if (file.url) {
    url = file.url;
  } else if (file.object_key) {
    // Use object_key as bucket path
    url = file.object_key;
  } else if (file.storage_key) {
    // Use storage_key as bucket path (alternative property name)
    url = file.storage_key;
  } else if (file.content) {
    const isBase64 = isBase64Content(file.content);
    url = isBase64
      ? `data:${file.mime_type};base64,${file.content}`
      : `data:${file.mime_type},${file.content}`;
  } else {
    url = '';
  }

  // Debug logging
  if (!url) {
    console.warn('transformFileToAttachment: No URL or object_key found', {
      file,
      hasUrl: !!file.url,
      hasObjectKey: !!file.object_key,
      hasStorageKey: !!file.storage_key,
      keys: Object.keys(file),
      fullObject: JSON.stringify(file, null, 2),
    });
  }

  return {
    id: file.id,
    name: file.filename || file.file_name || `file.${file.format || 'bin'}`,
    file_id: file.file_id,
    file_name: file.file_name || file.filename,
    type: file.mime_type,
    size: 0,
    url,
  };
};

const transformImageToAttachment = (img: BackendImage): MessageAttachment => {
  return {
    id: img.id,
    name: `image.${img.format}`,
    type: img.mime_type,
    size: 0,
    url: `data:${img.mime_type};base64,${img.content}`,
  };
};

export const transformBackendAttachment = (
  att: BackendAttachment,
): MessageAttachment => {
  // Use object_key or storage_key as url if url is not present (contains bucket path)
  // Check multiple possible property names for the bucket path
  const url =
    att.url ||
    att.object_key ||
    (att as any).storage_key ||
    (att as any).file_path ||
    undefined;

  // Extract filename from path if file_name is not available
  // This handles edge function attachments that only have object_key/storage_key
  const extractFileNameFromPath = (
    path: string | undefined,
  ): string | undefined => {
    if (!path) return undefined;

    // Remove query parameters and fragments from URL if present
    const cleanPath = path.split('?')[0].split('#')[0];

    // Extract the last part of the path (filename)
    const fileName = cleanPath.split('/').pop();

    // Return if it's a valid filename (not empty, not just a path segment, and has some content)
    // Accept filenames with or without extensions
    if (fileName && fileName.trim().length > 0 && !fileName.match(/^[./]+$/)) {
      return fileName;
    }
    return undefined;
  };

  // Try to get filename from various sources
  const fileNameFromPath = extractFileNameFromPath(
    att.object_key ||
      (att as any).storage_key ||
      (att as any).file_path ||
      att.url,
  );
  const fileName =
    att.file_name || att.name || fileNameFromPath || 'attachment';

  // Generate a stable ID based on file_name and object_key if no id is provided
  // This ensures attachments from JSON content get proper IDs
  const generateId = () => {
    if (att.file_id) return att.file_id;
    if (att.id) return att.id;
    // Create a stable ID from file_name and object_key if available
    const identifier = fileName;
    const path = att.object_key || (att as any).storage_key || '';
    if (path) {
      // Use a hash-like ID based on the path to ensure consistency
      return `att-${identifier}-${path.split('/').pop() || Date.now()}`;
    }
    return `att-${Date.now()}-${Math.random()}`;
  };

  // Debug logging to see what we're receiving (only if no URL found)
  if (!url) {
    console.warn('transformBackendAttachment: No URL or object_key found', {
      attachment: att,
      hasUrl: !!att.url,
      hasObjectKey: !!att.object_key,
      hasStorageKey: !!(att as any).storage_key,
      hasFilePath: !!(att as any).file_path,
      keys: Object.keys(att),
    });
  } else {
    // Log successful transformation for debugging
    console.log('transformBackendAttachment: Successfully transformed', {
      originalFileName: att.file_name || att.name,
      extractedFileName: fileNameFromPath,
      finalFileName: fileName,
      url,
      hasObjectKey: !!att.object_key,
    });
  }

  return {
    id: generateId(),
    name: fileName,
    file_id: att.file_id,
    file_name: fileName,
    type: att.mime_type || att.type || 'application/octet-stream',
    size: att.size || 0,
    url,
  };
};

const parseContentString = (content: string): ParsedContent | null => {
  const trimmedContent = content.trim();
  if (!trimmedContent.startsWith('{') && !trimmedContent.startsWith('[')) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmedContent);
    if (parsed && typeof parsed === 'object') {
      return parsed as ParsedContent;
    }
  } catch (e) {
    console.warn('Content looked like JSON but failed to parse:', e);
  }
  return null;
};

const extractContentData = (content: string | ParsedContent) => {
  let textContent: string;
  let agent_name: string | undefined;
  let team_name: string | undefined;
  let agent_id: string | undefined;
  let actions: MessageAction[] | undefined;
  let parsedAttachments: BackendAttachment[] | undefined;

  if (typeof content === 'string' && content.trim()) {
    const parsed = parseContentString(content);

    if (parsed) {
      agent_name = parsed.agent_name;
      team_name = parsed.team_name;
      agent_id = parsed.agent_id;
      parsedAttachments = parsed.attachments;

      // Process actions
      if (parsed.actions && Array.isArray(parsed.actions)) {
        actions = parsed.actions.map((action, idx) => ({
          ...action,
          id: action.id || `action-${idx}`,
        }));
      }

      // Extract text content
      if (parsed.agent_response !== undefined) {
        textContent = parsed.agent_response || '';
      } else if (parsed.response !== undefined) {
        textContent = parsed.response || '';
      } else if (parsed.content !== undefined) {
        textContent = parsed.content || '';
      } else if (actions && actions.length > 0) {
        textContent = '';
      } else {
        textContent = content;
      }
    } else {
      textContent = content;
    }
  } else if (typeof content === 'object' && content !== null) {
    agent_name = content.agent_name;
    team_name = content.team_name;
    agent_id = content.agent_id;
    parsedAttachments = content.attachments;

    // Process actions
    if (content.actions && Array.isArray(content.actions)) {
      actions = content.actions.map((action, idx) => ({
        ...action,
        id: action.id || `action-${idx}`,
      }));
    }

    // Extract text content
    if (content.agent_response !== undefined) {
      textContent = content.agent_response || '';
    } else if (content.response !== undefined) {
      textContent = content.response || '';
    } else if (content.content !== undefined) {
      textContent = content.content || '';
    } else {
      textContent = JSON.stringify(content);
    }
  } else {
    textContent = '';
  }

  return {
    textContent,
    agent_name,
    team_name,
    agent_id,
    actions,
    parsedAttachments,
  };
};

const collectAttachments = (
  msg: BackendMessage,
  parsedAttachments?: BackendAttachment[],
): MessageAttachment[] => {
  const attachments: MessageAttachment[] = [];

  // Process files - only if they have valid data
  if (msg.files && Array.isArray(msg.files) && msg.files.length > 0) {
    const validFiles = msg.files.filter(
      (file) =>
        file &&
        (file.id || file.file_id) &&
        (file.filename || file.file_name || file.url || file.object_key),
    );
    if (validFiles.length > 0) {
      attachments.push(...validFiles.map(transformFileToAttachment));
    }
  }

  // Process images - only if they have valid data
  if (msg.images && Array.isArray(msg.images) && msg.images.length > 0) {
    const validImages = msg.images.filter(
      (img) => img && img.id && img.content,
    );
    if (validImages.length > 0) {
      attachments.push(...validImages.map(transformImageToAttachment));
    }
  }

  // Process direct attachments - only if they have valid data
  // Allow attachments from edge functions that may only have object_key/storage_key without file_name
  if (
    msg.attachments &&
    Array.isArray(msg.attachments) &&
    msg.attachments.length > 0
  ) {
    const validAttachments = msg.attachments.filter((att) => {
      if (!att) return false;

      // For edge function attachments, allow if they have any valid identifier or path
      // This handles cases where file_name is missing but object_key/storage_key exists
      const hasValidIdentifier = att.id || att.file_id;
      const hasValidPath =
        att.url ||
        att.object_key ||
        (att as any).storage_key ||
        (att as any).file_path;

      // Accept if: has identifier OR has path (even without name, since transformBackendAttachment handles fallback)
      const isValid = hasValidIdentifier || hasValidPath;

      if (!isValid) {
        console.warn(
          'collectAttachments: Filtered out attachment (no valid identifier or path)',
          {
            attachment: att,
            keys: Object.keys(att),
          },
        );
      }

      return isValid;
    });

    if (validAttachments.length > 0) {
      console.log('collectAttachments: Processing valid attachments', {
        total: msg.attachments.length,
        valid: validAttachments.length,
        attachments: validAttachments.map((att) => ({
          id: att.id,
          file_id: att.file_id,
          file_name: att.file_name,
          name: att.name,
          object_key: att.object_key,
          storage_key: (att as any).storage_key,
          url: att.url,
        })),
      });
      attachments.push(...validAttachments.map(transformBackendAttachment));
    } else {
      console.warn('collectAttachments: No valid attachments found', {
        total: msg.attachments.length,
        attachments: msg.attachments,
      });
    }
  }

  // Process parsed attachments from content - only if they have valid data
  // These attachments might only have object_key/storage_key without file_name (from edge functions)
  if (
    parsedAttachments &&
    Array.isArray(parsedAttachments) &&
    parsedAttachments.length > 0
  ) {
    const validParsedAttachments = parsedAttachments.filter((att) => {
      if (!att) return false;

      // Allow attachments with object_key/storage_key even without file_name (for edge function attachments)
      const hasValidPath =
        att.url || att.object_key || att.storage_key || (att as any).file_path;

      // Accept if: has path (name is optional, transformBackendAttachment handles fallback)
      return hasValidPath;
    });

    if (validParsedAttachments.length > 0) {
      attachments.push(
        ...validParsedAttachments.map(transformBackendAttachment),
      );
    }
  }

  return attachments;
};

export const parseBackendMessage = (
  msg: BackendMessage,
  msgIndex: number,
  sessionId?: string,
): Message | null => {
  if (msg.role !== 'user' && msg.role !== 'assistant') {
    return null;
  }

  // Extract content and metadata
  const {
    textContent,
    agent_name,
    team_name,
    agent_id,
    actions,
    parsedAttachments,
  } = extractContentData(msg.content);

  // Handle timestamp formats
  let timestamp: Date;
  if (msg.created_at) {
    timestamp =
      typeof msg.created_at === 'number'
        ? new Date(msg.created_at * 1000)
        : new Date(msg.created_at);
  } else {
    timestamp = new Date();
  }

  // Collect all attachments
  const attachments = collectAttachments(msg, parsedAttachments);

  // Create Message object
  return {
    id:
      msg.id ||
      `${sessionId || 'session'}_${msg.created_at || Date.now()}_${msgIndex}`,
    content: String(textContent || ''),
    sender: msg.role === 'user' ? 'user' : 'agent',
    timestamp,
    agent_id,
    agent_name,
    team_name,
    actions,
    attachments: attachments.length > 0 ? attachments : undefined,
  };
};

export const transformBackendMessages = (
  backendMessages: BackendMessage[],
  sessionId?: string,
): Message[] => {
  if (!Array.isArray(backendMessages)) {
    return [];
  }

  return backendMessages
    .map((msg, index) => parseBackendMessage(msg, index, sessionId))
    .filter((msg): msg is Message => msg !== null);
};
