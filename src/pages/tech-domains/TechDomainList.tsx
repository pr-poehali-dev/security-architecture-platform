import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { fetchTechDomains, TechDomain, STATUS_OPTIONS } from '@/api/techDomains';

const STATUS_STYLE: Record<string, string> = {
  active:         'bg-success/10 text-success',
  in_development: 'bg-warning/10 text-warning',
  inactive:       'bg-muted text-muted-foreground',
  archived:       'bg-muted text-muted-foreground',
};

export default function TechDomainList() {
  const navigate = useNavigate();
  const [items, setItems] = useState<TechDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchTechDomains()
      .then(setItems)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = items.filter((d) => {
    const q = search.toLowerCase();
    const matchSearch = !q
      || d.name.toLowerCase().includes(q)
      || d.id.toLowerCase().includes(q)
      || d.owner.toLowerCase().includes(q);
    const matchStatus = !statusFilter || d.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <>
      {/* Header */}
      <div className="relative border-b border-border bg-primary text-primary-foreground overflow-hidden">
        <div className="absolute inset-0 grid-texture opacity-[0.08]" />
        <div className="relative px-6 py-8 max-w-[1400px] mx-auto">
          <div className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-accent mb-3 bg-accent/15 px-2.5 py-1 rounded">
            <span className="size-1.5 rounded-full bg-accent animate-pulse" />
            Домены
          </div>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-4">
              <div className="size-12 rounded-xl bg-primary-foreground/10 border border-primary-foreground/15 flex items-center justify-center shrink-0">
                <Icon name="Server" size={24} className="text-accent" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Технический домен</h1>
                <p className="mt-1.5 text-primary-foreground/65 leading-relaxed max-w-xl">
                  Перечень технических доменов с привязкой к организационной структуре компании.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/tech-domain/new')}
              className="h-10 px-5 rounded-md bg-accent text-accent-foreground text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity shrink-0"
            >
              <Icon name="Plus" size={16} /> Создать домен
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-6 py-4 max-w-[1400px] mx-auto flex flex-wrap gap-3 items-center border-b border-border">
        <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-border bg-background text-sm text-muted-foreground flex-1 min-w-[200px] max-w-xs">
          <Icon name="Search" size={16} />
          <input
            className="bg-transparent outline-none flex-1 text-foreground placeholder:text-muted-foreground"
            placeholder="Поиск по названию, ID, владельцу…"
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
        <span className="text-xs font-mono text-muted-foreground ml-auto">
          {filtered.length} из {items.length}
        </span>
      </div>

      {/* Content */}
      <div className="px-6 py-6 max-w-[1400px] mx-auto">
        {loading && (
          <div className="flex items-center justify-center py-24 text-muted-foreground gap-3">
            <Icon name="Loader2" size={22} className="animate-spin" />
            <span>Загрузка…</span>
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
              <Icon name="Server" size={26} className="text-muted-foreground/50" />
            </div>
            <p className="font-medium">{items.length === 0 ? 'Нет технических доменов' : 'Ничего не найдено'}</p>
            {items.length === 0 && (
              <button
                onClick={() => navigate('/tech-domain/new')}
                className="mt-2 h-9 px-4 rounded-md bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Создать первый домен
              </button>
            )}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="grid grid-cols-[1fr_160px_180px_100px_80px] gap-4 px-4 py-2.5 border-b border-border bg-muted/40 text-[11px] uppercase tracking-widest text-muted-foreground font-medium">
              <span>Название / ID</span>
              <span>Владелец</span>
              <span>Статус</span>
              <span>Версия</span>
              <span />
            </div>
            {filtered.map((d, i) => (
              <Link
                key={d.id}
                to={`/tech-domain/${d.id}`}
                className={`grid grid-cols-[1fr_160px_180px_100px_80px] gap-4 px-4 py-3.5 items-center hover:bg-muted/40 transition-colors ${i < filtered.length - 1 ? 'border-b border-border' : ''}`}
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">{d.name}</div>
                  <div className="text-xs font-mono text-muted-foreground mt-0.5">{d.id}</div>
                  {d.orgDomains.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {d.orgDomains.slice(0, 2).map((o) => (
                        <span key={o.id} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-accent/10 text-accent">
                          {o.name}
                        </span>
                      ))}
                      {d.orgDomains.length > 2 && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          +{d.orgDomains.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="text-sm text-muted-foreground truncate">{d.owner || '—'}</div>
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
