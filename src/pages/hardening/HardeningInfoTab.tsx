import { Link } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import MarkdownViewer from '@/components/technologies/MarkdownViewer';
import { HardeningDetail } from '@/api/hardening';

function fmt(iso: string) {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

interface HardeningInfoTabProps {
  item: HardeningDetail;
  showVersions: boolean;
  setShowVersions: (v: boolean) => void;
}

export default function HardeningInfoTab({ item, showVersions, setShowVersions }: HardeningInfoTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <section className="rounded-lg border border-border bg-card p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Icon name="Info" size={18} className="text-accent" /> Основная информация
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
            {[
              { label: 'ID',       value: item.id,           mono: true  },
              { label: 'Версия',   value: item.version,      mono: true  },
              { label: 'Владелец', value: item.owner || '—', mono: false },
              { label: 'Статус',   value: item.statusLabel,  mono: false },
              { label: 'Создано',  value: fmt(item.createdAt), mono: false },
              { label: 'Изменено', value: fmt(item.updatedAt), mono: false },
            ].map((f) => (
              <div key={f.label}>
                <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">{f.label}</div>
                <div className={`text-sm font-medium ${f.mono ? 'font-mono' : ''}`}>{f.value}</div>
              </div>
            ))}
          </div>
        </section>

        {item.description && (
          <section className="rounded-lg border border-border bg-card p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Icon name="FileText" size={18} className="text-accent" /> Описание
            </h2>
            <MarkdownViewer>{item.description}</MarkdownViewer>
          </section>
        )}
      </div>

      <div className="space-y-6">
        <section className="rounded-lg border border-border bg-card p-5">
          <button
            type="button"
            onClick={() => setShowVersions(!showVersions)}
            className="w-full flex items-center justify-between text-sm font-semibold"
          >
            <span className="flex items-center gap-2">
              <Icon name="History" size={16} className="text-accent" /> История версий
              <span className="text-[11px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{item.versions.length}</span>
            </span>
            <Icon name={showVersions ? 'ChevronUp' : 'ChevronDown'} size={16} className="text-muted-foreground" />
          </button>
          {showVersions && (
            <div className="mt-4 space-y-3">
              {item.versions.map((v) => (
                <div key={v.id} className="flex items-start gap-3 text-sm">
                  <span className="font-mono text-accent shrink-0">v{v.version}</span>
                  <div className="min-w-0 flex-1">
                    {v.changeNote && <div className="text-foreground/80">{v.changeNote}</div>}
                    <div className="text-[11px] text-muted-foreground mt-0.5">{fmt(v.changedAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {item.solutions.length > 0 && (
          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="font-semibold mb-3 text-sm flex items-center gap-2">
              <Icon name="Workflow" size={15} className="text-accent" /> Технические решения
            </h2>
            <div className="space-y-1.5">
              {item.solutions.map((s) => (
                <Link key={s.id} to={`/solutions/${s.id}`}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
                >
                  <Icon name="ArrowRight" size={13} className="shrink-0" />
                  <span className="truncate">{s.name}</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
