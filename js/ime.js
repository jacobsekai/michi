// Turns a text input into a romaji → hiragana input ("taberu" → たべる) for typed answers.
// Typing with a real Japanese keyboard works too: kana passes straight through.
import { toKana } from './kana.js';
import { demacron } from './check.js';

export function attachIme(input) {
  input.setAttribute('lang', 'ja');
  input.addEventListener('input', (e) => {
    if (e.isComposing) return; // native Japanese IME is active
    const v = input.value;
    const kana = toKana(demacron(v), { ime: true });
    if (kana !== v) {
      const fromEnd = v.length - input.selectionEnd;
      input.value = kana;
      const pos = Math.max(0, kana.length - fromEnd);
      input.setSelectionRange(pos, pos);
    }
  });
}

// Final conversion on submit (a trailing "n" becomes ん).
export const finishKana = (v) => toKana(demacron(v.trim()));
