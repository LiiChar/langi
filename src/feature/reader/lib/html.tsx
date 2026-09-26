import React, { Fragment, type ReactNode } from "react";

export const WORD_REGEX =
  /[\p{L}\p{M}\p{N}]+(?:['’\-][\p{L}\p{M}\p{N}]+)*/gu;

const VOID_ELEMENTS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

const IGNORED_ELEMENTS = new Set([
  "script",
  "noscript",
  "iframe",
  "object",
  "embed",
]);

const HTML_TO_REACT_ATTRIBUTES: Record<string, string> = {
  "class": "className",
  "for": "htmlFor",
  "tabindex": "tabIndex",
  "readonly": "readOnly",
  "maxlength": "maxLength",
  "minlength": "minLength",
  "colspan": "colSpan",
  "rowspan": "rowSpan",
  "cellpadding": "cellPadding",
  "cellspacing": "cellSpacing",
  "contenteditable": "contentEditable",
  "spellcheck": "spellCheck",
  "autofocus": "autoFocus",
  "autoplay": "autoPlay",
  "crossorigin": "crossOrigin",
  "datetime": "dateTime",
  "enctype": "encType",
  "formmethod": "formMethod",
  "formenctype": "formEncType",
  "formtarget": "formTarget",
  "frameborder": "frameBorder",
  "hreflang": "hrefLang",
  "http-equiv": "httpEquiv",
  "usemap": "useMap",
  "srcset": "srcSet",
};

const parseStyle = (value: string): React.CSSProperties => {
  const result: Record<string, string> = {};

  for (const declaration of value.split(";")) {
    const separator = declaration.indexOf(":");

    if (separator === -1) {
      continue;
    }

    const property = declaration.slice(0, separator).trim();
    const propertyValue = declaration.slice(separator + 1).trim();

    if (!property || !propertyValue) {
      continue;
    }

    const camelCaseProperty = property.replace(
      /-([a-z])/g,
      (_, letter: string) => letter.toUpperCase(),
    );

    result[camelCaseProperty] = propertyValue;
  }

  return result as React.CSSProperties;
};

const isSafeUrl = (value: string): boolean => {
  const normalized = value.trim().toLowerCase();

  return !normalized.startsWith("javascript:");
};

const getReactAttributes = (
  element: Element,
): Record<string, unknown> => {
  const props: Record<string, unknown> = {};

  for (const attribute of Array.from(element.attributes)) {
    const name = attribute.name;
    const value = attribute.value;

    // Не переносим inline event handlers:
    // onclick, onload, onerror и т. д.
    if (name.toLowerCase().startsWith("on")) {
      continue;
    }

    if (
      (name === "href" ||
        name === "src" ||
        name === "action" ||
        name === "formaction") &&
      !isSafeUrl(value)
    ) {
      continue;
    }

    if (name === "style") {
      props.style = parseStyle(value);
      continue;
    }

    const reactName =
      HTML_TO_REACT_ATTRIBUTES[name.toLowerCase()] ??
      name;

    props[reactName] = value;
  }

  return props;
};

export type ReaderWord = {
  index: number;
  text: string;
};

export type ReaderWordRenderProps = {
  word: ReaderWord;
};

type RenderContext = {
  wordIndex: number;
  renderWord: (
    word: ReaderWord,
  ) => ReactNode;
};

const splitTextNode = (
  text: string,
  context: RenderContext,
): ReactNode[] => {
  const result: ReactNode[] = [];

  WORD_REGEX.lastIndex = 0;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = WORD_REGEX.exec(text)) !== null) {
    const matchIndex = match.index;
    const matchText = match[0];

    if (matchIndex > lastIndex) {
      result.push(text.slice(lastIndex, matchIndex));
    }

    const word: ReaderWord = {
      index: context.wordIndex++,
      text: matchText,
    };

    result.push(context.renderWord(word));

    lastIndex = matchIndex + matchText.length;
  }

  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex));
  }

  return result;
};

const renderNode = (
  node: Node,
  context: RenderContext,
): ReactNode => {
  if (node.nodeType === Node.TEXT_NODE) {
    return splitTextNode(node.textContent ?? "", context);
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const element = node as Element;
  const tagName = element.tagName.toLowerCase();

  if (IGNORED_ELEMENTS.has(tagName)) {
    return null;
  }

  const props = getReactAttributes(element);

  if (VOID_ELEMENTS.has(tagName)) {
    return React.createElement(tagName, props);
  }

  const children = Array.from(element.childNodes).map(
    (child, index) => (
      <Fragment key={index}>
        {renderNode(child, context)}
      </Fragment>
    ),
  );

  return React.createElement(
    tagName,
    props,
    children,
  );
};

export const renderHtmlWithWords = (
  html: string,
  renderWord: (
    word: ReaderWord,
  ) => ReactNode,
): ReactNode => {
  const parser = new DOMParser();
  const document = parser.parseFromString(
    html,
    "text/html",
  );

  const context: RenderContext = {
    wordIndex: 0,
    renderWord,
  };

  return Array.from(document.body.childNodes).map(
    (node, index) => (
      <Fragment key={index}>
        {renderNode(node, context)}
      </Fragment>
    ),
  );
};

export const extractWordsFromHtml = (
  html: string,
): string[] => {
  const parser = new DOMParser();
  const document = parser.parseFromString(
    html,
    "text/html",
  );

  const words: string[] = [];

  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
  );

  let node: Node | null;

  while ((node = walker.nextNode())) {
    const parent = node.parentElement;

    if (
      parent &&
      IGNORED_ELEMENTS.has(parent.tagName.toLowerCase())
    ) {
      continue;
    }

    const text = node.textContent ?? "";

    WORD_REGEX.lastIndex = 0;

    let match: RegExpExecArray | null;

    while ((match = WORD_REGEX.exec(text)) !== null) {
      words.push(match[0]);
    }
  }

  return words;
};
