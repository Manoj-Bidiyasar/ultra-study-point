import { adminDb } from "@/lib/firebaseAdmin";

export async function GET() {
  const urls = [];

  urls.push(`<url><loc>https://ultrastudypoint.in</loc></url>`);
  urls.push(`<url><loc>https://ultrastudypoint.in/current-affairs</loc></url>`);
  urls.push(`<url><loc>https://ultrastudypoint.in/notes</loc></url>`);

  const snap = await adminDb
    .collection("artifacts")
    .doc("ultra-study-point")
    .collection("public")
    .doc("data")
    .collection("currentAffairs")
    .where("status", "==", "published")
    .get();

  snap.docs.forEach((doc) => {
    const d = doc.data();
    urls.push(
      `<url><loc>https://ultrastudypoint.in/current-affairs/${d.type}/${d.slug}</loc></url>`
    );
  });

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
     <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
     ${urls.join("")}
     </urlset>`,
    { headers: { "Content-Type": "application/xml" } }
  );
}
