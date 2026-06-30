import { REFRESH_OPTIONS } from '@/hooks/useAutoRefresh';
import Icon from '@/components/ui/icon';

interface RefreshControlProps {
  intervalSeconds: number;
  onIntervalChange: (v: number) => void;
  onRefreshNow: () => void;
}

export default function RefreshControl({
  intervalSeconds,
  onIntervalChange,
  onRefreshNow,
}: RefreshControlProps) {
  const current = REFRESH_OPTIONS.find((o) => o.value === intervalSeconds);

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={onRefreshNow}
        title="Обновить сейчас"
        className="h-9 w-9 flex items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <Icon name="RefreshCw" size={15} />
      </button>
      <select
        value={intervalSeconds}
        onChange={(e) => onIntervalChange(Number(e.target.value))}
        title="Автообновление"
        className="h-9 px-2 rounded-md border border-border bg-background text-sm text-foreground outline-none cursor-pointer"
      >
        {REFRESH_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.value === 0 ? 'Авто: выкл' : `Авто: ${o.label}`}
          </option>
        ))}
      </select>
      {intervalSeconds > 0 && (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          каждые {current?.label}
        </span>
      )}
    </div>
  );
}
