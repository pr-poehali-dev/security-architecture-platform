import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { fetchDecisions, Decision, STATUS_OPTIONS, TYPE_OPTIONS } from '@/api/decisions';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import RefreshControl from '@/components/ui/RefreshControl';

const STATUS_STYLE: Record<string, string> = {
  active:         'bg-success/10 text-success',
  in_development: 'bg-warning/10 text-warning',
  inactive:       'bg-muted text-muted-foreground',
  archived:       'bg-muted text-muted-foreground',
};

const TYPE_STYLE: Record<string, string> = {
  technical:      'bg-blue-500/10 text-blue-400',
  organizational: 'bg-purple-500/10 text-purple-400',
};

export default function DecisionList() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    fetchDecisions()
      .then(setItems)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const { intervalSeconds, setIntervalSeconds } = useAutoRefresh('decisions', load);

  const filtered = items.filter((d) => {
    const q = search.toLowerCase();
    const matchSearch = !q
      || d.name.toLowerCase().includes(q)
      || d.id.toLowerCase().includes(q)
      || d.owner.toLowerCase().includes(q)
      || d.tags.some((t) => t.name.toLowerCase().includes(q));
    return matchSearch
      && (!statusFilter || d.status === statusFilter)
      && (!typeFilter || d.decisionType === typeFilter);
  });

  return (
    <>
      {/* Header */}
      <div className="relative border-b border-border bg-primary text-primary-foreground overflow-hidden">
        <div className="absolute inset-0 grid-texture opacity-[0.08]" />
        <div className="relative px-6 py-8 max-w-[1400px] mx-auto">
          <div className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-accent mb-3 bg-accent/15 px-2.5 py-1 rounded">
            <span className="size-1.5 rounded-full bg-accent animate-pulse" />
            Управление
          </div>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-4">
              <div className="size-12 rounded-xl bg-primary-foreground/10 border border-primary-foreground/15 flex items-center justify-center shrink-0">
                <Icon name="Workflow" size={24} className="text-accent" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Технические и орг. решения</h1>
                <p className="mt-1.5 text-primary-foreground/65 leading-relaxed max-w-xl">
                  Технические и организационные решения: продукты, практики, стандарты, соглашения.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <RefreshControl
                intervalSeconds={intervalSeconds}
                onIntervalChange={setIntervalSeconds}
                onRefreshNow={load}
              />
              <button
                onClick={() => navigate('/solutions/new')}
                className="h-10 px-5 rounded-md bg-accent text-accent-foreground text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity shrink-0"
              >
                <Icon name="Plus" size={16} /> Добавить решение
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-4 max-w-[1400px] mx-auto flex flex-wrap gap-3 items-center border-b border-border">
        <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-border bg-background text-sm text-muted-foreground flex-1 min-w-[200px] max-w-xs">
          <Icon name="Search" size={16} />
          <input
            className="bg-transparent outline-none flex-1 text-foreground placeholder:text-muted-foreground"
            placeholder="Поиск по названию, тегу, ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="hover:text-foreground">
              <Icon name="X" size={14} />
            </button>
          )}
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground outline-none cursor-pointer"
        >
          <option value="">Все статусы</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground outline-none cursor-pointer"
        >
          <option value="">Все типы</option>
          {TYPE_OPTIONS.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <span className="text-xs font-mono text-muted-foreground ml-auto">{filtered.length} из {items.length}</span>
      </div>

      {/* Content */}
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
              <Icon name="Workflow" size={26} className="text-muted-foreground/50" />
            </div>
            <p className="font-medium">{items.length === 0 ? 'Нет решений' : 'Ничего не найдено'}</p>
            {items.length === 0 && (
              <button
                onClick={() => navigate('/solutions/new')}
                className="mt-2 h-9 px-4 rounded-md bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Добавить первое решение
              </button>
            )}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="grid grid-cols-[1fr_120px_130px_130px_80px_50px] gap-4 px-4 py-2.5 border-b border-border bg-muted/40 text-[11px] uppercase tracking-widest text-muted-foreground font-medium">
              <span>Название / Теги</span>
              <span>Владелец</span>
              <span>Тип</span>
              <span>Статус</span>
              <span>Версия</span>
              <span />
            </div>
            {filtered.map((d, i) => (
              <Link
                key={d.id}
                to={`/solutions/${d.id}`}
                className={`grid grid-cols-[1fr_120px_130px_130px_80px_50px] gap-4 px-4 py-3.5 items-center hover:bg-muted/40 transition-colors ${i < filtered.length - 1 ? 'border-b border-border' : ''}`}
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
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                          +{d.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="text-sm text-muted-foreground truncate">{d.owner || '—'}</div>
                <div>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${TYPE_STYLE[d.decisionType] ?? 'bg-muted text-muted-foreground'}`}>
                    {d.typeLabel}
                  </span>
                </div>
                <div>
                  <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${STATUS_STYLE[d.status] ?? 'bg-muted text-muted-foreground'}`}>
                    {d.statusLabel}
                  </span>
                </div>
                <div className="text-sm font-mono text-muted-foreground">{d.version}</div>
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