import { createFileRoute } from "@tanstack/react-router";
import { SettingsPage } from "@/feature/layout/pages/SettingsPage";

export const Route = createFileRoute("/settings/")({ component: SettingsPage });
