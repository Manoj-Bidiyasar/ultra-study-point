export async function GET() {
  const baseUrl = "https://www.ultrastudypoint.in";
  const now = new Date().toISOString();

  const sitemaps = [
    `${baseUrl}/sitemap.xml`,
    `${baseUrl}/sitemap-images.xml`,
  ];

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
     <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
       ${sitemaps
         .map(
           (loc) => `
             <sitemap>
               <loc>${loc}</loc>
               <lastmod>${now}</lastmod>
             </sitemap>
           `
         )
         .join("")}
     </sitemapindex>`,
    {
      headers: {
        "Content-Type": "application/xml",
      },
    }
  );
}
