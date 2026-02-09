import { getAllPublishedPages } from "@/lib/sitemap";

export default async function sitemap() {
  const baseUrl = "https://www.ultrastudypoint.in";
  const pages = await getAllPublishedPages();

  const dynamicEntries = pages.map((page) => ({
    url: `${baseUrl}${page.path}`,
    lastModified: page.lastModified || new Date(),
    priority: page.path.startsWith("/current-affairs") ? 0.7 : 0.6,
  }));

  const staticEntries = [
    { url: `${baseUrl}/`, lastModified: new Date(), priority: 1.0 },
    { url: `${baseUrl}/current-affairs`, lastModified: new Date(), priority: 0.9 },
    { url: `${baseUrl}/notes`, lastModified: new Date(), priority: 0.9 },
    { url: `${baseUrl}/quiz`, lastModified: new Date(), priority: 0.8 },
    { url: `${baseUrl}/pyqs`, lastModified: new Date(), priority: 0.8 },
    { url: `${baseUrl}/leaderboard`, lastModified: new Date(), priority: 0.6 },
    { url: `${baseUrl}/about`, lastModified: new Date(), priority: 0.5 },
    { url: `${baseUrl}/privacy-policy`, lastModified: new Date(), priority: 0.4 },
  ];

  return [
    ...staticEntries,
    ...dynamicEntries,
  ];
}

export { getAllPublishedPages };
