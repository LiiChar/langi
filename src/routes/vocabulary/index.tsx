import { createFileRoute } from "@tanstack/react-router";
import { VocabularyPage } from "@/feature/learning/pages/VocabularyPage";
export const Route = createFileRoute("/vocabulary/")({ component: VocabularyPage });
