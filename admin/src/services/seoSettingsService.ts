/**
 * SEO Settings Service
 * Handles API calls for the SEO Management admin module.
 */
import { apiClient } from './api-client';

export interface SeoSetting {
  id: number;
  page_key: string;
  page_name: string;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  og_title: string | null;
  og_description: string | null;
  robots: string;
  created_at: string;
  updated_at: string;
}

export interface SeoSettingsResponse {
  success: boolean;
  data?: SeoSetting | SeoSetting[];
  count?: number;
  message?: string;
  error?: string;
}

export interface UpdateSeoData {
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  og_title?: string;
  og_description?: string;
  robots?: string;
}

class SeoSettingsService {
  /** Fetch all SEO settings entries (admin). */
  async getAll(): Promise<SeoSettingsResponse> {
    return apiClient.get<SeoSettingsResponse>('/admin/seo-settings');
  }

  /** Fetch a single entry by its numeric ID (admin). */
  async getById(id: number): Promise<SeoSettingsResponse> {
    return apiClient.get<SeoSettingsResponse>(`/admin/seo-settings/${id}`);
  }

  /** Update SEO data for a page (admin). */
  async update(id: number, data: UpdateSeoData): Promise<SeoSettingsResponse> {
    return apiClient.put<SeoSettingsResponse>(`/admin/seo-settings/${id}`, data);
  }
}

export const seoSettingsService = new SeoSettingsService();
