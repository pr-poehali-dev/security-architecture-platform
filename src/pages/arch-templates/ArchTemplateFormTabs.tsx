import Icon from '@/components/ui/icon';
import TagInput from '@/components/technologies/TagInput';
import MarkdownViewer from '@/components/technologies/MarkdownViewer';
import MermaidEditor from '@/components/technologies/MermaidEditor';
import SuggestPicker, { SuggestItem } from './SuggestPicker';
import RequirementsSection from './RequirementsSection';
import {
  fetchTagsSuggest,
  fetchTemplatesSuggest,
  fetchTechSuggest,
  fetchDecisionsSuggest,
  addMermaid,
  updateMermaid,
  ArchTemplateFormData,
  TemplateStatus,
  TemplateType,
  TemplateRef,
  TechRef,
  DecisionRef,
  MermaidDiagram,
  TemplateFile,
  RequirementDomainGroup,
  STATUS_OPTIONS,
  TYPE_OPTIONS,
} from '@/api/archTemplates';

export type Tab = 'main' | 'description' | 'links' | 'requirements';

const INPUT = 'w-full h-10 px-3 rounded-md border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors';

const STATUS_STYLE: Record<string, string> = {
  active:         'bg-success/10 text-success',
  on_review:      'bg-blue-500/10 text-blue-400',
  in_development: 'bg-warning/10 text-warning',
  inactive:       'bg-muted text-muted-foreground',
  archived:       'bg-muted text-muted-foreground',
};

export interface ArchTemplateFormTabsProps {
  tab: Tab;
  form: ArchTemplateFormData;
  set: <K extends keyof ArchTemplateFormData>(key: K, val: ArchTemplateFormData[K]) => void;
  isEdit: boolean;
  id: string | undefined;
  mdPreview: boolean;
  setMdPreview: (v: boolean) => void;
  selectedTemplates: TemplateRef[];
  setSelectedTemplates: React.Dispatch<React.SetStateAction<TemplateRef[]>>;
  selectedTechs: TechRef[];
  setSelectedTechs: React.Dispatch<React.SetStateAction<TechRef[]>>;
  selectedDecisions: DecisionRef[];
  setSelectedDecisions: React.Dispatch<React.SetStateAction<DecisionRef[]>>;
  mermaidDiagrams: MermaidDiagram[];
  setMermaidDiagrams: React.Dispatch<React.SetStateAction<MermaidDiagram[]>>;
  files: TemplateFile[];
  setFiles: React.Dispatch<React.SetStateAction<TemplateFile[]>>;
  uploadingFile: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  requirementsByDomain: RequirementDomainGroup[];
  fetchReqs: () => void;
}

