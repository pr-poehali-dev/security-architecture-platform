import { useEffect, useRef, useState, useCallback } from 'react';
import { TransformWrapper, TransformComponent, useControls } from 'react-zoom-pan-pinch';
import mermaid from 'mermaid';
import Icon from '@/components/ui/icon';

type MermaidTheme = 'dark' | 'default' | 'forest' | 'neutral' | 'base';

// Инициализируем один раз — все типы диаграмм поддерживаются автоматически
// (повторный initialize() сбрасывает регистрацию модулей)
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  // Разрешаем useMaxWidth=false для всех типов, чтобы схема не обрезалась
  flowchart:   { useMaxWidth: false, htmlLabels: true },
  sequence:    { useMaxWidth: false },
  gantt:       { useMaxWidth: false },
  journey:     { useMaxWidth: false },
  timeline:    { useMaxWidth: false },
  er:          { useMaxWidth: false },
  pie:         { useMaxWidth: false },
  mindmap:     { useMaxWidth: false },
  sankey:      { useMaxWidth: false },
  block:       { useMaxWidth: false },
  packet:      { useMaxWidth: false },
  gitGraph:    { useMaxWidth: false },
  xychart:     { useMaxWidth: false },
  quadrantChart: { useMaxWidth: false },
  requirementDiagram: { useMaxWidth: false },
});

const THEMES: { value: MermaidTheme; label: string }[] = [
  { value: 'dark',    label: 'Тёмная'    },
  { value: 'default', label: 'Светлая'   },
  { value: 'forest',  label: 'Лес'       },
  { value: 'neutral', label: 'Нейтральная'},
  { value: 'base',    label: 'Базовая'   },
];

let counter = 0;

// Кнопки управления зумом — внутри TransformWrapper
function ZoomControls({ onFullscreen }: { onFullscreen: () => void }) {
  const { zoomIn, zoomOut, resetTransform } = useControls();
  return (
    <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
      <button
        type="button"
        onClick={() => zoomIn()}
        title="Увеличить"
        className="size-7 rounded border border-border bg-card/90 backdrop-blur-sm text-muted-foreground hover:text-foreground hover:border-accent transition-colors flex items-center justify-center"
      >
        <Icon name="Plus" size={13} />
      </button>
      <button
        type="button"
        onClick={() => zoomOut()}
        title="Уменьшить"
        className="size-7 rounded border border-border bg-card/90 backdrop-blur-sm text-muted-foreground hover:text-foreground hover:border-accent transition-colors flex items-center justify-center"
      >
        <Icon name="Minus" size={13} />
      </button>
      <button
        type="button"
        onClick={() => resetTransform()}
        title="Сбросить"
        className="size-7 rounded border border-border bg-card/90 backdrop-blur-sm text-muted-foreground hover:text-foreground hover:border-accent transition-colors flex items-center justify-center"
      >
        <Icon name="Crosshair" size={13} />
      </button>
      <button
        type="button"
        onClick={onFullscreen}
        title="На весь экран"
        className="size-7 rounded border border-border bg-card/90 backdrop-blur-sm text-muted-foreground hover:text-foreground hover:border-accent transition-colors flex items-center justify-center"
      >
        <Icon name="Maximize2" size={13} />
      </button>
    </div>
  );
}

interface InnerProps {
  svg: string;
  onFullscreen: () => void;
  compact?: boolean;
}

