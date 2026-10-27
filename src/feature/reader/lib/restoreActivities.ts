import type { LearningEvent } from "@/shared/commands/bindings";
import type { RestoredReaderActivity } from "../hooks/useReader";

export function restoreCompletedExercises(chapters: Array<{ id: string }>, events: LearningEvent[]): RestoredReaderActivity[] {
  type PositionedActivity = RestoredReaderActivity & { renderedIndex: number; timestamp: number };
  const latestCompletions = new Map<string, LearningEvent>();
  const startsByExercise = new Map<string, LearningEvent[]>();
  const answersByExercise = new Map<string, LearningEvent[]>();

  for (const event of events) {
    const exerciseId = event.context.exercise_id;
    if (!exerciseId) continue;

    if (event.event_type === "ExerciseCompleted" && event.data.type === "ExerciseCompleted" && /(?:translation|review-words)$/.test(exerciseId)) {
      const previous = latestCompletions.get(exerciseId);
      if (!previous || previous.timestamp <= event.timestamp) latestCompletions.set(exerciseId, event);
    }
    if (event.event_type === "ExerciseStarted") {
      const starts = startsByExercise.get(exerciseId) ?? [];
      starts.push(event);
      startsByExercise.set(exerciseId, starts);
    }
    if (event.event_type === "QuestionAnswered" && event.data.type === "QuestionAnswered") {
      const answers = answersByExercise.get(exerciseId) ?? [];
      answers.push(event);
      answersByExercise.set(exerciseId, answers);
    }
  }

  const restored: PositionedActivity[] = [];
  for (const [exerciseId, completion] of latestCompletions) {
    const suffix = exerciseId.match(/-(\d+)-(translation|review-words)$/);
    const chapterIndex = chapters.findIndex((chapter) => chapter.id === completion.context.chapter_id);
    const renderedIndex = Number(completion.context.element_id?.match(/-(\d+)$/)?.[1] ?? suffix?.[1]);
    if (!suffix || chapterIndex < 0 || !Number.isInteger(renderedIndex) || renderedIndex < 0) continue;

    const starts = startsByExercise.get(exerciseId) ?? [];
    const latestStart = starts.reduce((timestamp, event) => event.timestamp <= completion.timestamp ? Math.max(timestamp, event.timestamp) : timestamp, -Infinity);
    const answers = (answersByExercise.get(exerciseId) ?? []).filter((event) => event.timestamp <= completion.timestamp && event.timestamp >= latestStart);

    if (suffix[2] === "translation") {
      const answerEvent = answers.reduce<LearningEvent | null>((latest, event) => !latest || event.timestamp > latest.timestamp ? event : latest, null);
      if (!answerEvent || answerEvent.data.type !== "QuestionAnswered") continue;
      const word = answerEvent.context.word_id ?? answerEvent.data.word_ids[0];
      const answer = answerEvent.data.correct_answer;
      const selectedAnswer = answerEvent.data.selected_answer;
      if (!word || !answer || !selectedAnswer) continue;
      restored.push({
        id: `restored:${exerciseId}`,
        chapterIndex,
        anchorIndex: renderedIndex,
        element: { type: "review-word", word, answer, selectedAnswer, translations: [...new Set([selectedAnswer, answer])] },
        renderedIndex,
        timestamp: completion.timestamp,
      });
      continue;
    }

    const pairs: Record<string, string> = {};
    for (const event of answers) {
      if (event.data.type !== "QuestionAnswered" || !event.data.correct) continue;
      const word = event.context.question_id ?? event.context.word_id ?? event.data.word_ids[0];
      if (word && event.data.correct_answer) pairs[word] = event.data.correct_answer;
    }
    const words = completion.data.type === "ExerciseCompleted" ? completion.data.word_ids : [];
    if (words.length === 0 || words.some((word) => !pairs[word])) continue;
    restored.push({
      id: `restored:${exerciseId}`,
      chapterIndex,
      anchorIndex: renderedIndex,
      element: { type: "review-words", words, pairs, translations: words.map((word) => pairs[word]), initialMatched: pairs },
      renderedIndex,
      timestamp: completion.timestamp,
    });
  }

  restored.sort((a, b) => a.chapterIndex - b.chapterIndex || a.renderedIndex - b.renderedIndex || a.timestamp - b.timestamp);
  const restoredBeforeChapter = new Map<number, number>();
  return restored.map(({ renderedIndex, ...activity }) => {
    const precedingCount = restoredBeforeChapter.get(activity.chapterIndex) ?? 0;
    restoredBeforeChapter.set(activity.chapterIndex, precedingCount + 1);
    return { ...activity, anchorIndex: Math.max(0, renderedIndex - precedingCount) };
  });
}
