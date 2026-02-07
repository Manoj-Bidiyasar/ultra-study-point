# lib/ overview

This file lists each lib module, its import path, and where it is used.

## Modules

- `lib/admin/adminNav.js`
  Import: `@/lib/admin/adminNav`
  Used in: (no imports found)
- `lib/admin/permissions.js`
  Import: `@/lib/admin/permissions`
  Used in: admin\layout.js
- `lib/breadcrumbs/buildBreadcrumbs.js`
  Import: `@/lib/breadcrumbs/buildBreadcrumbs`
  Used in: (no imports found)
- `lib/breadcrumbs/buildBreadcrumbSchema.js`
  Import: `@/lib/breadcrumbs/buildBreadcrumbSchema`
  Used in: current-affairs\monthly\[slug]\page.js, current-affairs\daily\[slug]\page.js
- `lib/breadcrumbs/config.js`
  Import: `@/lib/breadcrumbs/config`
  Used in: current-affairs\daily\[slug]\page.js, current-affairs\monthly\[slug]\page.js
- `lib/ca/validation.js`
  Import: `@/lib/ca/validation`
  Used in: admin\editors\BaseEditor.jsx
- `lib/content/contentUtils.js`
  Import: `@/lib/content/contentUtils`
  Used in: admin\editors\BaseEditor.jsx, admin\notes\create\page.js, admin\sections\RelatedContentSection.jsx, admin\current-affairs\daily\create\page.js, admin\current-affairs\monthly\create\page.js
- `lib/content/firestoreUtils.js`
  Import: `@/lib/content/firestoreUtils`
  Used in: (no imports found)
- `lib/content/validation.js`
  Import: `@/lib/content/validation`
  Used in: ca\validation.js
- `lib/data/getDailyArticle.js`
  Import: `@/lib/data/getDailyArticle`
  Used in: (no imports found)
- `lib/data/getDailyArticleBySlug.js`
  Import: `@/lib/data/getDailyArticleBySlug`
  Used in: (no imports found)
- `lib/dates/formatters.js`
  Import: `@/lib/dates/formatters`
  Used in: seo\buildDailyMetadata.js, admin\sections\WorkflowSection.jsx, current-affairs\daily\[slug]\page.js, current-affairs\daily\[slug]\ArticleClient.jsx, admin\current-affairs\monthly\page.js, admin\current-affairs\daily\page.js, admin\notes\page.js
- `lib/firebase/admin.js`
  Import: `@/lib/firebase/admin`
  Used in: firebase\adminDb.js, data\getDailyArticleBySlug.js, current-affairs\page.js, related\noteSelectors.js, data\getDailyArticle.js, related\caSelectors.js, current-affairs\monthly\[slug]\page.js, notes\page.js, notes\[slug]\page.js, preview\[type]\[slug]\page.js, notes\category\[subcategory]\page.js, current-affairs\daily\[slug]\page.js, api\publish-scheduled\route.js
- `lib/firebase/adminDb.js`
  Import: `@/lib/firebase/adminDb`
  Used in: preview\[type]\[slug]\page.js
- `lib/firebase/client.js`
  Import: `@/lib/firebase/client`
  Used in: preview\previewToken.js, page.js, admin\sections\RelatedContentSection.jsx, admin\sections\WorkflowSection.jsx, content\firestoreUtils.js, current-affairs\CurrentAffairsClient.jsx, about\page.js, admin\login\page.js, admin\layout.js, admin\current-affairs\monthly\create\page.js, admin\current-affairs\monthly\[docId]\page.js, admin\current-affairs\monthly\page.js, admin\editors\BaseEditor.jsx, admin\current-affairs\daily\page.js, admin\current-affairs\daily\create\page.js, admin\current-affairs\daily\[docId]\page.js, admin\notes\page.js, admin\users\page.js, admin\messages\MessagesClient.jsx, admin\dashboard\page.js, admin\notes\[docId]\page.js, admin\notes\create\page.js, admin\users\components\AccessToggle.jsx, admin\users\components\UserTable.jsx
- `lib/hooks/useUnsavedChanges.js`
  Import: `@/lib/hooks/useUnsavedChanges`
  Used in: (no imports found)
- `lib/notes/taxonomy.js`
  Import: `@/lib/notes/taxonomy`
  Used in: admin\sections\types\NotesSection.jsx
- `lib/preview/previewToken.js`
  Import: `@/lib/preview/previewToken`
  Used in: admin\editors\BaseEditor.jsx
- `lib/related/caSelectors.js`
  Import: `@/lib/related/caSelectors`
  Used in: (no imports found)
- `lib/related/noteSelectors.js`
  Import: `@/lib/related/noteSelectors`
  Used in: (no imports found)
- `lib/related/relatedEngine.js`
  Import: `@/lib/related/relatedEngine`
  Used in: current-affairs\monthly\[slug]\page.js, notes\[slug]\page.js, current-affairs\daily\[slug]\page.js
- `lib/seo/buildDailyMetadata.js`
  Import: `@/lib/seo/buildDailyMetadata`
  Used in: (no imports found)
- `lib/serialization/serializeDoc.js`
  Import: `@/lib/serialization/serializeDoc`
  Used in: notes\page.js
- `lib/serialization/serializeFirestore.js`
  Import: `@/lib/serialization/serializeFirestore`
  Used in: page.js, current-affairs\page.js, notes\[slug]\page.js, current-affairs\monthly\[slug]\page.js, current-affairs\daily\[slug]\page.js
- `lib/sitemap/index.js`
  Import: `@/lib/sitemap`
  Used in: sitemap.js
- `lib/styles/styleToClass.js`
  Import: `@/lib/styles/styleToClass`
  Used in: (no imports found)
- `lib/text/extractText.js`
  Import: `@/lib/text/extractText`
  Used in: (no imports found)
