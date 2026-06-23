import { useEffect, useRef, useState } from 'react';
import Icon from '@/components/ui/icon';
import { fetchTagsSuggest, TagRef } from '@/api/technologies';

interface Props {
  value: string[];
  onChange: (tags: string[]) => void;
}

export default function TagInput({ value, onChange }: Props) {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<TagRef[]>([]);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const res = await fetchTagsSuggest(input);
      setSuggestions(res.filter((t) => !value.includes(t.name)));
      setOpen(res.length > 0);
    }, 200);
  }, [input, value]);

  const add = (tag: string) => {
    const t = tag.trim().toLowerCase();
    if (t && !value.includes(t)) onChange([...value, t]);
    setInput('');
    setSuggestions([]);
    setOpen(false);
    inputRef.current?.focus();
  };

  const remove = (tag: string) => onChange(value.filter((t) => t !== tag));

  const handleKey = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
      e.preventDefault();
      add(input);
    }
    if (e.key === 'Backspace' && !input && value.length) {
      remove(value[value.length - 1]);
    }
    if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div className="relative">
      <div
        className="min-h-10 px-2 py-1.5 rounded-md border border-border bg-background flex flex-wrap gap-1.5 cursor-text focus-within:ring-2 focus-within:ring-accent/30 focus-within:border-accent transition-colors"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-accent/15 text-accent">
            #{tag}
            <button type="button" onClick={() => remove(tag)} className="hover:text-accent/60 transition-colors">
              <Icon name="X" size={10} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          onFocus={() => input && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={value.length === 0 ? 'Введите тег и нажмите Enter…' : ''}
          className="flex-1 min-w-[120px] bg-transparent outline-none text-sm py-0.5 px-1 placeholder:text-muted-foreground"
        />
      </div>

      {open && suggestions.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-full rounded-md border border-border bg-card shadow-lg py-1 max-h-48 overflow-y-auto">
          {suggestions.map((s) => (
            <button
              key={s.id}
              type="button"
              onMouseDown={() => add(s.name)}
              className="w-full px-3 py-2 text-left text-sm hover:bg-muted/60 transition-colors flex items-center gap-2"
            >
              <Icon name="Tag" size={14} className="text-muted-foreground" />
              #{s.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
