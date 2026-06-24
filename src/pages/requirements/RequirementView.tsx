import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import MarkdownViewer from '@/components/technologies/MarkdownViewer';
import { fetchRequirement, RequirementDetail } from '@/api/requirements';

const STATUS_STYLE: Record<string, string> = {
  active:         'bg-success/10 text-success border-success/20',
  in_development: 'bg-warning/10 text-warning border-warning/20',
  inactive:       'bg-muted text-muted-foreground border-border',
  archived:       'bg-muted text-muted-foreground border-border',
};

const TYPE_STYLE: Record<string, string> = {
  technical:      'bg-blue-500/10 text-blue-400',
  functional:     'bg-accent/10 text-accent',
  non_functional: 'bg-purple-500/10 text-purple-400',
  organizational: 'bg-orange-500/10 text-orange-400',
};

function Field({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  if (!value) return null;
  return (
    <div>
      <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">{label}</div>
      <div className={`text-sm ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  );
}

export default function RequirementView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [req, setReq] = useState<RequirementDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showVersions, setShowVersions] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchRequirement(id)
      .then(setReq)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center py-32 text-muted-foreground gap-3">
      <Icon name="Loader2" size={22} className="animate-spin" />
      Загрузка…
    </div>
  );

  if (error || !req) return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-5 py-4 text-destructive">
        {error || 'Требование не найдено'}
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-[1100px] mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/requirements" className="hover:text-foreground transition-colors">Требования</Link>
        <Icon name="ChevronRight" size={14} />
        <span className="text-foreground font-mono">{req.id}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-sm text-accent bg-accent/10 px-2 py-0.5 rounded">{req.id}</span>
            <span className={`text-[11px] px-2.5 py-1 rounded-full border font-medium ${STATUS_STYLE[req.status]}`}>
              {req.statusLabel}
            </span>
            <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${TYPE_STYLE[req.reqType]}`}>
              {req.reqTypeLabel}
            </span>
            {req.isProcurement && (
              <span className="text-[11px] px-2.5 py-1 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 font-medium flex items-center gap-1">
                <Icon name="ShoppingCart" size={11} /> Закупки
              </span>
            )}
            <span className="font-mono text-[11px] text-muted-foreground">v{req.version}</span>
          </div>
          <h1 className="text-xl font-semibold">{req.shortDesc || '—'}</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/requirements/${id}/edit`)}
            className="h-9 px-4 rounded-md border border-border text-sm flex items-center gap-2 hover:border-accent hover:text-accent transition-colors"
          >
            <Icon name="Pencil" size={15} /> Редактировать
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — main info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {req.description && (
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-3">Описание</div>
              <MarkdownViewer>{req.description}</MarkdownViewer>
            </div>
          )}

          {/* Extra fields */}
          <div className="rounded-lg border border-border bg-card p-5 space-y-4">
            <Field label="Нормативная документация" value={req.normativeDoc} />
            <Field label="Метрики контроля" value={req.controlMetrics} />
            <Field label="Способ исполнения требования" value={req.fulfillmentMethod} />
            {!req.normativeDoc && !req.controlMetrics && !req.fulfillmentMethod && (
              <p className="text-sm text-muted-foreground">Дополнительные поля не заполнены</p>
            )}
          </div>

          {/* Technologies */}
          {req.technologies.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-3">
                Технологии ({req.technologies.length})
              </div>
              <div className="flex flex-wrap gap-2">
                {req.technologies.map((t) => (
                  <Link
                    key={t.id}
                    to={`/technologies/${t.id}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-muted/30 text-sm hover:border-accent hover:text-accent transition-colors"
                  >
                    <Icon name="Cpu" size={13} />
                    {t.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right — meta */}
        <div className="space-y-4">
          {/* Tech domain */}
          {req.techDomain && (
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-3">Технический домен</div>
              <Link
                to={`/tech-domains/${req.techDomain.id}`}
                className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-muted/30 text-sm hover:border-accent hover:text-accent transition-colors"
              >
                <Icon name="Layers" size={14} />
                <span className="flex-1">{req.techDomain.name}</span>
                <span className="text-[10px] text-muted-foreground">{req.techDomain.statusLabel}</span>
              </Link>
            </div>
          )}

          {/* Score */}
          <div className="rounded-lg border border-border bg-card p-5 space-y-4">
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Скор</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-accent">{req.scorePoint}</div>
                <div className="text-[11px] text-muted-foreground mt-1">Балл (1–4)</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">{req.scoreWeight}</div>
                <div className="text-[11px] text-muted-foreground mt-1">Вес (1–10)</div>
              </div>
            </div>
          </div>

          {/* Meta */}
          <div className="rounded-lg border border-border bg-card p-5 space-y-3">
            <Field label="Владелец" value={req.owner} />
            <div>
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">Создано</div>
              <div className="text-sm text-muted-foreground">{new Date(req.createdAt).toLocaleDateString('ru-RU')}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">Обновлено</div>
              <div className="text-sm text-muted-foreground">{new Date(req.updatedAt).toLocaleDateString('ru-RU')}</div>
            </div>
          </div>

          {/* Tags */}
          {req.tags.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-3">Теги</div>
              <div className="flex flex-wrap gap-1.5">
                {req.tags.map((t) => (
                  <span key={t.id} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {t.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Versions */}
          {req.versions.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-5">
              <button
                onClick={() => setShowVersions((v) => !v)}
                className="w-full flex items-center justify-between text-[11px] uppercase tracking-widest text-muted-foreground mb-0"
              >
                История версий ({req.versions.length})
                <Icon name={showVersions ? 'ChevronUp' : 'ChevronDown'} size={14} />
              </button>
              {showVersions && (
                <div className="mt-3 space-y-2">
                  {req.versions.map((v) => (
                    <div key={v.id} className="flex items-start gap-2 py-2 border-t border-border first:border-t-0 first:pt-0">
                      <span className="font-mono text-xs text-accent mt-0.5">v{v.version}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-muted-foreground">{new Date(v.changedAt).toLocaleDateString('ru-RU')}</div>
                        {v.changeNote && <div className="text-xs mt-0.5">{v.changeNote}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}