import { getAllPublishedPages } from "@/lib/sitemap";

export default async function sitemap() {
  const baseUrl = "https://ultrastudypoint.in";
  const pages = await getAllPublishedPages();

  const dynamicEntries = pages.map((page) => ({
    url: `${baseUrl}${page.path}`,
    lastModified: page.lastModified || new Date(),
    priority: page.path.startsWith("/current-affairs") ? 0.7 : 0.6,
  }));

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
    ...dynamicEntries,
  ];
}

export { getAllPublishedPages };
