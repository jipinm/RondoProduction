/**
 * Email Template Management Service
 * Handles API calls for the Email Management admin module.
 */
import { apiClient } from './api-client';

export interface EmailTemplate {
  id: number;
  event_key: string;
  event_label: string;
  subject: string;
  body_html: string;
  body_text: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmailTemplateSummary {
  id: number;
  event_key: string;
  event_label: string;
  subject: string;
  is_active: boolean;
  updated_at: string;
}

export interface EmailTemplatesResponse {
  success: boolean;
  data?: EmailTemplate | EmailTemplateSummary[];
  count?: number;
  message?: string;
  error?: string;
}

export interface UpdateEmailTemplateData {
  subject?: string;
  body_html?: string;
  body_text?: string;
  is_active?: boolean;
}

/**
 * Available placeholders per event type, shown in the admin UI as a reference.
 */
export const EVENT_PLACEHOLDERS: Record<string, Array<{ key: string; description: string }>> = {
  email_verification: [
    { key: '{{customer_name}}', description: 'Full name of the customer' },
    { key: '{{verify_url}}',    description: 'Email verification link' },
  ],
  password_reset: [
    { key: '{{customer_name}}', description: 'Full name of the customer' },
    { key: '{{reset_url}}',     description: 'Password reset link' },
  ],
  email_change_verification: [
    { key: '{{customer_name}}', description: 'Full name of the customer' },
    { key: '{{new_email}}',     description: 'The new email address' },
    { key: '{{verify_url}}',    description: 'Email change confirmation link' },
  ],
  booking_confirmation: [
    { key: '{{customer_name}}',     description: 'Full name of the customer' },
    { key: '{{booking_id}}',        description: 'Internal booking ID' },
    { key: '{{booking_reference}}', description: 'Booking reference code' },
    { key: '{{event_name}}',        description: 'Name of the event' },
    { key: '{{event_date}}',        description: 'Formatted event date' },
    { key: '{{venue_name}}',        description: 'Name of the venue' },
    { key: '{{ticket_count}}',      description: 'Number of tickets' },
    { key: '{{total_amount}}',      description: 'Formatted total amount' },
    { key: '{{currency}}',          description: 'Currency code (e.g. EUR)' },
  ],
};

class EmailTemplateService {
  /** Fetch summary list of all email templates (no body content). */
  async getAll(): Promise<EmailTemplatesResponse> {
    return apiClient.get<EmailTemplatesResponse>('/admin/email-templates');
  }

  /** Fetch full template including body_html and body_text. */
  async getById(id: number): Promise<EmailTemplatesResponse> {
    return apiClient.get<EmailTemplatesResponse>(`/admin/email-templates/${id}`);
  }

  /** Update subject, body_html, body_text and/or is_active for a template. */
  async update(id: number, data: UpdateEmailTemplateData): Promise<EmailTemplatesResponse> {
    return apiClient.put<EmailTemplatesResponse>(`/admin/email-templates/${id}`, data);
  }

  /** Reset a template to its built-in default content. */
  async resetToDefault(id: number): Promise<EmailTemplatesResponse> {
    return apiClient.post<EmailTemplatesResponse>(`/admin/email-templates/${id}/reset`, {});
  }
}

export const emailTemplateService = new EmailTemplateService();
