import { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { useFormCache } from '@/hooks/useFormCache';
import {
  fetchArchTemplate,
  createArchTemplate,
  updateArchTemplate,
  uploadFile,
  ArchTemplateFormData,
  TemplateStatus,
  TemplateType,
  TemplateRef,
  TechRef,
  DecisionRef,
  MermaidDiagram,
  TemplateFile,
  RequirementDomainGroup,
} from '@/api/archTemplates';
import ArchTemplateFormTabs, { Tab } from './ArchTemplateFormTabs';

const EMPTY: ArchTemplateFormData = {
  name: '', owner: '', status: 'in_development' as TemplateStatus,
  templateType: 'technical' as TemplateType,
  description: '', tags: [],
  relatedTemplateIds: [], technologyIds: [], decisionIds: [],
  changeNote: '',
};

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'main',         label: 'Основное',   icon: 'Info'       },
  { id: 'description',  label: 'Описание',   icon: 'FileText'   },
  { id: 'links',        label: 'Связи',      icon: 'Link'       },
  { id: 'requirements', label: 'Требования', icon: 'ListChecks' },
];

export default function ArchTemplateForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<ArchTemplateFormData>(EMPTY);
  const [tab, setTab] = useState<Tab>('main');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState('');
  const [mdPreview, setMdPreview] = useState(false);
  const [restored, setRestored] = useState(false);

  const [selectedTemplates, setSelectedTemplates] = useState<TemplateRef[]>([]);
  const [selectedTechs, setSelectedTechs] = useState<TechRef[]>([]);
  const [selectedDecisions, setSelectedDecisions] = useState<DecisionRef[]>([]);
  const [requirementsByDomain, setRequirementsByDomain] = useState<RequirementDomainGroup[]>([]);
  const [mermaidDiagrams, setMermaidDiagrams] = useState<MermaidDiagram[]>([]);
  const [files, setFiles] = useState<TemplateFile[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cacheKey = `form:arch-template:${id ?? 'new'}`;
  const { clear } = useFormCache(cacheKey, form, (cached) => {
    setForm(cached);
    setRestored(true);
  });

  function set<K extends keyof ArchTemplateFormData>(key: K, val: ArchTemplateFormData[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  useEffect(() => {
    if (!isEdit || !id) return;
    fetchArchTemplate(id)
      .then((d) => {
        setForm({
          name: d.name, owner: d.owner, status: d.status,
          templateType: d.templateType, description: d.description,
          tags: d.tags.map((t) => t.name),
          relatedTemplateIds: d.relatedTemplates.map((t) => t.id),
          technologyIds: d.technologies.map((t) => t.id),
          decisionIds: d.decisions.map((dc) => dc.id),
          changeNote: '',
        });
        setSelectedTemplates(d.relatedTemplates);
        setSelectedTechs(d.technologies);
        setSelectedDecisions(d.decisions);
        setMermaidDiagrams(d.mermaidDiagrams);
        setFiles(d.files);
        setRequirementsByDomain(d.requirementsByDomain);
        clear();
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const fetchReqs = useCallback(() => {
    if (!isEdit || !id) return;
    fetchArchTemplate(id).then((d) => setRequirementsByDomain(d.requirementsByDomain)).catch(() => {});
  }, [id, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const data: ArchTemplateFormData = {
        ...form,
        relatedTemplateIds: selectedTemplates.map((t) => t.id),
        technologyIds: selectedTechs.map((t) => t.id),
        decisionIds: selectedDecisions.map((d) => d.id),
      };
      if (isEdit && id) {
        await updateArchTemplate(id, data);
        clear();
        navigate(`/templates/${id}`);
      } else {
        const created = await createArchTemplate(data);
        clear();
        navigate(`/templates/${created.id}`);
      }
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setUploadingFile(true);
    try {
      const uploaded = await uploadFile(id, file);
      setFiles((prev) => [...prev, uploaded]);
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-32 text-muted-foreground gap-3">
      <Icon name="Loader2" size={22} className="animate-spin" /> Загрузка…
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="flex flex-col min-h-full">
      {/* Header */}
      <div className="relative border-b border-border bg-primary text-primary-foreground overflow-hidden">
        <div className="absolute inset-0 grid-texture opacity-[0.08]" />
        <div className="relative px-6 py-6 max-w-[1400px] mx-auto">
          <div className="flex items-center gap-2 text-sm text-primary-foreground/60 mb-3">
            <Link to="/templates" className="hover:text-primary-foreground transition-colors flex items-center gap-1.5">
              <Icon name="ChevronLeft" size={16} /> Шаблоны архитектур
            </Link>
          </div>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-4">
              <div className="size-10 rounded-lg bg-primary-foreground/10 border border-primary-foreground/15 flex items-center justify-center shrink-0">
                <Icon name={isEdit ? 'Pencil' : 'Plus'} size={20} className="text-accent" />
              </div>
              <div>
                <h1 className="text-xl font-semibold tracking-tight">
                  {isEdit ? 'Редактирование шаблона' : 'Новый шаблон архитектуры'}
                </h1>
                {id && <p className="text-primary-foreground/60 text-sm font-mono mt-0.5">{id}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to={isEdit && id ? `/templates/${id}` : '/templates'}
                className="h-9 px-4 rounded-md border border-primary-foreground/20 text-sm text-primary-foreground/80 hover:text-primary-foreground hover:border-primary-foreground/40 transition-colors flex items-center gap-2"
              >
                <Icon name="X" size={15} /> Отменить
              </Link>
              <button
                type="submit"
                disabled={saving || !form.name.trim()}
                className="h-9 px-5 rounded-md bg-accent text-accent-foreground text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving ? <Icon name="Loader2" size={15} className="animate-spin" /> : <Icon name="Save" size={15} />}
                {isEdit ? 'Сохранить' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Restore banner */}
      {restored && (
        <div className="px-6 py-2 bg-warning/10 border-b border-warning/20 text-sm text-warning flex items-center gap-2 max-w-[1400px] mx-auto w-full">
          <Icon name="RotateCcw" size={14} /> Восстановлен несохранённый черновик
          <button type="button" onClick={() => { setForm(EMPTY); setRestored(false); clear(); }} className="ml-auto text-xs underline">
            Сбросить
          </button>
        </div>
      )}

      {error && (
        <div className="px-6 pt-4 max-w-[1400px] mx-auto w-full">
          <div className="flex items-center gap-3 p-3 rounded-md border border-destructive/30 bg-destructive/5 text-destructive text-sm">
            <Icon name="TriangleAlert" size={16} /> {error}
          </div>
        </div>
      )}

      {/* Tabs nav */}
      <div className="px-6 max-w-[1400px] mx-auto w-full border-b border-border">
        <div className="flex gap-0.5 -mb-px pt-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-accent text-accent'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon name={t.icon} size={15} />
              {t.label}
              {t.id === 'requirements' && requirementsByDomain.length > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-accent/15 text-accent">
                  {requirementsByDomain.reduce((s, g) => s + g.requirements.length, 0)}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <ArchTemplateFormTabs
        tab={tab}
        form={form}
        set={set}
        isEdit={isEdit}
        id={id}
        mdPreview={mdPreview}
        setMdPreview={setMdPreview}
        selectedTemplates={selectedTemplates}
        setSelectedTemplates={setSelectedTemplates}
        selectedTechs={selectedTechs}
        setSelectedTechs={setSelectedTechs}
        selectedDecisions={selectedDecisions}
        setSelectedDecisions={setSelectedDecisions}
        mermaidDiagrams={mermaidDiagrams}
        setMermaidDiagrams={setMermaidDiagrams}
        files={files}
        setFiles={setFiles}
        uploadingFile={uploadingFile}
        fileInputRef={fileInputRef}
        onFileUpload={handleFileUpload}
        requirementsByDomain={requirementsByDomain}
        fetchReqs={fetchReqs}
      />
    </form>
  );
}
