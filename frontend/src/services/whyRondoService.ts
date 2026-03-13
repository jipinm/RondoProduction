import { customerApiClient } from './customerApiClient';

export interface WhyRondoItem {
  id: number;
  title: string;
  description: string;
  icon_url: string;
  position_order: number;
}

interface WhyRondoResponse {
  success: boolean;
  data: WhyRondoItem[];
}

const whyRondoPublicService = {
  /**
   * Fetch active Why Rondo Sports items for public display
   */
  getWhyRondoItems: async (): Promise<WhyRondoItem[]> => {
    try {
      const response = await customerApiClient.get<WhyRondoResponse>('/api/v1/why-rondo-sports');
      if (response.data.success && Array.isArray(response.data.data)) {
        return response.data.data;
      }
      return [];
    } catch (error) {
      console.error('Error fetching Why Rondo items:', error);
      return [];
    }
  }
};

export default whyRondoPublicService;
