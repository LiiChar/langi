import { createFileRoute } from "@tanstack/react-router";
import { StatisticsPage } from "@/feature/learning/pages/StatisticsPage";
export const Route = createFileRoute("/statistics/")({ component: StatisticsPage });
