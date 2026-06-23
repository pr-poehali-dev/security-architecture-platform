import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'loose' });

let counter = 0;

interface Props {
  code: string;
  className?: string;
}

export default function MermaidPreview({ code, className = '' }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const idRef = useRef(`mermaid-${++counter}`);

  useEffect(() => {
    if (!ref.current || !code.trim()) return;
    setError('');
    const id = idRef.current;
    mermaid.render(id, code)
      .then(({ svg }) => {
        if (ref.current) ref.current.innerHTML = svg;
      })
      .catch((e) => {
        setError(String(e?.message || 'Ошибка синтаксиса диаграммы'));
        if (ref.current) ref.current.innerHTML = '';
      });
  }, [code]);

  if (!code.trim()) return null;

  return (
    <div className={className}>
      {error ? (
        <div className="text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded p-3">
          {error}
        </div>
      ) : (
        <div ref={ref} className="overflow-auto flex justify-center [&>svg]:max-w-full" />
      )}
    </div>
  );
}
