## Additional Enhancements to Blog Management Module

### Featured Image Management

#### Current Requirement Change

Replace the existing **"Featured Image URL"** input field with a proper image upload mechanism.

#### Requirements

##### Create Blog

* Remove the Featured Image URL text input.
* Add a Featured Image upload field.
* Upload and store the image using the application's existing image management/upload implementation.
* Follow the same storage structure, validation rules, and file handling patterns already used elsewhere in the application.

##### Edit Blog

* Display the currently uploaded featured image.
* Allow administrators to replace/change the existing image.
* If a new image is uploaded:

  * Replace the existing image reference.
  * Follow the same image replacement workflow used in other modules.
* Maintain compatibility with existing image storage and retrieval mechanisms.

##### Frontend

* Blog listing page must correctly load and display the uploaded featured image.
* Blog detail page must correctly load and display the uploaded featured image.
* Use the same image URL generation and asset serving approach already implemented in the application.

#### Implementation Guidance

* Review and reuse any existing image upload modules/components/services currently used in the system.
* Do not create a separate image management pattern if a standardized implementation already exists.
* Maintain consistency with existing file upload validation, storage paths, naming conventions, and image rendering logic.

---

### Publish Date & Time – Timezone Consistency

#### Requirements

The Publish Date & Time functionality must be fully based on server time to avoid timezone inconsistencies between:

* Admin Application
* API Application
* Frontend Application
* Database Server

#### Rules

##### Storage

* Store publish datetime using the same approach already used by the application for date/time management.
* The server should be the single source of truth.

##### Publishing Logic

A blog is considered published only when:

```text
status = Published
AND
publish_date <= current server datetime
```

##### Frontend

* Frontend must not independently determine whether a blog is published based on the user's local browser timezone.
* Blog visibility should be controlled by the API using server-side publish datetime validation.

##### API

* All publish date filtering must occur on the server side.
* Return only eligible published blog records.

#### Implementation Guidance

* Review existing modules that handle scheduled content, date filtering, event dates, publication dates, or similar server-time-based functionality.
* Reuse the existing application-wide datetime strategy.
* Avoid introducing a separate timezone handling approach for blogs.

---

### SEO Management

Add a dedicated SEO section to the Blog Create/Edit form.

#### SEO Fields

##### SEO Title

* Input field
* Optional override for page title
* If empty, frontend may fall back to blog title

##### Meta Description

* Multi-line text field
* Used for page metadata description

##### Meta Keywords

* Text input
* Comma-separated keywords

##### Open Graph Title

* Optional field
* Used for social sharing metadata

##### Open Graph Description

* Optional field
* Used for social sharing metadata

##### Open Graph Image

* Optional image selection
* If empty, use Featured Image as fallback

---

### Frontend SEO Usage

#### Blog Listing Page

Generate appropriate SEO metadata for:

```text
/blog
```

#### Blog Detail Page

Generate dynamic SEO metadata using blog-specific values:

* Page Title
* Meta Description
* Meta Keywords
* Open Graph Metadata

Priority order:

```text
SEO Title
↓
Blog Title
```

```text
Meta Description
↓
Blog Excerpt
```

```text
Open Graph Image
↓
Featured Image
```

---

### Database Enhancements

Add SEO-related columns to the blogs table:

* seo_title
* meta_description
* meta_keywords
* og_title
* og_description
* og_image

Include these fields in:

* Migration scripts
* Seed data
* Admin APIs
* Frontend APIs

---

### Reuse Existing Implementations

Before implementing:

#### Image Management

Review and reuse:

* Existing image upload components
* Existing file storage services
* Existing image rendering patterns
* Existing validation rules

#### Date & Time Management

Review and reuse:

* Existing server datetime handling
* Existing timezone management strategy
* Existing publication scheduling logic
* Existing date filtering implementations

#### Goal

Maintain consistency across the entire platform and avoid introducing duplicate implementations, different storage patterns, or timezone-related discrepancies.
