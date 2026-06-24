import Icon from '@/components/ui/icon';
import TagInput from '@/components/technologies/TagInput';
import {
  fetchTagsSuggest,
  HardeningStatus,
  HardeningFormData,
  STATUS_OPTIONS,
} from '@/api/hardening';

const INPUT = 'w-full h-10 px-3 rounded-md border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors';

interface HardeningFormMainTabProps {
  form: HardeningFormData;
  set: <K extends keyof HardeningFormData>(k: K, v: HardeningFormData[K]) => void;
  isEdit: boolean;
  displayId: string;
  displayVersion: string;
}

export default function HardeningFormMainTab({
  form, set, isEdit, displayId, displayVersion,
}: HardeningFormMainTabProps) {
  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <label className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">ID</label>
        <input readOnly value={displayId} className={`${INPUT} opacity-60 cursor-not-allowed font-mono`} />
      </div>
      <div>
        <label className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">Версия</label>
        <input readOnly value={displayVersion} className={`${INPUT} opacity-60 cursor-not-allowed font-mono`} />
      </div>
      <div>
        <label className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">Название *</label>
        <input
          className={INPUT}
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="Название карточки"
        />
      </div>
      <div>
        <label className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">Владелец</label>
        <input
          className={INPUT}
          value={form.owner}
          onChange={(e) => set('owner', e.target.value)}
          placeholder="Ответственный"
        />
      </div>
      <div>
        <label className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">Статус</label>
        <select
          value={form.status}
          onChange={(e) => set('status', e.target.value as HardeningStatus)}
          className={INPUT + ' cursor-pointer'}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">Теги</label>
        <TagInput
          value={form.tags}
          onChange={(tags) => set('tags', tags)}
          fetchSuggest={fetchTagsSuggest}
        />
      </div>
      {isEdit && (
        <div>
          <label className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">Примечание к изменению</label>
          <input
            className={INPUT}
            value={form.changeNote ?? ''}
            onChange={(e) => set('changeNote', e.target.value)}
            placeholder="Что изменилось?"
          />
        </div>
      )}
    </div>
  );
}
