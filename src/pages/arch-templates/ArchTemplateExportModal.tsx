import { useEffect, useState, useCallback, useRef } from 'react';
import mermaid from 'mermaid';
import Icon from '@/components/ui/icon';
import MermaidPreview from '@/components/technologies/MermaidPreview';
import MarkdownViewer from '@/components/technologies/MarkdownViewer';
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
  ENVS,
  EnvStatus,
  EnvStatusDual,
} from '@/api/archTemplates';
import { fetchRequirement, RequirementDetail } from '@/api/requirements';
import { fetchReqContent, ReqContent } from '@/api/hardening';

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

const REQ_TYPE_STYLE: Record<string, string> = {
  technical:      'bg-blue-500/10 text-blue-400',
  functional:     'bg-accent/10 text-accent',
  non_functional: 'bg-purple-500/10 text-purple-400',
  organizational: 'bg-orange-500/10 text-orange-400',
};

const ENV_STATUS_STYLE: Record<EnvStatus, { cell: string; icon: string; label: string }> = {
  required:     { cell: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300', icon: 'Check',         label: 'Обязательно'  },
  conditional:  { cell: 'bg-amber-500/15  text-amber-700  dark:text-amber-300',    icon: 'TriangleAlert', label: 'Условие'      },
  not_required: { cell: 'bg-muted/50 text-muted-foreground',                        icon: 'Minus',         label: 'Не требуется' },
};

const IOD_ROWS: { key: 'noIod' | 'iod'; label: string }[] = [
  { key: 'noIod', label: 'Без ИОД' },
  { key: 'iod',   label: 'С ИОД'   },
];

// Кеши (между рендерами модала)
const detailCache = new Map<string, RequirementDetail>();
const hardeningCache = new Map<string, ReqContent>();

// ── Полная карточка требования ────────────────────────────────────────────────

function ExportReqCard({
  r, removed, onToggle,
}: {
  r: ExportRequirement; removed: boolean; onToggle: () => void;
}) {
  const [detail, setDetail] = useState<RequirementDetail | null>(detailCache.get(r.id) ?? null);
  const [loadingD, setLoadingD] = useState(!detailCache.has(r.id));

  const hKey = r.hardeningId ? `${r.hardeningId}::${r.id}` : null;
  const [hContent, setHContent] = useState<ReqContent | null>(hKey ? (hardeningCache.get(hKey) ?? null) : null);
  const [loadingH, setLoadingH] = useState(!!hKey && !hardeningCache.has(hKey));

  useEffect(() => {
    if (detailCache.has(r.id)) return;
    fetchRequirement(r.id)
      .then(d => { detailCache.set(r.id, d); setDetail(d); })
      .finally(() => setLoadingD(false));
  }, [r.id]);

  useEffect(() => {
    if (!hKey || !r.hardeningId) return;
    if (hardeningCache.has(hKey)) return;
    fetchReqContent(r.hardeningId, r.id)
      .then(c => { hardeningCache.set(hKey!, c); setHContent(c); })
      .finally(() => setLoadingH(false));
  }, [hKey, r.hardeningId, r.id]);

  const envStatus: EnvStatusDual | undefined = hContent?.envStatus ?? r.envStatus;

  return (
    <div className={`rounded-md border transition-colors ${removed ? 'border-border/30 opacity-40' : 'border-border bg-muted/10'}`}>
      {/* Заголовок */}
      <div className="flex items-start justify-between gap-2 px-3 py-2 border-b border-border/50">
        <div className="flex-1 min-w-0">
          <span className="text-xs font-medium">{r.shortDesc}</span>
          <span className="ml-2 text-[10px] font-mono text-muted-foreground">{r.id}</span>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className={`shrink-0 text-[10px] px-2 py-0.5 rounded border transition-colors ${removed
            ? 'border-accent/40 text-accent hover:bg-accent/10'
            : 'border-destructive/30 text-destructive hover:bg-destructive/10'}`}
        >
          {removed ? 'Вернуть' : 'Убрать'}
        </button>
      </div>

      {!removed && (
        <div className="px-3 py-2.5 flex flex-col gap-2.5">
          {loadingD && (
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Icon name="Loader2" size={12} className="animate-spin" /> Загрузка…
            </div>
          )}

          {/* Таблица envStatus */}
          {envStatus && (
            <div className="overflow-x-auto rounded border border-border/50">
              <table className="w-full text-[10px] border-collapse">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="px-2 py-1 text-left text-muted-foreground font-medium w-16" />
                    {ENVS.map(e => (
                      <th key={e.key} className="px-2 py-1 text-center text-muted-foreground font-medium">{e.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {IOD_ROWS.map(row => (
                    <tr key={row.key} className="border-b border-border/30 last:border-0">
                      <td className="px-2 py-1.5 text-muted-foreground whitespace-nowrap">{row.label}</td>
                      {ENVS.map(e => {
                        const st: EnvStatus = envStatus[row.key][e.key];
                        const s = ENV_STATUS_STYLE[st];
                        return (
                          <td key={e.key} className={`px-2 py-1.5 text-center ${s.cell}`}>
                            <div className="flex flex-col items-center gap-0.5">
                              <Icon name={s.icon} size={10} />
                              <span className="text-[9px] leading-tight">{s.label}</span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {detail && (
            <>
              {/* Бейджи: тип, закупки, домен, теги, технологии */}
              <div className="flex flex-wrap gap-1.5">
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${REQ_TYPE_STYLE[detail.reqType] ?? 'bg-muted text-muted-foreground'}`}>
                  {detail.reqTypeLabel}
                </span>
                {detail.isProcurement && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 font-medium flex items-center gap-1">
                    <Icon name="ShoppingCart" size={9} /> Закупки
                  </span>
                )}
                {r.source === 'hardening' && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400 flex items-center gap-1">
                    <Icon name="ShieldCheck" size={9} /> Харденинг
                  </span>
                )}
                {detail.techDomain && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground flex items-center gap-1">
                    <Icon name="Layers" size={9} /> {detail.techDomain.name}
                  </span>
                )}
                {detail.tags.map(t => (
                  <span key={t.id} className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted/60 text-muted-foreground">#{t.name}</span>
                ))}
                {detail.technologies.map(t => (
                  <span key={t.id} className="text-[10px] px-1.5 py-0.5 rounded-full border border-border bg-muted/30 text-muted-foreground flex items-center gap-1">
                    <Icon name="Cpu" size={9} /> {t.name}
                  </span>
                ))}
              </div>

              {/* Балл / Вес / Владелец */}
              {(detail.scorePoint != null || detail.scoreWeight != null || detail.owner) && (
                <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                  {detail.scorePoint != null && (
                    <span className="flex items-center gap-1">
                      <Icon name="Star" size={10} className="text-accent" />
                      Балл: <span className="font-semibold text-foreground ml-0.5">{detail.scorePoint}</span>
                    </span>
                  )}
                  {detail.scoreWeight != null && (
                    <span className="flex items-center gap-1">
                      <Icon name="Weight" size={10} className="text-accent" />
                      Вес: <span className="font-semibold text-foreground ml-0.5">{detail.scoreWeight}</span>
                    </span>
                  )}
                  {detail.owner && (
                    <span className="flex items-center gap-1"><Icon name="User" size={10} /> {detail.owner}</span>
                  )}
                </div>
              )}

              {/* Описание */}
              {detail.description && (
                <p className="text-[11px] text-muted-foreground leading-relaxed">{detail.description}</p>
              )}

              {/* Нормативка / метрики / способ + харденинг */}
              {(detail.normativeDoc || detail.controlMetrics || detail.fulfillmentMethod || r.hardeningId) && (
                <div className="flex gap-4 items-start pt-1 border-t border-border/40">
                  {(detail.normativeDoc || detail.controlMetrics || detail.fulfillmentMethod) && (
                    <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                      {detail.normativeDoc && (
                        <div>
                          <div className="text-[9px] uppercase tracking-widest text-muted-foreground mb-0.5">Нормативная документация</div>
                          <div className="text-[11px]">{detail.normativeDoc}</div>
                        </div>
                      )}
                      {detail.controlMetrics && (
                        <div>
                          <div className="text-[9px] uppercase tracking-widest text-muted-foreground mb-0.5">Метрики контроля</div>
                          <div className="text-[11px]">{detail.controlMetrics}</div>
                        </div>
                      )}
                      {detail.fulfillmentMethod && (
                        <div>
                          <div className="text-[9px] uppercase tracking-widest text-muted-foreground mb-0.5">Способ исполнения</div>
                          <div className="text-[11px]">{detail.fulfillmentMethod}</div>
                        </div>
                      )}
                    </div>
                  )}
                  {r.hardeningId && (
                    <div className="flex flex-col gap-1 min-w-0 flex-1 pl-3 border-l border-orange-500/30">
                      <div className="flex items-center gap-1">
                        <Icon name="ShieldCheck" size={10} className="text-orange-400" />
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-orange-400">Харденинг</span>
                        {loadingH && <Icon name="Loader2" size={9} className="animate-spin text-orange-400/50 ml-1" />}
                      </div>
                      {!loadingH && (hContent?.markdown
                        ? <MarkdownViewer>{hContent.markdown}</MarkdownViewer>
                        : <span className="text-[11px] text-muted-foreground/50 italic">Текст не заполнен</span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── MD-генератор ─────────────────────────────────────────────────────────────

const ENV_STATUS_LABEL: Record<string, string> = {
  required: '✅ Обязательно', conditional: '⚠️ Условие', not_required: '— Не требуется',
};
const ENV_COLS = ['Prod', 'ProdLike', 'Stage', 'Test', 'Dev'];
const ENV_KEYS = ['prod', 'prodlike', 'stage', 'test', 'dev'];

function buildMarkdown(
  data: ExportData,
  excluded: Set<string>,
  dCache: Map<string, import('@/api/requirements').RequirementDetail>,
  hCache: Map<string, import('@/api/hardening').ReqContent>,
): string {
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
          const detail = dCache.get(r.id);
          const hKey = r.hardeningId ? `${r.hardeningId}::${r.id}` : null;
          const hContent = hKey ? hCache.get(hKey) : null;
          const envStatus = hContent?.envStatus ?? r.envStatus;

          lines.push(`#### ${r.shortDesc} \`${r.id}\``);
          lines.push('');

          // Мета-строка
          const meta: string[] = [];
          if (detail?.reqTypeLabel) meta.push(`**Тип:** ${detail.reqTypeLabel}`);
          if (detail?.isProcurement) meta.push('**Закупки**');
          if (r.source === 'hardening') meta.push('**Харденинг**');
          if (detail?.techDomain) meta.push(`**Домен:** ${detail.techDomain.name}`);
          if (detail?.owner) meta.push(`**Владелец:** ${detail.owner}`);
          if (detail?.scorePoint != null) meta.push(`**Балл:** ${detail.scorePoint}`);
          if (detail?.scoreWeight != null) meta.push(`**Вес:** ${detail.scoreWeight}`);
          if (meta.length) { lines.push(meta.join(' · ')); lines.push(''); }

          // Теги и технологии
          const badges: string[] = [];
          if (detail?.tags?.length) badges.push(...detail.tags.map(t => `\`#${t.name}\``));
          if (detail?.technologies?.length) badges.push(...detail.technologies.map(t => `\`${t.name}\``));
          if (badges.length) { lines.push(badges.join(' ')); lines.push(''); }

          // Таблица сред
          if (envStatus) {
            lines.push(`| | ${ENV_COLS.join(' | ')} |`);
            lines.push(`|---|${'---|'.repeat(ENV_COLS.length)}`);
            const iodRows = [{ key: 'noIod', label: 'Без ИОД' }, { key: 'iod', label: 'С ИОД' }] as const;
            iodRows.forEach(row => {
              const cells = ENV_KEYS.map(k => ENV_STATUS_LABEL[envStatus[row.key][k as keyof typeof envStatus.noIod]] ?? '—');
              lines.push(`| **${row.label}** | ${cells.join(' | ')} |`);
            });
            lines.push('');
          }

          // Описание
          if (detail?.description) { lines.push(detail.description); lines.push(''); }

          // Нормативка / метрики / способ
          if (detail?.normativeDoc) { lines.push(`> **Нормативная документация:** ${detail.normativeDoc}`); }
          if (detail?.controlMetrics) { lines.push(`> **Метрики контроля:** ${detail.controlMetrics}`); }
          if (detail?.fulfillmentMethod) { lines.push(`> **Способ исполнения:** ${detail.fulfillmentMethod}`); }
          if (detail?.normativeDoc || detail?.controlMetrics || detail?.fulfillmentMethod) lines.push('');

          // Харденинг
          if (r.hardeningId && hContent?.markdown) {
            lines.push('**Харденинг:**');
            lines.push('');
            lines.push(hContent.markdown);
            lines.push('');
          }
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
  const [viewMode, setViewMode] = useState<'editor' | 'raw' | 'rendered'>('editor');
  const [copied, setCopied] = useState(false);
  // Счётчик для ре-рендера после загрузки деталей в ExportReqCard
  const [cacheRev, setCacheRev] = useState(0);

  useEffect(() => {
    fetchArchTemplateExport(templateId)
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [templateId]);

  // Подписываемся на изменения кешей через интервал (пока карточки грузятся)
  useEffect(() => {
    if (!data) return;
    const allReqIds = (data.requirementsByDomain ?? []).flatMap(g => g.requirements.map(r => r.id));
    if (allReqIds.length === 0) return;
    const interval = setInterval(() => {
      const loaded = allReqIds.filter(id => detailCache.has(id)).length;
      if (loaded === allReqIds.length) clearInterval(interval);
      setCacheRev(v => v + 1);
    }, 300);
    return () => clearInterval(interval);
  }, [data]);

  const toggle = useCallback((key: string) => {
    setExcluded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  // md пересчитывается при каждом ре-рендере (cacheRev тригерит его при загрузке деталей)
  const md = data ? buildMarkdown(data, excluded, detailCache, hardeningCache) : '';
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  cacheRev;

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
    const text = md;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })
        .catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  };

  const fallbackCopy = (text: string) => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try { document.execCommand('copy'); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch (e) { console.warn('copy failed', e); }
    document.body.removeChild(ta);
  };

  const pdfMermaidIdx = useRef(0);

  const downloadPdf = async () => {
    // 1. Рендерим все активные mermaid-диаграммы в SVG
    const activeDiagrams = (data?.mermaidDiagrams ?? []).filter(
      m => !excluded.has('mermaid') && !excluded.has(`mermaid-${m.id}`)
    );
    const svgMap = new Map<number, string>();
    await Promise.all(activeDiagrams.map(async (m) => {
      try {
        const id = `pdf-mermaid-${++pdfMermaidIdx.current}`;
        const { svg } = await mermaid.render(id, m.code);
        svgMap.set(m.id, svg);
      } catch { /* пропускаем битые диаграммы */ }
    }));

    // 2. Конвертируем MD → HTML, заменяя ```mermaid``` блоки на SVG
    const mdText = md;

    // Сначала вырезаем mermaid-блоки и ставим плейсхолдеры
    const mermaidBlocks: string[] = [];
    const mdWithPlaceholders = mdText.replace(/```mermaid\n([\s\S]*?)```/g, (_, code: string) => {
      // ищем диаграмму по коду
      const diagram = activeDiagrams.find(m => m.code.trim() === code.trim());
      const svg = diagram ? svgMap.get(diagram.id) : undefined;
      const placeholder = `__MERMAID_${mermaidBlocks.length}__`;
      mermaidBlocks.push(svg
        ? `<div class="mermaid-svg">${svg}</div>`
        : `<pre><code>${code}</code></pre>`
      );
      return placeholder;
    });

    const htmlBody = mdWithPlaceholders
      .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/^---$/gm, '<hr/>')
      .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/^\|(.+)\|$/gm, (line) => {
        if (/^\|[-| :]+\|$/.test(line)) return '__TABLE_SEP__';
        const cells = line.slice(1, -1).split('|').map(c => `<td>${c.trim()}</td>`).join('');
        return `<tr>${cells}</tr>`;
      })
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/\n{2,}/g, '</p><p>')
      .replace(/__TABLE_SEP__\n?/g, '')
      .replace(/(<li>.+<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
      .replace(/(<tr>.+<\/tr>\n?)+/g, (m) => `<table>${m}</table>`)
      // восстанавливаем SVG-блоки
      .replace(/__MERMAID_(\d+)__/g, (_, i) => mermaidBlocks[Number(i)] ?? '');

    const html = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8"/>
<title>${data?.name ?? 'Экспорт'}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 12px; line-height: 1.6; color: #111; padding: 32px 40px; max-width: 900px; margin: 0 auto; }
  h1 { font-size: 22px; margin: 0 0 16px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }
  h2 { font-size: 16px; margin: 24px 0 8px; color: #1e40af; }
  h3 { font-size: 13px; margin: 16px 0 6px; color: #374151; }
  h4 { font-size: 12px; margin: 12px 0 4px; font-weight: 600; }
  p { margin: 6px 0; }
  ul { margin: 6px 0 6px 20px; }
  li { margin: 2px 0; }
  code { background: #f3f4f6; padding: 1px 4px; border-radius: 3px; font-family: monospace; font-size: 11px; }
  pre { background: #f3f4f6; padding: 10px; border-radius: 6px; overflow-x: auto; margin: 8px 0; }
  blockquote { border-left: 3px solid #d1d5db; padding-left: 10px; color: #6b7280; margin: 6px 0; }
  hr { border: none; border-top: 1px solid #e5e7eb; margin: 16px 0; }
  table { border-collapse: collapse; width: 100%; margin: 8px 0; font-size: 11px; }
  td, th { border: 1px solid #e5e7eb; padding: 4px 8px; text-align: left; }
  tr:nth-child(even) td { background: #f9fafb; }
  strong { font-weight: 600; }
  .mermaid-svg { margin: 12px 0; page-break-inside: avoid; }
  .mermaid-svg svg { max-width: 100%; height: auto; background: #fff; }
  @media print { body { padding: 0; } .mermaid-svg { page-break-inside: avoid; } }
</style>
</head>
<body><p>${htmlBody}</p>
<script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); }</` + `script>
</body></html>`;

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
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
            {(['editor', 'raw', 'rendered'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 transition-colors border-r border-border last:border-r-0 ${viewMode === mode ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted/60'}`}
              >
                {mode === 'editor' ? 'Редактор' : mode === 'raw' ? 'Текст MD' : 'Рендер MD'}
              </button>
            ))}
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

          {data && viewMode === 'editor' && (
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
                  <div className="flex flex-col gap-4">
                    {(data.requirementsByDomain ?? []).map((g: ExportRequirementGroup) => (
                      <div key={g.domainId ?? '__none__'}>
                        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
                          <Icon name="Layers" size={9} /> {g.domainName}
                        </div>
                        <div className="flex flex-col gap-2">
                          {g.requirements.map((r: ExportRequirement) => (
                            <ExportReqCard
                              key={r.id}
                              r={r}
                              removed={excluded.has(`req-${r.id}`)}
                              onToggle={() => toggle(`req-${r.id}`)}
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

          {/* Текст MD */}
          {data && viewMode === 'raw' && (
            <pre className="p-5 text-xs font-mono leading-relaxed whitespace-pre-wrap text-foreground/80 select-all">
              {md}
            </pre>
          )}

          {/* Рендер MD */}
          {data && viewMode === 'rendered' && (
            <div className="p-5 prose prose-sm prose-invert max-w-none">
              <MarkdownViewer>{md}</MarkdownViewer>
            </div>
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
                onClick={downloadPdf}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              >
                <Icon name="FileText" size={13} />
                Скачать PDF
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