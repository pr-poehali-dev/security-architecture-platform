import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { useFormCache } from '@/hooks/useFormCache';
import {
  fetchTechDomain,
  fetchOrgDomainsForPicker,
  createTechDomain,
  updateTechDomain,
  TechDomainStatus,
  STATUS_OPTIONS,
  OrgDomainRef,
} from '@/api/techDomains';

const EMPTY = {
  name: '',
  owner: '',
  status: 'in_development' as TechDomainStatus,
  description: '',
  orgDomainIds: [] as string[],
  changeNote: '',
};

export default function TechDomainForm() {
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const cacheKey = `form:tech-domain:${id ?? 'new'}`;

  const [form, setForm] = useState(EMPTY);
  const [domainId, setDomainId] = useState('');
  const [currentVersion, setCurrentVersion] = useState('');
  const [allOrg, setAllOrg] = useState<OrgDomainRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [restored, setRestored] = useState(false);

  const { clear } = useFormCache(cacheKey, form, (cached) => {
    setForm(cached);
    setRestored(true);
  });

  useEffect(() => {
    const loadOrg = fetchOrgDomainsForPicker();

    if (isEdit && id) {
      Promise.all([fetchTechDomain(id), loadOrg])
        .then(([d, org]) => {
          setForm((prev) => {
            const hasCache = prev.name !== '';
            return hasCache ? prev : {
              name: d.name, owner: d.owner, status: d.status,
              description: d.description, orgDomainIds: d.orgDomainIds, changeNote: '',
            };
          });
          setDomainId(d.id);
          setCurrentVersion(d.version);
          setAllOrg(org);
        })
        .catch((e: Error) => setError(e.message))
        .finally(() => setLoading(false));
    } else {
      loadOrg
        .then(setAllOrg)
        .catch((e: Error) => setError(e.message))
        .finally(() => setLoading(false));
    }
  }, [id, isEdit]);

  const set = <K extends keyof typeof EMPTY>(k: K, v: (typeof EMPTY)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const toggleOrg = (orgId: string) => {
    setForm((f) => ({
      ...f,
      orgDomainIds: f.orgDomainIds.includes(orgId)
        ? f.orgDomainIds.filter((x) => x !== orgId)
        : [...f.orgDomainIds, orgId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Заполните поле «Название»'); return; }
    setSaving(true);
    setError('');
    try {
      if (isEdit && id) {
        await updateTechDomain(id, form);
        clear();
        navigate(`/tech-domain/${id}`);
      } else {
        const created = await createTechDomain(form);
        clear();
        navigate(`/tech-domain/${created.id}`);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-32 text-muted-foreground gap-3">
      <Icon name="Loader2" size={22} className="animate-spin" /> Загрузка…
    </div>
  );

  return (
    <>
      {/* Header */}
      <div className="relative border-b border-border bg-primary text-primary-foreground overflow-hidden">
        <div className="absolute inset-0 grid-texture opacity-[0.08]" />
        <div className="relative px-6 py-6 max-w-[1400px] mx-auto">
          <nav className="flex items-center gap-2 text-sm text-primary-foreground/60 mb-4 flex-wrap">
            <Link to="/tech-domain" className="hover:text-primary-foreground transition-colors">
              Технический домен
            </Link>
            <Icon name="ChevronRight" size={14} />
            {isEdit && id && (
              <>
                <Link to={`/tech-domain/${id}`} className="hover:text-primary-foreground transition-colors">
                  {domainId}
                </Link>
                <Icon name="ChevronRight" size={14} />
              </>
            )}
            <span className="text-primary-foreground font-medium">
              {isEdit ? 'Редактирование' : 'Создание'}
            </span>
          </nav>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            {isEdit ? 'Редактировать технический домен' : 'Новый технический домен'}
          </h1>
        </div>
      </div>

      {restored && (
        <div className="px-6 pt-4 max-w-[900px] mx-auto">
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-warning/30 bg-warning/8 text-warning text-sm">
            <Icon name="RotateCcw" size={15} />
            <span>Восстановлен несохранённый черновик</span>
            <button onClick={() => { clear(); setForm(EMPTY); setRestored(false); }} className="ml-auto text-xs underline underline-offset-2 hover:opacity-70">
              Сбросить
            </button>
          </div>
        </div>
      )}

      <div className="px-6 py-8 max-w-[900px] mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Main fields */}
          <div className="rounded-lg border border-border bg-card p-6 space-y-5">
            <h2 className="font-semibold text-sm uppercase tracking-widest text-muted-foreground">
              Основные поля
            </h2>

            {/* ID */}
            <div>
              <label className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">ID</label>
              <div className="h-10 px-3 rounded-md border border-border bg-muted text-muted-foreground text-sm font-mono flex items-center select-none">
                {isEdit ? domainId : 'tech-dom- (присваивается автоматически)'}
              </div>
            </div>

            {/* Version */}
            {isEdit && (
              <div>
                <label className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">Версия</label>
                <div className="h-10 px-3 rounded-md border border-border bg-muted text-muted-foreground text-sm font-mono flex items-center select-none">
                  {currentVersion} → увеличится при сохранении
                </div>
              </div>
            )}

            {/* Name */}
            <div>
              <label className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">
                Название <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Введите название технического домена"
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
              />
            </div>

            {/* Owner */}
            <div>
              <label className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">Владелец</label>
              <input
                type="text"
                value={form.owner}
                onChange={(e) => set('owner', e.target.value)}
                placeholder="Ответственный за домен"
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">Статус</label>
              <select
                value={form.status}
                onChange={(e) => set('status', e.target.value as TechDomainStatus)}
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors cursor-pointer"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">Описание</label>
              <textarea
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Описание технического домена"
                rows={4}
                className="w-full px-3 py-2.5 rounded-md border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors resize-none"
              />
            </div>
          </div>

          {/* Org domains picker */}
          <div className="rounded-lg border border-border bg-card p-6 space-y-4">
            <div>
              <h2 className="font-semibold text-sm uppercase tracking-widest text-muted-foreground">
                Организационные домены
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Выберите один или несколько организационных доменов для привязки
              </p>
            </div>

            {allOrg.length === 0 ? (
              <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-muted/30 text-sm text-muted-foreground">
                <Icon name="Info" size={16} />
                Нет доступных организационных доменов.{' '}
                <Link to="/org-domain/new" className="text-accent hover:underline" target="_blank">
                  Создать
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {allOrg.map((o) => {
                  const selected = form.orgDomainIds.includes(o.id);
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => toggleOrg(o.id)}
                      className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                        selected
                          ? 'border-accent bg-accent/10'
                          : 'border-border hover:border-accent/50 hover:bg-muted/40'
                      }`}
                    >
                      <div className={`size-5 rounded flex items-center justify-center shrink-0 border transition-colors ${
                        selected ? 'bg-accent border-accent' : 'border-border'
                      }`}>
                        {selected && <Icon name="Check" size={12} className="text-accent-foreground" />}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{o.name}</div>
                        <div className="text-[11px] font-mono text-muted-foreground">{o.id}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {form.orgDomainIds.length > 0 && (
              <div className="flex items-center gap-2 pt-1">
                <Icon name="Check" size={14} className="text-accent" />
                <span className="text-xs text-muted-foreground">
                  Выбрано: {form.orgDomainIds.length}
                </span>
                <button
                  type="button"
                  onClick={() => set('orgDomainIds', [])}
                  className="text-xs text-muted-foreground hover:text-destructive ml-2 transition-colors"
                >
                  Сбросить
                </button>
              </div>
            )}
          </div>

          {/* Change note (edit only) */}
          {isEdit && (
            <div className="rounded-lg border border-border bg-card p-6">
              <label className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">
                Комментарий к изменению
              </label>
              <input
                type="text"
                value={form.changeNote}
                onChange={(e) => set('changeNote', e.target.value)}
                placeholder="Что изменилось (необязательно)"
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
              />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-destructive/30 bg-destructive/5 text-destructive text-sm">
              <Icon name="TriangleAlert" size={16} /> {error}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="h-10 px-6 rounded-md bg-accent text-accent-foreground text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving
                ? <><Icon name="Loader2" size={16} className="animate-spin" /> Сохранение…</>
                : <><Icon name="Save" size={16} /> {isEdit ? 'Сохранить изменения' : 'Создать домен'}</>
              }
            </button>
            <Link
              to={isEdit && id ? `/tech-domain/${id}` : '/tech-domain'}
              className="h-10 px-5 rounded-md border border-border text-sm font-medium flex items-center gap-2 hover:border-accent hover:text-accent transition-colors"
            >
              Отмена
            </Link>
          </div>
        </form>
      </div>
    </>
  );
}