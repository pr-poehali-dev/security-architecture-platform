import Icon from '@/components/ui/icon';
import { RequirementDomainGroup, EnvStatus, ENVS } from '@/api/archTemplates';

const REQ_STATUS_STYLE: Record<string, string> = {
  active:         'bg-emerald-500/15 text-emerald-400',
  in_development: 'bg-amber-500/15 text-amber-400',
  inactive:       'bg-muted text-muted-foreground',
  archived:       'bg-muted text-muted-foreground',
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

interface RequirementsSectionProps {
  groups: RequirementDomainGroup[];
}

export default function RequirementsSection({ groups }: RequirementsSectionProps) {
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
              const hasEnvData = req.envStatus && (
                Object.values(req.envStatus.noIod).some(s => s !== 'not_required') ||
                Object.values(req.envStatus.iod).some(s => s !== 'not_required')
              );

              return (
                <div key={req.id} className="px-4 py-3 flex flex-col gap-2.5">
                  {/* Заголовок требования */}
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium leading-snug">{req.shortDesc}</div>
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
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${REQ_STATUS_STYLE[req.status] ?? 'bg-muted text-muted-foreground'}`}>
                      {req.status === 'active' ? 'Активно' : req.status === 'in_development' ? 'В работе' : req.status}
                    </span>
                  </div>

                  {/* Матрица применимости по средам */}
                  {hasEnvData ? (
                    <div className="rounded-md border border-border overflow-hidden text-[10px]">
                      {/* Заголовок сред */}
                      <div className="grid grid-cols-[64px_repeat(5,1fr)] border-b border-border bg-muted/30">
                        <div className="border-r border-border" />
                        {ENVS.map(({ key, label }) => (
                          <div key={key} className="py-1.5 text-center font-semibold text-muted-foreground border-r last:border-r-0 border-border">
                            {label}
                          </div>
                        ))}
                      </div>
                      {/* Строки: Без ИОД / С ИОД */}
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
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
