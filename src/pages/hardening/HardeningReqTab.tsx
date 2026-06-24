import Icon from '@/components/ui/icon';
import ReqViewer from './ReqViewer';
import { RequirementRef, RequirementDomainGroup } from '@/api/hardening';

interface HardeningReqTabProps {
  hardeningId: string;
  allReqs: RequirementRef[];
  filteredGroups: RequirementDomainGroup[];
  activeReqId: string | null;
  setActiveReqId: (id: string) => void;
  reqSearch: string;
  setReqSearch: (v: string) => void;
  activeReq: RequirementRef | null;
}

export default function HardeningReqTab({
  hardeningId,
  allReqs,
  filteredGroups,
  activeReqId,
  setActiveReqId,
  reqSearch,
  setReqSearch,
  activeReq,
}: HardeningReqTabProps) {
  return (
    <div className="flex gap-6 min-h-[500px]">

      {/* LEFT: список требований */}
      <div className="w-72 shrink-0 flex flex-col rounded-lg border border-border bg-card overflow-hidden">
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
                placeholder="Поиск…"
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
              <p className="text-xs">Нет связанных требований</p>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">Ничего не найдено</div>
          ) : (
            filteredGroups.map((group) => (
              <div key={group.domainId ?? '__none__'}>
                <div className="px-3 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground/60 bg-muted/20 border-b border-border/50 font-medium">
                  {group.domainName}
                </div>
                {group.requirements.map((req) => {
                  const isActive = activeReqId === req.id;
                  return (
                    <button
                      key={req.id}
                      type="button"
                      onClick={() => setActiveReqId(req.id)}
                      className={`w-full text-left px-3 py-2.5 border-b border-border/40 transition-colors ${
                        isActive
                          ? 'bg-accent/10 border-l-2 border-l-accent'
                          : 'hover:bg-muted/40'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className={`mt-1 size-1.5 rounded-full shrink-0 ${
                          req.status === 'active' ? 'bg-emerald-400' :
                          req.status === 'in_development' ? 'bg-amber-400' : 'bg-muted-foreground/40'
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
            ))
          )}
        </div>
      </div>

      {/* RIGHT: просмотр контента требования */}
      <div className="flex-1 rounded-lg border border-border bg-card overflow-hidden flex flex-col">
        {activeReq ? (
          <>
            {/* Заголовок требования */}
            <div className="px-5 py-4 border-b border-border bg-muted/20">
              <div className="text-xs font-mono text-muted-foreground mb-1">{activeReq.id}</div>
              <div className="font-semibold text-sm leading-snug">{activeReq.shortDesc}</div>
              {activeReq.techName && (
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Icon name="Cpu" size={11} /> {activeReq.techName}
                </div>
              )}
            </div>
            {/* Контент */}
            <div className="flex-1 overflow-y-auto px-5 py-5">
              <ReqViewer key={activeReq.id} hardeningId={hardeningId} req={activeReq} />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground p-8">
            <div className="size-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <Icon name="MousePointerClick" size={28} className="opacity-30" />
            </div>
            <p className="font-medium text-sm">Выберите требование</p>
            <p className="text-xs mt-1 max-w-xs">Нажмите на требование слева для просмотра инструкции</p>
          </div>
        )}
      </div>
    </div>
  );
}
