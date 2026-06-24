import { useEffect, useRef, useState } from 'react';
import Icon from '@/components/ui/icon';

export type SuggestItem = { id: string; name: string };

interface SuggestPickerProps {
  label: string;
  icon: string;
  selected: SuggestItem[];
  onRemove: (id: string) => void;
  onAdd: (item: SuggestItem) => void;
  fetchFn: (q: string) => Promise<SuggestItem[]>;
  renderBadge?: (item: SuggestItem) => React.ReactNode;
}

export default function SuggestPicker({
  label, icon, selected, onRemove, onAdd, fetchFn, renderBadge,
}: SuggestPickerProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SuggestItem[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchFn(query).then((r) => setSuggestions(r.filter((x) => !selected.find((s) => s.id === x.id))));
  }, [query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
        <Icon name={icon} size={12} /> {label}
      </label>
      <div ref={ref} className="relative">
        <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-border bg-background text-sm">
          <Icon name="Search" size={14} className="text-muted-foreground shrink-0" />
          <input
            className="bg-transparent outline-none flex-1 text-foreground placeholder:text-muted-foreground"
            placeholder={`Поиск ${label.toLowerCase()}…`}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
          />
        </div>
        {open && suggestions.length > 0 && (
          <div className="absolute z-50 top-full mt-1 w-full rounded-md border border-border bg-card shadow-lg max-h-60 overflow-y-auto">
            {suggestions.map((item) => (
              <button
                key={item.id}
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors flex items-center justify-between gap-2"
                onClick={() => { onAdd(item); setQuery(''); setOpen(false); }}
              >
                <span className="truncate">{item.name}</span>
                {renderBadge?.(item)}
              </button>
            ))}
          </div>
        )}
      </div>
      {selected.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {selected.map((item) => (
            <div key={item.id} className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-card/50 text-sm">
              <span className="flex-1 truncate">{item.name}</span>
              {renderBadge?.(item)}
              <button type="button" onClick={() => onRemove(item.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                <Icon name="X" size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
