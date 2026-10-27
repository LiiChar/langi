import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { commands } from "@/shared/commands/bindings";
import { WORD_REGEX } from "../lib/html";
import type { ContentElement } from "../lib/paragraph";

export type ReaderSpeechTarget = {
  bookId: string;
  element: ContentElement | null;
  chapterIndex: number;
  elementIndex: number;
};

const SPEECH_WORD_CLASS = "reader-word-speaking";

function toPlainText(element: ContentElement | null) {
  if (!element) return "";

  let html: string;
  switch (element.type) {
    case "paragraph":
    case "heading":
      html = element.text;
      break;
    case "sentence":
      html = element.sentence;
      break;
    case "code":
      html = element.code;
      break;
    case "question":
      html = element.questions.map(({ question }) => question).join(" ");
      break;
    default:
      return "";
  }

  return new DOMParser().parseFromString(html, "text/html").body.textContent?.trim() ?? "";
}

function getSpeechWord(target: ReaderSpeechTarget, wordIndex: number) {
  const content = document.querySelector<HTMLElement>(
    `[data-reader-content="${target.chapterIndex}-${target.elementIndex}"]`,
  );
  if (!content) return null;

  return [...content.querySelectorAll<HTMLElement>("[data-reader-word-index]")]
    .find((word) => Number(word.dataset.readerWordIndex) === wordIndex) ?? null;
}

export function useReaderSpeech(target: ReaderSpeechTarget) {
  const [error, setError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [speechReady, setSpeechReady] = useState(false);
  const speakingRef = useRef(speaking);
  speakingRef.current = speaking;
  const speechStartedAt = useRef(0);
  const speechRequest = useRef(0);
  const targetKey = `${target.bookId}:${target.chapterIndex}:${target.elementIndex}`;
  const text = useMemo(() => toPlainText(target.element), [target.element]);
  const previousTargetKey = useRef(`${targetKey}:${text}`);
  const words = useMemo(() => text.match(WORD_REGEX) ?? [], [text]);

  useEffect(() => () => {
    if (speakingRef.current) {
      void commands.stopSpeech().catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    const currentKey = `${targetKey}:${text}`;
    if (previousTargetKey.current === currentKey) return;
    previousTargetKey.current = currentKey;

    speechRequest.current += 1;
    if (!speaking) return;

    void commands.stopSpeech().catch(() => undefined);
    setSpeaking(false);
    setSpeechReady(false);
  }, [speaking, targetKey, text]);

  const toggle = useCallback(async () => {
    if (speaking) {
      speechRequest.current += 1;
      try {
        await commands.stopSpeech();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Не удалось остановить озвучивание");
      } finally {
        setSpeaking(false);
        setSpeechReady(false);
      }
      return;
    }

    if (!text) return;

    const requestId = ++speechRequest.current;
    setError(null);
    setSpeechReady(false);
    setSpeaking(true);

    try {
      const result = await commands.speakText(text);
      if (requestId !== speechRequest.current) return;

      if (result.status === "error") {
        setError(result.error || "Не удалось озвучить текст");
        setSpeaking(false);
        return;
      }

      speechStartedAt.current = performance.now();
      setSpeechReady(true);
    } catch (cause) {
      if (requestId !== speechRequest.current) return;

      setError(cause instanceof Error ? cause.message : "Не удалось озвучить текст");
      setSpeaking(false);
      setSpeechReady(false);
    }
  }, [speaking, text]);

  useEffect(() => {
    if (!speaking || !speechReady) return;

    let active = true;
    let checkingPlayback = false;
    let highlightedWord: HTMLElement | null = null;
    const durations = words.map((word) => 80 + Math.max(1, word.length) * 55);
    let selectedWordIndex = -1;

    const interval = window.setInterval(() => {
      if (!active) return;

      const elapsed = performance.now() - speechStartedAt.current;
      let elapsedBefore = 0;
      let nextWordIndex: number | null = null;

      for (let index = 0; index < durations.length; index += 1) {
        elapsedBefore += durations[index];
        if (elapsed <= elapsedBefore) {
          nextWordIndex = index;
          break;
        }
      }

      if (nextWordIndex !== null && nextWordIndex !== selectedWordIndex) {
        highlightedWord?.classList.remove(SPEECH_WORD_CLASS);
        highlightedWord = getSpeechWord(target, nextWordIndex);
        highlightedWord?.classList.add(SPEECH_WORD_CLASS);
        selectedWordIndex = nextWordIndex;
      }

      if (checkingPlayback) return;
      checkingPlayback = true;
      void commands.isSpeechPlaying()
        .then((isPlaying) => {
          if (active && !isPlaying && performance.now() - speechStartedAt.current > 600) {
            setSpeaking(false);
          }
        })
        .catch((cause) => {
          if (active) {
            setError(cause instanceof Error ? cause.message : "Не удалось проверить озвучивание");
            setSpeaking(false);
          }
        })
        .finally(() => {
          checkingPlayback = false;
        });
    }, 90);

    return () => {
      active = false;
      window.clearInterval(interval);
      highlightedWord?.classList.remove(SPEECH_WORD_CLASS);
    };
  }, [
    speechReady,
    speaking,
    target.chapterIndex,
    target.element,
    target.elementIndex,
    targetKey,
    words,
  ]);

  return { text, speaking, error, toggle };
}
