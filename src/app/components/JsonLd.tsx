// Server component — renders JSON-LD structured data for Google rich snippets.
// Pass any valid schema.org object; multiple schemas can be composed via an array.
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
