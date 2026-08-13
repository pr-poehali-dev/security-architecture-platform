import { useEffect, useState } from 'react';
import Icon from '@/components/ui/icon';
import {
  fetchAnalysisVersions,
  compareAnalysisVersions,
  AnalysisVersion,
  VersionsCompareResult,
  AssessmentStatus,
} from '@/api/products';

function scoreColor(score: number) {
  if (score >= 80) return 'text-success';
  if (score >= 50) return 'text-warning';
  return 'text-destructive';
}

const CHANGE_STYLE: Record<string, string> = {
  status_changed: 'bg-warning/10 text-warning border-warning/20',
  added:          'bg-success/10 text-success border-success/20',
  removed:        'bg-destructive/10 text-destructive border-destructive/20',
};

const CHANGE_LABEL: Record<string, string> = {
  status_changed: 'Изменена оценка',
  added: 'Добавлено требование',
  removed: 'Удалено требование',
};

const CHANGE_ICON: Record<string, string> = {
  status_changed: 'ArrowRightLeft',
  added: 'Plus',
  removed: 'Minus',
};

const ASSESSMENT_BADGE_STYLE: Record<AssessmentStatus, string> = {
  compliant:      'bg-success/15 text-success',
  partial:        'bg-warning/15 text-warning',
  non_compliant:  'bg-destructive/15 text-destructive',
  not_assessed:   'bg-muted text-muted-foreground',
};

