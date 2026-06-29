/**
 * Blog Management Service – Admin
 * Handles all API calls for the Blog Management admin module.
 */
import { apiClient } from './api-client';

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export interface BlogCategory {
  id: number;
  name: string;
  slug: string;
  created_at?: string;
  updated_at?: string;
}

export interface BlogTag {
  id: number;
  name: string;
  slug: string;
  created_at?: string;
  updated_at?: string;
}

export interface Blog {
  id: number;
  title: string;
  slug: string;
  featured_image: string | null;
  excerpt: string | null;
  content: string | null;
  category_id: number | null;
  category_name?: string | null;
  publish_date: string | null;
  status: 'draft' | 'published';
  tags: BlogTag[];
  seo_title?: string | null;
  meta_description?: string | null;
  meta_keywords?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  og_image?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface BlogsListResponse {
  success: boolean;
  data: Blog[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  error?: string;
}

export interface BlogResponse {
  success: boolean;
  data?: Blog;
  error?: string;
  errors?: string[];
}

export interface CategoriesResponse {
  success: boolean;
  data: BlogCategory[];
  error?: string;
}

export interface TagsResponse {
  success: boolean;
  data: BlogTag[];
  error?: string;
}

export interface CategoryResponse {
  success: boolean;
  data?: BlogCategory;
  error?: string;
}

export interface TagResponse {
  success: boolean;
  data?: BlogTag;
  error?: string;
}

export interface BlogFormData {
  title: string;
  slug: string;
  featured_image?: string | null;
  excerpt?: string | null;
  content?: string | null;
  category_id?: number | null;
  tag_ids?: number[];
  publish_date?: string | null;
  status: 'draft' | 'published';
  seo_title?: string | null;
  meta_description?: string | null;
  meta_keywords?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  og_image?: string | null;
}

export interface BlogListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sort_by?: string;
  sort_dir?: 'ASC' | 'DESC';
}

// ──────────────────────────────────────────────────────────────────────────────
// Service
// ──────────────────────────────────────────────────────────────────────────────

class BlogManagementService {
  // ── Blogs ──────────────────────────────────────────────────────────────

  async getBlogs(params: BlogListParams = {}): Promise<BlogsListResponse> {
    const query = new URLSearchParams();
    if (params.page)     query.set('page',     String(params.page));
    if (params.limit)    query.set('limit',    String(params.limit));
    if (params.search)   query.set('search',   params.search);
    if (params.status)   query.set('status',   params.status);
    if (params.sort_by)  query.set('sort_by',  params.sort_by);
    if (params.sort_dir) query.set('sort_dir', params.sort_dir);
    const qs = query.toString();
    return apiClient.get<BlogsListResponse>(`/admin/blogs${qs ? `?${qs}` : ''}`);
  }

  async getBlog(id: number): Promise<BlogResponse> {
    return apiClient.get<BlogResponse>(`/admin/blogs/${id}`);
  }

  async createBlog(data: BlogFormData): Promise<BlogResponse> {
    return apiClient.post<BlogResponse>('/admin/blogs', data);
  }

  async updateBlog(id: number, data: BlogFormData): Promise<BlogResponse> {
    return apiClient.put<BlogResponse>(`/admin/blogs/${id}`, data);
  }

  async deleteBlog(id: number): Promise<{ success: boolean; error?: string }> {
    return apiClient.delete<{ success: boolean; error?: string }>(`/admin/blogs/${id}`);
  }

  async uploadFeaturedImage(id: number, file: File): Promise<{ success: boolean; data?: { featured_image: string }; error?: string }> {
    const formData = new FormData();
    formData.append('image', file);
    return apiClient.postFormData<{ success: boolean; data?: { featured_image: string }; error?: string }>(
      `/admin/blogs/${id}/upload-image`,
      formData
    );
  }

  // ── Categories ─────────────────────────────────────────────────────────

  async getCategories(): Promise<CategoriesResponse> {
    return apiClient.get<CategoriesResponse>('/admin/blog-categories');
  }

  async createCategory(data: { name: string; slug?: string }): Promise<CategoryResponse> {
    return apiClient.post<CategoryResponse>('/admin/blog-categories', data);
  }

  async updateCategory(id: number, data: { name: string; slug?: string }): Promise<CategoryResponse> {
    return apiClient.put<CategoryResponse>(`/admin/blog-categories/${id}`, data);
  }

  async deleteCategory(id: number): Promise<{ success: boolean; error?: string }> {
    return apiClient.delete<{ success: boolean; error?: string }>(`/admin/blog-categories/${id}`);
  }

  // ── Tags ───────────────────────────────────────────────────────────────

  async getTags(): Promise<TagsResponse> {
    return apiClient.get<TagsResponse>('/admin/blog-tags');
  }

  async createTag(data: { name: string; slug?: string }): Promise<TagResponse> {
    return apiClient.post<TagResponse>('/admin/blog-tags', data);
  }

  async updateTag(id: number, data: { name: string; slug?: string }): Promise<TagResponse> {
    return apiClient.put<TagResponse>(`/admin/blog-tags/${id}`, data);
  }

  async deleteTag(id: number): Promise<{ success: boolean; error?: string }> {
    return apiClient.delete<{ success: boolean; error?: string }>(`/admin/blog-tags/${id}`);
  }
}

export const blogManagementService = new BlogManagementService();
