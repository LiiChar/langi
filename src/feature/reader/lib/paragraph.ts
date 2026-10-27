export type ParagraphType = "paragraph" | "heading" | "question" | "code";
export type ParagraphQuestion = {
  question: string;
  answer: string;
};

export type ReviewWordQuestion = {
  word: string;
  translations: string[];
  answer: string;
};

export type ReviewWordsQuestion = {
  words: string[];
  translations: string[];
  pairs: Record<string, string>;
};

export type SentenceQuestion = {
  sentence: string;
  choices: string[];
  answer: string;
};

export type ContentElement =
  | ParagraphElementType
  | HeadingElementType
  | QuestionElementType
  | CodeElementType
  | ReviewWordElementType
  | ReviewWordsElementType
  | SentenceElementType;

export type ParagraphElementType = {
  type: "paragraph";
  text: string;
  index: number;
};

export type HeadingElementType = {
  type: "heading";
  level: 1 | 2 | 3;
  text: string;
};

export type QuestionElementType = {
  type: "question";
  questions: ParagraphQuestion[];
  right: number;
  label: string;
  description: string;
};

export type ReviewWordElementType = {
  type: "review-word";
  word: string;
  translations: string[];
  answer: string;
  selectedAnswer?: string;
};

export type ReviewWordsElementType = {
  type: "review-words";
  words: string[];
  translations: string[];
  pairs: Record<string, string>;
  initialMatched?: Record<string, string>;
};

export type SentenceElementType = {
  type: "sentence";
  sentence: string;
  choices: string[];
  answer: string;
};

export type CodeElementType = {
  type: "code";
  language?: string;
  code: string;
};

export type Document = {
  id: string;
  elements: ContentElement[];
};

export const buildDocument = (text: string): Document => {
  const paragraphs = splitIntoParagraphs(text);

  const elements: ContentElement[] = [];

  for (let i = 0; i < paragraphs.length; i++) {
    elements.push({
      type: "paragraph",
      text: paragraphs[i],
      index: i,
    });
  }

  

  return {
    id: crypto.randomUUID(),
    elements,
  };
};

// Размер шага чтения: предложения по возможности остаются целыми,
// а длинные фразы делятся по естественным паузам.
const TARGET_CHUNK_LENGTH = 220;
const MAX_CHUNK_LENGTH = 320;

const BLOCK_TAGS = [
  "p",
  "li",
  "blockquote",
  "pre",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
];

const ABBREVIATIONS = new Set([
  // English
  "mr",
  "mrs",
  "ms",
  "dr",
  "prof",
  "sr",
  "jr",
  "st",
  "vs",
  "etc",
  "e.g",
  "i.e",
  "fig",
  "no",
  "approx",

  // Russian
  "г",
  "гг",
  "ул",
  "д",
  "кв",
  "им",
  "имени",
  "стр",
  "корп",
  "пр",
  "проф",
  "акад",
  "доц",
  "рис",
  "табл",
  "см",
  "т.е",
  "т.к",
  "и т.д",
  "и т.п",
  "др",
  "н",
  "обл",
  "р-н",
]);

const CLOSING_CHARS = new Set([
  '"',
  "'",
  "»",
  "”",
  "’",
  ")",
  "]",
  "}",
]);

const SENTENCE_ENDINGS = new Set([".", "!", "?", "…"]);

/**
 * Проверяет, является ли символ частью URL/email.
 */
const isInsideLinkLikeText = (text: string, index: number): boolean => {
  const before = text.slice(0, index + 1);
  const after = text.slice(index);

  // http://, https://
  if (/https?:\/\/[^\s]+$/i.test(before)) {
    return true;
  }

  // www.example.com
  if (/www\.[^\s]+$/i.test(before)) {
    return true;
  }

  // email@example.com
  if (/[^\s]+@[^\s]+$/.test(before)) {
    return true;
  }

  // example.com/path
  if (
    /(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s]*)?$/i.test(
      before + after.match(/^[^\s]*/)?.[0],
    )
  ) {
    return true;
  }

  return false;
};

/**
 * Получает слово непосредственно перед точкой.
 */
