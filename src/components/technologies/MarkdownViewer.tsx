import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import hljs from 'highlight.js';
import Icon from '@/components/ui/icon';

// Тёмная тема highlight.js
import 'highlight.js/styles/github-dark.css';

function CodeBlock({ className, children }: { className?: string; children: string }) {
  const lang = className?.replace('language-', '') ?? '';
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!codeRef.current) return;
    if (lang && hljs.getLanguage(lang)) {
      hljs.highlightElement(codeRef.current);
    } else {
      hljs.highlightElement(codeRef.current);
    }
  }, [children, lang]);

  const copy = () => {
    navigator.clipboard.writeText(children).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="my-4 rounded-lg border border-border overflow-hidden group/code">
      <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-border">
        <span className="text-[11px] font-mono uppercase tracking-widest text-[#8b949e]">
          {lang || 'code'}
        </span>
        <button
          onClick={copy}
          className="flex items-center gap-1.5 text-[11px] text-[#8b949e] hover:text-white transition-colors opacity-0 group-hover/code:opacity-100"
        >
          <Icon name={copied ? 'Check' : 'Copy'} size={12} />
          {copied ? 'Скопировано' : 'Копировать'}
        </button>
      </div>
      <pre className="overflow-x-auto m-0 p-0 bg-[#0d1117]">
        <code
          ref={codeRef}
          className={`hljs language-${lang} text-xs leading-relaxed block p-4`}
        >
          {children}
        </code>
      </pre>
    </div>
  );
}

const components: Components = {
  h1: ({ children }) => (
    <h1 className="text-2xl font-bold text-foreground mt-8 mb-4 pb-2 border-b border-border first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-xl font-semibold text-foreground mt-6 mb-3 pb-1.5 border-b border-border/50">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-base font-semibold text-foreground mt-5 mb-2">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-sm font-semibold text-foreground mt-4 mb-2 uppercase tracking-wide">{children}</h4>
  ),
  h5: ({ children }) => (
    <h5 className="text-sm font-semibold text-muted-foreground mt-3 mb-1">{children}</h5>
  ),
  h6: ({ children }) => (
    <h6 className="text-xs font-semibold text-muted-foreground mt-3 mb-1 uppercase tracking-widest">{children}</h6>
  ),
  p: ({ children }) => (
    <p className="text-sm text-foreground/85 leading-7 mb-4 last:mb-0">{children}</p>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-accent underline underline-offset-2 hover:text-accent/80 transition-colors"
    >
      {children}
    </a>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic text-foreground/80">{children}</em>
  ),
  del: ({ children }) => (
    <del className="line-through text-muted-foreground">{children}</del>
  ),
  ul: ({ children }) => (
    <ul className="mb-4 space-y-1.5 pl-0">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-4 space-y-1.5 pl-0 list-none">{children}</ol>
  ),
  li: ({ children, ...props }) => {
    const isOrdered = (props as { ordered?: boolean }).ordered;
    return (
      <li className="flex gap-2.5 text-sm text-foreground/85 leading-6 items-start">
        {!isOrdered && (
          <span className="mt-2 size-1.5 rounded-full bg-accent shrink-0" />
        )}
        <span>{children}</span>
      </li>
    );
  },
  blockquote: ({ children }) => (
    <blockquote className="my-4 pl-4 border-l-2 border-accent bg-accent/5 rounded-r-md py-3 pr-3">
      <div className="text-sm text-muted-foreground italic leading-relaxed [&>p]:mb-0">{children}</div>
    </blockquote>
  ),
  pre: ({ children }) => <>{children}</>,
  code: ({ className, children }) => {
    const isBlock = className?.startsWith('language-');
    if (isBlock) {
      return (
        <CodeBlock className={className}>
          {String(children).replace(/\n$/, '')}
        </CodeBlock>
      );
    }
    return (
      <code className="text-xs font-mono bg-muted text-accent px-1.5 py-0.5 rounded border border-border/50">
        {children}
      </code>
    );
  },
  hr: () => <hr className="my-6 border-border" />,
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-muted/60 border-b border-border">{children}</thead>
  ),
  tbody: ({ children }) => <tbody className="divide-y divide-border">{children}</tbody>,
  tr: ({ children }) => <tr className="hover:bg-muted/30 transition-colors">{children}</tr>,
  th: ({ children }) => (
    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-2.5 text-sm text-foreground/85">{children}</td>
  ),
  img: ({ src, alt }) => (
    <span className="block my-4">
      <img
        src={src}
        alt={alt ?? ''}
        className="rounded-lg border border-border max-w-full h-auto"
      />
      {alt && <span className="block mt-1.5 text-center text-xs text-muted-foreground">{alt}</span>}
    </span>
  ),
  input: ({ type, checked }) =>
    type === 'checkbox' ? (
      <input type="checkbox" checked={checked} readOnly className="mr-2 accent-accent" />
    ) : null,
};

interface Props {
  children: string;
  className?: string;
}

export default function MarkdownViewer({ children, className = '' }: Props) {
  if (!children?.trim()) return null;
  return (
    <div className={`min-w-0 ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
