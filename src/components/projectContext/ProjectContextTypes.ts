// Generic interfaces
export interface TabCategory {
  id: number;
  name: string;
  priority?: number;
}

export interface TabItem {
  id: number | string;
  [key: string]: any;
}

export interface TabItemsResponse<T extends TabItem> {
  category_id: number;
  items: T[];
}

// Project-specific item interface
export interface ProjectItem extends TabItem {
  title: string;
  description: string;
  created_at: Date;
  updated_at: Date;
  fileSize?: number;
  isDeliverable: boolean;
  isKeyDeliverable?: boolean;
  mimeType?: string;
  mime_type?: string;
  createdInEditor?: boolean;
  // Optional file specific properties
  file_size?: number;
  signed_url?: string;
}

// Project-specific response interface
export interface ProjectCategoryItemsResponse
  extends TabItemsResponse<ProjectItem> {
  category_id: number;
  items: ProjectItem[];
}
