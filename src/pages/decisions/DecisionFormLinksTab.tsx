import Icon from '@/components/ui/icon';
import { DecisionRef, TechRef } from '@/api/decisions';

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
}

export default function DecisionFormLinksTab({
  selectedDecisions, decQuery, setDecQuery, decOpen, setDecOpen,
  decSuggestions, decRef, addDecision, removeDecision,
  selectedTechs, techQuery, setTechQuery, techOpen, setTechOpen,
  techSuggestions, techRef, addTech, removeTech,
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
    </div>
  );
}
