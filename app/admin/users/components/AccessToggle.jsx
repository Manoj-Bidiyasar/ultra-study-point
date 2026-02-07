import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

export default function AccessToggle({ userId, accessKey, value }) {
  const toggle = async () => {
    const ref = doc(
      db,
      "artifacts",
      "ultra-study-point",
      "public",
      "data",
      "users",
      userId
    );

    await updateDoc(ref, {
      [`contentAccess.${accessKey}`]: !value,
      updatedAt: serverTimestamp(),
    });
  };

  return (
    <input
      type="checkbox"
      checked={value}
      onChange={toggle}
    />
  );
}

