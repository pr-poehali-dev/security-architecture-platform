import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { fetchHardening, HardeningDetail, RequirementRef, RequirementDomainGroup } from '@/api/hardening';
import HardeningInfoTab from './HardeningInfoTab';
import HardeningReqTab from './HardeningReqTab';

const STATUS_STYLE: Record<string, string> = {
  active:         'bg-success/10 text-success border-success/20',
  in_development: 'bg-warning/10 text-warning border-warning/20',
  inactive:       'bg-muted text-muted-foreground border-border',
  archived:       'bg-muted text-muted-foreground border-border',
};

export default function HardeningView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<HardeningDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showVersions, setShowVersions] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'requirements'>('info');
  const [activeReqId, setActiveReqId] = useState<string | null>(null);
  const [reqSearch, setReqSearch] = useState('');

  useEffect(() => {
    if (!id) return;
    fetchHardening(id)
      .then((d) => {
        setItem(d);
        const first = d.requirementsByDomain?.[0]?.requirements?.[0];
        if (first) setActiveReqId(first.id);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center py-32 text-muted-foreground gap-3">
      <Icon name="Loader2" size={22} className="animate-spin" /> Загрузка…
    </div>
  );

  if (error || !item) return (
    <div className="px-6 py-12 max-w-[1400px] mx-auto space-y-4">
      <div className="flex items-center gap-3 p-4 rounded-lg border border-destructive/30 bg-destructive/5 text-destructive text-sm">
        <Icon name="TriangleAlert" size={18} /> {error || 'Карточка не найдена'}
      </div>
      <Link to="/hardening" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <Icon name="ArrowLeft" size={16} /> Вернуться к списку
      </Link>
    </div>
  );

  const allReqs: RequirementRef[] = item.requirementsByDomain.flatMap((g) => g.requirements);
  const filteredGroups: RequirementDomainGroup[] = reqSearch.trim()
    ? item.requirementsByDomain.map((g) => ({
        ...g,
        requirements: g.requirements.filter((r) =>
          r.shortDesc.toLowerCase().includes(reqSearch.toLowerCase()) ||
          r.id.toLowerCase().includes(reqSearch.toLowerCase())),
      })).filter((g) => g.requirements.length > 0)
    : item.requirementsByDomain;
  const activeReq = allReqs.find((r) => r.id === activeReqId) ?? null;

  return (
    <>
      {/* Header */}
      <div className="relative border-b border-border bg-primary text-primary-foreground overflow-hidden">
        <div className="absolute inset-0 grid-texture opacity-[0.08]" />
        <div className="relative px-6 py-6 max-w-[1400px] mx-auto">
          <nav className="flex items-center gap-2 text-sm text-primary-foreground/60 mb-4 flex-wrap">
            <Link to="/hardening" className="hover:text-primary-foreground transition-colors">Харденинг</Link>
            <Icon name="ChevronRight" size={14} />
            <span className="text-primary-foreground font-medium truncate">{item.name}</span>
          </nav>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{item.name}</h1>
                <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full border ${STATUS_STYLE[item.status] ?? 'bg-muted'}`}>
                  {item.statusLabel}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-2 text-sm text-primary-foreground/60 flex-wrap">
                <span className="font-mono">{item.id}</span>
                <span>·</span>
                <span>v{item.version}</span>
                {item.owner && <><span>·</span><span>{item.owner}</span></>}
              </div>
              {item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {item.tags.map((t) => (
                    <span key={t.id} className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-primary-foreground/10 text-primary-foreground/80">
                      #{t.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => navigate(`/hardening/${item.id}/edit`)}
              className="h-10 px-5 rounded-md bg-accent text-accent-foreground text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity shrink-0"
            >
              <Icon name="Pencil" size={16} /> Редактировать
            </button>
          </div>
        </div>
      </div>

      {/* Tabs nav */}
      <div className="border-b border-border bg-card/60">
        <div className="px-6 max-w-[1400px] mx-auto flex gap-1">
          {([
            { key: 'info',         label: 'Основное',                       icon: 'Info'        },
            { key: 'requirements', label: 'Техническое решение и харденинг', icon: 'ShieldCheck',
              badge: allReqs.length || undefined },
          ] as const).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === t.key
                  ? 'border-accent text-accent'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon name={t.icon} size={15} />
              {t.label}
              {'badge' in t && t.badge ? (
                <span className="text-[10px] font-mono bg-accent/15 text-accent px-1.5 py-0.5 rounded-full">
                  {t.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="px-6 py-8 max-w-[1400px] mx-auto">
        {activeTab === 'info' && (
          <HardeningInfoTab
            item={item}
            showVersions={showVersions}
            setShowVersions={setShowVersions}
          />
        )}
        {activeTab === 'requirements' && (
          <HardeningReqTab
            hardeningId={item.id}
            allReqs={allReqs}
            filteredGroups={filteredGroups}
            activeReqId={activeReqId}
            setActiveReqId={setActiveReqId}
            reqSearch={reqSearch}
            setReqSearch={setReqSearch}
            activeReq={activeReq}
          />
        )}
      </div>
    </>
  );
}
