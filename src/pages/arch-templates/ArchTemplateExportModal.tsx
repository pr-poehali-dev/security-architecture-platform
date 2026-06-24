import { useEffect, useState, useCallback } from 'react';
import Icon from '@/components/ui/icon';
import MermaidPreview from '@/components/technologies/MermaidPreview';
import {
  fetchArchTemplateExport,
  ExportData,
  ExportRequirement,
  ExportRequirementGroup,
  MermaidDiagram,
  TechRef,
  DecisionRef,
  TagRef,
  ExternalLink,
  TemplateFile,
  TemplateRef,
} from '@/api/archTemplates';

// ── helpers ──────────────────────────────────────────────────────────────────

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' });
}

const STATUS_MAP: Record<string, string> = {
  active: 'Активен', on_review: 'На ревью', in_development: 'В разработке',
  inactive: 'Не активен', archived: 'В архиве',
};
const TYPE_MAP: Record<string, string> = {
  technical: 'Техническое', organizational: 'Организационное',
};
const REQ_TYPE_MAP: Record<string, string> = {
  technical: 'Технические', functional: 'Функциональные',
  non_functional: 'Нефункциональные', organizational: 'Организационные',
};

// ── MD-генератор ─────────────────────────────────────────────────────────────

function buildMarkdown(data: ExportData, excluded: Set<string>): string {
  const has = (key: string) => !excluded.has(key);
  const lines: string[] = [];
  // Защита от undefined-полей (данные могут прийти частично)
  const _tags = data.tags ?? [];
  const _technologies = data.technologies ?? [];
  const _decisions = data.decisions ?? [];
  const _relatedTemplates = data.relatedTemplates ?? [];
  const _requirementsByDomain = data.requirementsByDomain ?? [];
  const _mermaidDiagrams = data.mermaidDiagrams ?? [];
  const _externalLinks = data.externalLinks ?? [];
  const _files = data.files ?? [];
  const _versions = data.versions ?? [];

  lines.push(`# ${data.name}`);
  lines.push('');
  lines.push(`**ID:** \`${data.id}\`  `);
  lines.push(`**Тип:** ${TYPE_MAP[data.templateType] ?? data.templateType}  `);
  lines.push(`**Версия:** ${data.version}  `);
  if (has('status'))  lines.push(`**Статус:** ${STATUS_MAP[data.status] ?? data.status}  `);
  if (has('owner') && data.owner)   lines.push(`**Владелец:** ${data.owner}  `);
  if (has('createdAt')) lines.push(`**Создан:** ${fmtDate(data.createdAt)}  `);
  if (has('updatedAt')) lines.push(`**Обновлён:** ${fmtDate(data.updatedAt)}  `);
  lines.push('');

  if (data.description) {
    lines.push('## Описание');
    lines.push('');
    lines.push(data.description);
    lines.push('');
  }

  // Теги
  if (has('tags') && _tags.length > 0) {
    const activeTags = _tags.filter(t => !excluded.has(`tag-${t.id}`));
    if (activeTags.length > 0) {
      lines.push(`**Теги:** ${activeTags.map(t => `\`#${t.name}\``).join(' ')}`);
      lines.push('');
    }
  }

  // Технологии
  if (has('technologies') && _technologies.length > 0) {
    const active = _technologies.filter(t => !excluded.has(`tech-${t.id}`));
    if (active.length > 0) {
      lines.push('## Технологии');
      lines.push('');
      active.forEach(t => lines.push(`- **${t.name}** (${STATUS_MAP[t.status] ?? t.status})`));
      lines.push('');
    }
  }

  // Решения
  if (has('decisions') && _decisions.length > 0) {
    const active = _decisions.filter(d => !excluded.has(`dec-${d.id}`));
    if (active.length > 0) {
      lines.push('## Архитектурные решения');
      lines.push('');
      active.forEach(d => lines.push(`- **${d.name}** \`${d.id}\` — ${d.typeLabel}`));
      lines.push('');
    }
  }

  // Связанные шаблоны
  if (has('relatedTemplates') && _relatedTemplates.length > 0) {
    const active = _relatedTemplates.filter(r => !excluded.has(`rel-${r.id}`));
    if (active.length > 0) {
      lines.push('## Связанные шаблоны');
      lines.push('');
      active.forEach(r => lines.push(`- **${r.name}** \`${r.id}\` — ${r.typeLabel}`));
      lines.push('');
    }
  }

  // Требования по доменам
  if (has('requirements')) {
    const activeGroups = _requirementsByDomain
      .map(g => ({
        ...g,
        requirements: g.requirements.filter((r: ExportRequirement) => !excluded.has(`req-${r.id}`)),
      }))
      .filter(g => g.requirements.length > 0);

    if (activeGroups.length > 0) {
      lines.push('## Требования');
      lines.push('');
      activeGroups.forEach(g => {
        lines.push(`### ${g.domainName}`);
        lines.push('');
        g.requirements.forEach((r: ExportRequirement) => {
          lines.push(`#### ${r.shortDesc} \`${r.id}\``);
          if (r.reqTypeLabel) lines.push(`**Тип:** ${r.reqTypeLabel}  `);
          if (r.scorePoint)   lines.push(`**Балл:** ${r.scorePoint} / **Вес:** ${r.scoreWeight}  `);
          if (r.owner)        lines.push(`**Владелец:** ${r.owner}  `);
          if (r.description)  { lines.push(''); lines.push(r.description); }
          if (r.normativeDoc)       { lines.push(''); lines.push(`> **Нормативная документация:** ${r.normativeDoc}`); }
          if (r.controlMetrics)     { lines.push(`> **Метрики контроля:** ${r.controlMetrics}`); }
          if (r.fulfillmentMethod)  { lines.push(`> **Способ исполнения:** ${r.fulfillmentMethod}`); }
          lines.push('');
        });
      });
    }
  }

  // Mermaid-диаграммы
  if (has('mermaid') && _mermaidDiagrams.length > 0) {
    const active = _mermaidDiagrams.filter(m => !excluded.has(`mermaid-${m.id}`));
    if (active.length > 0) {
      lines.push('## Диаграммы');
      lines.push('');
      active.forEach(m => {
        if (m.title) lines.push(`### ${m.title}`);
        lines.push('');
        lines.push('```mermaid');
        lines.push(m.code);
        lines.push('```');
        lines.push('');
      });
    }
  }

  // Внешние ссылки
  if (has('externalLinks') && _externalLinks.length > 0) {
    const active = _externalLinks.filter(l => !excluded.has(`link-${l.id}`));
    if (active.length > 0) {
      lines.push('## Ссылки');
      lines.push('');
      active.forEach(l => lines.push(`- [${l.label || l.url}](${l.url})`));
      lines.push('');
    }
  }

  // Файлы
  if (has('files') && _files.length > 0) {
    const active = _files.filter(f => !excluded.has(`file-${f.id}`));
    if (active.length > 0) {
      lines.push('## Файлы');
      lines.push('');
      active.forEach(f => lines.push(`- [${f.filename}](${f.url}) — ${fmtSize(f.sizeBytes)}`));
      lines.push('');
    }
  }

  // История версий
  if (has('versions') && _versions.length > 0) {
    lines.push('## История версий');
    lines.push('');
    lines.push('| Версия | Дата | Примечание |');
    lines.push('|---|---|---|');
    _versions.forEach(v => {
      lines.push(`| ${v.version} | ${fmtDate(v.changedAt)} | ${v.changeNote || '—'} |`);
    });
    lines.push('');
  }

  lines.push(`---`);
  lines.push(`*Экспортировано: ${new Date().toLocaleString('ru-RU')}*`);

  return lines.join('\n');
}

