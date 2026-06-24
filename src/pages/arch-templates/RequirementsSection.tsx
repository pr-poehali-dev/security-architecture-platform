import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { RequirementDomainGroup, EnvStatus, ENVS } from '@/api/archTemplates';
import { fetchRequirement, RequirementDetail } from '@/api/requirements';
import { fetchReqContent, ReqContent } from '@/api/hardening';
import MarkdownViewer from '@/components/technologies/MarkdownViewer';

const REQ_STATUS_STYLE: Record<string, string> = {
  active:         'bg-emerald-500/15 text-emerald-400',
  in_development: 'bg-amber-500/15 text-amber-400',
  inactive:       'bg-muted text-muted-foreground',
  archived:       'bg-muted text-muted-foreground',
};

const TYPE_STYLE: Record<string, string> = {
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

// Кеш деталей требований в памяти
const detailCache = new Map<string, RequirementDetail>();
const hardeningContentCache = new Map<string, ReqContent>();

function ReqDetailPanel({ reqId, hardeningId }: { reqId: string; hardeningId?: string | null }) {
  const [detail, setDetail] = useState<RequirementDetail | null>(detailCache.get(reqId) ?? null);
  const [loading, setLoading] = useState(!detailCache.has(reqId));
  const cacheKey = hardeningId ? `${hardeningId}__${reqId}` : null;
  const [hContent, setHContent] = useState<ReqContent | null>(cacheKey ? (hardeningContentCache.get(cacheKey) ?? null) : null);
  const [hLoading, setHLoading] = useState(!!cacheKey && !hardeningContentCache.has(cacheKey));

  useEffect(() => {
    if (detailCache.has(reqId)) return;
    fetchRequirement(reqId).then((d) => {
      detailCache.set(reqId, d);
      setDetail(d);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [reqId]);

  useEffect(() => {
    if (!cacheKey || !hardeningId || hardeningContentCache.has(cacheKey)) return;
    fetchReqContent(hardeningId, reqId).then((c) => {
      hardeningContentCache.set(cacheKey, c);
      setHContent(c);
      setHLoading(false);
    }).catch(() => setHLoading(false));
  }, [cacheKey, hardeningId, reqId]);

  if (loading) return (
    <div className="flex items-center gap-2 py-3 text-muted-foreground text-xs">
      <Icon name="Loader2" size={13} className="animate-spin" /> Загрузка…
    </div>
  );

  if (!detail) return null;

  const hasExtra = detail.normativeDoc || detail.controlMetrics || detail.fulfillmentMethod;

  return (
    <div className="border-t border-border/60 pt-3 mt-0.5 flex flex-col gap-3">
      {/* Тип + флаги */}
      <div className="flex flex-wrap gap-1.5">
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${TYPE_STYLE[detail.reqType] ?? 'bg-muted text-muted-foreground'}`}>
          {detail.reqTypeLabel}
        </span>
        {detail.isProcurement && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 font-medium flex items-center gap-1">
            <Icon name="ShoppingCart" size={9} /> Закупки
          </span>
        )}
        {detail.techDomain && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground flex items-center gap-1">
            <Icon name="Layers" size={9} /> {detail.techDomain.name}
          </span>
        )}
        {detail.tags.map((t) => (
          <span key={t.id} className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted/60 text-muted-foreground">
            #{t.name}
          </span>
        ))}
      </div>

      {/* Скор */}
      <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Icon name="Star" size={11} className="text-accent" />
          Балл: <span className="font-semibold text-foreground ml-0.5">{detail.scorePoint}</span>
        </span>
        <span className="flex items-center gap-1">
          <Icon name="Weight" size={11} className="text-accent" />
          Вес: <span className="font-semibold text-foreground ml-0.5">{detail.scoreWeight}</span>
        </span>
        {detail.owner && (
          <span className="flex items-center gap-1">
            <Icon name="User" size={11} />
            {detail.owner}
          </span>
        )}
      </div>

      {/* Описание */}
      {detail.description && (
        <p className="text-xs text-muted-foreground leading-relaxed">{detail.description}</p>
      )}

      {/* Требование харденинга */}
      {hardeningId && (
        <div className="rounded-md border border-orange-500/20 bg-orange-500/5 overflow-hidden">
          <div className="flex items-center gap-1.5 px-3 py-2 border-b border-orange-500/20 bg-orange-500/10">
            <Icon name="ShieldCheck" size={12} className="text-orange-400" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-orange-400">Требование харденинга</span>
          </div>
          <div className="px-3 py-2.5">
            {hLoading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Icon name="Loader2" size={12} className="animate-spin" /> Загрузка…
              </div>
            ) : hContent?.markdown ? (
              <div className="text-xs">
                <MarkdownViewer content={hContent.markdown} />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground/60 italic">Текст требования не заполнен</p>
            )}
          </div>
        </div>
      )}

      {/* Доп. поля */}
      {hasExtra && (
        <div className="flex flex-col gap-2">
          {detail.normativeDoc && (
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Нормативная документация</div>
              <div className="text-xs">{detail.normativeDoc}</div>
            </div>
          )}
          {detail.controlMetrics && (
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Метрики контроля</div>
              <div className="text-xs">{detail.controlMetrics}</div>
            </div>
          )}
          {detail.fulfillmentMethod && (
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Способ исполнения</div>
              <div className="text-xs">{detail.fulfillmentMethod}</div>
            </div>
          )}
        </div>
      )}

      {/* Технологии */}
      {detail.technologies.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {detail.technologies.map((t) => (
            <Link
              key={t.id}
              to={`/technologies/${t.id}`}
              className="text-[10px] px-1.5 py-0.5 rounded-full border border-border bg-muted/30 text-muted-foreground hover:border-accent hover:text-accent transition-colors flex items-center gap-1"
            >
              <Icon name="Cpu" size={9} /> {t.name}
            </Link>
          ))}
        </div>
      )}

      {/* Ссылка на полную страницу */}
      <Link
        to={`/requirements/${detail.id}`}
        className="self-start text-[11px] text-accent hover:underline flex items-center gap-1"
      >
        Открыть полную карточку <Icon name="ExternalLink" size={11} />
      </Link>
    </div>
  );
}

interface RequirementsSectionProps {
  groups: RequirementDomainGroup[];
}

export default function RequirementsSection({ groups }: RequirementsSectionProps) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground gap-2">
        <Icon name="ListChecks" size={24} className="text-muted-foreground/40" />
        <p className="text-sm">Добавьте технологии или решения, чтобы подтянуть связанные требования</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <div key={group.domainId ?? '__none__'} className="rounded-lg border border-border bg-card/50 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-muted/30">
            <Icon name="Layers" size={14} className="text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{group.domainName}</span>
            <span className="ml-auto text-[11px] font-mono text-muted-foreground">{group.requirements.length}</span>
          </div>
          <div className="divide-y divide-border">
            {group.requirements.map((req) => {
              const isOpen = openIds.has(req.id);
              const hasEnvData = req.envStatus && (
                Object.values(req.envStatus.noIod).some(s => s !== 'not_required') ||
                Object.values(req.envStatus.iod).some(s => s !== 'not_required')
              );

              return (
                <div key={req.id} className="px-4 py-3 flex flex-col gap-2.5">
                  {/* Заголовок требования — кликабелен для раскрытия */}
                  <button
                    type="button"
                    onClick={() => toggle(req.id)}
                    className="flex items-start gap-3 text-left group w-full"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium leading-snug group-hover:text-accent transition-colors">{req.shortDesc}</div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-[10px] font-mono text-muted-foreground">{req.id}</span>
                        {req.techName && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent flex items-center gap-1">
                            <Icon name="Cpu" size={9} /> {req.techName}
                          </span>
                        )}
                        {req.source === 'hardening' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400 flex items-center gap-1">
                            <Icon name="ShieldCheck" size={9} /> харденинг
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${REQ_STATUS_STYLE[req.status] ?? 'bg-muted text-muted-foreground'}`}>
                        {req.status === 'active' ? 'Активно' : req.status === 'in_development' ? 'В работе' : req.status}
                      </span>
                      <Icon
                        name={isOpen ? 'ChevronUp' : 'ChevronDown'}
                        size={14}
                        className="text-muted-foreground transition-transform"
                      />
                    </div>
                  </button>

                  {/* Матрица применимости по средам */}
                  {hasEnvData ? (
                    <div className="rounded-md border border-border overflow-hidden text-[10px]">
                      <div className="grid grid-cols-[64px_repeat(5,1fr)] border-b border-border bg-muted/30">
                        <div className="border-r border-border" />
                        {ENVS.map(({ key, label }) => (
                          <div key={key} className="py-1.5 text-center font-semibold text-muted-foreground border-r last:border-r-0 border-border">
                            {label}
                          </div>
                        ))}
                      </div>
                      {IOD_ROWS.map((row, rowIdx) => (
                        <div key={row.key} className={`grid grid-cols-[64px_repeat(5,1fr)] ${rowIdx < IOD_ROWS.length - 1 ? 'border-b border-border' : ''}`}>
                          <div className="flex items-center justify-center px-1 py-2 border-r border-border bg-muted/20">
                            <span className="font-semibold text-muted-foreground text-center leading-tight">{row.label}</span>
                          </div>
                          {ENVS.map(({ key }) => {
                            const st = ((req.envStatus?.[row.key]) ?? {})[key] as EnvStatus ?? 'not_required';
                            const style = ENV_STATUS_STYLE[st];
                            return (
                              <div key={key} className={`flex flex-col items-center justify-center gap-0.5 py-2 px-1 border-r last:border-r-0 border-border ${style.cell}`}>
                                <Icon name={style.icon} size={11} />
                                <span className="font-semibold leading-tight text-center" style={{ fontSize: '9px' }}>{style.label}</span>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60 italic">
                      <Icon name="Info" size={11} />
                      Данные о применимости по средам не заполнены
                    </div>
                  )}

                  {/* Раскрывающаяся панель с полными свойствами */}
                  {isOpen && <ReqDetailPanel reqId={req.id} hardeningId={req.hardeningId} />}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}