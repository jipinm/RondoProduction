/**
 * Blog Service – Frontend
 * Fetches blog data from the public API endpoints.
 */

const API_BASE = import.meta.env.VITE_CUSTOMER_API_BASE_URL || '';

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export interface BlogCategory {
  id: number;
  name: string;
  slug: string;
}

export interface BlogTag {
  id: number;
  name: string;
  slug: string;
}

export interface BlogSummary {
  id: number;
  title: string;
  slug: string;
  featured_image: string | null;
  excerpt: string | null;
  publish_date: string | null;
  status: string;
  category_id: number | null;
  category_name: string | null;
  category_slug: string | null;
  tags: BlogTag[];
}

export interface BlogDetail extends BlogSummary {
  content: string | null;
  seo_title?: string | null;
  meta_description?: string | null;
  meta_keywords?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  og_image?: string | null;
}

export interface BlogListResponse {
  success: boolean;
  data: BlogSummary[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface BlogListParams {
  page?: number;
  limit?: number;
  category_id?: number | null;
  tag_id?: number | null;
}

// ──────────────────────────────────────────────────────────────────────────────
// Service
// ──────────────────────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

export async function getBlogs(params: BlogListParams = {}): Promise<BlogListResponse> {
  const q = new URLSearchParams();
  if (params.page)        q.set('page',        String(params.page));
  if (params.limit)       q.set('limit',       String(params.limit));
  if (params.category_id) q.set('category_id', String(params.category_id));
  if (params.tag_id)      q.set('tag_id',      String(params.tag_id));
  const qs = q.toString();
  return apiFetch<BlogListResponse>(`/api/v1/blogs${qs ? `?${qs}` : ''}`);
}

export async function getBlogBySlug(slug: string): Promise<{ success: boolean; data?: BlogDetail }> {
  return apiFetch(`/api/v1/blogs/${encodeURIComponent(slug)}`);
}

export async function getRelatedBlogs(slug: string): Promise<{ success: boolean; data?: BlogSummary[] }> {
  return apiFetch(`/api/v1/blogs/${encodeURIComponent(slug)}/related`);
}

export async function getBlogCategories(): Promise<{ success: boolean; data?: BlogCategory[] }> {
  return apiFetch('/api/v1/blog-categories');
}

export async function getBlogTags(): Promise<{ success: boolean; data?: BlogTag[] }> {
  return apiFetch('/api/v1/blog-tags');
}

export function formatBlogDate(dt: string | null): string {
  if (!dt) return '';
  return new Date(dt).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}
