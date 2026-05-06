import apiClient from './api-client';

export interface ContactPageSettings {
  id?: number;
  banner_image_url: string | null;
  email_address: string;
  phone_number: string;
  whatsapp_number: string;
  social_facebook: string;
  social_twitter: string;
  social_instagram: string;
  social_linkedin: string;
  social_youtube: string;
  created_at?: string;
  updated_at?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
}

const contactPageService = {
  /**
   * Fetch current contact page settings (Admin)
   */
  getSettings: async (): Promise<ApiResponse<ContactPageSettings | null>> => {
    try {
      return await apiClient.get<ApiResponse<ContactPageSettings | null>>('/admin/contact-page');
    } catch (error: any) {
      return {
        success: false,
        data: null,
        error: error.message || 'Failed to fetch contact page settings',
      };
    }
  },

  /**
   * Update contact page settings (Admin)
   */
  updateSettings: async (
    data: Partial<ContactPageSettings>
  ): Promise<ApiResponse<ContactPageSettings | null>> => {
    try {
      return await apiClient.put<ApiResponse<ContactPageSettings | null>>('/admin/contact-page', data);
    } catch (error: any) {
      return {
        success: false,
        data: null,
        error: error.message || 'Failed to update contact page settings',
      };
    }
  },

  /**
   * Upload banner image (Admin)
   */
  uploadBanner: async (file: File): Promise<ApiResponse<{ banner_image_url: string } | null>> => {
    try {
      const formData = new FormData();
      formData.append('banner', file);
      return await apiClient.postFormData<ApiResponse<{ banner_image_url: string } | null>>(
        '/admin/contact-page/banner',
        formData
      );
    } catch (error: any) {
      return {
        success: false,
        data: null,
        error: error.message || 'Failed to upload banner',
      };
    }
  },
};

export default contactPageService;

