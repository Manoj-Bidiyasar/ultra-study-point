"use client";

function normalizePdfUrl(url, page, zoom) {
  if (!url) return "";

  // Google Drive
  const drive =
    url.match(/drive\.google\.com\/file\/d\/([^/]+)/);

  if (drive) {
    return `https://drive.google.com/file/d/${drive[1]}/preview#page=${page}&zoom=${zoom}`;
  }

  // Normal PDF
  let final = url;
  const params = [];

  if (page) params.push(`page=${page}`);
  if (zoom) params.push(`zoom=${zoom}`);

  if (params.length) {
    final += "#" + params.join("&");
  }

  return final;
}

export default function PdfBlock({ block }) {
  if (!block?.url) return null;

  const pdfUrl = normalizePdfUrl(
    block.url,
    block.page || 1,
    block.zoom || 100
  );

  if (block.mode === "link") {
    return (
      <div className="my-4 border border-gray-300 rounded-md p-4 bg-gray-50">
        <a
          href={block.url}
          target="_blank"
          className="text-blue-600 underline font-medium"
        >
          📄 {block.title || "Download PDF"}
        </a>
      </div>
    );
  }

  return (
    <div className="my-4 border border-gray-300 rounded-md bg-white overflow-hidden">

      {block.title && (
        <div className="px-4 py-2 font-semibold border-b bg-gray-50">
          {block.title}
        </div>
      )}

      <iframe
        src={pdfUrl}
        className="w-full h-[750px]"
        loading="lazy"
      />

      <div className="p-2 text-sm bg-gray-50 border-t text-right">
        <a
          href={block.url}
          target="_blank"
          className="text-blue-600 underline"
        >
          Open in new tab
        </a>
      </div>
    </div>
  );
}
