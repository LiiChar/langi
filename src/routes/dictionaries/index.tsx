import { DictionariesPage } from "@/feature/library/pages/Dictionaries";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dictionaries/")({ component: DictionariesPage });
