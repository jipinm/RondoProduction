/**
 * Newsletter Service – Frontend
 * Handles newsletter subscription via the public API.
 */

const API_BASE = import.meta.env.VITE_CUSTOMER_API_BASE_URL || '';

export interface NewsletterSubscribeResponse {
  success: boolean;
  already: boolean;
  message: string;
}

async function subscribe(email: string): Promise<NewsletterSubscribeResponse> {
  const res = await fetch(`${API_BASE}/api/v1/newsletter/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  const data = await res.json();

  if (!res.ok && res.status !== 422) {
    throw new Error(data.message || 'Failed to subscribe.');
  }

  return data as NewsletterSubscribeResponse;
}

const newsletterService = { subscribe };
export default newsletterService;
