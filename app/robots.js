export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/preview", "/api"],
      },
    ],
    sitemap: "https://www.ultrastudypoint.in/sitemap-index.xml",
    host: "https://www.ultrastudypoint.in",
  };
}