const getWordBefore = (text: string, index: number): string => {
  const before = text.slice(0, index);

  const match = before.match(/([^\s.,!?;:()[\]{}"'«»]+)$/);

  return match?.[1] ?? "";
};

/**
 * Проверяет, является ли точка частью десятичного числа.
 *
 * 3.14
 * 10.5
 * 1.000
 */
const isDecimalPoint = (text: string, index: number): boolean => {
  const prev = text[index - 1];
  const next = text[index + 1];

  return /\d/.test(prev ?? "") && /\d/.test(next ?? "");
};

/**
 * Проверяет инициалы:
 *
 * И. И. Иванов
 * A. B. Smith
 */
const isInitial = (text: string, index: number): boolean => {
  const prev = text[index - 1];

  if (!prev || !/[A-Za-zА-Яа-яЁё]/.test(prev)) {
    return false;
  }

  const before = text.slice(0, index + 1);

  // "И."
  if (/[A-Za-zА-Яа-яЁё]\.$/.test(before)) {
    const after = text.slice(index + 1);

    // Если после точки идёт пробел + ещё одна буква,
    // это очень вероятно инициалы или аббревиатура.
    if (/^\s+[A-Za-zА-Яа-яЁё]\./.test(after)) {
      return true;
    }

    // "И. Иванов"
    if (/^\s+[A-Za-zА-Яа-яЁё][A-Za-zА-Яа-яЁё-]*\b/.test(after)) {
      return true;
    }
  }

  return false;
};

/**
 * Проверяет распространённые сокращения.
 *
 * Mr.
 * Dr.
 * г.
 * ул.
 * т.д.
 */
const isAbbreviation = (text: string, index: number): boolean => {
  const word = getWordBefore(text, index).toLowerCase();

  if (!word) {
    return false;
  }

  return ABBREVIATIONS.has(word);
};

/**
 * Проверяет, является ли точка частью многоточия.
 */
const isEllipsis = (text: string, index: number): boolean => {
  return (
    text[index] === "…" ||
    text.slice(index - 2, index + 1) === "..." ||
    text.slice(index, index + 3) === "..."
  );
};

/**
 * После знака конца предложения могут идти:
 *
 * "..."
 * «...»
 * (...).
 *
 * Нужно пропустить закрывающие символы.
 */
const skipClosingCharacters = (text: string, index: number): number => {
  let i = index + 1;

  while (i < text.length && CLOSING_CHARS.has(text[i])) {
    i++;
  }

  return i;
};

/**
 * Проверяет, действительно ли здесь заканчивается предложение.
 */
const isSentenceBoundary = (text: string, index: number): boolean => {
  const char = text[index];

  if (!SENTENCE_ENDINGS.has(char)) {
    return false;
  }

  // URL / email / домен
  if (isInsideLinkLikeText(text, index)) {
    return false;
  }

  // 3.14
  if (char === "." && isDecimalPoint(text, index)) {
    return false;
  }

  // ...
  if (char === "." && isEllipsis(text, index)) {
    return false;
  }

  // И. И. Иванов
  if (char === "." && isInitial(text, index)) {
    return false;
  }

  // Mr. Smith / г. Москва / т.д.
  if (char === "." && isAbbreviation(text, index)) {
    return false;
  }

  const nextIndex = skipClosingCharacters(text, index);

  // Конец строки — это конец предложения.
  if (nextIndex >= text.length) {
    return true;
  }

  const next = text[nextIndex];

  // После точки в нормальном тексте должно начинаться
  // новое слово/предложение.
  //
  // Если сразу идёт буква без пробела:
  // "example.com"
  //
  // то это почти наверняка не конец предложения.
  if (/[A-Za-zА-Яа-яЁё]/.test(next)) {
    return false;
  }

  // После ! ? … практически всегда конец предложения.
  if (char !== ".") {
    return true;
  }

  // Для точки ожидаем пробел или перенос строки.
  return /\s/.test(text[index + 1] ?? "");
};

/**
 * Разбивает текст на предложения.
 */
export const splitIntoSentences = (text: string): string[] => {
  const result: string[] = [];

  let start = 0;

  for (let i = 0; i < text.length; i++) {
    if (!isSentenceBoundary(text, i)) {
      continue;
    }

    const end = skipClosingCharacters(text, i);

    const sentence = text.slice(start, end).trim();

    if (sentence) {
      result.push(sentence);
    }

    start = end;
    i = end - 1;
  }

  const tail = text.slice(start).trim();

  if (tail) {
    result.push(tail);
  }

  return result;
};

/**
 * Нормализует пробелы внутри текста.
 */
const normalizeText = (text: string): string => {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

/**
 * Извлекает текстовые блоки из HTML.
 */
const extractBlocks = (html: string): string[] => {
  const doc = new DOMParser().parseFromString(html, "text/html");

  const selector = BLOCK_TAGS.join(",");
  const elements = Array.from(doc.querySelectorAll(selector))
    // Не обрабатываем контейнер вместе с его вложенными блочными элементами.
    .filter((element) => !element.querySelector(selector));

  // Если HTML вообще не содержит блочных элементов,
  // используем содержимое body целиком.
  if (elements.length === 0) {
    return doc.body.innerHTML.trim() ? [doc.body.innerHTML] : [];
  }

  return elements
    .map((element) => element.outerHTML)
    .filter(Boolean);
};

const getVisibleText = (html: string): string => {
  const doc = new DOMParser().parseFromString(html, "text/html");
  // Изображения (включая data:image/...;base64) не входят в длину текста.
  doc.querySelectorAll("img, script, style, noscript").forEach((element) => element.remove());
  return normalizeText(doc.body.textContent ?? "");
};

const getImages = (html: string): string[] => {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return Array.from(doc.querySelectorAll("img"), (image) => image.outerHTML);
};

const splitAtNaturalPauses = (sentence: string): string[] => {
  const parts = sentence.split(/(?<=[,;:—–])\s+/).filter(Boolean);
  if (parts.length < 2) return [sentence];

  const chunks: string[] = [];
  let current = "";
  for (const part of parts) {
    if (current && current.length + part.length + 1 > TARGET_CHUNK_LENGTH) {
      chunks.push(current);
      current = part;
    } else {
      current = current ? `${current} ${part}` : part;
    }
  }
  if (current) chunks.push(current);

  // Если естественные паузы не помогли, режем по словам, не оставляя
  // крошечные хвосты и не разрывая слова.
  return chunks.flatMap((chunk) => {
    if (chunk.length <= MAX_CHUNK_LENGTH) return [chunk];
    const words = chunk.split(/\s+/);
    const result: string[] = [];
    let part = "";
    for (const word of words) {
      if (part && part.length + word.length + 1 > TARGET_CHUNK_LENGTH) {
        result.push(part);
        part = word;
      } else {
        part = part ? `${part} ${word}` : word;
      }
    }
    if (part) result.push(part);
    return result;
  });
};

const splitLongBlock = (text: string): string[] => {
  const sentences = splitIntoSentences(text);
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    const sentenceParts = sentence.length > MAX_CHUNK_LENGTH
      ? splitAtNaturalPauses(sentence)
      : [sentence];
    for (const part of sentenceParts) {
      if (current && current.length + part.length + 1 > TARGET_CHUNK_LENGTH) {
        chunks.push(current);
        current = part;
      } else {
        current = current ? `${current} ${part}` : part;
      }
    }
  }
  if (current) chunks.push(current);
  return chunks;
};

/**
 * Основная функция.
 */
export const splitIntoParagraphs = (text: string): string[] => {
  if (!text.trim()) {
    return [];
  }

  const blocks = extractBlocks(text);

  return blocks.flatMap((html) => {
    const visibleText = getVisibleText(html);
    const images = getImages(html);

    // Сохраняем исходную HTML-разметку, если блок помещается в один шаг.
    if (!visibleText || visibleText.length <= TARGET_CHUNK_LENGTH) {
      return [html];
    }

    const chunks = splitLongBlock(visibleText);
    // Если блок пришлось делить, изображения выводим отдельными элементами:
    // они не влияют на границы текста и не теряются при сегментации.
    return [...chunks, ...images];
  });
};
