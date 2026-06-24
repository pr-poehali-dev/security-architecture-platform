import Icon from '@/components/ui/icon';
import MermaidEditor from '@/components/technologies/MermaidEditor';
import {
  addMermaid,
  updateMermaid,
  formatBytes,
  MermaidDiagram,
  DecisionFile,
} from '@/api/decisions';

function fileIcon(ct: string) {
  if (ct.startsWith('image/')) return 'Image';
  if (ct === 'application/pdf') return 'FileText';
  if (ct.includes('zip') || ct.includes('archive')) return 'Archive';
  return 'File';
}

interface DecisionFormAttachmentsTabProps {
  currentId: string;
  mermaidDiagrams: MermaidDiagram[];
  onMermaidSaved: (d: MermaidDiagram) => void;
  files: DecisionFile[];
  uploading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function DecisionFormAttachmentsTab({
  currentId,
  mermaidDiagrams,
  onMermaidSaved,
  files,
  uploading,
  fileInputRef,
  handleUpload,
}: DecisionFormAttachmentsTabProps) {
  return (
    <div className="space-y-6">
      {/* Mermaid diagrams */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Icon name="GitBranch" size={18} className="text-accent" /> Mermaid-схемы
        </h2>
        {currentId ? (
          <MermaidEditor
            technologyId={currentId}
            diagrams={mermaidDiagrams}
            onSaved={onMermaidSaved}
            onAdd={(title, code) => addMermaid(currentId, title, code)}
            onUpdate={(mid, title, code) => updateMermaid(mid, title, code)}
          />
        ) : (
          <p className="text-sm text-muted-foreground italic">Сохраните карточку, чтобы добавить схемы</p>
        )}
      </div>

      {/* Files */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Icon name="Paperclip" size={18} className="text-accent" /> Файлы
        </h2>
        {files.length > 0 && (
          <div className="space-y-2">
            {files.map((f) => (
              <div key={f.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
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
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} accept="*/*" />
        {currentId ? (
          <>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full h-10 rounded-lg border border-dashed border-border hover:border-accent text-muted-foreground hover:text-accent text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {uploading
                ? <><Icon name="Loader2" size={16} className="animate-spin" /> Загрузка…</>
                : <><Icon name="Paperclip" size={16} /> Прикрепить файл</>
              }
            </button>
            <p className="text-[11px] text-muted-foreground">Максимальный размер: 20 МБ</p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground italic">Сохраните карточку, чтобы прикрепить файлы</p>
        )}
      </div>
    </div>
  );
}
