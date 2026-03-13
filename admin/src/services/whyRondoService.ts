import apiClient from './api-client';

export interface WhyRondoItem {
  id: number;
  title: string;
  description: string;
  icon_url: string;
  position_order: number;
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
}

const whyRondoService = {
  /**
   * Get all Why Rondo Sports items (Admin)
   */
  getAllItems: async (): Promise<ApiResponse<WhyRondoItem[]>> => {
    try {
      return await apiClient.get<ApiResponse<WhyRondoItem[]>>('/admin/why-rondo-sports');
    } catch (error: any) {
      return {
        success: false,
        data: [],
        error: error.message || 'Failed to fetch items'
      };
    }
  },

  /**
   * Create a new item
   */
  createItem: async (data: Partial<WhyRondoItem>): Promise<ApiResponse<{ id: number }>> => {
    try {
      return await apiClient.post<ApiResponse<{ id: number }>>('/admin/why-rondo-sports', data);
    } catch (error: any) {
      return {
        success: false,
        data: { id: 0 },
        error: error.message || 'Failed to create item'
      };
    }
  },

  /**
   * Update an existing item
   */
  updateItem: async (id: number, data: Partial<WhyRondoItem>): Promise<ApiResponse<void>> => {
    try {
      return await apiClient.put<ApiResponse<void>>(`/admin/why-rondo-sports/${id}`, data);
    } catch (error: any) {
      return {
        success: false,
        data: undefined as any,
        error: error.message || 'Failed to update item'
      };
    }
  },

  /**
   * Delete an item
   */
  deleteItem: async (id: number): Promise<ApiResponse<void>> => {
    try {
      return await apiClient.delete<ApiResponse<void>>(`/admin/why-rondo-sports/${id}`);
    } catch (error: any) {
      return {
        success: false,
        data: undefined as any,
        error: error.message || 'Failed to delete item'
      };
    }
  },

  /**
   * Upload icon image for an item
   */
  uploadIcon: async (id: number, file: File): Promise<ApiResponse<{ icon_url: string }>> => {
    try {
      const formData = new FormData();
      formData.append('icon', file);
      return await apiClient.postFormData<ApiResponse<{ icon_url: string }>>(
        `/admin/why-rondo-sports/${id}/upload-icon`,
        formData
      );
    } catch (error: any) {
      return {
        success: false,
        data: { icon_url: '' },
        error: error.message || 'Failed to upload icon'
      };
    }
  }
};

export default whyRondoService;
