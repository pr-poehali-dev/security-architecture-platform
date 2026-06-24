import Icon from '@/components/ui/icon';
import { RequirementDomainGroup } from '@/api/archTemplates';

const REQ_STATUS_STYLE: Record<string, string> = {
  active:         'bg-emerald-500/15 text-emerald-400',
  in_development: 'bg-amber-500/15 text-amber-400',
  inactive:       'bg-muted text-muted-foreground',
  archived:       'bg-muted text-muted-foreground',
};

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
            {group.requirements.map((req) => (
              <div key={req.id} className="flex items-start gap-3 px-4 py-3">
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
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
