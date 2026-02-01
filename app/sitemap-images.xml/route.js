import { getAllPublishedPages } from "@/app/sitemap";

export async function GET() {
  const pages = await getAllPublishedPages();

  const images = [];

  pages.forEach((page) => {
    page.blocks?.forEach((b) => {
      if (b.type === "image") {
        images.push(`
          <image:image>
            <image:loc>${b.url}</image:loc>
            <image:caption>${b.caption || ""}</image:caption>
            <image:title>${b.title}</image:title>
          </image:image>
        `);
      }
    });
  });

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
     <urlset xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
       ${images.join("")}
     </urlset>`,
    {
      headers: {
        "Content-Type": "application/xml",
      },
    }
  );
}
