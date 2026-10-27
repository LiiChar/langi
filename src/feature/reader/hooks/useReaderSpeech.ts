import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { commands } from "@/shared/commands/bindings";
import { WORD_REGEX } from "../lib/html";
import type { ContentElement } from "../lib/paragraph";

function toPlainText(element: ContentElement | null) {
  if (!element) return "";
  let html: string;
  switch (element.type) {
    case "paragraph":
    case "heading": html = element.text; break;
    case "sentence": html = element.sentence; break;
    case "code": html = element.code; break;
    case "question": html = element.questions.map(({ question }) => question).join(" "); break;
    default: return "";
  }
  return new DOMParser().parseFromString(html, "text/html").body.textContent?.trim() ?? "";
}

function selectWord( wordIndex: number) {

}

export function useReaderSpeech(element: ContentElement | null) {
  const [error, setError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [speechReady, setSpeechReady] = useState(false);
  const speechStartedAt = useRef(0);
  const text = useMemo(() => toPlainText(element), [element]);
  const words = useMemo(() => text.match(WORD_REGEX) ?? [], [text]);

  const toggle = useCallback(async () => {
    if (speaking) {
      await commands.stopSpeech();
      setSpeaking(false);
      setSpeechReady(false);
      return;
    }
    if (!text) return;
    setError(null);
    setSpeechReady(false);
    setSpeaking(true);
    try {
      const result = await commands.speakText(text);
      if (result.status === "error") {
        setError(result.error || "Не удалось озвучить текст");
        setSpeaking(false);
        return;
      }
      speechStartedAt.current = performance.now();
      setSpeechReady(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось озвучить текст");
      setSpeaking(false);
      setSpeechReady(false);
    }
  }, [speaking, text]);

  useEffect(() => {
    if (!speaking) {
      const selection = window.getSelection();
      const anchor = selection?.anchorNode;
      const anchorElement = anchor?.nodeType === Node.ELEMENT_NODE ? anchor as Element : anchor?.parentElement;
      if (anchorElement?.closest("[data-reader-content]")) selection?.removeAllRanges();
      return;
    }
    if (!speechReady) return;

    let active = true;
    const durations = words.map((word) => 80 + Math.max(1, word.length) * 55);
    let selectedWord = -1;
    const interval = window.setInterval(() => {
      if (!active) return;
      const elapsed = performance.now() - speechStartedAt.current;
      let elapsedBefore = 0;
      let nextWord: number | null = null;
      for (let index = 0; index < durations.length; index++) {
        elapsedBefore += durations[index];
        if (elapsed <= elapsedBefore) { nextWord = index; break; }
      }
      if (nextWord !== null && nextWord !== selectedWord) {
        selectWord(nextWord);
        selectedWord = nextWord;
      }
      void commands.isSpeechPlaying().then((playing) => {
        if (active && !playing && performance.now() - speechStartedAt.current > 600) setSpeaking(false);
      });
    }, 90);

    return () => { active = false; window.clearInterval(interval); };
  }, [speaking, speechReady, words]);

  useEffect(() => {
    setSpeaking(false);
    setSpeechReady(false);
    void commands.stopSpeech();
  }, [text]);

  return { text, speaking, error, toggle };
}
