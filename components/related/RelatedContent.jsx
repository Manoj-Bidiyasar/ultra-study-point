"use client";

import CurrentAffairsBlock from "./CurrentAffairsBlock";
import ImportantNotesBlock from "./ImportantNotesBlock";
import QuizBlock from "./QuizBlock";

export default function RelatedContent({ data, pageType }) {
  if (!data) return null;

  return (
    <aside className="space-y-6">
      {data.currentAffairs?.length > 0 && (
        <CurrentAffairsBlock
          items={data.currentAffairs}
          pageType={pageType}
        />
      )}

      {data.quizzes?.length > 0 && (
        <QuizBlock items={data.quizzes} pageType={pageType} />
      )}

      {data.importantNotes?.length > 0 && (
        <ImportantNotesBlock items={data.importantNotes} />
      )}
    </aside>
  );
}
