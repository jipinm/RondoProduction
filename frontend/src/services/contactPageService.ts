import { customerApiClient } from './customerApiClient';

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
}

interface ContactPageResponse {
  success: boolean;
  data: ContactPageSettings | null;
}

const DEFAULT_SETTINGS: ContactPageSettings = {
  banner_image_url: null,
  email_address: 'info@rondosports.com',
  phone_number: '+44 800 000 0000',
  whatsapp_number: '',
  social_facebook: '',
  social_twitter: '',
  social_instagram: '',
  social_linkedin: '',
  social_youtube: '',
};

const contactPagePublicService = {
  /**
   * Fetch contact page settings for public display.
   * Falls back to sensible defaults on error so the page always renders.
   */
  getSettings: async (): Promise<ContactPageSettings> => {
    try {
      const response = await customerApiClient.get<ContactPageResponse>(
        '/api/v1/contact-page'
      );
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      return DEFAULT_SETTINGS;
    } catch (error) {
      console.error('Error fetching contact page settings:', error);
      return DEFAULT_SETTINGS;
    }
  },
};

export { DEFAULT_SETTINGS };
export default contactPagePublicService;

