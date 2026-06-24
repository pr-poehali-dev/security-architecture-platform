import Icon from '@/components/ui/icon';
import ReqEditor from './ReqEditor';
import { SolutionRef, RequirementRef, RequirementDomainGroup } from '@/api/hardening';

interface HardeningFormLinksTabProps {
  // Solutions
  selectedSolutions: SolutionRef[];
  solQuery: string;
  setSolQuery: (v: string) => void;
  solOpen: boolean;
  setSolOpen: (v: boolean) => void;
  solSuggestions: SolutionRef[];
  solRef: React.RefObject<HTMLDivElement>;
  addSolution: (s: SolutionRef) => void;
  removeSolution: (id: string) => void;
  // Requirements
  allReqs: RequirementRef[];
  filteredReqs: RequirementRef[];
  requirementsByDomain: RequirementDomainGroup[];
  reqSearch: string;
  setReqSearch: (v: string) => void;
  activeReqId: string | null;
  setActiveReqId: (id: string | null) => void;
  activeReq: RequirementRef | null;
  currentHardeningId: string;
}

export default function HardeningFormLinksTab({
  selectedSolutions, solQuery, setSolQuery, solOpen, setSolOpen,
  solSuggestions, solRef, addSolution, removeSolution,
  allReqs, filteredReqs, requirementsByDomain,
  reqSearch, setReqSearch,
  activeReqId, setActiveReqId, activeReq,
  currentHardeningId,
}: HardeningFormLinksTabProps) {
  return (
    <div className="flex gap-6 h-[calc(100vh-280px)] min-h-[500px]">

      {/* LEFT: требования */}
      <div className="w-72 shrink-0 flex flex-col gap-3">
        {/* Привязка решений */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <h3 className="text-xs font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-widest">
            <Icon name="Workflow" size={13} className="text-accent" /> Решение
          </h3>
          {selectedSolutions.length > 0 && (
            <div className="space-y-1.5">
              {selectedSolutions.map((s) => (
                <div key={s.id} className="flex items-center gap-1.5 text-xs bg-accent/5 border border-accent/20 rounded px-2 py-1.5">
                  <Icon name="Workflow" size={11} className="text-accent shrink-0" />
                  <span className="flex-1 truncate">{s.name}</span>
                  <button type="button" onClick={() => removeSolution(s.id)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                    <Icon name="X" size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div ref={solRef} className="relative">
            <div className="flex items-center gap-1.5 h-8 px-2 rounded border border-border bg-background text-xs text-muted-foreground">
              <Icon name="Search" size={12} />
              <input
                className="bg-transparent outline-none flex-1 text-foreground placeholder:text-muted-foreground"
                placeholder="Найти решение…"
                value={solQuery}
                onChange={(e) => { setSolQuery(e.target.value); setSolOpen(true); }}
                onFocus={() => setSolOpen(true)}
              />
            </div>
            {solOpen && solSuggestions.length > 0 && (
              <div className="absolute z-20 top-full mt-1 w-full rounded-md border border-border bg-card shadow-lg overflow-hidden">
                {solSuggestions.map((s) => (
                  <button key={s.id} type="button" onClick={() => addSolution(s)}
                    className="w-full flex items-center gap-2 px-2.5 py-2 text-xs hover:bg-muted/60 transition-colors text-left">
                    <Icon name="Workflow" size={12} className="text-accent shrink-0" />
                    <span className="flex-1 truncate">{s.name}</span>
                    <span className="font-mono text-muted-foreground shrink-0">{s.id}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Список требований */}
        <div className="flex-1 flex flex-col rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-3 py-2.5 border-b border-border bg-muted/30">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2 flex items-center gap-1.5">
              <Icon name="ListChecks" size={11} className="text-accent" />
              Требования ИБ
              {allReqs.length > 0 && (
                <span className="ml-auto font-mono bg-accent/15 text-accent px-1.5 py-0.5 rounded-full text-[10px]">
                  {allReqs.length}
                </span>
              )}
            </div>
            {allReqs.length > 0 && (
              <div className="flex items-center gap-1.5 h-7 px-2 rounded border border-border bg-background text-xs text-muted-foreground">
                <Icon name="Search" size={11} />
                <input
                  className="bg-transparent outline-none flex-1 text-foreground placeholder:text-muted-foreground text-xs"
                  placeholder="Поиск требований…"
                  value={reqSearch}
                  onChange={(e) => setReqSearch(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {allReqs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-8 text-center text-muted-foreground px-4">
                <Icon name="ListChecks" size={24} className="mb-2 opacity-30" />
                <p className="text-xs">Привяжите технические решения выше</p>
              </div>
            ) : filteredReqs.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">Ничего не найдено</div>
            ) : (
              requirementsByDomain.map((group) => {
                const groupReqs = group.requirements.filter((r) =>
                  !reqSearch.trim() || filteredReqs.find((fr) => fr.id === r.id));
                if (groupReqs.length === 0) return null;
                return (
                  <div key={group.domainId ?? '__none__'}>
                    <div className="px-3 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground/60 bg-muted/20 border-b border-border/50 font-medium">
                      {group.domainName}
                    </div>
                    {groupReqs.map((req) => {
                      const isActive = activeReqId === req.id;
                      const statusKey = req.status as string;
                      return (
                        <button
                          key={req.id}
                          type="button"
                          onClick={() => setActiveReqId(isActive ? null : req.id)}
                          className={`w-full text-left px-3 py-2.5 border-b border-border/40 transition-colors ${
                            isActive
                              ? 'bg-accent/10 border-l-2 border-l-accent'
                              : 'hover:bg-muted/40'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <div className={`mt-0.5 size-2 rounded-full shrink-0 ${
                              statusKey === 'active' ? 'bg-emerald-400' :
                              statusKey === 'in_development' ? 'bg-amber-400' : 'bg-muted-foreground/40'
                            }`} />
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium leading-snug line-clamp-2">{req.shortDesc}</div>
                              <div className="text-[10px] font-mono text-muted-foreground mt-0.5">{req.id}</div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* RIGHT: редактор контента */}
      <div className="flex-1 rounded-lg border border-border bg-card overflow-hidden flex flex-col">
        {activeReq ? (
          <div className="flex-1 overflow-y-auto p-5">
            <ReqEditor hardeningId={currentHardeningId} req={activeReq} />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground p-8">
            <div className="size-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <Icon name="MousePointerClick" size={28} className="opacity-30" />
            </div>
            <p className="font-medium text-sm">Выберите требование</p>
            <p className="text-xs mt-1 max-w-xs">
              Нажмите на требование слева, чтобы добавить инструкцию по настройке и скриншоты
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
