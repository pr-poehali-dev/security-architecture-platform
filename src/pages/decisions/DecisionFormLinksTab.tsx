import Icon from '@/components/ui/icon';
import { DecisionRef, TechRef, LinkedRequirementRef, ReqType, REQ_TYPE_OPTIONS } from '@/api/decisions';

interface DecisionFormLinksTabProps {
  // Decisions
  selectedDecisions: DecisionRef[];
  decQuery: string;
  setDecQuery: (v: string) => void;
  decOpen: boolean;
  setDecOpen: (v: boolean) => void;
  decSuggestions: DecisionRef[];
  decRef: React.RefObject<HTMLDivElement>;
  addDecision: (r: DecisionRef) => void;
  removeDecision: (id: string) => void;
  // Technologies
  selectedTechs: TechRef[];
  techQuery: string;
  setTechQuery: (v: string) => void;
  techOpen: boolean;
  setTechOpen: (v: boolean) => void;
  techSuggestions: TechRef[];
  techRef: React.RefObject<HTMLDivElement>;
  addTech: (t: TechRef) => void;
  removeTech: (id: string) => void;
  // Requirements
  selectedReqs: LinkedRequirementRef[];
  reqQuery: string;
  setReqQuery: (v: string) => void;
  reqTypeFilter: ReqType | '';
  setReqTypeFilter: (v: ReqType | '') => void;
  reqOpen: boolean;
  setReqOpen: (v: boolean) => void;
  reqSuggestions: LinkedRequirementRef[];
  reqRef: React.RefObject<HTMLDivElement>;
  addReq: (r: LinkedRequirementRef) => void;
  removeReq: (id: string) => void;
}

