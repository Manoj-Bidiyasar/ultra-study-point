"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function QuizAdminRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/quizzes");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-xl font-semibold">Quizzes Admin</h1>
        <p className="text-sm text-slate-600 mt-2">
          Redirecting to the new quizzes editor…
        </p>
      </div>
    </div>
  );
}
