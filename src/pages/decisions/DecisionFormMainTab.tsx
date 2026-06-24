import Icon from '@/components/ui/icon';
import TagInput from '@/components/technologies/TagInput';
import {
  fetchTagsSuggest,
  DecisionStatus,
  DecisionFormData,
  STATUS_OPTIONS,
  TYPE_OPTIONS,
} from '@/api/decisions';

const INPUT = 'w-full h-10 px-3 rounded-md border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors';

interface DecisionFormMainTabProps {
  form: DecisionFormData;
  set: <K extends keyof DecisionFormData>(k: K, v: DecisionFormData[K]) => void;
  isEdit: boolean;
  entityId: string;
  currentVersion: string;
}

export default function DecisionFormMainTab({
  form, set, isEdit, entityId, currentVersion,
}: DecisionFormMainTabProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-5">
      {/* ID */}
      <div>
        <label className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">ID</label>
        <div className="h-10 px-3 rounded-md border border-border bg-muted text-muted-foreground text-sm font-mono flex items-center select-none">
          {isEdit ? entityId : 'tos- (присваивается автоматически)'}
        </div>
      </div>

      {isEdit && (
        <div>
          <label className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">Версия</label>
          <div className="h-10 px-3 rounded-md border border-border bg-muted text-muted-foreground text-sm font-mono flex items-center select-none">
            {currentVersion}
          </div>
        </div>
      )}

      {/* Name */}
      <div>
        <label className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">
          Название <span className="text-destructive">*</span>
        </label>
        <input
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="Название решения…"
          autoFocus={!isEdit}
          className={INPUT}
        />
      </div>

      {/* Owner */}
      <div>
        <label className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">Владелец</label>
        <input
          value={form.owner}
          onChange={(e) => set('owner', e.target.value)}
          placeholder="Имя или команда"
          className={INPUT}
        />
      </div>

      {/* Type */}
      <div>
        <label className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">Тип решения</label>
        <div className="flex gap-3">
          {TYPE_OPTIONS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => set('decisionType', t.value)}
              className={`flex-1 h-10 rounded-md border text-sm font-medium transition-colors ${
                form.decisionType === t.value
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border text-muted-foreground hover:border-accent/50 hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Status */}
      <div>
        <label className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">Статус</label>
        <select
          value={form.status}
          onChange={(e) => set('status', e.target.value as DecisionStatus)}
          className={INPUT}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">Теги</label>
        <TagInput
          value={form.tags}
          onChange={(tags) => set('tags', tags)}
          fetchSuggestions={fetchTagsSuggest}
        />
      </div>

      {/* Change note (edit only) */}
      {isEdit && (
        <div>
          <label className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">
            Примечание к изменению
          </label>
          <input
            value={form.changeNote ?? ''}
            onChange={(e) => set('changeNote', e.target.value)}
            placeholder="Что изменилось?"
            className={INPUT}
          />
        </div>
      )}
    </div>
  );
}