function MermaidInner({ svg, onFullscreen, compact }: InnerProps) {
  return (
    <TransformWrapper
      initialScale={1}
      minScale={0.2}
      maxScale={8}
      limitToBounds={false}
      doubleClick={{ mode: 'reset' }}
      wheel={{ step: 0.02 }}
      panning={{ velocityDisabled: false }}
    >
      <div className={`relative overflow-hidden rounded-md bg-transparent ${compact ? 'min-h-[120px]' : 'min-h-[220px]'}`}>
        <ZoomControls onFullscreen={onFullscreen} />
        <TransformComponent
          wrapperStyle={{ width: '100%', height: '100%', minHeight: compact ? 120 : 220 }}
          contentStyle={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px' }}
        >
          <div
            dangerouslySetInnerHTML={{ __html: svg }}
            className="[&>svg]:max-w-none [&>svg]:h-auto"
          />
        </TransformComponent>
        <div className="absolute bottom-2 left-2 text-[10px] text-muted-foreground/50 select-none">
          Колесо мыши — зум · Перетащи — панорама · ДвойнойКлик — сброс
        </div>
      </div>
    </TransformWrapper>
  );
}

// Fullscreen Modal
interface ModalProps {
  svg: string;
  title?: string;
  theme: MermaidTheme;
  onThemeChange: (t: MermaidTheme) => void;
  onClose: () => void;
}

function FullscreenModal({ svg, title, theme, onThemeChange, onClose }: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-sm">
      {/* Modal header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card/80 shrink-0">
        <div className="flex items-center gap-3">
          <Icon name="GitBranch" size={18} className="text-accent" />
          <span className="font-medium text-sm">{title || 'Mermaid-схема'}</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Theme switcher */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground uppercase tracking-widest">Тема:</span>
            <div className="flex gap-1">
              {THEMES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => onThemeChange(t.value)}
                  className={`text-[11px] px-2.5 py-1 rounded border transition-colors ${
                    theme === t.value
                      ? 'border-accent bg-accent/15 text-accent'
                      : 'border-border text-muted-foreground hover:border-accent/50 hover:text-foreground'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-8 rounded border border-border text-muted-foreground hover:text-foreground hover:border-destructive transition-colors flex items-center justify-center"
          >
            <Icon name="X" size={16} />
          </button>
        </div>
      </div>

      {/* Full diagram */}
      <div className="flex-1 overflow-hidden relative">
        <TransformWrapper
          initialScale={1}
          minScale={0.1}
          maxScale={12}
          limitToBounds={false}
          doubleClick={{ mode: 'reset' }}
          wheel={{ step: 0.02 }}
          centerOnInit
        >
          <div className="absolute top-3 right-3 z-10 flex flex-col gap-1">
            <ZoomControls onFullscreen={() => {}} />
          </div>
          <TransformComponent
            wrapperStyle={{ width: '100%', height: '100%' }}
            wrapperClass="!w-full !h-full"
            contentStyle={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}
          >
            <div
              dangerouslySetInnerHTML={{ __html: svg }}
              className="[&>svg]:max-w-none [&>svg]:h-auto"
            />
          </TransformComponent>
        </TransformWrapper>
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[11px] text-muted-foreground/50 select-none bg-card/70 backdrop-blur-sm px-3 py-1 rounded-full border border-border/50">
          Колесо мыши — зум · Перетащи — панорама · Двойной клик — сброс · Esc — закрыть
        </div>
      </div>
    </div>
  );
}

interface Props {
  code: string;
  title?: string;
  className?: string;
  compact?: boolean;
  showThemeControls?: boolean;
}

export default function MermaidPreview({ code, title, className = '', compact, showThemeControls = true }: Props) {
  const [svg, setSvg] = useState('');
  const [error, setError] = useState('');
  const [theme, setTheme] = useState<MermaidTheme>('dark');
  const [fullscreen, setFullscreen] = useState(false);
  const idRef = useRef(`mermaid-${++counter}`);
  const renderCount = useRef(0);

  const render = useCallback(async (currentCode: string, currentTheme: MermaidTheme) => {
    if (!currentCode.trim()) { setSvg(''); return; }
    const renderIdx = ++renderCount.current;
    setError('');
    try {
      // Тему передаём через %%init%% директиву прямо в код схемы —
      // это единственный стабильный способ смены темы в mermaid v11
      // без повторного initialize (который сбрасывает реестр диаграмм)
      const themeDirective = `%%{init: {'theme': '${currentTheme}'}}%%\n`;
      const trimmed = currentCode.trimStart();
      const codeWithTheme = trimmed.startsWith('%%')
        ? trimmed.replace(/^%%\{init:.*?\}%%\s*/s, themeDirective)
        : themeDirective + trimmed;

      const id = `${idRef.current}-${renderIdx}`;
      const { svg: rendered } = await mermaid.render(id, codeWithTheme);
      if (renderCount.current === renderIdx) setSvg(rendered);
    } catch (e) {
      if (renderCount.current === renderIdx) {
        setError(String((e as Error)?.message || 'Ошибка синтаксиса'));
        setSvg('');
      }
    }
  }, []);

  useEffect(() => { render(code, theme); }, [code, theme, render]);

  if (!code.trim()) return null;

  return (
    <>
      <div className={className}>
        {/* Theme bar */}
        {showThemeControls && !compact && (
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {THEMES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTheme(t.value)}
                className={`text-[11px] px-2 py-0.5 rounded border transition-colors ${
                  theme === t.value
                    ? 'border-accent bg-accent/15 text-accent'
                    : 'border-border/50 text-muted-foreground hover:border-accent/50 hover:text-foreground'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {error ? (
          <div className="text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded-md p-3">
            <span className="font-mono">{error}</span>
          </div>
        ) : svg ? (
          <MermaidInner
            svg={svg}
            onFullscreen={() => setFullscreen(true)}
            compact={compact}
          />
        ) : (
          <div className={`flex items-center justify-center text-muted-foreground/50 ${compact ? 'min-h-[80px]' : 'min-h-[160px]'}`}>
            <Icon name="Loader2" size={20} className="animate-spin" />
          </div>
        )}
      </div>

      {fullscreen && svg && (
        <FullscreenModal
          svg={svg}
          title={title}
          theme={theme}
          onThemeChange={(t) => { setTheme(t); }}
          onClose={() => setFullscreen(false)}
        />
      )}
    </>
  );
}