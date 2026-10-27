import { createFileRoute } from "@tanstack/react-router";
import { ReviewPage } from "@/feature/learning/pages/ReviewPage";
export const Route = createFileRoute("/review/")({ component: ReviewPage });
