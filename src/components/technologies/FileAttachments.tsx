import { useRef, useState } from 'react';
import Icon from '@/components/ui/icon';
import { TechFile, uploadFile, formatBytes } from '@/api/technologies';

interface Props {
  technologyId: string;
  files: TechFile[];
  onUploaded: (f: TechFile) => void;
}

function fileIcon(contentType: string): string {
  if (contentType.startsWith('image/')) return 'Image';
  if (contentType === 'application/pdf') return 'FileText';
  if (contentType.includes('zip') || contentType.includes('archive')) return 'Archive';
  return 'File';
}

export default function FileAttachments({ technologyId, files, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { setError('Максимальный размер файла — 20 МБ'); return; }

    setUploading(true);
    setError('');
    try {
      const uploaded = await uploadFile(technologyId, file);
      onUploaded(uploaded);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-3">
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f) => (
            <div key={f.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors group">
              <div className="size-9 rounded-md bg-card border border-border flex items-center justify-center shrink-0 text-muted-foreground">
                <Icon name={fileIcon(f.contentType)} size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{f.filename}</div>
                <div className="text-xs text-muted-foreground">{formatBytes(f.sizeBytes)}</div>
              </div>
              <a
                href={f.url}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 h-8 px-3 rounded-md border border-border text-xs flex items-center gap-1.5 hover:border-accent hover:text-accent transition-colors"
              >
                <Icon name="Download" size={12} /> Скачать
              </a>
            </div>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={handleFile}
        accept="*/*"
      />

      {error && (
        <div className="flex items-center gap-2 text-destructive text-sm">
          <Icon name="TriangleAlert" size={14} /> {error}
        </div>
      )}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="w-full h-10 rounded-lg border border-dashed border-border hover:border-accent text-muted-foreground hover:text-accent text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
      >
        {uploading
          ? <><Icon name="Loader2" size={16} className="animate-spin" /> Загрузка…</>
          : <><Icon name="Paperclip" size={16} /> Прикрепить файл</>
        }
      </button>
      <p className="text-[11px] text-muted-foreground">Максимальный размер: 20 МБ</p>
    </div>
  );
}
