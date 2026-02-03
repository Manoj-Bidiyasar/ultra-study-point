import { getAllPublishedPages } from "@/lib/sitemap";

export default async function sitemap() {
  const baseUrl = "https://ultrastudypoint.in";

  return [
    {
      url: `${baseUrl}/`,
      lastModified: new Date(),
      priority: 1.0,
    },
    {
      url: `${baseUrl}/current-affairs`,
      lastModified: new Date(),
      priority: 0.9,
    },
    {
      url: `${baseUrl}/notes`,
      lastModified: new Date(),
      priority: 0.9,
    },
  ];
}

export { getAllPublishedPages };
