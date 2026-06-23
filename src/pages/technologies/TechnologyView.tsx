import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import MermaidPreview from '@/components/technologies/MermaidPreview';
import MarkdownViewer from '@/components/technologies/MarkdownViewer';
import { fetchTechnology, TechnologyDetail, formatBytes } from '@/api/technologies';

const STATUS_STYLE: Record<string, string> = {
  active:         'bg-success/10 text-success',
  in_development: 'bg-warning/10 text-warning',
  inactive:       'bg-muted text-muted-foreground',
  archived:       'bg-muted text-muted-foreground',
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
  return 'File';
}

export default function TechnologyView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tech, setTech] = useState<TechnologyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    fetchTechnology(id)
      .then(setTech)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center py-32 text-muted-foreground gap-3">
      <Icon name="Loader2" size={22} className="animate-spin" /> Загрузка…
    </div>
  );

  if (error || !tech) return (
    <div className="px-6 py-12 max-w-[1400px] mx-auto space-y-4">
      <div className="flex items-center gap-3 p-4 rounded-lg border border-destructive/30 bg-destructive/5 text-destructive text-sm">
        <Icon name="TriangleAlert" size={18} /> {error || 'Технология не найдена'}
      </div>
      <Link to="/technologies" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
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
            <Link to="/technologies" className="hover:text-primary-foreground transition-colors">Технологии</Link>
            <Icon name="ChevronRight" size={14} />
            <span className="text-primary-foreground font-medium truncate">{tech.name}</span>
          </nav>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{tech.name}</h1>
                <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${STATUS_STYLE[tech.status] ?? 'bg-muted text-muted-foreground'}`}>
                  {tech.statusLabel}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-2 text-sm text-primary-foreground/60 flex-wrap">
                <span className="font-mono">{tech.id}</span>
                <span>·</span>
                <span>v{tech.version}</span>
                {tech.owner && <><span>·</span><span>{tech.owner}</span></>}
              </div>
              {tech.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {tech.tags.map((t) => (
                    <span key={t.id} className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-primary-foreground/10 text-primary-foreground/80">
                      #{t.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => navigate(`/technologies/${tech.id}/edit`)}
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
                { label: 'ID',       value: tech.id,         mono: true  },
                { label: 'Версия',   value: tech.version,    mono: true  },
                { label: 'Название', value: tech.name                    },
                { label: 'Владелец', value: tech.owner || '—'            },
                { label: 'Статус',   value: tech.statusLabel              },
                { label: 'Создана',  value: fmt(tech.createdAt)           },
                { label: 'Изменена', value: fmt(tech.updatedAt)           },
              ].map((f) => (
                <div key={f.label}>
                  <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">{f.label}</div>
                  <div className={`text-sm font-medium ${f.mono ? 'font-mono' : ''}`}>{f.value}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Description (Markdown) */}
          {tech.description && (
            <section className="rounded-lg border border-border bg-card p-6">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <Icon name="FileText" size={18} className="text-accent" /> Описание
              </h2>
              <MarkdownViewer>{tech.description}</MarkdownViewer>
            </section>
          )}

          {/* Mermaid diagrams */}
          {tech.mermaidDiagrams.length > 0 && (
            <section className="rounded-lg border border-border bg-card p-6">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <Icon name="GitBranch" size={18} className="text-accent" /> Mermaid-схемы
                <span className="ml-1 text-[11px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {tech.mermaidDiagrams.length}
                </span>
              </h2>
              <div className="space-y-4">
                {tech.mermaidDiagrams.map((d) => (
                  <div key={d.id} className="rounded-lg border border-border bg-muted/20 overflow-hidden">
                    {d.title && (
                      <div className="px-4 py-2.5 border-b border-border bg-card/80 text-sm font-medium flex items-center gap-2">
                        <Icon name="GitBranch" size={14} className="text-accent" />
                        {d.title}
                      </div>
                    )}
                    <div className="p-4">
                      <MermaidPreview code={d.code} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Files */}
          {tech.files.length > 0 && (
            <section className="rounded-lg border border-border bg-card p-6">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <Icon name="Paperclip" size={18} className="text-accent" /> Файлы
                <span className="ml-1 text-[11px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {tech.files.length}
                </span>
              </h2>
              <div className="space-y-2">
                {tech.files.map((f) => (
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
        </div>

        {/* Right: version history */}
        <div>
          <section className="rounded-lg border border-border bg-card p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Icon name="History" size={18} className="text-accent" /> История версий
            </h2>
            {tech.versions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Версии отсутствуют</p>
            ) : (
              <div>
                {tech.versions.map((v, i) => (
                  <div key={v.id} className="flex gap-3 py-3">
                    <div className="relative flex flex-col items-center">
                      <div className={`size-2.5 rounded-full mt-1 shrink-0 ${i === 0 ? 'bg-accent' : 'bg-border'}`} />
                      {i < tech.versions.length - 1 && <span className="w-px flex-1 bg-border mt-1" />}
                    </div>
                    <div className="min-w-0 pb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-mono font-medium">v{v.version}</span>
                        {i === 0 && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-accent/10 text-accent">текущая</span>
                        )}
                      </div>
                      {v.changeNote && (
                        <div className="text-xs text-muted-foreground mt-0.5">{v.changeNote}</div>
                      )}
                      {v.tagsSnapshot.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {v.tagsSnapshot.slice(0, 3).map((t) => (
                            <span key={t} className="text-[10px] px-1 py-0.5 rounded bg-muted text-muted-foreground">#{t}</span>
                          ))}
                        </div>
                      )}
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