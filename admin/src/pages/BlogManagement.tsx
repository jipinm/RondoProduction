import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Edit2, Trash2, Search, ChevronLeft, ChevronRight,
  Tag, FolderOpen, X, Check, Loader2, AlertCircle, BookOpen,
} from 'lucide-react';
import RichTextEditor from '../components/RichTextEditor';
import { BannerImageUpload } from '../components/banners/BannerImageUpload';
import {
  blogManagementService,
  type Blog,
  type BlogCategory,
  type BlogTag,
  type BlogFormData,
} from '../services/blogManagementService';
import styles from './BlogManagement.module.css';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function formatDate(dt: string | null): string {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function nowDatetimeLocal(): string {
  const d = new Date();
  d.setSeconds(0, 0);
  return d.toISOString().slice(0, 16);
}

// ─────────────────────────────────────────────────────────────────────────────
// Types for active tab
// ─────────────────────────────────────────────────────────────────────────────

type ActiveTab = 'blogs' | 'categories' | 'tags';

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

const BlogManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('blogs');

  // ── Blog list state ────────────────────────────────────────────────────
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [totalBlogs, setTotalBlogs] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [blogsLoading, setBlogsLoading] = useState(false);
  const [blogsError, setBlogsError] = useState<string | null>(null);

  // ── Categories / Tags ──────────────────────────────────────────────────
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [tags, setTags] = useState<BlogTag[]>([]);

  // ── Form state ─────────────────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false);
  const [editingBlog, setEditingBlog] = useState<Blog | null>(null);
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const emptyForm = (): BlogFormData => ({
    title: '',
    slug: '',
    featured_image: null,
    excerpt: '',
    content: '',
    category_id: null,
    tag_ids: [],
    publish_date: nowDatetimeLocal(),
    status: 'draft',
    seo_title: '',
    meta_description: '',
    meta_keywords: '',
    og_title: '',
    og_description: '',
    og_image: '',
  });
  const [formData, setFormData] = useState<BlogFormData>(emptyForm());
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // ── Category form ──────────────────────────────────────────────────────
  const [catForm, setCatForm] = useState({ name: '', slug: '' });
  const [editingCat, setEditingCat] = useState<BlogCategory | null>(null);
  const [catLoading, setCatLoading] = useState(false);
  const [catError, setCatError] = useState<string | null>(null);
  const [catSuccess, setCatSuccess] = useState<string | null>(null);

  // ── Tag form ───────────────────────────────────────────────────────────
  const [tagForm, setTagForm] = useState({ name: '', slug: '' });
  const [editingTag, setEditingTag] = useState<BlogTag | null>(null);
  const [tagLoading, setTagLoading] = useState(false);
  const [tagError, setTagError] = useState<string | null>(null);
  const [tagSuccess, setTagSuccess] = useState<string | null>(null);

  // ─────────────────────────────────────────────────────────────────────
  // Data loading
  // ─────────────────────────────────────────────────────────────────────

  const loadBlogs = useCallback(async (page = currentPage) => {
    setBlogsLoading(true);
    setBlogsError(null);
    try {
      const res = await blogManagementService.getBlogs({
        page,
        limit: 10,
        search: searchTerm,
        status: statusFilter,
        sort_by: 'publish_date',
        sort_dir: 'DESC',
      });
      if (res.success) {
        setBlogs(res.data);
        setTotalBlogs(res.total);
        setTotalPages(res.total_pages);
      } else {
        setBlogsError(res.error || 'Failed to load blogs');
      }
    } catch {
      setBlogsError('Failed to connect to the API');
    } finally {
      setBlogsLoading(false);
    }
  }, [currentPage, searchTerm, statusFilter]);

  const loadCategories = useCallback(async () => {
    try {
      const res = await blogManagementService.getCategories();
      if (res.success) setCategories(res.data);
    } catch { /* silent */ }
  }, []);

  const loadTags = useCallback(async () => {
    try {
      const res = await blogManagementService.getTags();
      if (res.success) setTags(res.data);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    loadBlogs(1);
    setCurrentPage(1);
  }, [searchTerm, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadBlogs(currentPage);
  }, [currentPage]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadCategories();
    loadTags();
  }, [loadCategories, loadTags]);

  // ─────────────────────────────────────────────────────────────────────
  // Blog form helpers
  // ─────────────────────────────────────────────────────────────────────

  const openCreateForm = () => {
    setEditingBlog(null);
    setFormData(emptyForm());
    setPendingImage(null);
    setFormError(null);
    setFormSuccess(null);
    setShowForm(true);
  };

  const openEditForm = async (blog: Blog) => {
    setFormError(null);
    setFormSuccess(null);
    setPendingImage(null);
    setEditingBlog(blog);
    const res = await blogManagementService.getBlog(blog.id);
    const b = res.data ?? blog;
    setFormData({
      title:           b.title,
      slug:            b.slug,
      featured_image:  b.featured_image ?? null,
      excerpt:         b.excerpt ?? '',
      content:         b.content ?? '',
      category_id:     b.category_id ?? null,
      tag_ids:         (b.tags ?? []).map(t => t.id),
      publish_date:    b.publish_date
        ? new Date(b.publish_date).toISOString().slice(0, 16)
        : nowDatetimeLocal(),
      status:          b.status,
      seo_title:       b.seo_title ?? '',
      meta_description:b.meta_description ?? '',
      meta_keywords:   b.meta_keywords ?? '',
      og_title:        b.og_title ?? '',
      og_description:  b.og_description ?? '',
      og_image:        b.og_image ?? '',
    });
    setShowForm(true);
  };

  const handleTitleChange = (title: string) => {
    setFormData(prev => ({
      ...prev,
      title,
      slug: editingBlog ? prev.slug : slugify(title),
    }));
  };

  const toggleTag = (tagId: number) => {
    setFormData(prev => ({
      ...prev,
      tag_ids: prev.tag_ids?.includes(tagId)
        ? prev.tag_ids.filter(id => id !== tagId)
        : [...(prev.tag_ids ?? []), tagId],
    }));
  };

  const handleSubmitBlog = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);
    setFormSuccess(null);

    try {
      const payload: BlogFormData = {
        ...formData,
        featured_image:  formData.featured_image || null,
        excerpt:         formData.excerpt || null,
        content:         formData.content || null,
        category_id:     formData.category_id ?? null,
        publish_date:    formData.publish_date
          ? new Date(formData.publish_date).toISOString().slice(0, 19).replace('T', ' ')
          : new Date().toISOString().slice(0, 19).replace('T', ' '),
        seo_title:       formData.seo_title || null,
        meta_description:formData.meta_description || null,
        meta_keywords:   formData.meta_keywords || null,
        og_title:        formData.og_title || null,
        og_description:  formData.og_description || null,
        og_image:        formData.og_image || null,
      };

      let res;
      let savedId: number;
      if (editingBlog) {
        res = await blogManagementService.updateBlog(editingBlog.id, payload);
        savedId = editingBlog.id;
      } else {
        res = await blogManagementService.createBlog(payload);
        savedId = res.data?.id ?? 0;
      }

      if (!res.success) {
        setFormError(res.errors?.join(', ') ?? res.error ?? 'Failed to save blog');
        setFormLoading(false);
        return;
      }

      // Upload featured image if a new file was selected
      if (pendingImage && savedId) {
        const uploadRes = await blogManagementService.uploadFeaturedImage(savedId, pendingImage);
        if (!uploadRes.success) {
          setFormError('Blog saved but image upload failed: ' + (uploadRes.error ?? ''));
          setFormLoading(false);
          loadBlogs(currentPage);
          return;
        }
      }

      setFormSuccess(editingBlog ? 'Blog updated successfully.' : 'Blog created successfully.');
      setShowForm(false);
      setPendingImage(null);
      loadBlogs(currentPage);
    } catch {
      setFormError('Failed to save blog');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteBlog = async (id: number) => {
    if (!window.confirm('Delete this blog post? This action cannot be undone.')) return;
    try {
      const res = await blogManagementService.deleteBlog(id);
      if (res.success) {
        loadBlogs(currentPage);
      } else {
        alert(res.error ?? 'Failed to delete');
      }
    } catch {
      alert('Failed to delete');
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  // Category helpers
  // ─────────────────────────────────────────────────────────────────────

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setCatLoading(true);
    setCatError(null);
    setCatSuccess(null);
    try {
      const data = { name: catForm.name, slug: catForm.slug || slugify(catForm.name) };
      const res = editingCat
        ? await blogManagementService.updateCategory(editingCat.id, data)
        : await blogManagementService.createCategory(data);
      if (res.success) {
        setCatSuccess(editingCat ? 'Category updated.' : 'Category created.');
        setCatForm({ name: '', slug: '' });
        setEditingCat(null);
        loadCategories();
      } else {
        setCatError(res.error ?? 'Failed to save');
      }
    } catch {
      setCatError('Failed to save');
    } finally {
      setCatLoading(false);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!window.confirm('Delete this category?')) return;
    const res = await blogManagementService.deleteCategory(id);
    if (res.success) loadCategories();
    else alert(res.error ?? 'Failed to delete');
  };

  // ─────────────────────────────────────────────────────────────────────
  // Tag helpers
  // ─────────────────────────────────────────────────────────────────────

  const handleSaveTag = async (e: React.FormEvent) => {
    e.preventDefault();
    setTagLoading(true);
    setTagError(null);
    setTagSuccess(null);
    try {
      const data = { name: tagForm.name, slug: tagForm.slug || slugify(tagForm.name) };
      const res = editingTag
        ? await blogManagementService.updateTag(editingTag.id, data)
        : await blogManagementService.createTag(data);
      if (res.success) {
        setTagSuccess(editingTag ? 'Tag updated.' : 'Tag created.');
        setTagForm({ name: '', slug: '' });
        setEditingTag(null);
        loadTags();
      } else {
        setTagError(res.error ?? 'Failed to save');
      }
    } catch {
      setTagError('Failed to save');
    } finally {
      setTagLoading(false);
    }
  };

  const handleDeleteTag = async (id: number) => {
    if (!window.confirm('Delete this tag?')) return;
    const res = await blogManagementService.deleteTag(id);
    if (res.success) loadTags();
    else alert(res.error ?? 'Failed to delete');
  };

  // ─────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          <BookOpen size={24} />
          Blog Management
        </h1>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'blogs' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('blogs')}
        >
          <BookOpen size={16} /> Blog Posts
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'categories' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('categories')}
        >
          <FolderOpen size={16} /> Categories
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'tags' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('tags')}
        >
          <Tag size={16} /> Tags
        </button>
      </div>

      {/* ── BLOG LIST TAB ─────────────────────────────────────────────── */}
      {activeTab === 'blogs' && !showForm && (
        <>
          <div className={styles.toolbar}>
            <div className={styles.toolbarLeft}>
              <div className={styles.searchWrap}>
                <Search size={16} className={styles.searchIcon} />
                <input
                  className={styles.searchInput}
                  type="text"
                  placeholder="Search blogs..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <select
                className={styles.filterSelect}
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </div>
            <button className={styles.addButton} onClick={openCreateForm}>
              <Plus size={16} /> New Blog Post
            </button>
          </div>

          {blogsError && (
            <div className={styles.errorBanner}>
              <AlertCircle size={16} /> {blogsError}
            </div>
          )}

          {blogsLoading ? (
            <div className={styles.loading}><Loader2 size={24} className={styles.spin} /> Loading...</div>
          ) : (
            <>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Category</th>
                      <th>Tags</th>
                      <th>Publish Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {blogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className={styles.emptyRow}>No blog posts found.</td>
                      </tr>
                    ) : blogs.map(blog => (
                      <tr key={blog.id}>
                        <td className={styles.tdTitle}>
                          <div className={styles.blogTitle}>{blog.title}</div>
                          <div className={styles.blogSlug}>{blog.slug}</div>
                        </td>
                        <td>{blog.category_name ?? '—'}</td>
                        <td>
                          <div className={styles.tagList}>
                            {(blog.tags ?? []).map(t => (
                              <span key={t.id} className={styles.tagChip}>{t.name}</span>
                            ))}
                          </div>
                        </td>
                        <td>{formatDate(blog.publish_date)}</td>
                        <td>
                          <span className={`${styles.statusBadge} ${styles[`status_${blog.status}`]}`}>
                            {blog.status}
                          </span>
                        </td>
                        <td>
                          <div className={styles.actions}>
                            <button
                              className={styles.editBtn}
                              onClick={() => openEditForm(blog)}
                              title="Edit"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              className={styles.deleteBtn}
                              onClick={() => handleDeleteBlog(blog.id)}
                              title="Delete"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className={styles.pagination}>
                  <span className={styles.paginationInfo}>
                    {totalBlogs} posts &bull; Page {currentPage} of {totalPages}
                  </span>
                  <div className={styles.paginationBtns}>
                    <button
                      className={styles.pageBtn}
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage(p => p - 1)}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      className={styles.pageBtn}
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage(p => p + 1)}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── BLOG FORM ─────────────────────────────────────────────────── */}
      {activeTab === 'blogs' && showForm && (
        <div className={styles.formPanel}>
          <div className={styles.formHeader}>
            <h2>{editingBlog ? 'Edit Blog Post' : 'New Blog Post'}</h2>
            <button className={styles.closeFormBtn} onClick={() => setShowForm(false)}>
              <X size={20} />
            </button>
          </div>

          {formError && <div className={styles.errorBanner}><AlertCircle size={16} />{formError}</div>}
          {formSuccess && <div className={styles.successBanner}><Check size={16} />{formSuccess}</div>}

          <form onSubmit={handleSubmitBlog} className={styles.form}>
            <div className={styles.formGrid}>

              {/* Title */}
              <div className={`${styles.field} ${styles.fieldFull}`}>
                <label className={styles.label}>Title <span className={styles.required}>*</span></label>
                <input
                  className={styles.input}
                  type="text"
                  required
                  value={formData.title}
                  onChange={e => handleTitleChange(e.target.value)}
                />
              </div>

              {/* Slug */}
              <div className={`${styles.field} ${styles.fieldFull}`}>
                <label className={styles.label}>Slug <span className={styles.required}>*</span></label>
                <input
                  className={styles.input}
                  type="text"
                  required
                  value={formData.slug}
                  onChange={e => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                />
              </div>

              {/* Featured Image Upload */}
              <div className={`${styles.field} ${styles.fieldFull}`}>
                <label className={styles.label}>Featured Image</label>
                <BannerImageUpload
                  currentImageUrl={formData.featured_image ?? ''}
                  onImageChange={(file) => setPendingImage(file)}
                  maxSizeMessage="Maximum file size: 10MB."
                  dimensionHint="1200×630px"
                />
              </div>

              {/* Category */}
              <div className={styles.field}>
                <label className={styles.label}>Category</label>
                <select
                  className={styles.select}
                  value={formData.category_id ?? ''}
                  onChange={e => setFormData(prev => ({
                    ...prev,
                    category_id: e.target.value ? Number(e.target.value) : null,
                  }))}
                >
                  <option value="">— No Category —</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Publish Date */}
              <div className={styles.field}>
                <label className={styles.label}>Publish Date &amp; Time</label>
                <input
                  className={styles.input}
                  type="datetime-local"
                  value={formData.publish_date ?? ''}
                  onChange={e => setFormData(prev => ({ ...prev, publish_date: e.target.value }))}
                />
              </div>

              {/* Status */}
              <div className={styles.field}>
                <label className={styles.label}>Status <span className={styles.required}>*</span></label>
                <select
                  className={styles.select}
                  value={formData.status}
                  onChange={e => setFormData(prev => ({
                    ...prev,
                    status: e.target.value as 'draft' | 'published',
                  }))}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>

              {/* Tags */}
              <div className={`${styles.field} ${styles.fieldFull}`}>
                <label className={styles.label}>Tags</label>
                <div className={styles.tagsCheckGrid}>
                  {tags.map(t => (
                    <label key={t.id} className={styles.tagCheck}>
                      <input
                        type="checkbox"
                        checked={(formData.tag_ids ?? []).includes(t.id)}
                        onChange={() => toggleTag(t.id)}
                      />
                      {t.name}
                    </label>
                  ))}
                </div>
              </div>

              {/* Excerpt */}
              <div className={`${styles.field} ${styles.fieldFull}`}>
                <label className={styles.label}>Short Content / Excerpt</label>
                <textarea
                  className={styles.textarea}
                  rows={3}
                  placeholder="Brief summary shown on listing page..."
                  value={formData.excerpt ?? ''}
                  onChange={e => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
                />
              </div>

              {/* Content – WYSIWYG */}
              <div className={`${styles.field} ${styles.fieldFull}`}>
                <label className={styles.label}>Detailed Content</label>
                <RichTextEditor
                  content={formData.content ?? ''}
                  onChange={html => setFormData(prev => ({ ...prev, content: html }))}
                  placeholder="Write your blog content here..."
                  height={400}
                  mode="full"
                />
              </div>

              {/* SEO Section */}
              <div className={`${styles.field} ${styles.fieldFull}`}>
                <div className={styles.seoSectionTitle}>SEO Settings</div>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>SEO Title</label>
                <input
                  className={styles.input}
                  type="text"
                  placeholder="Override page title for search engines"
                  value={formData.seo_title ?? ''}
                  onChange={e => setFormData(prev => ({ ...prev, seo_title: e.target.value }))}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Meta Keywords</label>
                <input
                  className={styles.input}
                  type="text"
                  placeholder="keyword1, keyword2, keyword3"
                  value={formData.meta_keywords ?? ''}
                  onChange={e => setFormData(prev => ({ ...prev, meta_keywords: e.target.value }))}
                />
              </div>

              <div className={`${styles.field} ${styles.fieldFull}`}>
                <label className={styles.label}>Meta Description</label>
                <textarea
                  className={styles.textarea}
                  rows={3}
                  placeholder="Brief description for search engine results (up to ~160 characters)"
                  value={formData.meta_description ?? ''}
                  onChange={e => setFormData(prev => ({ ...prev, meta_description: e.target.value }))}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Open Graph Title</label>
                <input
                  className={styles.input}
                  type="text"
                  placeholder="Title for social sharing (optional)"
                  value={formData.og_title ?? ''}
                  onChange={e => setFormData(prev => ({ ...prev, og_title: e.target.value }))}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Open Graph Image URL</label>
                <input
                  className={styles.input}
                  type="text"
                  placeholder="Leave empty to use featured image"
                  value={formData.og_image ?? ''}
                  onChange={e => setFormData(prev => ({ ...prev, og_image: e.target.value }))}
                />
              </div>

              <div className={`${styles.field} ${styles.fieldFull}`}>
                <label className={styles.label}>Open Graph Description</label>
                <textarea
                  className={styles.textarea}
                  rows={2}
                  placeholder="Description for social sharing (optional)"
                  value={formData.og_description ?? ''}
                  onChange={e => setFormData(prev => ({ ...prev, og_description: e.target.value }))}
                />
              </div>

            </div>

            <div className={styles.formActions}>
              <button type="button" className={styles.cancelBtn} onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button type="submit" className={styles.saveBtn} disabled={formLoading}>
                {formLoading ? <><Loader2 size={16} className={styles.spin} /> Saving...</> : (
                  <><Check size={16} /> {editingBlog ? 'Update Blog' : 'Create Blog'}</>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── CATEGORIES TAB ───────────────────────────────────────────── */}
      {activeTab === 'categories' && (
        <div className={styles.taxonomyLayout}>
          {/* Form */}
          <div className={styles.taxonomyForm}>
            <h3>{editingCat ? 'Edit Category' : 'Add Category'}</h3>
            {catError && <div className={styles.errorBanner}><AlertCircle size={14} />{catError}</div>}
            {catSuccess && <div className={styles.successBanner}><Check size={14} />{catSuccess}</div>}
            <form onSubmit={handleSaveCategory}>
              <div className={styles.field}>
                <label className={styles.label}>Name <span className={styles.required}>*</span></label>
                <input
                  className={styles.input}
                  type="text"
                  required
                  value={catForm.name}
                  onChange={e => setCatForm(prev => ({
                    ...prev,
                    name: e.target.value,
                    slug: editingCat ? prev.slug : slugify(e.target.value),
                  }))}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Slug</label>
                <input
                  className={styles.input}
                  type="text"
                  value={catForm.slug}
                  onChange={e => setCatForm(prev => ({ ...prev, slug: e.target.value }))}
                />
              </div>
              <div className={styles.formActions}>
                {editingCat && (
                  <button type="button" className={styles.cancelBtn} onClick={() => {
                    setEditingCat(null);
                    setCatForm({ name: '', slug: '' });
                  }}>Cancel</button>
                )}
                <button type="submit" className={styles.saveBtn} disabled={catLoading}>
                  {catLoading ? <Loader2 size={16} className={styles.spin} /> : <Check size={16} />}
                  {editingCat ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>

          {/* List */}
          <div className={styles.taxonomyList}>
            <h3>Categories ({categories.length})</h3>
            {categories.length === 0 ? (
              <p className={styles.emptyRow}>No categories yet.</p>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr><th>Name</th><th>Slug</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {categories.map(c => (
                    <tr key={c.id}>
                      <td>{c.name}</td>
                      <td className={styles.blogSlug}>{c.slug}</td>
                      <td>
                        <div className={styles.actions}>
                          <button className={styles.editBtn} onClick={() => {
                            setEditingCat(c);
                            setCatForm({ name: c.name, slug: c.slug });
                            setCatSuccess(null);
                            setCatError(null);
                          }}><Edit2 size={14} /></button>
                          <button className={styles.deleteBtn} onClick={() => handleDeleteCategory(c.id)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── TAGS TAB ─────────────────────────────────────────────────── */}
      {activeTab === 'tags' && (
        <div className={styles.taxonomyLayout}>
          {/* Form */}
          <div className={styles.taxonomyForm}>
            <h3>{editingTag ? 'Edit Tag' : 'Add Tag'}</h3>
            {tagError && <div className={styles.errorBanner}><AlertCircle size={14} />{tagError}</div>}
            {tagSuccess && <div className={styles.successBanner}><Check size={14} />{tagSuccess}</div>}
            <form onSubmit={handleSaveTag}>
              <div className={styles.field}>
                <label className={styles.label}>Name <span className={styles.required}>*</span></label>
                <input
                  className={styles.input}
                  type="text"
                  required
                  value={tagForm.name}
                  onChange={e => setTagForm(prev => ({
                    ...prev,
                    name: e.target.value,
                    slug: editingTag ? prev.slug : slugify(e.target.value),
                  }))}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Slug</label>
                <input
                  className={styles.input}
                  type="text"
                  value={tagForm.slug}
                  onChange={e => setTagForm(prev => ({ ...prev, slug: e.target.value }))}
                />
              </div>
              <div className={styles.formActions}>
                {editingTag && (
                  <button type="button" className={styles.cancelBtn} onClick={() => {
                    setEditingTag(null);
                    setTagForm({ name: '', slug: '' });
                  }}>Cancel</button>
                )}
                <button type="submit" className={styles.saveBtn} disabled={tagLoading}>
                  {tagLoading ? <Loader2 size={16} className={styles.spin} /> : <Check size={16} />}
                  {editingTag ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>

          {/* List */}
          <div className={styles.taxonomyList}>
            <h3>Tags ({tags.length})</h3>
            {tags.length === 0 ? (
              <p className={styles.emptyRow}>No tags yet.</p>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr><th>Name</th><th>Slug</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {tags.map(t => (
                    <tr key={t.id}>
                      <td>{t.name}</td>
                      <td className={styles.blogSlug}>{t.slug}</td>
                      <td>
                        <div className={styles.actions}>
                          <button className={styles.editBtn} onClick={() => {
                            setEditingTag(t);
                            setTagForm({ name: t.name, slug: t.slug });
                            setTagSuccess(null);
                            setTagError(null);
                          }}><Edit2 size={14} /></button>
                          <button className={styles.deleteBtn} onClick={() => handleDeleteTag(t.id)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BlogManagement;
