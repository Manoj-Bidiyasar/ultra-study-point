export const roleTemplates = {
  editor: {
    permissions: {
      editOwnDraft: true,
      editAnyDraft: false,
      submitForReview: true,
      publish: false,
      schedule: false,
      editPublished: false,
      unpublish: false,
      deletePublished: false,
      moveContent: false,
      manageUsers: false,
    }
  },

  admin: {
    permissions: {
      editOwnDraft: true,
      editAnyDraft: true,
      submitForReview: true,
      publish: true,
      schedule: true,
      editPublished: true,
      unpublish: true,
      deletePublished: false,
      moveContent: false,
      manageUsers: false,
    }
  }
};