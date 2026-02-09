"use client";

import CurrentAffairsBlock from "./CurrentAffairsBlock";
import ImportantNotesBlock from "./ImportantNotesBlock";
import QuizBlock from "./QuizBlock";
import LatestQuizBlock from "./LatestQuizBlock";
import PyqBlock from "./PyqBlock";

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

      {data.latestQuizzes?.length > 0 ? (
        <LatestQuizBlock items={data.latestQuizzes} />
      ) : (
        <div className="text-xs text-gray-500">
          More quizzes coming soon.
        </div>
      )}

      {data.pyqs?.length > 0 ? (
        <PyqBlock items={data.pyqs} />
      ) : (
        <div className="text-xs text-gray-500">
          More PYQs coming soon.
        </div>
      )}

      {data.importantNotes?.length > 0 && (
        <ImportantNotesBlock items={data.importantNotes} />
      )}
    </aside>
  );
}
