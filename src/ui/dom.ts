type Child = Node | string | null | undefined | false;

interface ElementProps {
  className?: string;
  text?: string;
  attrs?: Record<string, string>;
}

/**
 * Creates an element with DOM APIs only. Strings become text nodes,
 * so data from the API can never be parsed as HTML (no innerHTML anywhere).
 */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  { className, text, attrs = {} }: ElementProps = {},
  children: Child[] = [],
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);

  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  Object.entries(attrs).forEach(([name, value]) => element.setAttribute(name, value));

  element.append(...children.filter((child): child is Node | string => Boolean(child)));
  return element;
}
