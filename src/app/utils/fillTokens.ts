/**
 * Substitute `%name%` placeholders in CMS copy.
 *
 * Editable strings cannot be template literals, so anything with a runtime
 * value in it is authored with `%token%` markers instead. This is the same
 * dialect the bonus heading already uses (`Earn %count% bonus points`).
 *
 * Braces are deliberately not supported: a `{…}` inside an attribute value
 * makes OneEntry's public read of the **entire set** fail with a JSON cast
 * error, so `%name%` is the only safe form.
 *
 * Unknown tokens are left untouched rather than blanked — a typo in the admin
 * panel then shows up as a visible `%typo%` instead of silently vanishing.
 * @param   {string} template - Copy containing `%token%` markers.
 * @param   {Record<string, string | number>} values - Token values.
 * @returns {string} The copy with every known token replaced.
 */
export function fillTokens(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/%([a-zA-Z][a-zA-Z0-9_]*)%/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : match,
  );
}
