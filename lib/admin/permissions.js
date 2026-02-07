const baseAccess = {
  // Admin shell access + visible modules
  canAccessAdmin: true,
  canViewDashboard: true,
  canManageContent: true,
};

const baseWorkflow = {
  // Content lifecycle permissions used by editors/admins
  create: true,
  editOwnDraft: true,
  submitForReview: true,
};

export const permissionsByRole = {
  editor: {
    ...baseAccess,
    // Users + messaging
    canManageUsers: false,
    canViewMessages: false,

    ...baseWorkflow,
    editAnyDraft: false,
    publish: false,
    schedule: false,
    editPublished: false,
    deletePublished: false,

    // Additional admin-only flags (kept for consistency)
    manageUsers: false,
  },

  admin: {
    ...baseAccess,
    // Users + messaging
    canManageUsers: true,
    canViewMessages: true,

    ...baseWorkflow,
    editAnyDraft: true,
    submitForReview: false,
    publish: true,
    schedule: true,
    editPublished: true,
    deletePublished: true,

    // Keep false to avoid accidental use in content logic
    manageUsers: false,
  },

  super_admin: {
    ...baseAccess,
    // Users + messaging
    canManageUsers: true,
    canViewMessages: true,
    canSystemOverride: true,

    ...baseWorkflow,
    editAnyDraft: true,
    publish: true,
    schedule: true,
    editPublished: true,
    deletePublished: true,

    // Super admin extras
    manageUsers: true,
    moveContent: true,
  },
};
