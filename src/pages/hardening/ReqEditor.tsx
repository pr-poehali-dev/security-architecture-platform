import { useEffect, useRef, useState, useCallback } from 'react';
import Icon from '@/components/ui/icon';
import MarkdownViewer from '@/components/technologies/MarkdownViewer';
import {
  fetchReqContent,
  saveReqMarkdown,
  saveEnvStatus,
  uploadReqImage,
  RequirementRef,
  ReqContent,
  ReqImage,
  EnvName,
  EnvStatus,
  EnvStatusDual,
  ENVS,
  DEFAULT_ENV_STATUS,
  DEFAULT_ENV_STATUS_DUAL,
} from '@/api/hardening';

const ENV_STATUS_STYLE: Record<EnvStatus, { cell: string; icon: string; label: string }> = {
  required:     { cell: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/20', icon: 'Check',         label: 'Обязательно'  },
  conditional:  { cell: 'bg-amber-500/15  text-amber-700  dark:text-amber-300  border-amber-500/20',    icon: 'TriangleAlert', label: 'Условие'      },
  not_required: { cell: 'bg-muted/60 text-muted-foreground border-border',                              icon: 'Minus',         label: 'Не требуется' },
};

const ENV_STATUS_CYCLE: EnvStatus[] = ['required', 'conditional', 'not_required'];

const IOD_ROWS: { key: 'noIod' | 'iod'; label: string }[] = [
  { key: 'noIod', label: 'Без ИОД' },
  { key: 'iod',   label: 'С ИОД'   },
];

interface ReqEditorProps {
  hardeningId: string;
  req: RequirementRef;
}

export default function ReqEditor({ hardeningId, req }: ReqEditorProps) {
  const [content, setContent] = useState<ReqContent>({
    markdown: '', updatedAt: null, images: [], envStatus: { ...DEFAULT_ENV_STATUS_DUAL },
  });
  const [loadingContent, setLoadingContent] = useState(true);
  const [mdValue, setMdValue] = useState('');
  const [mdPreview, setMdPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingEnv, setSavingEnv] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [envSaved, setEnvSaved] = useState(false);
  const [localEnv, setLocalEnv] = useState<EnvStatusDual>({ ...DEFAULT_ENV_STATUS_DUAL });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const envSaveTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!hardeningId) return;
    setLoadingContent(true);
    fetchReqContent(hardeningId, req.id)
      .then((c) => {
        setContent(c);
        setMdValue(c.markdown);
        setLocalEnv(c.envStatus ?? { ...DEFAULT_ENV_STATUS_DUAL });
      })
      .finally(() => setLoadingContent(false));
  }, [hardeningId, req.id]);

  const handleSave = useCallback(async (md: string) => {
    if (!hardeningId) return;
    setSaving(true);
    try {
      const updated = await saveReqMarkdown(hardeningId, req.id, md);
      setContent(updated);
      setSaved(true);
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }, [hardeningId, req.id]);

  const cycleEnv = async (row: 'noIod' | 'iod', env: EnvName) => {
    if (!hardeningId) return;
    const cur = localEnv[row][env];
    const next = ENV_STATUS_CYCLE[(ENV_STATUS_CYCLE.indexOf(cur) + 1) % ENV_STATUS_CYCLE.length];
    const updated: EnvStatusDual = {
      ...localEnv,
      [row]: { ...localEnv[row], [env]: next },
    };
    setLocalEnv(updated);
    setSavingEnv(true);
    try {
      await saveEnvStatus(hardeningId, req.id, updated);
      setEnvSaved(true);
      clearTimeout(envSaveTimer.current);
      envSaveTimer.current = setTimeout(() => setEnvSaved(false), 1500);
    } finally {
      setSavingEnv(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !hardeningId) return;
    setUploading(true);
    try {
      const img = await uploadReqImage(hardeningId, req.id, file);
      setContent((prev) => ({ ...prev, images: [...prev.images, img] }));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (loadingContent) return (
    <div className="flex items-center justify-center h-full py-16 text-muted-foreground gap-2">
      <Icon name="Loader2" size={18} className="animate-spin" /> Загрузка…
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Req header */}
      <div className="pb-3 border-b border-border">
        <div className="text-xs font-mono text-muted-foreground mb-1">{req.id}</div>
        <div className="font-semibold text-sm leading-snug">{req.shortDesc}</div>
        {req.techName && (
          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <Icon name="Cpu" size={12} /> {req.techName}
          </div>
        )}
      </div>

      {/* Матрица сред */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <Icon name="Layers" size={12} /> Применимость по средам
          </span>
          {savingEnv && <Icon name="Loader2" size={12} className="animate-spin text-muted-foreground" />}
          {envSaved && !savingEnv && (
            <span className="text-[11px] text-success flex items-center gap-1">
              <Icon name="Check" size={11} /> Сохранено
            </span>
          )}
        </div>
        <div className="rounded-lg border border-border overflow-hidden">
          {/* Header row: пустая ячейка + 5 сред */}
          <div className="grid grid-cols-[80px_repeat(5,1fr)] border-b border-border bg-muted/30">
            <div className="border-r border-border" />
            {ENVS.map(({ key, label }) => (
              <div key={key} className="px-2 py-2 text-center text-[11px] font-semibold text-muted-foreground border-r last:border-r-0 border-border">
                {label}
              </div>
            ))}
          </div>
          {/* Две строки: Без ИОД / С ИОД */}
          {IOD_ROWS.map((row, rowIdx) => (
            <div key={row.key} className={`grid grid-cols-[80px_repeat(5,1fr)] ${rowIdx < IOD_ROWS.length - 1 ? 'border-b border-border' : ''}`}>
              {/* Лейбл строки */}
              <div className="flex items-center justify-center px-2 py-3 border-r border-border bg-muted/20">
                <span className="text-[10px] font-semibold text-muted-foreground text-center leading-tight">{row.label}</span>
              </div>
              {/* Ячейки сред */}
              {ENVS.map(({ key, label }) => {
                const st = (localEnv[row.key]?.[key] ?? 'not_required') as EnvStatus;
                const style = ENV_STATUS_STYLE[st];
                return (
                  <button
                    key={key}
                    type="button"
                    title={`${row.label} / ${label}: нажмите для смены статуса`}
                    onClick={() => cycleEnv(row.key, key)}
                    disabled={!hardeningId}
                    className={`flex flex-col items-center justify-center gap-1 py-3 px-2 border-r last:border-r-0 border-border transition-all hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed rounded-none ${style.cell}`}
                  >
                    <Icon name={style.icon} size={14} />
                    <span className="text-[10px] font-semibold leading-tight text-center">{style.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        {!hardeningId && (
          <p className="text-[11px] text-muted-foreground">Сохраните карточку, чтобы задавать статусы сред</p>
        )}
      </div>

      {/* Markdown editor */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <Icon name="FileText" size={12} /> Инструкция (Markdown)
          </span>
          <div className="flex items-center gap-2">
            {saved && (
              <span className="text-[11px] text-success flex items-center gap-1">
                <Icon name="Check" size={12} /> Сохранено
              </span>
            )}
            <button
              type="button"
              onClick={() => setMdPreview((p) => !p)}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <Icon name={mdPreview ? 'Code' : 'Eye'} size={13} />
              {mdPreview ? 'Редактор' : 'Превью'}
            </button>
          </div>
        </div>

        {mdPreview ? (
          <div className="rounded-md border border-border bg-card/50 p-4 min-h-[160px]">
            {mdValue
              ? <MarkdownViewer>{mdValue}</MarkdownViewer>
              : <p className="text-muted-foreground text-sm">Нет содержимого</p>}
          </div>
        ) : (
          <textarea
            value={mdValue}
            onChange={(e) => setMdValue(e.target.value)}
            rows={8}
            placeholder="Опишите инструкцию по настройке в формате Markdown…"
            className="w-full px-3 py-2.5 rounded-md border border-border bg-background text-sm font-mono outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors resize-y min-h-[160px]"
          />
        )}

        <button
          type="button"
          onClick={() => handleSave(mdValue)}
          disabled={saving}
          className="self-end h-8 px-4 rounded-md bg-accent text-accent-foreground text-xs font-medium flex items-center gap-1.5 hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving
            ? <><Icon name="Loader2" size={13} className="animate-spin" /> Сохранение…</>
            : <><Icon name="Save" size={13} /> Сохранить</>}
        </button>
      </div>

      {/* Images */}
      <div className="border-t border-border pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <Icon name="Image" size={12} /> GUI-инструкции
            {content.images.length > 0 && (
              <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[10px]">{content.images.length}</span>
            )}
          </span>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || !hardeningId}
            className="h-7 px-3 rounded-md border border-border text-xs text-muted-foreground hover:border-accent hover:text-accent transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            {uploading
              ? <><Icon name="Loader2" size={12} className="animate-spin" /> Загрузка…</>
              : <><Icon name="Upload" size={12} /> Загрузить</>}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
          />
        </div>

        {content.images.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {content.images.map((img: ReqImage) => (
              <a key={img.id} href={img.url} target="_blank" rel="noreferrer"
                className="group relative rounded-md border border-border overflow-hidden bg-muted/30 hover:border-accent transition-colors">
                <img src={img.url} alt={img.filename}
                  className="w-full h-24 object-cover group-hover:opacity-90 transition-opacity" />
                <div className="absolute inset-x-0 bottom-0 bg-black/60 text-[10px] text-white/80 px-2 py-1 truncate">
                  {img.filename}
                </div>
              </a>
            ))}
          </div>
        )}

        {!hardeningId && (
          <p className="text-[11px] text-muted-foreground">Сохраните карточку, чтобы загружать изображения</p>
        )}
      </div>
    </div>
  );
}
