import apiClient from './api-client';

export interface SiteBrandingSettings {
  header_logo_url: string | null;
  footer_logo_url: string | null;
  favicon_url: string | null;
}

export type BrandingAssetType = 'header_logo' | 'footer_logo' | 'favicon';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
}

const siteBrandingService = {
  getSettings: async (): Promise<ApiResponse<SiteBrandingSettings>> => {
    try {
      return await apiClient.get<ApiResponse<SiteBrandingSettings>>('/admin/site-branding');
    } catch (error: any) {
      return { success: false, data: { header_logo_url: null, footer_logo_url: null, favicon_url: null }, error: error.message };
    }
  },

  uploadImage: async (
    type: BrandingAssetType,
    file: File
  ): Promise<ApiResponse<{ [key: string]: string }>> => {
    try {
      const formData = new FormData();
      formData.append('image', file);
      return await apiClient.postFormData<ApiResponse<{ [key: string]: string }>>(
        `/admin/site-branding/upload/${type}`,
        formData
      );
    } catch (error: any) {
      return { success: false, data: {}, error: error.message };
    }
  },

  deleteImage: async (
    type: BrandingAssetType
  ): Promise<ApiResponse<null>> => {
    try {
      return await apiClient.delete<ApiResponse<null>>(`/admin/site-branding/${type}`);
    } catch (error: any) {
      return { success: false, data: null, error: error.message };
    }
  },
};

export default siteBrandingService;
