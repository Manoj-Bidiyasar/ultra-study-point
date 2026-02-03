import "server-only";

import { getAdminDb } from "@/lib/firebaseAdmin";

const adminDb = getAdminDb();

export default adminDb;
