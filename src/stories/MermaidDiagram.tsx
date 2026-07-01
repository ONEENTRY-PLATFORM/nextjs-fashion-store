import React, { useEffect, useRef, useId } from 'react';

interface Props {
  chart: string;
}

export function MermaidDiagram({ chart }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId().replace(/:/g, '');

  useEffect(() => {
    if (!ref.current) return;
    let cancelled = false;

    (async () => {
      const { default: mermaid } = await import('mermaid');
      if (cancelled || !ref.current) return;

      // Wait for fonts to load — otherwise Mermaid measures text
      // with the fallback font and clipPath ends up too narrow
      await document.fonts.ready;
      if (cancelled || !ref.current) return;

      mermaid.initialize({
        startOnLoad: false,
        theme: 'base',
        themeVariables: {
          primaryColor: '#b5b9c0',
          primaryTextColor: '#111827',
          primaryBorderColor: '#a5aab1',
          lineColor: '#cdd1d7',
          secondaryColor: '#f3f4f6',
          secondaryTextColor: '#111827',
          tertiaryColor: '#ffffff',
          tertiaryTextColor: '#111827',
          fontFamily: 'Inter, sans-serif',
          fontSize: '12px',
        },
        flowchart: {
          curve: 'basis',
          padding: 20,
          nodeSpacing: 60,
          rankSpacing: 70,
          htmlLabels: true,
        },
      });

      const uniqueId = `mermaid-${id}-${Math.random().toString(36).slice(2)}`;
      const { svg } = await mermaid.render(uniqueId, chart);
      if (cancelled || !ref.current) return;

      ref.current.innerHTML = svg;
      const svgEl = ref.current.querySelector('svg');
      if (!svgEl) return;

      // Expand clipPath rectangles so text isn't clipped
      // (80px margin in width, 40px in height)
      svgEl.querySelectorAll('clipPath rect').forEach(el => {
        const w = parseFloat(el.getAttribute('width') || '0');
        const h = parseFloat(el.getAttribute('height') || '0');
        const x = parseFloat(el.getAttribute('x') || '0');
        const y = parseFloat(el.getAttribute('y') || '0');
        if (w > 0) {
          el.setAttribute('width', String(w + 80));
          el.setAttribute('x', String(x - 40));
        }
        if (h > 0) {
          el.setAttribute('height', String(h + 40));
          el.setAttribute('y', String(y - 10));
        }
      });

      // Expand foreignObject for htmlLabels mode
      svgEl.querySelectorAll('foreignObject').forEach(fo => {
        const w = parseFloat(fo.getAttribute('width') || '0');
        const h = parseFloat(fo.getAttribute('height') || '0');
        if (w > 0) fo.setAttribute('width', String(w + 80));
        if (h > 0) fo.setAttribute('height', String(h + 40));
      });

      // Remove fixed width — SVG stretches to the full container width
      const viewBox = svgEl.getAttribute('viewBox');
      if (viewBox) {
        const [, , w] = viewBox.split(' ').map(Number);
        svgEl.style.width = '100%';
        svgEl.style.height = 'auto';
        svgEl.style.minWidth = `${Math.min(w, 1200)}px`;
      } else {
        svgEl.style.maxWidth = '100%';
        svgEl.style.height = 'auto';
      }
    })().catch(console.error);

    return () => { cancelled = true; };
  }, [chart, id]);

  return (
    <div
      ref={ref}
      style={{
        padding: '24px',
        background: '#fafafa',
        border: '1px solid #e5e7eb',
        marginBottom: '32px',
        overflowX: 'auto',
      }}
    />
  );
}