function StatusBadge({ status, label }: { status?: AssessmentStatus; label?: string }) {
  if (!status || !label) return null;
  return (
    <span className={`inline-flex text-[11px] font-medium px-1.5 py-0.5 rounded ${ASSESSMENT_BADGE_STYLE[status]}`}>
      {label}
    </span>
  );
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

interface Props {
  productId: string;
  refreshKey: number;
}

export default function ProductVersionsTab({ productId, refreshKey }: Props) {
  const [versions, setVersions] = useState<AnalysisVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selected, setSelected] = useState<number[]>([]);
  const [compareResult, setCompareResult] = useState<VersionsCompareResult | null>(null);
  const [comparing, setComparing] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchAnalysisVersions(productId)
      .then(setVersions)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [productId, refreshKey]);

  const toggleSelect = (id: number) => {
    setCompareResult(null);
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const runCompare = async () => {
    if (selected.length !== 2) return;
    setComparing(true);
    setError('');
    try {
      const [a, b] = [...selected].sort((x, y) => x - y);
      const result = await compareAnalysisVersions(a, b);
      setCompareResult(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка сравнения');
    } finally {
      setComparing(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16 text-muted-foreground gap-3">
      <Icon name="Loader2" size={20} className="animate-spin" /> Загрузка версий…
    </div>
  );

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-3 p-3 rounded-lg border border-destructive/30 bg-destructive/5 text-destructive text-sm">
          <Icon name="TriangleAlert" size={16} /> {error}
        </div>
      )}

      {versions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground gap-2">
          <Icon name="History" size={24} className="text-muted-foreground/40" />
          <p className="text-sm">История анализа пуста</p>
          <p className="text-xs max-w-xs">Зафиксируйте текущее состояние оценки требований как первую версию анализа</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-muted-foreground">
              Выберите две версии, чтобы сравнить изменения оценок соответствия
            </p>
            <button
              type="button"
              disabled={selected.length !== 2 || comparing}
              onClick={runCompare}
              className="h-8 px-3 rounded-md bg-accent text-accent-foreground text-xs font-medium flex items-center gap-1.5 hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {comparing
                ? <><Icon name="Loader2" size={13} className="animate-spin" /> Сравнение…</>
                : <><Icon name="GitCompare" size={13} /> Сравнить версии</>
              }
            </button>
          </div>

          <div className="relative pl-5 border-l border-border flex flex-col gap-0">
            {versions.map((v, i) => {
              const isSelected = selected.includes(v.id);
              return (
                <div key={v.id} className="relative pb-4 last:pb-0">
                  <div className={`absolute -left-[21px] size-3 rounded-full border-2 ${i === 0 ? 'border-accent bg-accent' : 'border-border bg-card'}`} />
                  <button
                    type="button"
                    onClick={() => toggleSelect(v.id)}
                    className={`w-full text-left rounded-lg border p-3 flex items-center gap-3 transition-colors ${isSelected ? 'border-accent bg-accent/5' : 'border-border bg-card/50 hover:border-accent/40'}`}
                  >
                    <div className={`size-4 rounded border shrink-0 flex items-center justify-center ${isSelected ? 'bg-accent border-accent' : 'border-border'}`}>
                      {isSelected && <Icon name="Check" size={11} className="text-accent-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold font-mono text-accent">v{v.version}</span>
                        <span className="text-[11px] text-muted-foreground">{fmt(v.analyzedAt)}</span>
                      </div>
                      {v.changeNote && <p className="text-sm text-muted-foreground mt-0.5 truncate">{v.changeNote}</p>}
                    </div>
                    <span className={`text-xs font-mono font-semibold shrink-0 ${scoreColor(v.compliance.scorePercent)}`}>
                      {v.compliance.scorePercent}%
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {compareResult && (
        <div className="rounded-lg border border-border bg-card/50 p-5 space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h3 className="font-semibold flex items-center gap-2">
              <Icon name="GitCompare" size={16} className="text-accent" /> Сравнение версий
            </h3>
            <button type="button" onClick={() => setCompareResult(null)} className="text-xs text-muted-foreground hover:text-foreground">
              <Icon name="X" size={14} />
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1 rounded-md border border-border bg-background p-3 text-center">
              <div className="text-[11px] text-muted-foreground uppercase tracking-widest mb-1">v{compareResult.from.version}</div>
              <div className={`text-xl font-bold ${scoreColor(compareResult.from.compliance.scorePercent)}`}>
                {compareResult.from.compliance.scorePercent}%
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">{fmt(compareResult.from.analyzedAt)}</div>
            </div>
            <Icon name="ArrowRight" size={20} className="text-muted-foreground shrink-0" />
            <div className="flex-1 rounded-md border border-border bg-background p-3 text-center">
              <div className="text-[11px] text-muted-foreground uppercase tracking-widest mb-1">v{compareResult.to.version}</div>
              <div className={`text-xl font-bold ${scoreColor(compareResult.to.compliance.scorePercent)}`}>
                {compareResult.to.compliance.scorePercent}%
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">{fmt(compareResult.to.analyzedAt)}</div>
            </div>
          </div>

          <div>
            <h4 className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2">
              Изменения по требованиям ({compareResult.requirementChanges.length})
            </h4>
            {compareResult.requirementChanges.length === 0 ? (
              <p className="text-sm text-muted-foreground italic py-4 text-center">Изменений не обнаружено</p>
            ) : (
              <div className="space-y-1.5">
                {compareResult.requirementChanges.map((c) => (
                  <div key={c.requirementId} className={`flex items-center gap-3 p-2.5 rounded-md border text-sm ${CHANGE_STYLE[c.change]}`}>
                    <Icon name={CHANGE_ICON[c.change]} size={14} className="shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate mb-1">{c.shortDesc}</div>
                      <div className="flex items-center gap-1.5 flex-wrap text-[11px] opacity-90">
                        <span className="opacity-70">{CHANGE_LABEL[c.change]}</span>
                        {c.change === 'status_changed' && (
                          <span className="flex items-center gap-1.5">
                            <StatusBadge status={c.fromStatus} label={c.fromStatusLabel} />
                            <Icon name="ArrowRight" size={11} className="opacity-60" />
                            <StatusBadge status={c.toStatus} label={c.toStatusLabel} />
                          </span>
                        )}
                        {c.change === 'added' && <StatusBadge status={c.toStatus} label={c.toStatusLabel} />}
                        {c.change === 'removed' && <StatusBadge status={c.fromStatus} label={c.fromStatusLabel} />}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono opacity-70 shrink-0">{c.requirementId}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}