import "server-only";

import { getAdminDb } from "@/lib/firebase/admin";

const adminDb = getAdminDb();

export default adminDb;


