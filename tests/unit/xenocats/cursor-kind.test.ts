// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cursorKindFor } from '@/app/ui/xenocats/cursor-kind';

function mount(html: string) {
  document.body.innerHTML = html;
  return (selector: string) => document.querySelector(selector);
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('cursorKindFor', () => {
  it('is an arrow over plain content, and when there is no element', () => {
    const $ = mount('<p id="p">Invoices</p>');
    expect(cursorKindFor($('#p'))).toBe('arrow');
    expect(cursorKindFor(null)).toBe('arrow');
    expect(cursorKindFor(window)).toBe('arrow');
  });

  it('is a hand over links and buttons, including their children', () => {
    const $ = mount(
      '<a id="a" href="/x"><span id="inner">Go</span></a><button id="b">Save</button><select id="s"></select><input id="c" type="checkbox">'
    );
    for (const id of ['#a', '#inner', '#b', '#s', '#c'])
      expect(cursorKindFor($(id))).toBe('pointer');
  });

  it('is an I-beam over text fields', () => {
    const $ = mount(
      '<input id="plain"><input id="search" type="search"><input id="n" type="number"><textarea id="t"></textarea><div id="e" contenteditable="true"></div>'
    );
    for (const id of ['#plain', '#search', '#n', '#t', '#e'])
      expect(cursorKindFor($(id))).toBe('text');
  });

  it('is not-allowed over disabled controls, which wins over the others', () => {
    const $ = mount(
      '<button id="b" disabled>Save</button><input id="i" disabled><a id="a" href="/x" aria-disabled="true">Go</a>'
    );
    for (const id of ['#b', '#i', '#a']) expect(cursorKindFor($(id))).toBe('not-allowed');
  });
});
