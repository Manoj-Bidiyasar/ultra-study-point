const { setGlobalOptions } = require("firebase-functions");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const fetch = require("node-fetch");

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

      if (after.type === "daily") {
        paths.push(
          "/current-affairs",
          `/current-affairs/daily/${after.slug}`
        );
      }

      if (after.type === "monthly") {
        paths.push(
          "/current-affairs",
          `/current-affairs/monthly/${after.slug}`
        );
      }

      if (after.type === "notes") {
        paths.push(
          "/notes",
          `/notes/${after.category}`,
          `/notes/${after.slug}`
        );
      }

      await fetch("https://ultrastudypoint.in/api/revalidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: REVALIDATE_SECRET.value(),
          paths,
        }),
      });

      logger.info("Revalidation successful", { paths });
    } catch (err) {
      logger.error("Revalidation failed", err);
    }
  }
);
