export const permissionsByRole = {
  editor: {
    /* ===== NAV / ACCESS ===== */
    canAccessAdmin: true,
    canViewDashboard: true,
    canManageUsers: false,
    canManageContent: true,
    canViewMessages: false,

    /* ===== CONTENT WORKFLOW ===== */
    create: true,
    editOwnDraft: true,
    editAnyDraft: false,
    submitForReview: true,
    publish: false,
    schedule: false,
    editPublished: false,
    deletePublished: false,
    manageUsers: false,
  },

  admin: {
    /* ===== NAV / ACCESS ===== */
    canAccessAdmin: true,
    canViewDashboard: true,
    canManageUsers: true,
    canManageContent: true,
    canViewMessages: true,

    /* ===== CONTENT WORKFLOW ===== */
    create: true,
    editOwnDraft: true,
    editAnyDraft: true,
    submitForReview: false,
    publish: true,
    schedule: true,
    editPublished: true,
    deletePublished: true,
    manageUsers: false, // (keep as-is for content)
  },

  super_admin: {
    /* ===== NAV / ACCESS ===== */
    canAccessAdmin: true,
    canViewDashboard: true,
    canManageUsers: true,
    canManageContent: true,
    canSystemOverride: true,
    canViewMessages: true,

    /* ===== CONTENT WORKFLOW ===== */
    create: true,
    editOwnDraft: true,
    editAnyDraft: true,
    submitForReview: true,
    publish: true,
    schedule: true,
    editPublished: true,
    deletePublished: true,
    manageUsers: true,
    moveContent: true,
  },
};
