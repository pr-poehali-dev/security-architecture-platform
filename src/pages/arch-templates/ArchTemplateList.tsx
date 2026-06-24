import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { fetchArchTemplates, ArchTemplate, STATUS_OPTIONS, TYPE_OPTIONS } from '@/api/archTemplates';

const STATUS_STYLE: Record<string, string> = {
  active:         'bg-success/10 text-success',
  on_review:      'bg-blue-500/10 text-blue-400',
  in_development: 'bg-warning/10 text-warning',
  inactive:       'bg-muted text-muted-foreground',
  archived:       'bg-muted text-muted-foreground',
};

const TYPE_STYLE: Record<string, string> = {
  technical:      'bg-blue-500/10 text-blue-400',
  organizational: 'bg-purple-500/10 text-purple-400',
};

export default function ArchTemplateList() {
  const navigate = useNavigate();
  const [items, setItems] = useState<ArchTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sortCol, setSortCol] = useState<'name' | 'templateType' | 'owner' | 'status' | 'version'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    fetchArchTemplates()
      .then(setItems)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSort = (col: typeof sortCol) => {
    if (sortCol === col) { setSortDir((d) => d === 'asc' ? 'desc' : 'asc'); }
    else { setSortCol(col); setSortDir('asc'); }
  };

  const filtered = items
    .filter((d) => {
      const q = search.toLowerCase();
      const matchSearch = !q
        || d.name.toLowerCase().includes(q)
        || d.id.toLowerCase().includes(q)
        || d.owner.toLowerCase().includes(q)
        || d.tags.some((t) => t.name.toLowerCase().includes(q));
      return matchSearch
        && (!statusFilter || d.status === statusFilter)
        && (!typeFilter || d.templateType === typeFilter);
    })
    .sort((a, b) => {
      const v = (x: ArchTemplate) => {
        if (sortCol === 'name')         return x.name.toLowerCase();
        if (sortCol === 'templateType') return x.typeLabel.toLowerCase();
        if (sortCol === 'owner')        return (x.owner || '').toLowerCase();
        if (sortCol === 'status')       return x.statusLabel.toLowerCase();
        if (sortCol === 'version')      return x.version || '';
        return '';
      };
      return sortDir === 'asc'
        ? v(a).localeCompare(v(b), 'ru')
        : v(b).localeCompare(v(a), 'ru');
    });

  return (
    <>
      <div className="relative border-b border-border bg-primary text-primary-foreground overflow-hidden">
        <div className="absolute inset-0 grid-texture opacity-[0.08]" />
        <div className="relative px-6 py-8 max-w-[1400px] mx-auto">
          <div className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-accent mb-3 bg-accent/15 px-2.5 py-1 rounded">
            <span className="size-1.5 rounded-full bg-accent animate-pulse" />
            Конструктор
          </div>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-4">
              <div className="size-12 rounded-xl bg-primary-foreground/10 border border-primary-foreground/15 flex items-center justify-center shrink-0">
                <Icon name="Boxes" size={24} className="text-accent" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Шаблоны архитектур</h1>
                <p className="mt-1.5 text-primary-foreground/65 leading-relaxed max-w-xl">
                  Переиспользуемые шаблоны технических и организационных архитектурных решений.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/templates/new')}
              className="h-10 px-5 rounded-md bg-accent text-accent-foreground text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity shrink-0"
            >
              <Icon name="Plus" size={16} /> Добавить шаблон
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 py-3 max-w-[1400px] mx-auto flex flex-wrap gap-3 items-center border-b border-border">
        {/* Поиск */}
        <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-border bg-background text-sm text-muted-foreground flex-1 min-w-[200px] max-w-xs">
          <Icon name="Search" size={16} />
          <input
            className="bg-transparent outline-none flex-1 text-foreground placeholder:text-muted-foreground"
            placeholder="Поиск по названию, тегу, ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button type="button" onClick={() => setSearch('')} className="hover:text-foreground">
              <Icon name="X" size={14} />
            </button>
          )}
        </div>

        {/* Фильтры */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground outline-none cursor-pointer"
        >
          <option value="">Все статусы</option>
          {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground outline-none cursor-pointer"
        >
          <option value="">Все типы</option>
          {TYPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>

        {/* Сортировка */}
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-[11px] text-muted-foreground uppercase tracking-widest">Сортировка:</span>
          <div className="flex items-center rounded-md border border-border bg-background overflow-hidden text-xs">
            {([
              ['name',         'Название' ],
              ['templateType', 'Тип'      ],
              ['owner',        'Владелец' ],
              ['status',       'Статус'   ],
              ['version',      'Версия'   ],
            ] as const).map(([col, label]) => {
              const active = sortCol === col;
              return (
                <button
                  key={col}
                  type="button"
                  onClick={() => handleSort(col)}
                  className={`flex items-center gap-1 px-2.5 h-8 border-r last:border-r-0 border-border transition-colors ${active ? 'bg-accent text-accent-foreground font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'}`}
                >
                  {label}
                  {active && <Icon name={sortDir === 'asc' ? 'ArrowUp' : 'ArrowDown'} size={11} />}
                </button>
              );
            })}
          </div>
        </div>

        <span className="text-xs font-mono text-muted-foreground">{filtered.length} из {items.length}</span>
      </div>

      <div className="px-6 py-6 max-w-[1400px] mx-auto">
        {loading && (
          <div className="flex items-center justify-center py-24 text-muted-foreground gap-3">
            <Icon name="Loader2" size={22} className="animate-spin" /> Загрузка…
          </div>
        )}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-lg border border-destructive/30 bg-destructive/5 text-destructive text-sm">
            <Icon name="TriangleAlert" size={18} /> {error}
          </div>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground gap-3">
            <div className="size-14 rounded-full bg-muted flex items-center justify-center">
              <Icon name="Boxes" size={26} className="text-muted-foreground/50" />
            </div>
            <p className="font-medium">{items.length === 0 ? 'Нет шаблонов архитектур' : 'Ничего не найдено'}</p>
            {items.length === 0 && (
              <button
                type="button"
                onClick={() => navigate('/templates/new')}
                className="mt-2 h-9 px-4 rounded-md bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Создать первый шаблон
              </button>
            )}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="grid grid-cols-[1fr_120px_130px_120px_80px_50px] border-b border-border bg-muted/40">
              {([ ['name','Название / Теги'], ['templateType','Тип'], ['owner','Владелец'], ['status','Статус'], ['version','Версия'] ] as const).map(([col, label]) => {
                const active = sortCol === col;
                return (
                  <button key={col} type="button" onClick={() => handleSort(col)}
                    className={`group flex items-center gap-1.5 px-4 py-2.5 text-[11px] uppercase tracking-widest font-medium transition-colors select-none text-left ${active ? 'text-accent bg-accent/5' : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'}`}>
                    <span className={active ? 'underline underline-offset-2' : ''}>{label}</span>
                    <Icon
                      name={active ? (sortDir === 'asc' ? 'ArrowUp' : 'ArrowDown') : 'ArrowUpDown'}
                      size={13}
                      className={active ? 'text-accent' : 'opacity-30 group-hover:opacity-60 transition-opacity'}
                    />
                  </button>
                );
              })}
              <span />
            </div>
            {filtered.map((d, i) => (
              <Link
                key={d.id}
                to={`/templates/${d.id}`}
                className={`grid grid-cols-[1fr_120px_130px_120px_80px_50px] gap-4 px-4 py-3.5 items-center hover:bg-muted/40 transition-colors ${i < filtered.length - 1 ? 'border-b border-border' : ''}`}
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">{d.name}</div>
                  <div className="text-xs font-mono text-muted-foreground mt-0.5">{d.id}</div>
                  {d.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {d.tags.slice(0, 3).map((t) => (
                        <span key={t.id} className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
                          #{t.name}
                        </span>
                      ))}
                      {d.tags.length > 3 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">+{d.tags.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${TYPE_STYLE[d.templateType] ?? 'bg-muted text-muted-foreground'}`}>
                    {d.typeLabel}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground truncate">{d.owner || '—'}</div>
                <div>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUS_STYLE[d.status] ?? 'bg-muted text-muted-foreground'}`}>
                    {d.statusLabel}
                  </span>
                </div>
                <div className="text-xs font-mono text-muted-foreground">{d.version}</div>
                <div className="flex justify-end">
                  <Icon name="ChevronRight" size={16} className="text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}