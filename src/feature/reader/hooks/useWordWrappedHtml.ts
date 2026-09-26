import { useMemo } from "react";

export type ReaderWord = {
  index: number;
  text: string;
  normalized: string;
};

export type WordWrappedHtml = {
  html: string;
  words: ReaderWord[];
};

/**
 * Находим слова, включая:
 *
 * don't
 * I'm
 * well-known
 * mother-in-law
 * слово
 * слово123
 *
 * Пунктуация остаётся за пределами match.
 */
const WORD_REGEX =
  /[\p{L}\p{M}\p{N}]+(?:['’\-][\p{L}\p{M}\p{N}]+)*/gu;

const SKIP_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "CODE",
  "PRE",
]);

export const normalizeWord = (
  word: string,
): string => {
  return word
    .trim()
    .replace(
      /^[.,!?;:()[\]{}"'«»„“”‘’]+|[.,!?;:()[\]{}"'«»„“”‘’]+$/g,
      "",
    )
    .toLowerCase();
};

const createWordSpan = (
  document: Document,
  word: string,
  index: number,
): HTMLSpanElement => {
  const span = document.createElement("span");

  span.id = `word-index-${index}`;
  span.dataset.wordIndex = String(index);
  span.dataset.word = word;

  span.className = "reader-word";

  span.textContent = word;

  return span;
};

const wrapTextNode = (
  node: Text,
  words: ReaderWord[],
): void => {
  const document = node.ownerDocument;

  if (!document) {
    return;
  }

  const text = node.textContent ?? "";

  if (!text) {
    return;
  }

  const fragment =
    document.createDocumentFragment();

  let lastIndex = 0;

  for (const match of text.matchAll(WORD_REGEX)) {
    const word = match[0];
    const matchIndex = match.index;

    if (matchIndex === undefined) {
      continue;
    }

    /**
     * Текст до слова:
     *
     * "Hello "
     * "world, "
     * "\n"
     */
    if (matchIndex > lastIndex) {
      fragment.appendChild(
        document.createTextNode(
          text.slice(lastIndex, matchIndex),
        ),
      );
    }

    const normalized = normalizeWord(word);

    if (!normalized) {
      fragment.appendChild(
        document.createTextNode(word),
      );

      lastIndex =
        matchIndex + word.length;

      continue;
    }

    const wordIndex = words.length;

    fragment.appendChild(
      createWordSpan(
        document,
        word,
        wordIndex,
      ),
    );

    words.push({
      index: wordIndex,
      text: word,
      normalized,
    });

    lastIndex =
      matchIndex + word.length;
  }

  /**
   * Остаток после последнего слова.
   *
   * Например:
   *
   * "Hello!"
   *       ^
   *       "!"
   */
  if (lastIndex < text.length) {
    fragment.appendChild(
      document.createTextNode(
        text.slice(lastIndex),
      ),
    );
  }

  node.replaceWith(fragment);
};

const wrapTextNodes = (
  root: Node,
  words: ReaderWord[],
): void => {
  const document = root.ownerDocument;

  if (!document) {
    return;
  }

  const walker =
    document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
    );

  /**
   * Нельзя изменять DOM во время обхода TreeWalker,
   * поэтому сначала собираем все TextNode.
   */
  const textNodes: Text[] = [];

  let current = walker.nextNode();

  while (current) {
    const node = current as Text;

    const parent = node.parentElement;

    if (
      parent &&
      !SKIP_TAGS.has(parent.tagName)
    ) {
      textNodes.push(node);
    }

    current = walker.nextNode();
  }

  for (const node of textNodes) {
    wrapTextNode(node, words);
  }
};

export const parseWordWrappedHtml = (
  html: string,
): WordWrappedHtml => {
  const parser = new DOMParser();

  const document =
    parser.parseFromString(
      html,
      "text/html",
    );

  const words: ReaderWord[] = [];

  wrapTextNodes(
    document.body,
    words,
  );

  return {
    html: document.body.innerHTML,
    words,
  };
};

export const useWordWrappedHtml = (
  html: string,
): WordWrappedHtml => {
  return useMemo(
    () => parseWordWrappedHtml(html),
    [html],
  );
};

export const getWordsFromHtml = (
  html: string,
): ReaderWord[] => {
  return parseWordWrappedHtml(html).words;
};

export const extractWordsFromHtml = (
  html: string,
): string[] => {
  const parser = new DOMParser();

  const document =
    parser.parseFromString(
      html,
      "text/html",
    );

  const walker =
    document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
    );

  const words: string[] = [];

  let current = walker.nextNode();

  while (current) {
    const text =
      current.textContent ?? "";

    for (
      const match of text.matchAll(
        WORD_REGEX,
      )
    ) {
      words.push(match[0]);
    }

    current = walker.nextNode();
  }

  return words;
};


export const applySelectionToHtml = (
  html: string,
  isSelected: (
    wordIndex: number,
  ) => boolean,
): string => {
  const parser = new DOMParser();

  const document =
    parser.parseFromString(
      html,
      "text/html",
    );

  const wordElements =
    document.querySelectorAll<HTMLElement>(
      "[data-word-index]",
    );

  for (const element of wordElements) {
    const index = Number(
      element.dataset.wordIndex,
    );

    if (
      isSelected(index)
    ) {
      element.dataset.selected = "true";
    } else {
      delete element.dataset.selected;
    }
  }

  return document.body.innerHTML;
};
