import { events, type LearningEventType } from "@/shared/commands/bindings";

export function emitWordEvent(wordId: string, eventType: LearningEventType) {
  return events.learningEvent.emit({
    id: crypto.randomUUID(),
    user_id: "0",
    timestamp: Date.now(),
    event_type: eventType,
    context: {
      book_id: null,
      chapter_id: null,
      element_id: null,
      exercise_id: null,
      question_id: null,
      skill_id: null,
      word_id: wordId,
    },
    data: { type: "Empty" },
  });
}
