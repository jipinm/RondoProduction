import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FaFilter, FaTimes } from 'react-icons/fa';
import { useSEO } from '../hooks/useSEO';
import {
  getBlogs,
  getBlogCategories,
  getBlogTags,
  formatBlogDate,
  type BlogSummary,
  type BlogCategory,
  type BlogTag,
} from '../services/blogService';
import styles from './BlogListingPage.module.css';

const BLOGS_PER_PAGE = 6;

const BlogListingPage: React.FC = () => {
  useSEO('blog');

  const [blogs, setBlogs] = useState<BlogSummary[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [tags, setTags] = useState<BlogTag[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  const [activeTagId, setActiveTagId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  // Lock body scroll when the mobile filter drawer is open
  useEffect(() => {
    document.body.style.overflow = filterDrawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [filterDrawerOpen]);

  const loadBlogs = useCallback(async (page: number, catId: number | null, tagId: number | null) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getBlogs({
        page,
        limit: BLOGS_PER_PAGE,
        category_id: catId ?? undefined,
        tag_id: tagId ?? undefined,
      });
      if (res.success) {
        setBlogs(res.data);
        setTotalPages(res.total_pages);
      } else {
        setError('Failed to load blog posts.');
      }
    } catch {
      setError('Failed to load blog posts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getBlogCategories().then(r => { if (r.success && r.data) setCategories(r.data); });
    getBlogTags().then(r => { if (r.success && r.data) setTags(r.data); });
  }, []);

  useEffect(() => {
    loadBlogs(currentPage, activeCategoryId, activeTagId);
  }, [currentPage, activeCategoryId, activeTagId, loadBlogs]);

  const handleCategoryClick = (id: number | null) => {
    setActiveCategoryId(id);
    setActiveTagId(null);
    setCurrentPage(1);
    setFilterDrawerOpen(false);
  };

  const handleTagClick = (id: number | null) => {
    setActiveTagId(id);
    setActiveCategoryId(null);
    setCurrentPage(1);
    setFilterDrawerOpen(false);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Blog</h1>
          <button
            className={styles.mobileFilterBtn}
            onClick={() => setFilterDrawerOpen(true)}
            aria-label="Open filters"
          >
            <FaFilter aria-hidden="true" />
            Filters
          </button>
        </div>

        <div className={styles.layout}>
          {/* ── Main Content ──────────────────────────────────────────── */}
          <main className={styles.main}>
            {loading && (
              <div className={styles.loading}>
                <div className={styles.spinner} />
                <span>Loading blog posts...</span>
              </div>
            )}

            {!loading && error && (
              <div className={styles.errorState}>
                <p>{error}</p>
              </div>
            )}

            {!loading && !error && blogs.length === 0 && (
              <div className={styles.emptyState}>
                <p>No blog posts found.</p>
              </div>
            )}

            {!loading && !error && blogs.length > 0 && (
              <>
                <div className={styles.blogGrid}>
                  {blogs.map(blog => (
                    <BlogCard key={blog.id} blog={blog} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className={styles.pagination}>
                    <button
                      className={`${styles.pageBtn} ${styles.pageBtnNav}`}
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage <= 1}
                      aria-label="Previous page"
                    >
                      ‹
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        className={`${styles.pageBtn} ${currentPage === page ? styles.pageBtnActive : ''}`}
                        onClick={() => handlePageChange(page)}
                        aria-label={`Page ${page}`}
                        aria-current={currentPage === page ? 'page' : undefined}
                      >
                        {page}
                      </button>
                    ))}

                    <button
                      className={`${styles.pageBtn} ${styles.pageBtnNav}`}
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage >= totalPages}
                      aria-label="Next page"
                    >
                      ›
                    </button>
                  </div>
                )}
              </>
            )}
          </main>

          {/* ── Sidebar ───────────────────────────────────────────────── */}
          <aside className={styles.sidebar}>
            {/* Categories */}
            <div className={styles.sidebarWidget}>
              <h2 className={styles.widgetTitle}>Categories</h2>
              <ul className={styles.filterList}>
                <li>
                  <button
                    className={`${styles.filterItem} ${activeCategoryId === null && activeTagId === null ? styles.filterItemActive : ''}`}
                    onClick={() => { handleCategoryClick(null); setActiveTagId(null); }}
                  >
                    All Posts
                  </button>
                </li>
                {categories.map(cat => (
                  <li key={cat.id}>
                    <button
                      className={`${styles.filterItem} ${activeCategoryId === cat.id ? styles.filterItemActive : ''}`}
                      onClick={() => handleCategoryClick(cat.id)}
                    >
                      {cat.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Tags */}
            <div className={styles.sidebarWidget}>
              <h2 className={styles.widgetTitle}>Tags</h2>
              <div className={styles.tagsCloud}>
                {tags.map(tag => (
                  <button
                    key={tag.id}
                    className={`${styles.tagChip} ${activeTagId === tag.id ? styles.tagChipActive : ''}`}
                    onClick={() => handleTagClick(tag.id)}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* ── Mobile filter overlay ─────────────────────────────────────────── */}
      <div
        className={`${styles.filterOverlay} ${filterDrawerOpen ? styles.filterOverlayVisible : ''}`}
        onClick={() => setFilterDrawerOpen(false)}
        aria-hidden="true"
      />

      {/* ── Mobile filter drawer ──────────────────────────────────────────── */}
      <div
        className={`${styles.filterDrawer} ${filterDrawerOpen ? styles.filterDrawerOpen : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Blog filters"
      >
        <div className={styles.filterDrawerHeader}>
          <span className={styles.filterDrawerTitle}>Filters</span>
          <button
            className={styles.filterDrawerClose}
            onClick={() => setFilterDrawerOpen(false)}
            aria-label="Close filters"
          >
            <FaTimes />
          </button>
        </div>

        <div className={styles.filterDrawerContent}>
          {/* Categories */}
          <div className={styles.filterDrawerSection}>
            <h2 className={styles.widgetTitle}>Categories</h2>
            <ul className={styles.filterList}>
              <li>
                <button
                  className={`${styles.filterItem} ${activeCategoryId === null && activeTagId === null ? styles.filterItemActive : ''}`}
                  onClick={() => handleCategoryClick(null)}
                >
                  All Posts
                </button>
              </li>
              {categories.map(cat => (
                <li key={cat.id}>
                  <button
                    className={`${styles.filterItem} ${activeCategoryId === cat.id ? styles.filterItemActive : ''}`}
                    onClick={() => handleCategoryClick(cat.id)}
                  >
                    {cat.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Tags */}
          <div className={styles.filterDrawerSection}>
            <h2 className={styles.widgetTitle}>Tags</h2>
            <div className={styles.tagsCloud}>
              {tags.map(tag => (
                <button
                  key={tag.id}
                  className={`${styles.tagChip} ${activeTagId === tag.id ? styles.tagChipActive : ''}`}
                  onClick={() => handleTagClick(tag.id)}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Blog Card
// ─────────────────────────────────────────────────────────────────────────────

interface BlogCardProps {
  blog: BlogSummary;
}

const BlogCard: React.FC<BlogCardProps> = ({ blog }) => {
  const href = `/blog/${blog.slug}`;

  return (
    <article className={styles.card}>
      <Link to={href} className={styles.cardImageLink}>
        {blog.featured_image ? (
          <img
            src={blog.featured_image}
            alt={blog.title}
            className={styles.cardImage}
            loading="lazy"
          />
        ) : (
          <div className={styles.cardImagePlaceholder} aria-hidden="true" />
        )}
      </Link>

      <div className={styles.cardBody}>
        {blog.category_name && (
          <span className={styles.cardCategory}>{blog.category_name}</span>
        )}

        <Link to={href} className={styles.cardTitleLink}>
          <h3 className={styles.cardTitle}>{blog.title}</h3>
        </Link>

        {blog.excerpt && (
          <p className={styles.cardExcerpt}>{blog.excerpt}</p>
        )}

        <div className={styles.cardFooter}>
          <time className={styles.cardDate} dateTime={blog.publish_date ?? ''}>
            {formatBlogDate(blog.publish_date)}
          </time>
          <Link to={href} className={styles.readMoreBtn}>
            Read More
          </Link>
        </div>
      </div>
    </article>
  );
};

export default BlogListingPage;
