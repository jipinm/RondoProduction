import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { FaFilter, FaTimes } from 'react-icons/fa';
import {
  getBlogBySlug,
  getRelatedBlogs,
  getBlogCategories,
  getBlogTags,
  formatBlogDate,
  type BlogDetail,
  type BlogSummary,
  type BlogCategory,
  type BlogTag,
} from '../services/blogService';
import styles from './BlogDetailPage.module.css';

/** Helper to upsert a <meta> tag by name or property attribute. */
function setMeta(nameOrProp: string, content: string | null | undefined) {
  if (!content) return;
  const attr = nameOrProp.startsWith('og:') ? 'property' : 'name';
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${nameOrProp}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, nameOrProp);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

const BlogDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [blog, setBlog] = useState<BlogDetail | null>(null);
  const [related, setRelated] = useState<BlogSummary[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [tags, setTags] = useState<BlogTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  // Lock body scroll when the mobile filter drawer is open
  useEffect(() => {
    document.body.style.overflow = filterDrawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [filterDrawerOpen]);

  // Apply blog-specific SEO once blog data is loaded.
  // Priority: seo_title > blog title, meta_description > excerpt,
  //           og_image > featured_image.
  useEffect(() => {
    if (!blog) return;
    const pageTitle = (blog.seo_title || blog.title) + ' – Rondo Sports Tickets';
    document.title = pageTitle;
    setMeta('description', blog.meta_description || blog.excerpt);
    setMeta('keywords', blog.meta_keywords);
    setMeta('robots', 'index, follow');
    setMeta('og:type', 'article');
    setMeta('og:title', blog.og_title || pageTitle);
    setMeta('og:description', blog.og_description || blog.meta_description || blog.excerpt);
    setMeta('og:image', blog.og_image || blog.featured_image);
    setMeta('og:site_name', 'Rondo Sports Tickets');
  }, [blog]);

  useEffect(() => {
    if (!slug) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [blogRes, catRes, tagRes] = await Promise.all([
          getBlogBySlug(slug),
          getBlogCategories(),
          getBlogTags(),
        ]);

        if (cancelled) return;

        if (!blogRes.success || !blogRes.data) {
          navigate('/blog', { replace: true });
          return;
        }

        setBlog(blogRes.data);
        if (catRes.success && catRes.data) setCategories(catRes.data);
        if (tagRes.success && tagRes.data) setTags(tagRes.data);

        // Load related blogs
        const relatedRes = await getRelatedBlogs(slug);
        if (!cancelled && relatedRes.success && relatedRes.data) {
          setRelated(relatedRes.data);
        }
      } catch {
        if (!cancelled) setError('Failed to load blog post.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [slug, navigate]);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <span>Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.errorState}>
            <p>{error || 'Blog post not found.'}</p>
            <Link to="/blog" className={styles.backLink}>← Back to Blog</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.breadcrumb}>
          <Link to="/" className={styles.breadcrumbLink}>Home</Link>
          <span className={styles.breadcrumbSep}>/</span>
          <Link to="/blog" className={styles.breadcrumbLink}>Blog</Link>
          <span className={styles.breadcrumbSep}>/</span>
          <span className={styles.breadcrumbCurrent}>{blog.title}</span>
        </div>

        {/* Mobile-only filter trigger – hidden on desktop via CSS */}
        <div className={styles.mobileFilterRow}>
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
          {/* ── Main Article ────────────────────────────────────────── */}
          <main className={styles.main}>
            <article className={styles.article}>
              {/* Featured Image */}
              {blog.featured_image && (
                <Link to={`/blog/${blog.slug}`}>
                  <div className={styles.heroImageWrap}>
                    <img
                      src={blog.featured_image}
                      alt={blog.title}
                      className={styles.heroImage}
                    />
                  </div>
                </Link>
              )}

              <div className={styles.articleBody}>
                {/* Meta */}
                <div className={styles.articleMeta}>
                  {blog.category_name && (
                    <span className={styles.metaCategory}>{blog.category_name}</span>
                  )}
                  <time className={styles.metaDate} dateTime={blog.publish_date ?? ''}>
                    {formatBlogDate(blog.publish_date)}
                  </time>
                </div>

                {/* Title */}
                <h1 className={styles.articleTitle}>{blog.title}</h1>

                {/* Tags */}
                {blog.tags && blog.tags.length > 0 && (
                  <div className={styles.articleTags}>
                    {blog.tags.map(tag => (
                      <Link
                        key={tag.id}
                        to={`/blog?tag_id=${tag.id}`}
                        className={styles.articleTag}
                      >
                        {tag.name}
                      </Link>
                    ))}
                  </div>
                )}

                {/* Content */}
                <div
                  className={styles.articleContent}
                  dangerouslySetInnerHTML={{ __html: blog.content ?? '' }}
                />
              </div>
            </article>

            {/* ── Related Blogs ────────────────────────────────────── */}
            {related.length > 0 && (
              <section className={styles.related}>
                <h2 className={styles.relatedTitle}>Related Articles</h2>
                <div className={styles.relatedGrid}>
                  {related.map(rel => (
                    <RelatedCard key={rel.id} blog={rel} />
                  ))}
                </div>
              </section>
            )}
          </main>

          {/* ── Sidebar ───────────────────────────────────────────── */}
          <aside className={styles.sidebar}>
            {/* Categories */}
            <div className={styles.sidebarWidget}>
              <h2 className={styles.widgetTitle}>Categories</h2>
              <ul className={styles.filterList}>
                <li>
                  <Link to="/blog" className={styles.filterItem}>All Posts</Link>
                </li>
                {categories.map(cat => (
                  <li key={cat.id}>
                    <Link
                      to={`/blog?category_id=${cat.id}`}
                      className={`${styles.filterItem} ${blog.category_id === cat.id ? styles.filterItemActive : ''}`}
                    >
                      {cat.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Tags */}
            <div className={styles.sidebarWidget}>
              <h2 className={styles.widgetTitle}>Tags</h2>
              <div className={styles.tagsCloud}>
                {tags.map(tag => (
                  <Link
                    key={tag.id}
                    to={`/blog?tag_id=${tag.id}`}
                    className={`${styles.tagChip} ${
                      blog.tags?.some(t => t.id === tag.id) ? styles.tagChipActive : ''
                    }`}
                  >
                    {tag.name}
                  </Link>
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
                <Link
                  to="/blog"
                  className={styles.filterItem}
                  onClick={() => setFilterDrawerOpen(false)}
                >
                  All Posts
                </Link>
              </li>
              {categories.map(cat => (
                <li key={cat.id}>
                  <Link
                    to={`/blog?category_id=${cat.id}`}
                    className={`${styles.filterItem} ${blog.category_id === cat.id ? styles.filterItemActive : ''}`}
                    onClick={() => setFilterDrawerOpen(false)}
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Tags */}
          <div className={styles.filterDrawerSection}>
            <h2 className={styles.widgetTitle}>Tags</h2>
            <div className={styles.tagsCloud}>
              {tags.map(tag => (
                <Link
                  key={tag.id}
                  to={`/blog?tag_id=${tag.id}`}
                  className={`${styles.tagChip} ${blog.tags?.some(t => t.id === tag.id) ? styles.tagChipActive : ''}`}
                  onClick={() => setFilterDrawerOpen(false)}
                >
                  {tag.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Related Card
// ─────────────────────────────────────────────────────────────────────────────

interface RelatedCardProps {
  blog: BlogSummary;
}

const RelatedCard: React.FC<RelatedCardProps> = ({ blog }) => {
  const href = `/blog/${blog.slug}`;

  return (
    <article className={styles.relatedCard}>
      <Link to={href} className={styles.relatedImageLink}>
        {blog.featured_image ? (
          <img
            src={blog.featured_image}
            alt={blog.title}
            className={styles.relatedImage}
            loading="lazy"
          />
        ) : (
          <div className={styles.relatedImagePlaceholder} aria-hidden="true" />
        )}
      </Link>
      <div className={styles.relatedBody}>
        <time className={styles.relatedDate} dateTime={blog.publish_date ?? ''}>
          {formatBlogDate(blog.publish_date)}
        </time>
        <Link to={href} className={styles.relatedTitleLink}>
          <h3 className={styles.relatedCardTitle}>{blog.title}</h3>
        </Link>
      </div>
    </article>
  );
};

export default BlogDetailPage;
