/**
 * Newsletter Management Service – Admin
 */
import { apiClient } from './api-client';

export interface NewsletterSubscriber {
  id: number;
  email: string;
  name: string | null;
  submit_from: string;
  subscribed_at: string;
}

export interface NewsletterListResponse {
  success: boolean;
  data: NewsletterSubscriber[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface NewsletterDeleteResponse {
  success: boolean;
  message: string;
}

export interface NewsletterBulkImportResponse {
  success: boolean;
  added: string[];
  duplicates: string[];
  invalid: string[];
  message?: string;
}

const newsletterManagementService = {
  async list(params: { search?: string; page?: number; limit?: number } = {}): Promise<NewsletterListResponse> {
    const qs = new URLSearchParams();
    if (params.search) qs.set('search', params.search);
    if (params.page)   qs.set('page',   String(params.page));
    if (params.limit)  qs.set('limit',  String(params.limit));
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return apiClient.get<NewsletterListResponse>(`/admin/newsletter-subscribers${query}`);
  },

  async delete(id: number): Promise<NewsletterDeleteResponse> {
    return apiClient.delete<NewsletterDeleteResponse>(`/admin/newsletter-subscribers/${id}`);
  },

  async bulkImport(emails: string[]): Promise<NewsletterBulkImportResponse> {
    return apiClient.post<NewsletterBulkImportResponse>(
      '/admin/newsletter-subscribers/bulk-import',
      { emails }
    );
  },

  async exportCsv(): Promise<void> {
    const baseURL = (import.meta.env.VITE_API_URL as string) || '';
    const token   = localStorage.getItem('access_token') || '';

    const res = await fetch(`${baseURL}/admin/newsletter-subscribers/export`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error('Export failed.');

    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};

export default newsletterManagementService;
