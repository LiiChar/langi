import { createFileRoute } from "@tanstack/react-router";
import { GoalsPage } from "@/feature/learning/pages/GoalsPage";
export const Route = createFileRoute("/goals/")({ component: GoalsPage });