export default function ArchTemplateFormTabs({
  tab, form, set, isEdit, id,
  mdPreview, setMdPreview,
  selectedTemplates, setSelectedTemplates,
  selectedTechs, setSelectedTechs,
  selectedDecisions, setSelectedDecisions,
  mermaidDiagrams, setMermaidDiagrams,
  files,
  uploadingFile, fileInputRef, onFileUpload,
  requirementsByDomain, fetchReqs,
}: ArchTemplateFormTabsProps) {
  return (
    <div className="flex-1 px-6 py-6 max-w-[1400px] mx-auto w-full">

      {/* ── TAB: ОСНОВНОЕ ── */}
      {tab === 'main' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-3xl">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-widest">ID</label>
            <input
              readOnly
              value={id ?? `arch-sec-${isEdit ? '' : '(авто)'}`}
              className={`${INPUT} bg-muted/40 text-muted-foreground cursor-default`}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Версия</label>
            <input
              readOnly
              value={isEdit ? '(автоматически)' : '1.0'}
              className={`${INPUT} bg-muted/40 text-muted-foreground cursor-default`}
            />
          </div>

          <div className="flex flex-col gap-1.5 lg:col-span-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
              Название <span className="text-destructive">*</span>
            </label>
            <input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Название шаблона архитектуры"
              required
              className={INPUT}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Тип шаблона</label>
            <select
              value={form.templateType}
              onChange={(e) => set('templateType', e.target.value as TemplateType)}
              className={INPUT}
            >
              {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Статус</label>
            <select
              value={form.status}
              onChange={(e) => set('status', e.target.value as TemplateStatus)}
              className={INPUT}
            >
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1.5 lg:col-span-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Владелец</label>
            <input
              value={form.owner}
              onChange={(e) => set('owner', e.target.value)}
              placeholder="Команда или ответственный"
              className={INPUT}
            />
          </div>

          <div className="flex flex-col gap-1.5 lg:col-span-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Теги</label>
            <TagInput
              value={form.tags}
              onChange={(tags) => set('tags', tags)}
              fetchSuggestions={fetchTagsSuggest}
            />
          </div>

          {isEdit && (
            <div className="flex flex-col gap-1.5 lg:col-span-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Заметка об изменении</label>
              <input
                value={form.changeNote ?? ''}
                onChange={(e) => set('changeNote', e.target.value)}
                placeholder="Что изменилось в этой версии?"
                className={INPUT}
              />
            </div>
          )}
        </div>
      )}

      {/* ── TAB: ОПИСАНИЕ ── */}
      {tab === 'description' && (
        <div className="max-w-3xl flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              <Icon name="FileText" size={12} /> Описание (Markdown)
            </label>
            <button
              type="button"
              onClick={() => setMdPreview(!mdPreview)}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <Icon name={mdPreview ? 'Code' : 'Eye'} size={13} />
              {mdPreview ? 'Редактор' : 'Превью'}
            </button>
          </div>
          {mdPreview ? (
            <div className="rounded-md border border-border bg-card/50 p-4 min-h-[320px]">
              {form.description
                ? <MarkdownViewer>{form.description}</MarkdownViewer>
                : <p className="text-muted-foreground text-sm">Нет содержимого</p>}
            </div>
          ) : (
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={16}
              placeholder="Описание шаблона в формате Markdown…"
              className="w-full px-3 py-2.5 rounded-md border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors font-mono resize-none"
            />
          )}
        </div>
      )}

      {/* ── TAB: СВЯЗИ ── */}
      {tab === 'links' && (
        <div className="max-w-3xl flex flex-col gap-8">

          <SuggestPicker
            label="Связанные шаблоны"
            icon="Boxes"
            selected={selectedTemplates}
            onAdd={(item) => setSelectedTemplates((p) => [...p, item as TemplateRef])}
            onRemove={(rid) => setSelectedTemplates((p) => p.filter((x) => x.id !== rid))}
            fetchFn={fetchTemplatesSuggest as (q: string) => Promise<SuggestItem[]>}
            renderBadge={(item) => {
              const t = item as TemplateRef;
              return (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${t.templateType === 'technical' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>
                  {t.typeLabel}
                </span>
              );
            }}
          />

          <SuggestPicker
            label="Связанные технологии"
            icon="Cpu"
            selected={selectedTechs}
            onAdd={(item) => setSelectedTechs((p) => [...p, item as TechRef])}
            onRemove={(rid) => setSelectedTechs((p) => p.filter((x) => x.id !== rid))}
            fetchFn={fetchTechSuggest as (q: string) => Promise<SuggestItem[]>}
            renderBadge={(item) => {
              const t = item as TechRef;
              return (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${STATUS_STYLE[t.status] ?? 'bg-muted text-muted-foreground'}`}>
                  {t.statusLabel}
                </span>
              );
            }}
          />

          <SuggestPicker
            label="Связанные решения"
            icon="Workflow"
            selected={selectedDecisions}
            onAdd={(item) => setSelectedDecisions((p) => [...p, item as DecisionRef])}
            onRemove={(rid) => setSelectedDecisions((p) => p.filter((x) => x.id !== rid))}
            fetchFn={fetchDecisionsSuggest as (q: string) => Promise<SuggestItem[]>}
            renderBadge={(item) => {
              const d = item as DecisionRef;
              return (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${d.decisionType === 'technical' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>
                  {d.typeLabel}
                </span>
              );
            }}
          />

          {isEdit && id ? (
            <>
              <div className="flex flex-col gap-3">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                  <Icon name="Paperclip" size={12} /> Файлы
                </label>
                <div className="flex flex-col gap-2">
                  {files.map((f) => (
                    <a
                      key={f.id}
                      href={f.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-md border border-border bg-card/50 hover:bg-muted/40 transition-colors text-sm"
                    >
                      <Icon name="FileText" size={16} className="text-muted-foreground shrink-0" />
                      <span className="flex-1 truncate">{f.filename}</span>
                      <span className="text-xs text-muted-foreground">{(f.sizeBytes / 1024).toFixed(1)} KB</span>
                      <Icon name="ExternalLink" size={13} className="text-muted-foreground" />
                    </a>
                  ))}
                  <label className={`flex items-center gap-2 h-10 px-3 rounded-md border border-dashed border-border cursor-pointer hover:bg-muted/30 transition-colors text-sm text-muted-foreground ${uploadingFile ? 'opacity-50 pointer-events-none' : ''}`}>
                    {uploadingFile
                      ? <><Icon name="Loader2" size={15} className="animate-spin" /> Загрузка…</>
                      : <><Icon name="Upload" size={15} /> Прикрепить файл</>}
                    <input ref={fileInputRef} type="file" className="hidden" onChange={onFileUpload} />
                  </label>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                  <Icon name="GitBranch" size={12} /> Mermaid-схемы
                </label>
                <MermaidEditor
                  diagrams={mermaidDiagrams}
                  onAdd={async (title, code) => {
                    const d = await addMermaid(id, title, code);
                    setMermaidDiagrams((p) => [...p, d]);
                    return d;
                  }}
                  onUpdate={async (mid, title, code) => {
                    const d = await updateMermaid(mid, title, code);
                    setMermaidDiagrams((p) => p.map((x) => x.id === mid ? d : x));
                    return d;
                  }}
                />
              </div>
            </>
          ) : (
            <div className="rounded-md border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
              <Icon name="Info" size={15} /> Файлы и Mermaid-схемы доступны после сохранения карточки
            </div>
          )}
        </div>
      )}

      {/* ── TAB: ТРЕБОВАНИЯ ── */}
      {tab === 'requirements' && (
        <div className="max-w-3xl flex flex-col gap-4">
          {!isEdit && (
            <div className="rounded-md border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
              <Icon name="Info" size={15} /> Требования подтягиваются после сохранения карточки — когда привязаны технологии и решения
            </div>
          )}
          {isEdit && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Требования из связанных технологий и решений (включая харденинг), сгруппированные по домену
              </p>
              <button
                type="button"
                onClick={fetchReqs}
                className="h-8 px-3 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
              >
                <Icon name="RefreshCw" size={12} /> Обновить
              </button>
            </div>
          )}
          <RequirementsSection groups={requirementsByDomain} />
        </div>
      )}
    </div>
  );
}
