// Which cursor the browser would have shown over an element. The system cursor is
// hidden on pages with cats, so the fake one has to give these hints back.

export type CursorKind = 'arrow' | 'pointer' | 'text' | 'not-allowed';

const NOT_ALLOWED = ':disabled, [aria-disabled="true"]';

const TEXT_INPUT_TYPES = ['text', 'search', 'email', 'password', 'number', 'tel', 'url'];
const TEXT = [
  'textarea',
  '[contenteditable=""]',
  '[contenteditable="true"]',
  'input:not([type])',
  ...TEXT_INPUT_TYPES.map((type) => `input[type="${type}"]`),
].join(', ');

const POINTER = [
  'a[href]',
  'button',
  'select',
  'summary',
  'label[for]',
  '[role="button"]',
  '[role="link"]',
  '[role="tab"]',
  'input[type="button"]',
  'input[type="submit"]',
  'input[type="reset"]',
  'input[type="checkbox"]',
  'input[type="radio"]',
  'input[type="file"]',
].join(', ');

export function cursorKindFor(target: EventTarget | null): CursorKind {
  if (!target || !(target as Element).closest) return 'arrow';
  const element = target as Element;
  if (element.closest(NOT_ALLOWED)) return 'not-allowed';
  if (element.closest(TEXT)) return 'text';
  if (element.closest(POINTER)) return 'pointer';
  return 'arrow';
}
