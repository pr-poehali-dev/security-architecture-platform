import { useEffect, useState } from 'react';
import Icon from '@/components/ui/icon';
import MarkdownViewer from '@/components/technologies/MarkdownViewer';
import {
  fetchReqContent,
  RequirementRef,
  ReqContent,
  ReqImage,
  EnvStatus,
  ENVS,
  DEFAULT_ENV_STATUS_DUAL,
} from '@/api/hardening';

const ENV_STATUS_STYLE: Record<EnvStatus, { cell: string; icon: string; label: string }> = {
  required:     { cell: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300', icon: 'Check',         label: 'Обязательно'  },
  conditional:  { cell: 'bg-amber-500/15  text-amber-700  dark:text-amber-300',    icon: 'TriangleAlert', label: 'Условие'      },
  not_required: { cell: 'bg-muted/50 text-muted-foreground',                        icon: 'Minus',         label: 'Не требуется' },
};

// Кеш контента требований в памяти (живёт в рамках сессии)
export const reqContentCache = new Map<string, ReqContent>();

interface ReqViewerProps {
  hardeningId: string;
  req: RequirementRef;
}

export default function ReqViewer({ hardeningId, req }: ReqViewerProps) {
  const cacheKey = `${hardeningId}:${req.id}`;
  const [content, setContent] = useState<ReqContent | null>(
    reqContentCache.get(cacheKey) ?? null,
  );
  const [loading, setLoading] = useState(!reqContentCache.has(cacheKey));
  const [lightbox, setLightbox] = useState<ReqImage | null>(null);

  useEffect(() => {
    if (reqContentCache.has(cacheKey)) return;
    setLoading(true);
    fetchReqContent(hardeningId, req.id)
      .then((c) => {
        reqContentCache.set(cacheKey, c);
        setContent(c);
      })
      .finally(() => setLoading(false));
  }, [hardeningId, req.id, cacheKey]);

  if (loading) return (
    <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
      <Icon name="Loader2" size={16} className="animate-spin" /> Загрузка…
    </div>
  );

  if (!content) return null;

  const envStatus = content.envStatus ?? { ...DEFAULT_ENV_STATUS_DUAL };
  const IOD_ROWS: { key: 'noIod' | 'iod'; label: string }[] = [
    { key: 'noIod', label: 'Без ИОД' },
    { key: 'iod',   label: 'С ИОД'   },
  ];

  return (
    <div className="space-y-5 pt-1">
      {/* Матрица сред */}
      <div>
        <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
          <Icon name="Layers" size={11} /> Применимость по средам
        </div>
        <div className="rounded-lg border border-border overflow-hidden">
          {/* Заголовок: пустая ячейка + среды */}
          <div className="grid grid-cols-[72px_repeat(5,1fr)] border-b border-border bg-muted/30">
            <div className="border-r border-border" />
            {ENVS.map(({ key, label }) => (
              <div key={key} className="px-2 py-1.5 text-center text-[11px] font-semibold text-muted-foreground border-r last:border-r-0 border-border">
                {label}
              </div>
            ))}
          </div>
          {/* Строки: Без ИОД / С ИОД */}
          {IOD_ROWS.map((row, rowIdx) => (
            <div key={row.key} className={`grid grid-cols-[72px_repeat(5,1fr)] ${rowIdx < IOD_ROWS.length - 1 ? 'border-b border-border' : ''}`}>
              <div className="flex items-center justify-center px-1 py-2.5 border-r border-border bg-muted/20">
                <span className="text-[10px] font-semibold text-muted-foreground text-center leading-tight">{row.label}</span>
              </div>
              {ENVS.map(({ key }) => {
                const st = ((envStatus[row.key] ?? {})[key] ?? 'not_required') as EnvStatus;
                const style = ENV_STATUS_STYLE[st];
                return (
                  <div key={key} className={`flex flex-col items-center justify-center gap-1 py-2.5 px-1 border-r last:border-r-0 border-border ${style.cell}`}>
                    <Icon name={style.icon} size={13} />
                    <span className="text-[10px] font-semibold leading-tight text-center">{style.label}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Markdown */}
      {content.markdown ? (
        <div>
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
            <Icon name="FileText" size={11} /> Инструкция
          </div>
          <div className="rounded-lg border border-border bg-card/50 p-4">
            <MarkdownViewer>{content.markdown}</MarkdownViewer>
          </div>
        </div>
      ) : (
        content.images.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">Инструкция не заполнена</p>
        )
      )}

      {/* Изображения */}
      {content.images.length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
            <Icon name="Image" size={11} /> GUI-инструкции
            <span className="font-mono bg-muted px-1.5 py-0.5 rounded">{content.images.length}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {content.images.map((img) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setLightbox(img)}
                className="group relative rounded-md border border-border overflow-hidden bg-muted/30 hover:border-accent transition-colors text-left"
              >
                <img
                  src={img.url}
                  alt={img.filename}
                  className="w-full h-28 object-cover group-hover:opacity-90 transition-opacity"
                />
                <div className="absolute inset-x-0 bottom-0 bg-black/60 text-[10px] text-white/80 px-2 py-1 truncate">
                  {img.filename}
                </div>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                  <Icon name="ZoomIn" size={20} className="text-white drop-shadow" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div
            className="relative max-w-5xl max-h-[90vh] w-full flex flex-col items-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-sm text-white/80">{lightbox.filename}</span>
              <button
                type="button"
                onClick={() => setLightbox(null)}
                className="size-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                <Icon name="X" size={16} />
              </button>
            </div>
            <img
              src={lightbox.url}
              alt={lightbox.filename}
              className="max-h-[80vh] max-w-full rounded-lg object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}