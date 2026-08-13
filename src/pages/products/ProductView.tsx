import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import MarkdownViewer from '@/components/technologies/MarkdownViewer';
import ProductVersionsTab from './ProductVersionsTab';
import {
  fetchProduct,
  setRequirementAssessment,
  saveAnalysisVersion,
  ProductDetail,
  AssessmentStatus,
  AssessedRequirement,
  ASSESSMENT_OPTIONS,
} from '@/api/products';

const STATUS_STYLE: Record<string, string> = {
  active:         'bg-success/10 text-success border-success/20',
  in_development: 'bg-warning/10 text-warning border-warning/20',
  inactive:       'bg-muted text-muted-foreground border-border',
  archived:       'bg-muted text-muted-foreground border-border',
};

const ASSESSMENT_STYLE: Record<AssessmentStatus, string> = {
  compliant:      'bg-success/10 text-success border-success/20',
  partial:        'bg-warning/10 text-warning border-warning/20',
  non_compliant:  'bg-destructive/10 text-destructive border-destructive/20',
  not_assessed:   'bg-muted text-muted-foreground border-border',
};

const ASSESSMENT_ICON: Record<AssessmentStatus, string> = {
  compliant: 'CheckCircle2',
  partial: 'AlertTriangle',
  non_compliant: 'XCircle',
  not_assessed: 'CircleDashed',
};

function scoreColor(score: number) {
  if (score >= 80) return 'text-success';
  if (score >= 50) return 'text-warning';
  return 'text-destructive';
}

function scoreRing(score: number) {
  if (score >= 80) return 'stroke-success';
  if (score >= 50) return 'stroke-warning';
  return 'stroke-destructive';
}

function ScoreDonut({ score }: { score: number }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  return (
    <svg width="76" height="76" viewBox="0 0 76 76" className="shrink-0">
      <circle cx="38" cy="38" r={r} fill="none" strokeWidth="7" className="stroke-muted" />
      <circle
        cx="38" cy="38" r={r} fill="none" strokeWidth="7"
        strokeDasharray={c} strokeDashoffset={offset}
        strokeLinecap="round"
        className={`${scoreRing(score)} transition-all duration-500`}
        transform="rotate(-90 38 38)"
      />
      <text x="38" y="43" textAnchor="middle" className={`text-[16px] font-bold ${scoreColor(score)}`} fill="currentColor">
        {score}%
      </text>
    </svg>
  );
}

interface ReqRowProps {
  productId: string;
  req: AssessedRequirement;
  onUpdated: (r: AssessedRequirement) => void;
}

function ReqRow({ productId, req, onUpdated }: ReqRowProps) {
  const [saving, setSaving] = useState(false);
  const [comment, setComment] = useState(req.assessmentComment);
  const [editingComment, setEditingComment] = useState(false);

  const changeStatus = async (status: AssessmentStatus) => {
    setSaving(true);
    try {
      await setRequirementAssessment(productId, req.id, status, comment);
      onUpdated({ ...req, assessmentStatus: status,
        assessmentStatusLabel: ASSESSMENT_OPTIONS.find((o) => o.value === status)?.label || status });
    } finally {
      setSaving(false);
    }
  };

  const saveComment = async () => {
    setSaving(true);
    try {
      await setRequirementAssessment(productId, req.id, req.assessmentStatus, comment);
      onUpdated({ ...req, assessmentComment: comment });
    } finally {
      setSaving(false);
      setEditingComment(false);
    }
  };

  return (
    <div className="px-4 py-3 flex flex-col gap-2">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <Link to={`/requirements/${req.id}`} className="text-sm font-medium hover:text-accent transition-colors leading-snug">
            {req.shortDesc}
          </Link>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-[10px] font-mono text-muted-foreground">{req.id}</span>
            {req.techName && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent flex items-center gap-1">
                <Icon name="Cpu" size={9} /> {req.techName}
              </span>
            )}
          </div>
        </div>
        <div className="relative shrink-0">
          <select
            value={req.assessmentStatus}
            disabled={saving}
            onChange={(e) => changeStatus(e.target.value as AssessmentStatus)}
            className={`text-[11px] font-medium pl-2 pr-6 py-1 rounded-full border outline-none cursor-pointer appearance-none disabled:opacity-50 ${ASSESSMENT_STYLE[req.assessmentStatus]}`}
          >
            {ASSESSMENT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {editingComment ? (
        <div className="flex items-center gap-2">
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Комментарий к оценке…"
            className="flex-1 h-8 px-2.5 rounded-md border border-border bg-background text-xs outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
            autoFocus
          />
          <button type="button" onClick={saveComment} className="text-xs text-accent hover:underline shrink-0">
            Сохранить
          </button>
          <button type="button" onClick={() => { setEditingComment(false); setComment(req.assessmentComment); }} className="text-xs text-muted-foreground hover:text-foreground shrink-0">
            Отмена
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditingComment(true)}
          className="text-left text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
        >
          <Icon name="MessageSquare" size={11} />
          {req.assessmentComment || <span className="italic">Добавить комментарий…</span>}
        </button>
      )}
    </div>
  );
}

