// Server component — renders JSON-LD structured data for Google rich snippets.
// Pass any valid schema.org object; multiple schemas can be composed via an array.

/**
 * Serialise a schema.org payload for embedding inside `<script>`.
 *
 * The HTML parser scans for the literal `</script` sequence *before* the JSON
 * is ever parsed, so a product title containing `</script><img onerror=…>`
 * would close the block early and inject markup. `<` and `>` are escaped to
 * their JSON unicode form — identical to any consumer, inert to the parser.
 * `&` gets the same treatment to keep entity tricks out, and U+2028 / U+2029
 * are escaped because they are legal in JSON but terminate a JavaScript line.
 *
 * @param data - Any JSON-serialisable schema.org payload.
 * @returns A string safe to place inside a `<script>` element.
 */
function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}
