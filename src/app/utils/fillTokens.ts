/** Substitute `%name%` placeholders in CMS copy. */
export function fillTokens(template: string, values: Record<string, string | number>): string {
  return template.replace(/%([a-zA-Z][a-zA-Z0-9_]*)%/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : match,
  );
}