// ── Chip (удаляемый элемент) ──────────────────────────────────────────────────

function Chip({ label, onRemove, removed }: { label: string; onRemove: () => void; removed: boolean }) {
  if (removed) return null;
  return (
    <span className="group inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-muted/60 text-foreground border border-border hover:border-destructive/50 transition-colors">
      {label}
      <button type="button" onClick={onRemove} className="opacity-0 group-hover:opacity-100 text-destructive transition-opacity">
        <Icon name="X" size={10} />
      </button>
    </span>
  );
}

// ── Секция с заголовком ───────────────────────────────────────────────────────

function Section({
  icon, title, sectionKey, excluded, onToggleSection, onRemove, children,
}: {
  icon: string; title: string; sectionKey: string;
  excluded: Set<string>; onToggleSection: (k: string) => void;
  onRemove: (k: string) => void; children: React.ReactNode;
}) {
  const removed = excluded.has(sectionKey);
  return (
    <div className={`rounded-lg border transition-colors ${removed ? 'border-border/40 opacity-40' : 'border-border bg-card/50'}`}>
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/60">
        <Icon name={icon} size={13} className="text-muted-foreground" />
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex-1">{title}</span>
        <button
          type="button"
          onClick={() => onToggleSection(sectionKey)}
          className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${removed
            ? 'border-accent/40 text-accent hover:bg-accent/10'
            : 'border-destructive/30 text-destructive hover:bg-destructive/10'}`}
        >
          {removed ? 'Вернуть' : 'Убрать из экспорта'}
        </button>
      </div>
      {!removed && <div className="px-4 py-3">{children}</div>}
    </div>
  );
}

// ── Главный компонент ─────────────────────────────────────────────────────────

interface Props {
  templateId: string;
  templateName: string;
  onClose: () => void;
}

export default function ArchTemplateExportModal({ templateId, templateName, onClose }: Props) {
  const [data, setData] = useState<ExportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchArchTemplateExport(templateId)
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [templateId]);

  const toggle = useCallback((key: string) => {
    setExcluded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  const md = data ? buildMarkdown(data, excluded) : '';

  const downloadMd = () => {
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${templateId}-export.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyMd = () => {
    navigator.clipboard.writeText(md).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-xl border border-border bg-background shadow-2xl">

        {/* Шапка */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border shrink-0">
          <div className="size-8 rounded-md bg-accent/10 flex items-center justify-center">
            <Icon name="FileDown" size={16} className="text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate">{templateName}</div>
            <div className="text-[11px] text-muted-foreground">Экспорт шаблона</div>
          </div>
          {/* Переключатель режима */}
          <div className="flex items-center rounded-md border border-border overflow-hidden text-xs">
            <button
              type="button"
              onClick={() => setPreview(false)}
              className={`px-3 py-1.5 transition-colors ${!preview ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted/60'}`}
            >
              Редактор
            </button>
            <button
              type="button"
              onClick={() => setPreview(true)}
              className={`px-3 py-1.5 transition-colors ${preview ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted/60'}`}
            >
              Предпросмотр MD
            </button>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors ml-1">
            <Icon name="X" size={18} />
          </button>
        </div>

        {/* Тело */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-24 gap-3 text-muted-foreground">
              <Icon name="Loader2" size={20} className="animate-spin" /> Загрузка данных…
            </div>
          )}
          {error && (
            <div className="m-6 p-4 rounded-lg border border-destructive/30 bg-destructive/5 text-destructive text-sm">
              {error}
            </div>
          )}

          {data && !preview && (
            <div className="p-5 flex flex-col gap-4">

              {/* Базовая информация (нередактируемая) */}
              <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 flex flex-wrap gap-3 text-xs">
                <span className="font-mono text-muted-foreground">{data.id}</span>
                <span className="font-semibold">{data.name}</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">{data.typeLabel}</span>
                <span className="text-muted-foreground">{data.description ? data.description.slice(0, 80) + (data.description.length > 80 ? '…' : '') : '—'}</span>
              </div>

              {/* Мета (удаляемые поля) */}
              <Section icon="Info" title="Мета-информация" sectionKey="status" excluded={excluded} onToggleSection={toggle} onRemove={toggle}>
                <div className="flex flex-wrap gap-2 text-xs">
                  {[
                    { key: 'status', label: `Статус: ${data.statusLabel}` },
                    { key: 'owner', label: `Владелец: ${data.owner || '—'}` },
                    { key: 'createdAt', label: `Создан: ${fmtDate(data.createdAt)}` },
                    { key: 'updatedAt', label: `Обновлён: ${fmtDate(data.updatedAt)}` },
                  ].map(({ key, label }) => (
                    <Chip key={key} label={label} removed={excluded.has(key)} onRemove={() => toggle(key)} />
                  ))}
                </div>
              </Section>

              {/* Теги */}
              {(data.tags ?? []).length > 0 && (
                <Section icon="Tag" title="Теги" sectionKey="tags" excluded={excluded} onToggleSection={toggle} onRemove={toggle}>
                  <div className="flex flex-wrap gap-1.5">
                    {(data.tags ?? []).map((t: TagRef) => (
                      <Chip key={t.id} label={`#${t.name}`} removed={excluded.has(`tag-${t.id}`)} onRemove={() => toggle(`tag-${t.id}`)} />
                    ))}
                  </div>
                </Section>
              )}

              {/* Технологии */}
              {(data.technologies ?? []).length > 0 && (
                <Section icon="Cpu" title="Технологии" sectionKey="technologies" excluded={excluded} onToggleSection={toggle} onRemove={toggle}>
                  <div className="flex flex-wrap gap-1.5">
                    {(data.technologies ?? []).map((t: TechRef) => (
                      <Chip key={t.id} label={t.name} removed={excluded.has(`tech-${t.id}`)} onRemove={() => toggle(`tech-${t.id}`)} />
                    ))}
                  </div>
                </Section>
              )}

              {/* Решения */}
              {(data.decisions ?? []).length > 0 && (
                <Section icon="Lightbulb" title="Архитектурные решения" sectionKey="decisions" excluded={excluded} onToggleSection={toggle} onRemove={toggle}>
                  <div className="flex flex-col gap-1.5">
                    {(data.decisions ?? []).map((d: DecisionRef) => (
                      <Chip key={d.id} label={`${d.name} (${d.typeLabel})`} removed={excluded.has(`dec-${d.id}`)} onRemove={() => toggle(`dec-${d.id}`)} />
                    ))}
                  </div>
                </Section>
              )}

              {/* Связанные шаблоны */}
              {(data.relatedTemplates ?? []).length > 0 && (
                <Section icon="Link" title="Связанные шаблоны" sectionKey="relatedTemplates" excluded={excluded} onToggleSection={toggle} onRemove={toggle}>
                  <div className="flex flex-wrap gap-1.5">
                    {(data.relatedTemplates ?? []).map(r => (
                      <Chip key={r.id} label={r.name} removed={excluded.has(`rel-${r.id}`)} onRemove={() => toggle(`rel-${r.id}`)} />
                    ))}
                  </div>
                </Section>
              )}

              {/* Требования */}
              {(data.requirementsByDomain ?? []).length > 0 && (
                <Section icon="ListChecks" title="Требования" sectionKey="requirements" excluded={excluded} onToggleSection={toggle} onRemove={toggle}>
                  <div className="flex flex-col gap-3">
                    {(data.requirementsByDomain ?? []).map((g: ExportRequirementGroup) => (
                      <div key={g.domainId ?? '__none__'}>
                        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 flex items-center gap-1">
                          <Icon name="Layers" size={9} /> {g.domainName}
                        </div>
                        <div className="flex flex-col gap-1">
                          {g.requirements.map((r: ExportRequirement) => (
                            <Chip
                              key={r.id}
                              label={`${r.id} — ${r.shortDesc}`}
                              removed={excluded.has(`req-${r.id}`)}
                              onRemove={() => toggle(`req-${r.id}`)}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Mermaid */}
              {(data.mermaidDiagrams ?? []).length > 0 && (
                <Section icon="GitBranch" title="Диаграммы" sectionKey="mermaid" excluded={excluded} onToggleSection={toggle} onRemove={toggle}>
                  <div className="flex flex-col gap-3">
                    {(data.mermaidDiagrams ?? []).map((m: MermaidDiagram) => (
                      <div key={m.id} className={`rounded-md border overflow-hidden transition-opacity ${excluded.has(`mermaid-${m.id}`) ? 'opacity-30' : 'border-border'}`}>
                        <div className="flex items-center justify-between px-3 py-1.5 bg-muted/30 border-b border-border">
                          <span className="text-xs font-medium">{m.title || 'Без названия'}</span>
                          <button type="button" onClick={() => toggle(`mermaid-${m.id}`)}
                            className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${excluded.has(`mermaid-${m.id}`) ? 'border-accent/40 text-accent' : 'border-destructive/30 text-destructive'}`}>
                            {excluded.has(`mermaid-${m.id}`) ? 'Вернуть' : 'Убрать'}
                          </button>
                        </div>
                        {!excluded.has(`mermaid-${m.id}`) && (
                          <div className="p-2 max-h-48 overflow-hidden">
                            <MermaidPreview code={m.code} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Внешние ссылки */}
              {(data.externalLinks ?? []).length > 0 && (
                <Section icon="ExternalLink" title="Внешние ссылки" sectionKey="externalLinks" excluded={excluded} onToggleSection={toggle} onRemove={toggle}>
                  <div className="flex flex-col gap-1.5">
                    {(data.externalLinks ?? []).map((l: ExternalLink) => (
                      <Chip key={l.id} label={l.label || l.url} removed={excluded.has(`link-${l.id}`)} onRemove={() => toggle(`link-${l.id}`)} />
                    ))}
                  </div>
                </Section>
              )}

              {/* Файлы */}
              {(data.files ?? []).length > 0 && (
                <Section icon="Paperclip" title="Файлы" sectionKey="files" excluded={excluded} onToggleSection={toggle} onRemove={toggle}>
                  <div className="flex flex-col gap-1.5">
                    {(data.files ?? []).map((f: TemplateFile) => (
                      <Chip key={f.id} label={`${f.filename} (${fmtSize(f.sizeBytes)})`} removed={excluded.has(`file-${f.id}`)} onRemove={() => toggle(`file-${f.id}`)} />
                    ))}
                  </div>
                </Section>
              )}

              {/* История */}
              {(data.versions ?? []).length > 0 && (
                <Section icon="History" title="История версий" sectionKey="versions" excluded={excluded} onToggleSection={toggle} onRemove={toggle}>
                  <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                    {(data.versions ?? []).slice(0, 5).map(v => (
                      <div key={v.version} className="flex gap-2">
                        <span className="font-mono font-semibold text-foreground w-10">{v.version}</span>
                        <span>{fmtDate(v.changedAt)}</span>
                        {v.changeNote && <span className="text-muted-foreground/70">— {v.changeNote}</span>}
                      </div>
                    ))}
                    {(data.versions ?? []).length > 5 && (
                      <span className="text-muted-foreground/50">+ ещё {(data.versions ?? []).length - 5} версий</span>
                    )}
                  </div>
                </Section>
              )}
            </div>
          )}

          {/* Предпросмотр */}
          {data && preview && (
            <pre className="p-5 text-xs font-mono leading-relaxed whitespace-pre-wrap text-foreground/80 select-all">
              {md}
            </pre>
          )}
        </div>

        {/* Подвал */}
        {data && (
          <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-t border-border shrink-0 bg-muted/20">
            <span className="text-[11px] text-muted-foreground">
              {excluded.size > 0 ? `Скрыто элементов: ${excluded.size}` : 'Все элементы включены'}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setExcluded(new Set())}
                disabled={excluded.size === 0}
                className="text-xs px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Сбросить
              </button>
              <button
                type="button"
                onClick={copyMd}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              >
                <Icon name={copied ? 'Check' : 'Copy'} size={13} />
                {copied ? 'Скопировано' : 'Копировать MD'}
              </button>
              <button
                type="button"
                onClick={downloadMd}
                className="flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-md bg-accent text-accent-foreground hover:opacity-90 transition-opacity font-medium"
              >
                <Icon name="Download" size={13} />
                Скачать .md
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}