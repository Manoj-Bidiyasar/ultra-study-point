const { setGlobalOptions } = require("firebase-functions");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");

setGlobalOptions({ maxInstances: 10 });

const REVALIDATE_SECRET = defineSecret("REVALIDATE_SECRET");

exports.autoRevalidate = onDocumentWritten(
  {
    document:
      "artifacts/ultra-study-point/public/data/{collection}/{docId}",
    secrets: [REVALIDATE_SECRET],
  },
  async (event) => {
    try {
      const after = event.data?.after?.data();
      if (!after) return;

      const paths = ["/"];
      const tags = ["home-data"];

      if (after.type === "daily") {
        paths.push(
          "/current-affairs",
          `/current-affairs/daily/${after.slug}`
        );
        tags.push("current-affairs-index", "daily-ca");
      }

      if (after.type === "monthly") {
        paths.push(
          "/current-affairs",
          `/current-affairs/monthly/${after.slug}`
        );
        tags.push("current-affairs-index", "monthly-ca");
      }

      if (after.type === "notes") {
        paths.push(
          "/notes",
          `/notes/${after.slug}`
        );
        tags.push("notes-index");
      }

      const response = await fetch("https://ultrastudypoint.in/api/revalidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: REVALIDATE_SECRET.value(),
          paths,
          tags,
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(
          `Revalidate API failed with ${response.status}: ${body || "no body"}`
        );
      }

      logger.info("Revalidation successful", { paths, tags });
    } catch (err) {
      logger.error("Revalidation failed", err);
    }
  }
);
