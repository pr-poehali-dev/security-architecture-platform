import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";
import {
  fetchRequirements,
  Requirement,
  STATUS_OPTIONS,
  TYPE_OPTIONS,
} from "@/api/requirements";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import RefreshControl from "@/components/ui/RefreshControl";

const STATUS_STYLE: Record<string, string> = {
  active: "bg-success/10 text-success",
  in_development: "bg-warning/10 text-warning",
  inactive: "bg-muted text-muted-foreground",
  archived: "bg-muted text-muted-foreground",
};

const TYPE_STYLE: Record<string, string> = {
  technical: "bg-blue-500/10 text-blue-400",
  functional: "bg-accent/10 text-accent",
  non_functional: "bg-purple-500/10 text-purple-400",
  organizational: "bg-orange-500/10 text-orange-400",
};

export default function RequirementList() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    fetchRequirements()
      .then(setItems)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const { intervalSeconds, setIntervalSeconds } = useAutoRefresh('requirements', load);

  const filtered = items.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      r.id.toLowerCase().includes(q) ||
      r.shortDesc.toLowerCase().includes(q) ||
      r.owner.toLowerCase().includes(q) ||
      r.tags.some((t) => t.name.toLowerCase().includes(q));
    const matchStatus = !statusFilter || r.status === statusFilter;
    const matchType = !typeFilter || r.reqType === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Icon name="ListChecks" size={22} className="text-accent" />
            Требования
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {items.length} требований в реестре
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RefreshControl
            intervalSeconds={intervalSeconds}
            onIntervalChange={setIntervalSeconds}
            onRefreshNow={load}
          />
          <Link
            to="/requirements/new"
            className="h-9 px-4 rounded-md bg-accent text-accent-foreground text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity"
          >
            <Icon name="Plus" size={16} />
            Добавить требование
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-border bg-background text-sm w-72">
          <Icon
            name="Search"
            size={15}
            className="text-muted-foreground shrink-0"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по ID, описанию, тегам…"
            className="bg-transparent outline-none flex-1 text-sm placeholder:text-muted-foreground"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 px-3 rounded-md border border-border bg-background text-sm outline-none text-muted-foreground"
        >
          <option value="">Все статусы</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-9 px-3 rounded-md border border-border bg-background text-sm outline-none text-muted-foreground"
        >
          <option value="">Все типы</option>
          {TYPE_OPTIONS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20 text-muted-foreground gap-3">
          <Icon name="Loader2" size={20} className="animate-spin" />
          Загрузка…
        </div>
      )}

      {/* Empty */}
      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <Icon
            name="ListChecks"
            size={40}
            className="mx-auto mb-3 opacity-20"
          />
          <p className="text-sm">
            {search || statusFilter || typeFilter
              ? "Ничего не найдено"
              : "Требований пока нет"}
          </p>
          {!search && !statusFilter && !typeFilter && (
            <Link
              to="/requirements/new"
              className="mt-3 inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
            >
              <Icon name="Plus" size={14} /> Создать первое требование
            </Link>
          )}
        </div>
      )}

      {/* Table */}
      {!loading && filtered.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground w-28">
                  ID
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Краткое описание
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground w-44 hidden md:table-cell">
                  Тип
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground w-32 hidden lg:table-cell">
                  Статус
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground w-20 hidden xl:table-cell">
                  Версия
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground w-16 hidden xl:table-cell text-center">
                  Балл
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground w-16 hidden xl:table-cell text-center">
                  Вес
                </th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => navigate(`/requirements/${r.id}`)}
                  className="hover:bg-muted/30 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-accent">
                      {r.id}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium truncate max-w-xs">
                      {r.shortDesc || "—"}
                    </div>
                    {r.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {r.tags.slice(0, 3).map((t) => (
                          <span
                            key={t.id}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                          >
                            {t.name}
                          </span>
                        ))}
                        {r.tags.length > 3 && (
                          <span className="text-[10px] text-muted-foreground">
                            +{r.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${TYPE_STYLE[r.reqType] || "bg-muted text-muted-foreground"}`}
                    >
                      {r.reqTypeLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[r.status] || "bg-muted text-muted-foreground"}`}
                    >
                      {r.statusLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden xl:table-cell">
                    <span className="font-mono text-xs text-muted-foreground">
                      {r.version}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden xl:table-cell text-center">
                    <span className="font-mono text-xs">{r.scorePoint}</span>
                  </td>
                  <td className="px-4 py-3 hidden xl:table-cell text-center">
                    <span className="font-mono text-xs">{r.scoreWeight}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Icon
                      name="ChevronRight"
                      size={16}
                      className="text-muted-foreground"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}