import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

/* ===================== */
/* METADATA (SEO + PWA)  */
/* ===================== */
export const metadata = {
  title: "Ultra Study Point",
  description: "Study resources, notes, and current affairs",
  applicationName: "Ultra Study Point",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Ultra Study Point",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};
export function generateViewport() {
  return {
    themeColor: "#2563eb",
  };
}
/* ===================== */
/* ROOT LAYOUT           */
/* ===================== */
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        {/* Layout wrapper – NOT body */}
        <div className="flex flex-col min-h-screen">
          <Navbar />
          <main className="flex-grow">
            {children}
          </main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
