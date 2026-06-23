import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import TagInput from '@/components/technologies/TagInput';
import MermaidEditor from '@/components/technologies/MermaidEditor';
import FileAttachments from '@/components/technologies/FileAttachments';
import MarkdownViewer from '@/components/technologies/MarkdownViewer';
import {
  fetchTechnology,
  createTechnology,
  updateTechnology,
  TechStatus,
  STATUS_OPTIONS,
  MermaidDiagram,
  TechFile,
} from '@/api/technologies';

const EMPTY = {
  name: '', owner: '', status: 'in_development' as TechStatus,
  description: '', tags: [] as string[], changeNote: '',
};

type Tab = 'main' | 'description' | 'attachments';

export default function TechnologyForm() {
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY);
  const [domainId, setDomainId] = useState('');
  const [currentVersion, setCurrentVersion] = useState('');
  const [mermaidDiagrams, setMermaidDiagrams] = useState<MermaidDiagram[]>([]);
  const [files, setFiles] = useState<TechFile[]>([]);
  const [techIdForAttach, setTechIdForAttach] = useState('');

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('main');
  const [mdPreview, setMdPreview] = useState(false);

  useEffect(() => {
    if (!isEdit || !id) return;
    fetchTechnology(id)
      .then((d) => {
        setForm({
          name: d.name, owner: d.owner, status: d.status,
          description: d.description, tags: d.tags.map((t) => t.name), changeNote: '',
        });
        setDomainId(d.id);
        setCurrentVersion(d.version);
        setMermaidDiagrams(d.mermaidDiagrams);
        setFiles(d.files);
        setTechIdForAttach(d.id);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const set = <K extends keyof typeof EMPTY>(k: K, v: (typeof EMPTY)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Заполните поле «Название»'); return; }
    setSaving(true);
    setError('');
    try {
      if (isEdit && id) {
        await updateTechnology(id, form);
        navigate(`/technologies/${id}`);
      } else {
        const created = await createTechnology(form);
        navigate(`/technologies/${created.id}`);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const onMermaidSaved = (d: MermaidDiagram) => {
    setMermaidDiagrams((prev) => {
      const idx = prev.findIndex((x) => x.id === d.id);
      return idx >= 0 ? prev.map((x, i) => (i === idx ? d : x)) : [...prev, d];
    });
  };

  if (loading) return (
    <div className="flex items-center justify-center py-32 text-muted-foreground gap-3">
      <Icon name="Loader2" size={22} className="animate-spin" /> Загрузка…
    </div>
  );

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'main',        label: 'Основные поля',  icon: 'LayoutList'  },
    { id: 'description', label: 'Описание',        icon: 'FileText'    },
    { id: 'attachments', label: 'Файлы и схемы',  icon: 'Paperclip'   },
  ];

  return (
    <>
      {/* Header */}
      <div className="relative border-b border-border bg-primary text-primary-foreground overflow-hidden">
        <div className="absolute inset-0 grid-texture opacity-[0.08]" />
        <div className="relative px-6 py-6 max-w-[1400px] mx-auto">
          <nav className="flex items-center gap-2 text-sm text-primary-foreground/60 mb-4 flex-wrap">
            <Link to="/technologies" className="hover:text-primary-foreground transition-colors">Технологии</Link>
            <Icon name="ChevronRight" size={14} />
            {isEdit && id && (
              <>
                <Link to={`/technologies/${id}`} className="hover:text-primary-foreground transition-colors">{domainId}</Link>
                <Icon name="ChevronRight" size={14} />
              </>
            )}
            <span className="text-primary-foreground font-medium">{isEdit ? 'Редактирование' : 'Создание'}</span>
          </nav>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            {isEdit ? 'Редактировать технологию' : 'Новая технология'}
          </h1>
        </div>
      </div>

      {/* Tab bar */}
      <div className="border-b border-border bg-card/60 backdrop-blur-sm sticky top-16 z-10">
        <div className="px-6 max-w-[1400px] mx-auto flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-accent text-accent'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon name={t.icon} size={16} /> {t.label}
              {t.id === 'attachments' && (mermaidDiagrams.length + files.length > 0) && (
                <span className="text-[10px] font-mono bg-accent/15 text-accent px-1.5 py-0.5 rounded-full">
                  {mermaidDiagrams.length + files.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="px-6 py-8 max-w-[1000px] mx-auto space-y-6">

          {/* ── TAB: main ── */}
          {tab === 'main' && (
            <div className="rounded-lg border border-border bg-card p-6 space-y-5">
              {/* ID */}
              <div>
                <label className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">ID</label>
                <div className="h-10 px-3 rounded-md border border-border bg-muted text-muted-foreground text-sm font-mono flex items-center select-none">
                  {isEdit ? domainId : 'tech- (присваивается автоматически)'}
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
                  placeholder="Название технологии"
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
                  placeholder="Ответственный"
                  className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">Статус</label>
                <select
                  value={form.status}
                  onChange={(e) => set('status', e.target.value as TechStatus)}
                  className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors cursor-pointer"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">Теги</label>
                <TagInput value={form.tags} onChange={(tags) => set('tags', tags)} />
                <p className="text-[11px] text-muted-foreground mt-1">Enter или «,» для добавления тега</p>
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
          )}

          {/* ── TAB: description ── */}
          {tab === 'description' && (
            <div className="rounded-lg border border-border bg-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[11px] uppercase tracking-widest text-muted-foreground">Описание (Markdown)</label>
                <button
                  type="button"
                  onClick={() => setMdPreview((v) => !v)}
                  className="text-xs text-muted-foreground hover:text-accent flex items-center gap-1.5 transition-colors"
                >
                  <Icon name={mdPreview ? 'Code' : 'Eye'} size={14} />
                  {mdPreview ? 'Редактор' : 'Предпросмотр'}
                </button>
              </div>

              {mdPreview ? (
                <div className="min-h-[400px] rounded-md border border-border bg-muted/20 p-5">
                  {form.description
                    ? <MarkdownViewer>{form.description}</MarkdownViewer>
                    : <p className="text-sm text-muted-foreground italic">Пусто — введите текст в режиме редактора</p>
                  }
                </div>
              ) : (
                <textarea
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  placeholder={`# Название\n\nОписание технологии с поддержкой **Markdown**.\n\n## Особенности\n\n- Пункт 1\n- Пункт 2\n\n\`\`\`bash\nnpm install\n\`\`\``}
                  rows={20}
                  className="w-full px-3 py-2.5 rounded-md border border-border bg-background text-sm font-mono outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors resize-none"
                />
              )}
              <p className="text-[11px] text-muted-foreground">
                Поддерживается полная Markdown-разметка: заголовки, списки, таблицы, код, ссылки.
              </p>
            </div>
          )}

          {/* ── TAB: attachments ── */}
          {tab === 'attachments' && (
            <div className="space-y-6">
              {!isEdit && !techIdForAttach && (
                <div className="rounded-lg border border-border bg-card p-6">
                  <div className="flex items-center gap-3 p-4 rounded-lg border border-warning/30 bg-warning/5 text-warning text-sm">
                    <Icon name="Info" size={16} />
                    Сначала сохраните технологию, затем добавляйте файлы и схемы.
                  </div>
                </div>
              )}

              {(isEdit || techIdForAttach) && (
                <>
                  <div className="rounded-lg border border-border bg-card p-6">
                    <h2 className="font-semibold mb-4 flex items-center gap-2">
                      <Icon name="GitBranch" size={18} className="text-accent" /> Mermaid-схемы
                    </h2>
                    <MermaidEditor
                      technologyId={id || techIdForAttach}
                      diagrams={mermaidDiagrams}
                      onSaved={onMermaidSaved}
                    />
                  </div>

                  <div className="rounded-lg border border-border bg-card p-6">
                    <h2 className="font-semibold mb-4 flex items-center gap-2">
                      <Icon name="Paperclip" size={18} className="text-accent" /> Прикреплённые файлы
                    </h2>
                    <FileAttachments
                      technologyId={id || techIdForAttach}
                      files={files}
                      onUploaded={(f) => setFiles((prev) => [...prev, f])}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-destructive/30 bg-destructive/5 text-destructive text-sm">
              <Icon name="TriangleAlert" size={16} /> {error}
            </div>
          )}

          {/* Save / Cancel */}
          <div className="flex items-center gap-3 pb-8">
            <button
              type="submit"
              disabled={saving}
              className="h-10 px-6 rounded-md bg-accent text-accent-foreground text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving
                ? <><Icon name="Loader2" size={16} className="animate-spin" /> Сохранение…</>
                : <><Icon name="Save" size={16} /> {isEdit ? 'Сохранить изменения' : 'Создать технологию'}</>
              }
            </button>
            <Link
              to={isEdit && id ? `/technologies/${id}` : '/technologies'}
              className="h-10 px-5 rounded-md border border-border text-sm font-medium flex items-center gap-2 hover:border-accent hover:text-accent transition-colors"
            >
              Отмена
            </Link>
          </div>
        </div>
      </form>
    </>
  );
}