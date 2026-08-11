import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { fetchProducts, Product, STATUS_OPTIONS } from '@/api/products';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import RefreshControl from '@/components/ui/RefreshControl';

const STATUS_STYLE: Record<string, string> = {
  active:         'bg-success/10 text-success',
  in_development: 'bg-warning/10 text-warning',
  inactive:       'bg-muted text-muted-foreground',
  archived:       'bg-muted text-muted-foreground',
};

function scoreColor(score: number) {
  if (score >= 80) return 'text-success';
  if (score >= 50) return 'text-warning';
  return 'text-destructive';
}

function scoreBar(score: number) {
  if (score >= 80) return 'bg-success';
  if (score >= 50) return 'bg-warning';
  return 'bg-destructive';
}

export default function ProductList() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    fetchProducts()
      .then(setItems)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const { intervalSeconds, setIntervalSeconds } = useAutoRefresh('products', load);

  const filtered = items.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch = !q
      || p.name.toLowerCase().includes(q)
      || p.id.toLowerCase().includes(q)
      || p.owner.toLowerCase().includes(q)
      || p.tags.some((t) => t.name.toLowerCase().includes(q));
    return matchSearch && (!statusFilter || p.status === statusFilter);
  });

  return (
    <>
      {/* Header */}
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
                <Icon name="ScanSearch" size={24} className="text-accent" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Архитектурный анализ продуктов</h1>
                <p className="mt-1.5 text-primary-foreground/65 leading-relaxed max-w-xl">
                  Оценка архитектуры продуктов на соответствие требованиям и эталонным шаблонам безопасности.
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
                onClick={() => navigate('/product-analysis/new')}
                className="h-10 px-5 rounded-md bg-accent text-accent-foreground text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity shrink-0"
              >
                <Icon name="Plus" size={16} /> Добавить продукт
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
              <Icon name="ScanSearch" size={26} className="text-muted-foreground/50" />
            </div>
            <p className="font-medium">{items.length === 0 ? 'Нет продуктов' : 'Ничего не найдено'}</p>
            {items.length === 0 && (
              <button
                onClick={() => navigate('/product-analysis/new')}
                className="mt-2 h-9 px-4 rounded-md bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Добавить первый продукт
              </button>
            )}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="grid grid-cols-[1fr_120px_180px_130px_100px_50px] gap-4 px-4 py-2.5 border-b border-border bg-muted/40 text-[11px] uppercase tracking-widest text-muted-foreground font-medium">
              <span>Название / Теги</span>
              <span>Владелец</span>
              <span>Соответствие требованиям</span>
              <span>Связи</span>
              <span>Статус</span>
              <span />
            </div>
            {filtered.map((p, i) => (
              <Link
                key={p.id}
                to={`/product-analysis/${p.id}`}
                className={`grid grid-cols-[1fr_120px_180px_130px_100px_50px] gap-4 px-4 py-3.5 items-center hover:bg-muted/40 transition-colors ${i < filtered.length - 1 ? 'border-b border-border' : ''}`}
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">{p.name}</div>
                  <div className="text-xs font-mono text-muted-foreground mt-0.5">{p.id}</div>
                  {p.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {p.tags.slice(0, 3).map((t) => (
                        <span key={t.id} className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
                          #{t.name}
                        </span>
                      ))}
                      {p.tags.length > 3 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                          +{p.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="text-sm text-muted-foreground truncate">{p.owner || '—'}</div>
                <div>
                  {p.compliance.total > 0 ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden max-w-[90px]">
                        <div className={`h-full rounded-full ${scoreBar(p.compliance.scorePercent)}`} style={{ width: `${p.compliance.scorePercent}%` }} />
                      </div>
                      <span className={`text-xs font-mono font-semibold ${scoreColor(p.compliance.scorePercent)}`}>
                        {p.compliance.scorePercent}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">нет требований</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Icon name="Cpu" size={11} /> {p.technologiesCount}</span>
                  <span className="flex items-center gap-1"><Icon name="Workflow" size={11} /> {p.decisionsCount}</span>
                </div>
                <div>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUS_STYLE[p.status] ?? 'bg-muted text-muted-foreground'}`}>
                    {p.statusLabel}
                  </span>
                </div>
                <Icon name="ChevronRight" size={16} className="text-muted-foreground" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
