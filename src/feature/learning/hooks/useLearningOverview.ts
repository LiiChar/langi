import { useCallback, useEffect, useRef, useState } from "react";
import { commands, type LearningOverview } from "@/shared/commands/bindings";

export function useLearningOverview() {
  const [data, setData] = useState<LearningOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const reload = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const result = await commands.getLearningOverview();
      if (currentRequest !== requestId.current) return;
      if (result.status === "ok") setData(result.data);
      else setError(result.error || "Не удалось загрузить данные обучения");
    } catch (cause) {
      if (currentRequest === requestId.current) setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
    return () => { requestId.current += 1; };
  }, [reload]);

  return { data, loading, error, reload };
}
