import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import { app } from "@/lib/firebase/client";

export const storage = getStorage(app);

/* ================================
   WITH PROGRESS
================================ */

export function uploadImageWithProgress(file, onProgress) {
  return new Promise((resolve, reject) => {
    const path = `uploads/${Date.now()}-${file.name}`;
    const storageRef = ref(storage, path);

    const task = uploadBytesResumable(storageRef, file);

    task.on(
      "state_changed",
      (snap) => {
        const percent =
          (snap.bytesTransferred / snap.totalBytes) * 100;
        onProgress?.(Math.round(percent));
      },
      reject,
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        resolve(url);
      }
    );
  });
}

/* ================================
   SIMPLE UPLOAD (REQUIRED)
================================ */

export async function uploadImage(file) {
  return uploadImageWithProgress(file);
}