type Tab = 'overview' | 'versions';

export default function ProductView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [domainFilter, setDomainFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<AssessmentStatus | 'all'>('all');
  const [tab, setTab] = useState<Tab>('overview');
  const [versionsRefreshKey, setVersionsRefreshKey] = useState(0);
  const [savingVersion, setSavingVersion] = useState(false);
  const [changeNote, setChangeNote] = useState('');
  const [showSaveVersion, setShowSaveVersion] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    fetchProduct(id)
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const onReqUpdated = (domainId: string | null, updated: AssessedRequirement) => {
    setData((prev) => {
      if (!prev) return prev;
      const groups = prev.requirementsByDomain.map((g) => {
        if ((g.domainId ?? '__none__') !== (domainId ?? '__none__')) return g;
        return { ...g, requirements: g.requirements.map((r) => r.id === updated.id ? updated : r) };
      });
      const total = groups.reduce((s, g) => s + g.requirements.length, 0);
      let compliant = 0, partial = 0, nonCompliant = 0, notAssessed = 0;
      groups.forEach((g) => g.requirements.forEach((r) => {
        if (r.assessmentStatus === 'compliant') compliant++;
        else if (r.assessmentStatus === 'partial') partial++;
        else if (r.assessmentStatus === 'non_compliant') nonCompliant++;
        else notAssessed++;
      }));
      const scorePercent = total ? Math.round(((compliant + partial * 0.5) / total) * 100) : 0;
      return {
        ...prev, requirementsByDomain: groups,
        compliance: { total, compliant, partial, nonCompliant, notAssessed, scorePercent },
      };
    });
  };

  const handleSaveVersion = async () => {
    if (!id) return;
    setSavingVersion(true);
    try {
      await saveAnalysisVersion(id, changeNote);
      setChangeNote('');
      setShowSaveVersion(false);
      setVersionsRefreshKey((k) => k + 1);
      setTab('versions');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка сохранения версии');
    } finally {
      setSavingVersion(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-32 text-muted-foreground gap-3">
      <Icon name="Loader2" size={22} className="animate-spin" /> Загрузка…
    </div>
  );

  if (error || !data) return (
    <div className="px-6 py-12 max-w-[1400px] mx-auto space-y-4">
      <div className="flex items-center gap-3 p-4 rounded-lg border border-destructive/30 bg-destructive/5 text-destructive text-sm">
        <Icon name="TriangleAlert" size={18} /> {error || 'Продукт не найден'}
      </div>
      <Link to="/product-analysis" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <Icon name="ArrowLeft" size={16} /> Вернуться к списку
      </Link>
    </div>
  );

  const filteredGroups = data.requirementsByDomain
    .filter((g) => domainFilter === 'all' || (g.domainId ?? '__none__') === domainFilter)
    .map((g) => ({
      ...g,
      requirements: g.requirements.filter((r) => statusFilter === 'all' || r.assessmentStatus === statusFilter),
    }))
    .filter((g) => g.requirements.length > 0);

  return (
    <>
      {/* Header */}
      <div className="relative border-b border-border bg-primary text-primary-foreground overflow-hidden">
        <div className="absolute inset-0 grid-texture opacity-[0.08]" />
        <div className="relative px-6 py-6 max-w-[1400px] mx-auto">
          <nav className="flex items-center gap-2 text-sm text-primary-foreground/60 mb-4 flex-wrap">
            <Link to="/product-analysis" className="hover:text-primary-foreground transition-colors">Продукты</Link>
            <Icon name="ChevronRight" size={14} />
            <span className="text-primary-foreground font-medium truncate">{data.name}</span>
          </nav>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{data.name}</h1>
                <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full border ${STATUS_STYLE[data.status] ?? 'bg-muted'}`}>
                  {data.statusLabel}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-2 text-sm text-primary-foreground/60 flex-wrap">
                <span className="font-mono">{data.id}</span>
                {data.owner && <><span>·</span><span>{data.owner}</span></>}
              </div>
              {data.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {data.tags.map((t) => (
                    <span key={t.id} className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-primary-foreground/10 text-primary-foreground/80">
                      #{t.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowSaveVersion(true)}
                className="h-10 px-4 rounded-md border border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground text-sm font-medium flex items-center gap-2 hover:bg-primary-foreground/20 transition-colors"
              >
                <Icon name="History" size={16} /> Зафиксировать версию
              </button>
              <button
                onClick={() => navigate(`/product-analysis/${data.id}/edit`)}
                className="h-10 px-5 rounded-md bg-accent text-accent-foreground text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity"
              >
                <Icon name="Pencil" size={16} /> Редактировать
              </button>
            </div>
          </div>
        </div>
      </div>

      {showSaveVersion && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowSaveVersion(false)}
        >
          <div
            className="w-full max-w-md rounded-lg border border-border bg-card shadow-xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold flex items-center gap-2 mb-4">
              <Icon name="History" size={17} className="text-accent" /> Зафиксировать версию анализа
            </h3>
            <label className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">
              Комментарий к версии анализа
            </label>
            <textarea
              value={changeNote}
              onChange={(e) => setChangeNote(e.target.value)}
              placeholder="Например: анализ после аудита TLS…"
              rows={3}
              autoFocus
              className="w-full px-2.5 py-2 rounded-md border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent resize-none"
            />
            <div className="flex items-center gap-2 mt-4">
              <button
                type="button"
                disabled={savingVersion}
                onClick={handleSaveVersion}
                className="h-9 px-4 rounded-md bg-accent text-accent-foreground text-sm font-medium flex items-center gap-1.5 hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {savingVersion
                  ? <><Icon name="Loader2" size={13} className="animate-spin" /> Сохранение…</>
                  : <><Icon name="Save" size={13} /> Сохранить</>
                }
              </button>
              <button type="button" onClick={() => setShowSaveVersion(false)} className="h-9 px-4 rounded-md text-sm text-muted-foreground hover:text-foreground">
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div className="border-b border-border bg-card/60 sticky top-0 z-10">
        <div className="px-6 max-w-[1400px] mx-auto flex gap-0.5 overflow-x-auto">
          {([
            { id: 'overview', label: 'Обзор',            icon: 'Info'    },
            { id: 'versions', label: 'Версии анализа',    icon: 'History' },
          ] as const).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap -mb-px ${
                tab === t.id
                  ? 'border-accent text-accent'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon name={t.icon} size={15} /> {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'versions' && (
        <div className="px-6 py-8 max-w-[1000px] mx-auto">
          <ProductVersionsTab productId={data.id} refreshKey={versionsRefreshKey} />
        </div>
      )}

      {tab === 'overview' && (
      <div className="px-6 py-8 max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left */}
        <div className="lg:col-span-2 space-y-6">

          {data.description && (
            <section className="rounded-lg border border-border bg-card p-6">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <Icon name="FileText" size={18} className="text-accent" /> Описание
              </h2>
              <MarkdownViewer>{data.description}</MarkdownViewer>
            </section>
          )}

          {/* Requirements assessment */}
          <section className="rounded-lg border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h2 className="font-semibold flex items-center gap-2">
                <Icon name="ListChecks" size={18} className="text-accent" /> Оценка соответствия требованиям
                <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {data.compliance.total}
                </span>
              </h2>
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={domainFilter}
                  onChange={(e) => setDomainFilter(e.target.value)}
                  className="h-8 px-2.5 rounded-md border border-border bg-background text-xs outline-none"
                >
                  <option value="all">Все домены</option>
                  {data.requirementsByDomain.map((g) => (
                    <option key={g.domainId ?? '__none__'} value={g.domainId ?? '__none__'}>{g.domainName}</option>
                  ))}
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as AssessmentStatus | 'all')}
                  className="h-8 px-2.5 rounded-md border border-border bg-background text-xs outline-none"
                >
                  <option value="all">Все оценки</option>
                  {ASSESSMENT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {data.compliance.total === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground gap-2">
                <Icon name="ListChecks" size={24} className="text-muted-foreground/40" />
                <p className="text-sm">Добавьте технологии или решения продукта, чтобы подтянуть связанные требования</p>
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground gap-2">
                <Icon name="Filter" size={24} className="text-muted-foreground/40" />
                <p className="text-sm">Нет требований по выбранным фильтрам</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {filteredGroups.map((group) => (
                  <div key={group.domainId ?? '__none__'} className="rounded-lg border border-border bg-card/50 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-muted/30">
                      <Icon name="Layers" size={14} className="text-muted-foreground" />
                      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{group.domainName}</span>
                      <span className="ml-auto text-[11px] font-mono text-muted-foreground">{group.requirements.length}</span>
                    </div>
                    <div className="divide-y divide-border">
                      {group.requirements.map((req) => (
                        <ReqRow
                          key={req.id}
                          productId={data.id}
                          req={req}
                          onUpdated={(updated) => onReqUpdated(group.domainId, updated)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">

          {/* Compliance score */}
          <section className="rounded-lg border border-border bg-card p-5">
            <h3 className="text-[11px] uppercase tracking-widest text-muted-foreground mb-4">Соответствие требованиям</h3>
            <div className="flex items-center gap-4">
              <ScoreDonut score={data.compliance.scorePercent} />
              <div className="flex-1 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-success"><Icon name="CheckCircle2" size={12} /> Соответствует</span>
                  <span className="font-mono font-medium">{data.compliance.compliant}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-warning"><Icon name="AlertTriangle" size={12} /> Частично</span>
                  <span className="font-mono font-medium">{data.compliance.partial}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-destructive"><Icon name="XCircle" size={12} /> Не соответствует</span>
                  <span className="font-mono font-medium">{data.compliance.nonCompliant}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-muted-foreground"><Icon name="CircleDashed" size={12} /> Не оценено</span>
                  <span className="font-mono font-medium">{data.compliance.notAssessed}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Template matches */}
          <section className="rounded-lg border border-border bg-card p-5">
            <h3 className="text-[11px] uppercase tracking-widest text-muted-foreground mb-3">
              Соответствие шаблонам архитектур
            </h3>
            {data.templateMatches.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Нет шаблонов для сравнения</p>
            ) : (
              <div className="space-y-2.5">
                {data.templateMatches.map((tm) => (
                  <Link
                    key={tm.id}
                    to={`/templates/${tm.id}`}
                    className="block px-3 py-2.5 rounded-md border border-border bg-muted/30 hover:border-accent/50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-sm font-medium truncate flex-1">{tm.name}</span>
                      <span className={`text-xs font-mono font-semibold shrink-0 ${scoreColor(tm.matchPercent)}`}>
                        {tm.matchPercent}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-1.5">
                      <div
                        className={`h-full rounded-full ${tm.matchPercent >= 80 ? 'bg-success' : tm.matchPercent >= 50 ? 'bg-warning' : 'bg-destructive'}`}
                        style={{ width: `${tm.matchPercent}%` }}
                      />
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Icon name="Cpu" size={9} /> {tm.matchedTechnologies}/{tm.totalTechnologies}</span>
                      <span className="flex items-center gap-1"><Icon name="Workflow" size={9} /> {tm.matchedDecisions}/{tm.totalDecisions}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Technologies */}
          {data.technologies.length > 0 && (
            <section className="rounded-lg border border-border bg-card p-5">
              <h3 className="text-[11px] uppercase tracking-widest text-muted-foreground mb-3">
                Технологии ({data.technologies.length})
              </h3>
              <div className="space-y-1.5">
                {data.technologies.map((t) => (
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

          {/* Decisions */}
          {data.decisions.length > 0 && (
            <section className="rounded-lg border border-border bg-card p-5">
              <h3 className="text-[11px] uppercase tracking-widest text-muted-foreground mb-3">
                Решения ({data.decisions.length})
              </h3>
              <div className="space-y-1.5">
                {data.decisions.map((d) => (
                  <Link
                    key={d.id}
                    to={`/solutions/${d.id}`}
                    className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-muted/30 text-sm hover:border-accent hover:text-accent transition-colors"
                  >
                    <Icon name="Workflow" size={13} />
                    <span className="flex-1 truncate">{d.name}</span>
                    <span className="text-[10px] text-muted-foreground">{d.typeLabel}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
      )}
    </>
  );
}