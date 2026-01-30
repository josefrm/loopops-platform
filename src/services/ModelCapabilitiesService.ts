import { callBackendApi } from '@/utils/backendApiHelper';

export interface ModelCapabilities {
  modelId: string;
  modelName: string;
  provider: string;
  displayName: string;
  supportsFileUpload: boolean;
  supportsVision: boolean;
  allowedMimeTypes: string[];
  maxFileSizeMB: number;
  supportedFileFormats: string[];
  usedByAgents?: string[]; // Array of agent UUIDs
  usedByTeams?: string[]; // Array of team UUIDs
}

interface ModelCapabilitiesApiResponse {
  models: {
    [key: string]: {
      model_id: string;
      provider: string;
      display_name: string;
      capabilities: {
        modalities: string[];
        supports_vision: boolean;
        max_file_size_mb: number;
        supported_file_formats?: string[];
        supported_image_formats?: string[];
      };
      used_by_agents?: string[]; // Array of agent UUIDs
      used_by_teams?: string[]; // Array of team UUIDs
    };
  };
}

export const ModelCapabilitiesService = {
  /**
   * Obtiene las capabilities de TODOS los modelos desde el backend
   * El endpoint GET /api/v1/models/capabilities retorna un objeto con models dictionary
   * @returns Array de todas las capabilities de modelos disponibles
   */
  getAllModelCapabilities: async (): Promise<ModelCapabilities[]> => {
    try {
      const response = await callBackendApi<ModelCapabilitiesApiResponse>(
        '/api/v1/models/capabilities',
        'GET',
      );

      if (!response || !response.models) {
        console.error('Invalid response from model capabilities endpoint');
        return [];
      }

      // Convertir el objeto models en un array
      return Object.values(response.models).map((model) => {
        const fileFormats = model.capabilities.supported_file_formats || [];
        const imageFormats = model.capabilities.supported_image_formats || [];

        const allFormats = Array.from(
          new Set([...fileFormats, ...imageFormats]),
        );

        const mimeTypes =
          ModelCapabilitiesService.fileFormatsToMimeTypes(allFormats);

        const supportsFileUpload = allFormats.length > 0;

        return {
          modelId: model.model_id,
          modelName: model.model_id, // Usar model_id como nombre también
          provider: model.provider,
          displayName: model.display_name,
          supportsFileUpload,
          supportsVision: model.capabilities.supports_vision ?? false,
          allowedMimeTypes: mimeTypes,
          maxFileSizeMB: model.capabilities.max_file_size_mb ?? 30,
          supportedFileFormats: allFormats,
          usedByAgents: model.used_by_agents || [],
          usedByTeams: model.used_by_teams || [],
        };
      });
    } catch (error) {
      console.error('Error fetching model capabilities:', error);
      return [];
    }
  },

  getModelForAgent: async (templateId: string): Promise<string | null> => {
    try {
      const allCapabilities =
        await ModelCapabilitiesService.getAllModelCapabilities();

      for (const capability of allCapabilities) {
        // Check both used_by_agents and used_by_teams arrays
        const inAgents =
          capability.usedByAgents &&
          capability.usedByAgents.includes(templateId);
        const inTeams =
          capability.usedByTeams && capability.usedByTeams.includes(templateId);

        if (inAgents || inTeams) {
          return capability.modelId;
        }
      }

      return null;
    } catch (error) {
      console.error('Error getting model for template:', templateId, error);
      return null;
    }
  },

  /**
   * Convierte formatos de archivo (png, jpeg) a MIME types
   * @param formats Array de formatos como ['png', 'jpeg', 'jpg']
   */
  fileFormatsToMimeTypes: (formats: string[]): string[] => {
    const formatToMime: Record<string, string> = {
      png: 'image/png',
      jpeg: 'image/jpeg',
      jpg: 'image/jpeg',
      webp: 'image/webp',
      gif: 'image/gif',
      pdf: 'application/pdf',
      txt: 'text/plain',
      csv: 'text/csv',
      json: 'application/json',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };

    const mimeTypes = new Set<string>();
    formats.forEach((format) => {
      const mime = formatToMime[format.toLowerCase()];
      if (mime) {
        mimeTypes.add(mime);
      }
    });

    return Array.from(mimeTypes);
  },

  /**
   * Encuentra las capabilities de un modelo específico por nombre
   * Filtra en el cliente la lista de capabilities
   * @param capabilities Lista de todas las capabilities
   * @param modelName Nombre del modelo (case-insensitive)
   */
  getByModelName: (
    capabilities: ModelCapabilities[],
    modelName: string,
  ): ModelCapabilities | null => {
    return (
      capabilities.find(
        (cap) => cap.modelName.toLowerCase() === modelName.toLowerCase(),
      ) || null
    );
  },

  getByModelId: (
    capabilities: ModelCapabilities[],
    modelId: string,
  ): ModelCapabilities | null => {
    let result = capabilities.find((cap) => cap.modelId === modelId);

    if (!result) {
      result = capabilities.find((cap) => cap.modelName === modelId);
    }

    return result || null;
  },

  getAcceptAttribute: (capabilities: ModelCapabilities | null): string => {
    if (!capabilities || !capabilities.supportsFileUpload) {
      return '';
    }

    const extensions: string[] = [];
    const mimeTypes = capabilities.allowedMimeTypes;

    mimeTypes.forEach((mime) => {
      const ext = ModelCapabilitiesService.mimeTypeToExtension(mime);
      if (ext) {
        extensions.push(...ext);
      }
    });

    return extensions.length > 0 ? extensions.join(',') : '';
  },

  mimeTypeToExtension: (mimeType: string): string[] => {
    const mimeMap: Record<string, string[]> = {
      'application/pdf': ['.pdf'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/jpg': ['.jpg'],
      'image/gif': ['.gif'],
      'image/webp': ['.webp'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'text/csv': ['.csv'],
      'application/json': ['.json'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
        '.xlsx',
      ],
    };

    return mimeMap[mimeType] || [];
  },

  getFileTypesDescription: (capabilities: ModelCapabilities | null): string => {
    if (!capabilities || !capabilities.supportsFileUpload) {
      return 'No file uploads supported';
    }

    const mimeTypes = capabilities.allowedMimeTypes;
    const categories: string[] = [];

    const hasImages = mimeTypes.some((mime) => mime.startsWith('image/'));
    const hasPdf = mimeTypes.includes('application/pdf');
    const hasText = mimeTypes.some(
      (mime) =>
        mime.startsWith('text/') ||
        mime.includes('wordprocessingml') ||
        mime.includes('msword'),
    );
    const hasSpreadsheet = mimeTypes.some(
      (mime) => mime.includes('spreadsheet') || mime.includes('excel'),
    );

    if (hasImages) categories.push('Images');
    if (hasPdf) categories.push('PDF');
    if (hasText) categories.push('Documents');
    if (hasSpreadsheet) categories.push('Spreadsheets');

    if (categories.length === 0) {
      return 'Custom file types';
    }

    return categories.join(', ');
  },

  /**
   * Valida si un archivo es soportado por el modelo actual
   * @param file El archivo a validar
   * @param capabilities Capacidades del modelo
   * @returns true si el archivo es soportado, false si no
   */
  isFileSupportedByModel: (
    file: File,
    capabilities: ModelCapabilities | null,
  ): boolean => {
    if (!capabilities || !capabilities.supportsFileUpload) {
      return false;
    }

    // Si no hay restricciones de MIME types, permitir todo
    if (capabilities.allowedMimeTypes.length === 0) {
      return true;
    }

    // Verificar si el MIME type del archivo coincide con alguno permitido
    return capabilities.allowedMimeTypes.some((allowedMime) => {
      // Soporte para wildcards (e.g., "image/*")
      if (allowedMime.includes('*')) {
        const baseType = allowedMime.split('/')[0];
        return file.type.startsWith(baseType + '/');
      }
      return file.type === allowedMime;
    });
  },

  /**
   * Obtiene un mensaje de error descriptivo cuando un archivo no es soportado
   * @param file El archivo rechazado
   * @param capabilities Capacidades del modelo
   * @returns Mensaje de error descriptivo
   */
  getUnsupportedFileMessage: (
    file: File,
    capabilities: ModelCapabilities | null,
  ): string => {
    if (!capabilities || !capabilities.supportsFileUpload) {
      return 'This model does not support file uploads.';
    }

    const supportedFormats = capabilities.supportedFileFormats;
    if (supportedFormats.length === 0) {
      return `File type "${file.type}" is not supported.`;
    }

    const formatsString = supportedFormats
      .map((f) => f.toUpperCase())
      .join(', ');
    return `This model only accepts ${formatsString} files. Please convert "${file.name}" to one of these formats or select a different model.`;
  },
};
