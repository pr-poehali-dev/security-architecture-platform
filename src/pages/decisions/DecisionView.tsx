import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import MermaidPreview from '@/components/technologies/MermaidPreview';
import MarkdownViewer from '@/components/technologies/MarkdownViewer';
import { fetchDecision, DecisionDetail, formatBytes } from '@/api/decisions';

const STATUS_STYLE: Record<string, string> = {
  active:         'bg-success/10 text-success border-success/20',
  in_development: 'bg-warning/10 text-warning border-warning/20',
  inactive:       'bg-muted text-muted-foreground border-border',
  archived:       'bg-muted text-muted-foreground border-border',
};

const TYPE_STYLE: Record<string, string> = {
  technical:      'bg-blue-500/10 text-blue-400',
  organizational: 'bg-purple-500/10 text-purple-400',
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fileIcon(ct: string) {
  if (ct.startsWith('image/')) return 'Image';
  if (ct === 'application/pdf') return 'FileText';
  if (ct.includes('zip') || ct.includes('archive')) return 'Archive';
  return 'File';
}

export default function DecisionView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [dec, setDec] = useState<DecisionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showVersions, setShowVersions] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchDecision(id)
      .then(setDec)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center py-32 text-muted-foreground gap-3">
      <Icon name="Loader2" size={22} className="animate-spin" /> Загрузка…
    </div>
  );

  if (error || !dec) return (
    <div className="px-6 py-12 max-w-[1400px] mx-auto space-y-4">
      <div className="flex items-center gap-3 p-4 rounded-lg border border-destructive/30 bg-destructive/5 text-destructive text-sm">
        <Icon name="TriangleAlert" size={18} /> {error || 'Решение не найдено'}
      </div>
      <Link to="/solutions" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
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
          <nav className="flex items-center gap-2 text-sm text-primary-foreground/60 mb-4 flex-wrap">
            <Link to="/solutions" className="hover:text-primary-foreground transition-colors">Решения</Link>
            <Icon name="ChevronRight" size={14} />
            <span className="text-primary-foreground font-medium truncate">{dec.name}</span>
          </nav>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{dec.name}</h1>
                <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full border ${STATUS_STYLE[dec.status] ?? 'bg-muted'}`}>
                  {dec.statusLabel}
                </span>
                <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${TYPE_STYLE[dec.decisionType] ?? 'bg-muted'}`}>
                  {dec.typeLabel}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-2 text-sm text-primary-foreground/60 flex-wrap">
                <span className="font-mono">{dec.id}</span>
                <span>·</span>
                <span>v{dec.version}</span>
                {dec.owner && <><span>·</span><span>{dec.owner}</span></>}
              </div>
              {dec.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {dec.tags.map((t) => (
                    <span key={t.id} className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-primary-foreground/10 text-primary-foreground/80">
                      #{t.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => navigate(`/solutions/${dec.id}/edit`)}
              className="h-10 px-5 rounded-md bg-accent text-accent-foreground text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity shrink-0"
            >
              <Icon name="Pencil" size={16} /> Редактировать
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 py-8 max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: main content */}
        <div className="lg:col-span-2 space-y-6">

          {/* Info */}
          <section className="rounded-lg border border-border bg-card p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Icon name="Info" size={18} className="text-accent" /> Основная информация
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
              {[
                { label: 'ID',       value: dec.id,         mono: true },
                { label: 'Версия',   value: dec.version,    mono: true },
                { label: 'Тип',      value: dec.typeLabel              },
                { label: 'Владелец', value: dec.owner || '—'           },
                { label: 'Статус',   value: dec.statusLabel             },
                { label: 'Создано',  value: fmt(dec.createdAt)          },
                { label: 'Изменено', value: fmt(dec.updatedAt)          },
              ].map((f) => (
                <div key={f.label}>
                  <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">{f.label}</div>
                  <div className={`text-sm font-medium ${f.mono ? 'font-mono' : ''}`}>{f.value}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Description */}
          {dec.description && (
            <section className="rounded-lg border border-border bg-card p-6">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <Icon name="FileText" size={18} className="text-accent" /> Описание
              </h2>
              <MarkdownViewer>{dec.description}</MarkdownViewer>
            </section>
          )}

          {/* Mermaid diagrams */}
          {dec.mermaidDiagrams.length > 0 && (
            <section className="rounded-lg border border-border bg-card p-6">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <Icon name="GitBranch" size={18} className="text-accent" /> Mermaid-схемы
                <span className="ml-1 text-[11px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {dec.mermaidDiagrams.length}
                </span>
              </h2>
              <div className="space-y-4">
                {dec.mermaidDiagrams.map((d) => (
                  <div key={d.id} className="rounded-lg border border-border bg-muted/20 overflow-hidden">
                    {d.title && (
                      <div className="px-4 py-2.5 border-b border-border bg-card/80 text-sm font-medium flex items-center gap-2">
                        <Icon name="GitBranch" size={14} className="text-accent" />
                        {d.title}
                      </div>
                    )}
                    <div className="p-4">
                      <MermaidPreview code={d.code} title={d.title} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Files */}
          {dec.files.length > 0 && (
            <section className="rounded-lg border border-border bg-card p-6">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <Icon name="Paperclip" size={18} className="text-accent" /> Файлы
                <span className="ml-1 text-[11px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {dec.files.length}
                </span>
              </h2>
              <div className="space-y-2">
                {dec.files.map((f) => (
                  <div key={f.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
                    <div className="size-9 rounded-md bg-card border border-border flex items-center justify-center shrink-0 text-muted-foreground">
                      <Icon name={fileIcon(f.contentType)} size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{f.filename}</div>
                      <div className="text-xs text-muted-foreground">{formatBytes(f.sizeBytes)}</div>
                    </div>
                    <a
                      href={f.url}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 h-8 px-3 rounded-md border border-border text-xs flex items-center gap-1.5 hover:border-accent hover:text-accent transition-colors"
                    >
                      <Icon name="Download" size={12} /> Скачать
                    </a>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Requirements by domain */}
          {dec.requirementsByDomain.length > 0 && (
            <section className="rounded-lg border border-border bg-card p-6">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <Icon name="ListChecks" size={18} className="text-accent" /> Требования по доменам
              </h2>
              <div className="space-y-4">
                {dec.requirementsByDomain.map((group) => (
                  <div key={group.domainId ?? '__none__'}>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon name="Layers" size={14} className="text-muted-foreground" />
                      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        {group.domainName}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {group.requirements.length}
                      </span>
                    </div>
                    <div className="space-y-1 pl-4 border-l-2 border-border">
                      {group.requirements.map((r) => (
                        <Link
                          key={r.id}
                          to={`/requirements/${r.id}`}
                          className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/50 transition-colors group"
                        >
                          <span className="font-mono text-[11px] text-accent">{r.id}</span>
                          <span className="text-sm flex-1 truncate">{r.shortDesc}</span>
                          <span className="text-[10px] text-muted-foreground hidden group-hover:block">
                            via {r.techName}
                          </span>
                          <Icon name="ArrowRight" size={12} className="text-muted-foreground shrink-0" />
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right: sidebar */}
        <div className="space-y-4">

          {/* Related decisions */}
          {dec.relatedDecisions.length > 0 && (
            <section className="rounded-lg border border-border bg-card p-5">
              <h3 className="text-[11px] uppercase tracking-widest text-muted-foreground mb-3">
                Связанные решения ({dec.relatedDecisions.length})
              </h3>
              <div className="space-y-1.5">
                {dec.relatedDecisions.map((r) => (
                  <Link
                    key={r.id}
                    to={`/solutions/${r.id}`}
                    className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-muted/30 text-sm hover:border-accent hover:text-accent transition-colors"
                  >
                    <Icon name="Workflow" size={13} />
                    <span className="flex-1 truncate">{r.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${TYPE_STYLE[r.decisionType] ?? ''}`}>
                      {r.typeLabel}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Technologies */}
          {dec.technologies.length > 0 && (
            <section className="rounded-lg border border-border bg-card p-5">
              <h3 className="text-[11px] uppercase tracking-widest text-muted-foreground mb-3">
                Технологии ({dec.technologies.length})
              </h3>
              <div className="space-y-1.5">
                {dec.technologies.map((t) => (
                  <Link
                    key={t.id}
                    to={`/technologies/${t.id}`}
                    className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-muted/30 text-sm hover:border-accent hover:text-accent transition-colors"
                  >
                    <Icon name="Cpu" size={13} />
                    <span className="flex-1 truncate">{t.name}</span>
                    <span className="text-[10px] text-muted-foreground">{t.statusLabel}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Versions */}
          {dec.versions.length > 0 && (
            <section className="rounded-lg border border-border bg-card p-5">
              <button
                onClick={() => setShowVersions((v) => !v)}
                className="w-full flex items-center justify-between text-[11px] uppercase tracking-widest text-muted-foreground"
              >
                <span>История версий ({dec.versions.length})</span>
                <Icon name={showVersions ? 'ChevronUp' : 'ChevronDown'} size={14} />
              </button>
              {showVersions && (
                <div className="mt-3 space-y-2">
                  {dec.versions.map((v) => (
                    <div key={v.id} className="rounded-md border border-border bg-muted/30 px-3 py-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm font-medium text-accent">v{v.version}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(v.changedAt).toLocaleDateString('ru-RU')}
                        </span>
                      </div>
                      {v.changeNote && (
                        <div className="text-xs text-muted-foreground mt-0.5">{v.changeNote}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </>
  );
}
