// Client instrumentation: synchronous top-level code here runs after the HTML
// document loads and *before* React hydration, which is the window this patch
// needs. It lived in the root layout's `<head>` as an inline `<script>` until a
// locale switch — a client navigation that re-renders the root layout — made
// React reconcile that element on the client and warn that scripts rendered by
// components never execute. A module has no such render pass.

if (process.env.NODE_ENV !== 'production') {
  // Swallows a React 19 dev-build regression where the Components performance
  // track calls performance.measure() with a negative start timestamp during
  // first hydration of App Router pages, producing an uncaught TypeError.
  // Production builds are unaffected because react-dom-client.production.js
  // does not emit these marks — hence the guard, which the bundler resolves to
  // `false` and drops from the production client bundle.
  if (typeof performance !== 'undefined' && typeof performance.measure === 'function') {
    const measure = performance.measure.bind(performance);
    performance.measure = (
      measureName: string,
      startOrMeasureOptions?: string | PerformanceMeasureOptions,
      endMark?: string,
    ): PerformanceMeasure => {
      try {
        return measure(measureName, startOrMeasureOptions, endMark);
      } catch (error) {
        if (error instanceof TypeError && /negative time stamp/i.test(error.message)) {
          // The entry was never recorded; React discards the return value for
          // these marks, so handing back nothing is safe.
          return undefined as unknown as PerformanceMeasure;
        }
        throw error;
      }
    };
  }
}