export default function DecisionFormLinksTab({
  selectedDecisions, decQuery, setDecQuery, decOpen, setDecOpen,
  decSuggestions, decRef, addDecision, removeDecision,
  selectedTechs, techQuery, setTechQuery, techOpen, setTechOpen,
  techSuggestions, techRef, addTech, removeTech,
  selectedReqs, reqQuery, setReqQuery, reqTypeFilter, setReqTypeFilter,
  reqOpen, setReqOpen, reqSuggestions, reqRef, addReq, removeReq,
}: DecisionFormLinksTabProps) {
  return (
    <div className="space-y-6">
      {/* Related decisions */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Icon name="Workflow" size={18} className="text-accent" /> Связанные решения
        </h2>
        <div ref={decRef} className="relative">
          <div className="flex flex-wrap gap-2 p-2 min-h-10 rounded-md border border-border bg-background focus-within:ring-2 focus-within:ring-accent/30 focus-within:border-accent transition-colors">
            {selectedDecisions.map((r) => (
              <span key={r.id} className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-accent/15 text-accent">
                <Icon name="Workflow" size={11} /> {r.name}
                <button type="button" onClick={() => removeDecision(r.id)} className="ml-0.5 hover:text-destructive transition-colors">
                  <Icon name="X" size={11} />
                </button>
              </span>
            ))}
            <input
              value={decQuery}
              onChange={(e) => { setDecQuery(e.target.value); setDecOpen(true); }}
              onFocus={() => setDecOpen(true)}
              placeholder={selectedDecisions.length ? '' : 'Найти решение…'}
              className="flex-1 min-w-[140px] bg-transparent text-sm outline-none placeholder:text-muted-foreground py-0.5 px-1"
            />
          </div>
          {decOpen && decSuggestions.length > 0 && (
            <div className="absolute z-20 top-full mt-1 w-full rounded-md border border-border bg-card shadow-lg max-h-52 overflow-y-auto">
              {decSuggestions.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); addDecision(r); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-left"
                >
                  <Icon name="Workflow" size={14} className="text-muted-foreground shrink-0" />
                  <span className="flex-1">{r.name}</span>
                  <span className="text-[10px] text-muted-foreground">{r.typeLabel}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Technologies */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Icon name="Cpu" size={18} className="text-accent" /> Связанные технологии
        </h2>
        <p className="text-xs text-muted-foreground">
          При выборе технологии автоматически подтянутся связанные требования, сгруппированные по доменам.
        </p>
        <div ref={techRef} className="relative">
          <div className="flex flex-wrap gap-2 p-2 min-h-10 rounded-md border border-border bg-background focus-within:ring-2 focus-within:ring-accent/30 focus-within:border-accent transition-colors">
            {selectedTechs.map((t) => (
              <span key={t.id} className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-accent/15 text-accent">
                <Icon name="Cpu" size={11} /> {t.name}
                <button type="button" onClick={() => removeTech(t.id)} className="ml-0.5 hover:text-destructive transition-colors">
                  <Icon name="X" size={11} />
                </button>
              </span>
            ))}
            <input
              value={techQuery}
              onChange={(e) => { setTechQuery(e.target.value); setTechOpen(true); }}
              onFocus={() => setTechOpen(true)}
              placeholder={selectedTechs.length ? '' : 'Найти технологию…'}
              className="flex-1 min-w-[140px] bg-transparent text-sm outline-none placeholder:text-muted-foreground py-0.5 px-1"
            />
          </div>
          {techOpen && techSuggestions.length > 0 && (
            <div className="absolute z-20 top-full mt-1 w-full rounded-md border border-border bg-card shadow-lg max-h-52 overflow-y-auto">
              {techSuggestions.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); addTech(t); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-left"
                >
                  <Icon name="Cpu" size={14} className="text-muted-foreground shrink-0" />
                  <span className="flex-1">{t.name}</span>
                  <span className="text-[10px] text-muted-foreground">{t.statusLabel}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Requirements */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Icon name="ListChecks" size={18} className="text-accent" /> Требования
        </h2>
        <p className="text-xs text-muted-foreground">
          Привяжите одно или несколько требований напрямую к решению. Используйте фильтр, чтобы искать по типу требования.
        </p>

        <div className="flex items-center gap-2">
          <label className="text-[11px] uppercase tracking-widest text-muted-foreground shrink-0">Тип:</label>
          <select
            value={reqTypeFilter}
            onChange={(e) => setReqTypeFilter(e.target.value as ReqType | '')}
            className="h-9 px-2.5 rounded-md border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
          >
            <option value="">Все типы</option>
            {REQ_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div ref={reqRef} className="relative">
          <div className="flex flex-wrap gap-2 p-2 min-h-10 rounded-md border border-border bg-background focus-within:ring-2 focus-within:ring-accent/30 focus-within:border-accent transition-colors">
            {selectedReqs.map((r) => (
              <span key={r.id} className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-accent/15 text-accent">
                <Icon name="ListChecks" size={11} /> {r.shortDesc}
                <button type="button" onClick={() => removeReq(r.id)} className="ml-0.5 hover:text-destructive transition-colors">
                  <Icon name="X" size={11} />
                </button>
              </span>
            ))}
            <input
              value={reqQuery}
              onChange={(e) => { setReqQuery(e.target.value); setReqOpen(true); }}
              onFocus={() => setReqOpen(true)}
              placeholder={selectedReqs.length ? '' : 'Найти требование…'}
              className="flex-1 min-w-[140px] bg-transparent text-sm outline-none placeholder:text-muted-foreground py-0.5 px-1"
            />
          </div>
          {reqOpen && reqSuggestions.length > 0 && (
            <div className="absolute z-20 top-full mt-1 w-full rounded-md border border-border bg-card shadow-lg max-h-52 overflow-y-auto">
              {reqSuggestions.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); addReq(r); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-left"
                >
                  <Icon name="ListChecks" size={14} className="text-muted-foreground shrink-0" />
                  <span className="flex-1 truncate">{r.shortDesc}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">{r.reqTypeLabel}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}