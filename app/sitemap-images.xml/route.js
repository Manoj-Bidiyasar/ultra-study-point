import { getAllPublishedPages } from "@/app/sitemap";

export async function GET() {
  const pages = await getAllPublishedPages();
  const baseUrl = "https://www.ultrastudypoint.in";

  const escapeXml = (value) =>
    String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");

  const urlEntries = pages
    .map((page) => {
      const imageEntries = (page.blocks || [])
        .filter((b) => b.type === "image" && b.url)
        .map(
          (b) => `
            <image:image>
              <image:loc>${escapeXml(b.url)}</image:loc>
              ${b.caption ? `<image:caption>${escapeXml(b.caption)}</image:caption>` : ""}
              ${b.title ? `<image:title>${escapeXml(b.title)}</image:title>` : ""}
            </image:image>
          `
        )
        .join("");

      if (!imageEntries) return "";

      return `
        <url>
          <loc>${escapeXml(`${baseUrl}${page.path}`)}</loc>
          ${imageEntries}
        </url>
      `;
    })
    .filter(Boolean)
    .join("");

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
     <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
             xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
       ${urlEntries}
     </urlset>`,
    {
      headers: {
        "Content-Type": "application/xml",
      },
    }
  );
}
