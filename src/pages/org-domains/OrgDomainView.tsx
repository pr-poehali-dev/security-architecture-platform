import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { fetchOrgDomain, OrgDomainDetail } from '@/api/orgDomains';

const STATUS_STYLE: Record<string, string> = {
  active:         'bg-success/10 text-success',
  in_development: 'bg-warning/10 text-warning',
  inactive:       'bg-muted text-muted-foreground',
  archived:       'bg-muted text-muted-foreground',
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function OrgDomainView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [domain, setDomain] = useState<OrgDomainDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    fetchOrgDomain(id)
      .then(setDomain)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center py-32 text-muted-foreground gap-3">
      <Icon name="Loader2" size={22} className="animate-spin" /> Загрузка…
    </div>
  );

  if (error || !domain) return (
    <div className="px-6 py-12 max-w-[1400px] mx-auto">
      <div className="flex items-center gap-3 p-4 rounded-lg border border-destructive/30 bg-destructive/5 text-destructive text-sm">
        <Icon name="TriangleAlert" size={18} /> {error || 'Домен не найден'}
      </div>
      <Link to="/org-domain" className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <Icon name="ArrowLeft" size={16} /> Вернуться к списку
      </Link>
    </div>
  );

  return (
    <>
      {/* Header */}
      <div className="relative border-b border-border bg-primary text-primary-foreground overflow-hidden">
        <div className="absolute inset-0 grid-texture opacity-[0.08]" />
        <div className="relative px-6 py-6 max-w-[1400px] mx-auto">
          <nav className="flex items-center gap-2 text-sm text-primary-foreground/60 mb-4">
            <Link to="/org-domain" className="hover:text-primary-foreground transition-colors">Организационный домен</Link>
            <Icon name="ChevronRight" size={14} />
            <span className="text-primary-foreground font-medium truncate">{domain.name}</span>
          </nav>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{domain.name}</h1>
                <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${STATUS_STYLE[domain.status] ?? 'bg-muted text-muted-foreground'}`}>
                  {domain.statusLabel}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm text-primary-foreground/60 flex-wrap">
                <span className="font-mono">{domain.id}</span>
                <span>·</span>
                <span>v{domain.version}</span>
                {domain.owner && <><span>·</span><span>{domain.owner}</span></>}
              </div>
            </div>
            <button
              onClick={() => navigate(`/org-domain/${domain.id}/edit`)}
              className="h-10 px-5 rounded-md bg-accent text-accent-foreground text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity shrink-0"
            >
              <Icon name="Pencil" size={16} /> Редактировать
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 py-8 max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-6">
          <section className="rounded-lg border border-border bg-card p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Icon name="Info" size={18} className="text-accent" /> Основная информация
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: 'ID', value: domain.id, mono: true },
                { label: 'Версия', value: domain.version, mono: true },
                { label: 'Название', value: domain.name },
                { label: 'Владелец', value: domain.owner || '—' },
                { label: 'Статус', value: domain.statusLabel },
                { label: 'Создан', value: fmt(domain.createdAt) },
                { label: 'Изменён', value: fmt(domain.updatedAt) },
              ].map((f) => (
                <div key={f.label}>
                  <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">{f.label}</div>
                  <div className={`text-sm font-medium ${f.mono ? 'font-mono' : ''}`}>{f.value}</div>
                </div>
              ))}
            </div>
            {domain.description && (
              <div className="mt-5 pt-5 border-t border-border">
                <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2">Описание</div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{domain.description}</p>
              </div>
            )}
          </section>
        </div>

        {/* Version history */}
        <div className="space-y-4">
          <section className="rounded-lg border border-border bg-card p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Icon name="History" size={18} className="text-accent" /> История версий
            </h2>
            {domain.versions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Версии отсутствуют</p>
            ) : (
              <div className="space-y-0">
                {domain.versions.map((v, i) => (
                  <div key={v.id} className="flex gap-3 py-3">
                    <div className="relative flex flex-col items-center">
                      <div className={`size-2.5 rounded-full mt-1 shrink-0 ${i === 0 ? 'bg-accent' : 'bg-border'}`} />
                      {i < domain.versions.length - 1 && <span className="w-px flex-1 bg-border mt-1" />}
                    </div>
                    <div className="min-w-0 pb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono font-medium">v{v.version}</span>
                        {i === 0 && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-accent/10 text-accent">текущая</span>}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{v.changeNote}</div>
                      <div className="text-[11px] font-mono text-muted-foreground/60 mt-0.5">{fmt(v.changedAt)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
