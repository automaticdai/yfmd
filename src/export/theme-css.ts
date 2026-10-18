/**
 * Make imported theme CSS safe to embed in a `<style>` tag.
 * Neutralizes style-tag breakout, remote imports, and scriptable CSS.
 */
export function sanitizeThemeCss(css: string): string {
  return css
    .replace(/<\/style/gi, '<\\/style')
    .replace(/<!--/g, '<\\!--')
    .replace(/@import\b[^;]*;?/gi, '')
    .replace(/expression\s*\(/gi, '(')
    .replace(/javascript\s*:/gi, '')
}
