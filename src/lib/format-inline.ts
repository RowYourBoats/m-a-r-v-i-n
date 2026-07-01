// Render-time inline formatter for short plain-text strings that carry the
// site's lightweight emphasis convention (captions, résumé cells, etc.). The
// site has no bold, so `**x**`/`__x__` collapse to plain text (legacy markers),
// while single `*x*`/`_x_` render as italics — the site's only emphasis
// mechanism. Straight quotes/apostrophes are upgraded to typographer's marks.
//
// Output is HTML (consume via `set:html` / <Fragment set:html>), so the raw
// input is HTML-escaped FIRST — never feed unescaped user text past this.
const escHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const typographize = (s: string) =>
  s
    .replace(/(^|[\s([])"/g, "$1“") // opening double quote
    .replace(/"/g, "”") // closing double quote
    .replace(/(^|[\s([“])'/g, "$1‘") // opening single quote (rare)
    .replace(/'/g, "’"); // apostrophe / closing single

const emphasize = (s: string) =>
  s
    .replace(/\*\*(.+?)\*\*/g, "$1") // drop bold markers (no bold on the site)
    .replace(/__(.+?)__/g, "$1")
    .replace(/\*(.+?)\*/g, "<em>$1</em>") // single * → italic
    .replace(/_(.+?)_/g, "<em>$1</em>"); // single _ → italic

export const formatInline = (s: string | null | undefined) =>
  emphasize(typographize(escHtml((s || "").toString())));
