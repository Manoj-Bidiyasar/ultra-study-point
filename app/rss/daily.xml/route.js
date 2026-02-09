export async function GET() {
  const now = new Date().toUTCString();

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Ultra Study Point - Daily</title>
    <link>https://www.ultrastudypoint.in</link>
    <description>Daily updates</description>
    <lastBuildDate>${now}</lastBuildDate>
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      "Content-Type": "application/xml",
    },
  });
}
