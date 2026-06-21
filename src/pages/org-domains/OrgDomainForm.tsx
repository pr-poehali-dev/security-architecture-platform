import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import {
  fetchOrgDomain,
  createOrgDomain,
  updateOrgDomain,
  OrgDomainStatus,
  STATUS_OPTIONS,
} from '@/api/orgDomains';

const EMPTY = { name: '', owner: '', status: 'in_development' as OrgDomainStatus, description: '', changeNote: '' };

export default function OrgDomainForm() {
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY);
  const [domainId, setDomainId] = useState('');
  const [currentVersion, setCurrentVersion] = useState('');
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit || !id) return;
    fetchOrgDomain(id)
      .then((d) => {
        setForm({ name: d.name, owner: d.owner, status: d.status, description: d.description, changeNote: '' });
        setDomainId(d.id);
        setCurrentVersion(d.version);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const set = (k: keyof typeof EMPTY, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Заполните поле «Название»'); return; }
    setSaving(true);
    setError('');
    try {
      if (isEdit && id) {
        await updateOrgDomain(id, form);
        navigate(`/org-domain/${id}`);
      } else {
        const created = await createOrgDomain(form);
        navigate(`/org-domain/${created.id}`);
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
          <nav className="flex items-center gap-2 text-sm text-primary-foreground/60 mb-4">
            <Link to="/org-domain" className="hover:text-primary-foreground transition-colors">Организационный домен</Link>
            <Icon name="ChevronRight" size={14} />
            {isEdit && id && (
              <>
                <Link to={`/org-domain/${id}`} className="hover:text-primary-foreground transition-colors">{domainId}</Link>
                <Icon name="ChevronRight" size={14} />
              </>
            )}
            <span className="text-primary-foreground font-medium">{isEdit ? 'Редактирование' : 'Создание'}</span>
          </nav>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            {isEdit ? 'Редактировать домен' : 'Новый организационный домен'}
          </h1>
        </div>
      </div>

      <div className="px-6 py-8 max-w-[800px] mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-6 space-y-5">

            {/* ID — non-editable */}
            <div>
              <label className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">ID</label>
              <div className="h-10 px-3 rounded-md border border-border bg-muted text-muted-foreground text-sm font-mono flex items-center">
                {isEdit ? domainId : 'org-dom- (будет присвоен автоматически)'}
              </div>
            </div>

            {/* Version — non-editable */}
            {isEdit && (
              <div>
                <label className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">Версия</label>
                <div className="h-10 px-3 rounded-md border border-border bg-muted text-muted-foreground text-sm font-mono flex items-center">
                  {currentVersion} → будет увеличена при сохранении
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
                placeholder="Введите название домена"
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
                onChange={(e) => set('status', e.target.value)}
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
                placeholder="Описание организационного домена"
                rows={5}
                className="w-full px-3 py-2.5 rounded-md border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors resize-none"
              />
            </div>

            {/* Change note (edit only) */}
            {isEdit && (
              <div>
                <label className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">Комментарий к изменению</label>
                <input
                  type="text"
                  value={form.changeNote}
                  onChange={(e) => set('changeNote', e.target.value)}
                  placeholder="Что изменилось (необязательно)"
                  className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
                />
              </div>
            )}
          </div>

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
              to={isEdit && id ? `/org-domain/${id}` : '/org-domain'}
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
