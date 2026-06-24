import { useState } from 'react';
import Icon from '@/components/ui/icon';
import MermaidPreview from './MermaidPreview';
import { MermaidDiagram, addMermaid, updateMermaid } from '@/api/technologies';

interface Props {
  technologyId: string;
  diagrams: MermaidDiagram[];
  onSaved: (d: MermaidDiagram) => void;
  /** Override save handlers (for non-technology entities) */
  onAdd?: (title: string, code: string) => Promise<MermaidDiagram>;
  onUpdate?: (id: number, title: string, code: string) => Promise<MermaidDiagram>;
}

const SNIPPETS: { label: string; code: string }[] = [
  { label: 'Flowchart', code: `flowchart TD\n  A[Начало] --> B{Условие}\n  B -->|Да| C[Действие]\n  B -->|Нет| D[Конец]` },
  { label: 'Sequence', code: `sequenceDiagram\n  participant A as Клиент\n  participant B as Сервер\n  A->>B: Запрос\n  B-->>A: Ответ` },
  { label: 'Class', code: `classDiagram\n  class Animal {\n    +String name\n    +makeSound()\n  }\n  class Dog {\n    +fetch()\n  }\n  Animal <|-- Dog` },
  { label: 'State', code: `stateDiagram-v2\n  [*] --> Idle\n  Idle --> Running : start\n  Running --> Idle : stop\n  Running --> [*] : finish` },
  { label: 'ER', code: `erDiagram\n  USER ||--o{ ORDER : places\n  ORDER ||--|{ ITEM : contains\n  USER {\n    int id\n    string name\n  }` },
  { label: 'Gantt', code: `gantt\n  title График проекта\n  dateFormat YYYY-MM-DD\n  section Фаза 1\n  Задача 1 :a1, 2024-01-01, 30d\n  Задача 2 :after a1, 20d` },
  { label: 'Pie', code: `pie title Распределение\n  "Frontend" : 40\n  "Backend" : 35\n  "DevOps" : 25` },
  { label: 'GitGraph', code: `gitGraph\n  commit\n  branch feature\n  checkout feature\n  commit\n  commit\n  checkout main\n  merge feature` },
  { label: 'Mindmap', code: `mindmap\nroot((Проект))\n  Фронтенд\n    React\n    TypeScript\n  Бэкенд\n    Python\n    PostgreSQL` },
  { label: 'Timeline', code: `timeline\n  title История версий\n  2022 : Запуск v1.0\n  2023 : Релиз v2.0\n       : Новый UI\n  2024 : v3.0 Текущая` },
  { label: 'XY Chart', code: `xychart-beta\n  title "Продажи по месяцам"\n  x-axis [Янв, Фев, Мар, Апр]\n  y-axis "Сумма" 0 --> 100\n  bar [50, 70, 60, 90]\n  line [50, 70, 60, 90]` },
  { label: 'Quadrant', code: `quadrantChart\n  title Приоритизация задач\n  x-axis Низкий --> Высокий приоритет\n  y-axis Низкая --> Высокая сложность\n  quadrant-1 Делать сейчас\n  quadrant-2 Планировать\n  quadrant-3 Делегировать\n  quadrant-4 Пересмотреть\n  Задача А: [0.7, 0.3]\n  Задача Б: [0.3, 0.7]` },
];

const PLACEHOLDER = SNIPPETS[0].code;

export default function MermaidEditor({ technologyId, diagrams, onSaved, onAdd, onUpdate }: Props) {
  const [editing, setEditing] = useState<MermaidDiagram | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [code, setCode] = useState(PLACEHOLDER);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const openCreate = () => {
    setEditing(null);
    setTitle('');
    setCode(PLACEHOLDER);
    setCreating(true);
    setError('');
  };

  const openEdit = (d: MermaidDiagram) => {
    setEditing(d);
    setTitle(d.title);
    setCode(d.code);
    setCreating(true);
    setError('');
  };

  const cancel = () => { setCreating(false); setEditing(null); };

  const save = async () => {
    if (!code.trim()) { setError('Код схемы обязателен'); return; }
    setSaving(true);
    setError('');
    try {
      let saved: MermaidDiagram;
      if (editing) {
        saved = onUpdate ? await onUpdate(editing.id, title, code) : await updateMermaid(editing.id, title, code);
      } else {
        saved = onAdd ? await onAdd(title, code) : await addMermaid(technologyId, title, code);
      }
      onSaved(saved);
      cancel();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Existing diagrams */}
      {diagrams.map((d) => (
        <div key={d.id} className="rounded-lg border border-border bg-muted/30 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-card">
            <div className="flex items-center gap-2">
              <Icon name="GitBranch" size={16} className="text-accent" />
              <span className="text-sm font-medium">{d.title || 'Без названия'}</span>
            </div>
            <button
              type="button"
              onClick={() => openEdit(d)}
              className="text-xs text-muted-foreground hover:text-accent flex items-center gap-1 transition-colors"
            >
              <Icon name="Pencil" size={12} /> Изменить
            </button>
          </div>
          <div className="p-4">
            <MermaidPreview code={d.code} title={d.title} />
          </div>
        </div>
      ))}

      {/* Editor */}
      {creating ? (
        <div className="rounded-lg border border-accent/40 bg-card p-5 space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Icon name="GitBranch" size={16} className="text-accent" />
            {editing ? 'Редактировать схему' : 'Новая Mermaid-схема'}
          </h3>

          <div>
            <label className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">Название</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Необязательно"
              className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
            />
          </div>

          {/* Snippets */}
          <div>
            <label className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">
              Шаблон схемы
            </label>
            <div className="flex flex-wrap gap-1.5">
              {SNIPPETS.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => setCode(s.code)}
                  className="text-[11px] px-2.5 py-1 rounded border border-border text-muted-foreground hover:border-accent hover:text-accent transition-colors"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">
                Код Mermaid
              </label>
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                rows={12}
                className="w-full px-3 py-2.5 rounded-md border border-border bg-background text-sm font-mono outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors resize-none"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">
                Предпросмотр
              </label>
              <div className="rounded-md border border-border bg-muted/30 p-3 min-h-[220px]">
                {code.trim()
                  ? <MermaidPreview code={code} title={title} className="w-full" />
                  : <div className="flex items-center justify-center h-[180px] text-xs text-muted-foreground">Введите код для предпросмотра</div>
                }
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <Icon name="TriangleAlert" size={14} /> {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="h-9 px-5 rounded-md bg-accent text-accent-foreground text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? <><Icon name="Loader2" size={14} className="animate-spin" /> Сохранение…</> : <><Icon name="Save" size={14} /> Сохранить</>}
            </button>
            <button type="button" onClick={cancel} className="h-9 px-4 rounded-md border border-border text-sm hover:border-accent hover:text-accent transition-colors">
              Отмена
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={openCreate}
          className="w-full h-10 rounded-lg border border-dashed border-border hover:border-accent text-muted-foreground hover:text-accent text-sm flex items-center justify-center gap-2 transition-colors"
        >
          <Icon name="Plus" size={16} /> Добавить Mermaid-схему
        </button>
      )}
    </div>
  );
}