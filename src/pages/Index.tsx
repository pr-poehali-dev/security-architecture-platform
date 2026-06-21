import { useState } from 'react';
import Icon from '@/components/ui/icon';

type NavItem = { id: string; label: string; icon: string; group: string; count?: number };

const NAV: NavItem[] = [
  { id: 'library', label: 'Пользовательская библиотека', icon: 'Library', group: 'Основное', count: 128 },
  { id: 'org-domain', label: 'Организационный домен', icon: 'Building2', group: 'Домены', count: 34 },
  { id: 'tech-domain', label: 'Технический домен', icon: 'Server', group: 'Домены', count: 41 },
  { id: 'technologies', label: 'Технологии', icon: 'Cpu', group: 'Домены', count: 76 },
  { id: 'requirements', label: 'Требования', icon: 'ListChecks', group: 'Управление', count: 312 },
  { id: 'solutions', label: 'Орг. и технические решения', icon: 'Workflow', group: 'Управление', count: 58 },
  { id: 'hardening', label: 'Харденинг и конфигурации', icon: 'ShieldCheck', group: 'Управление', count: 94 },
  { id: 'architectures', label: 'Архитектуры', icon: 'Network', group: 'Конструктор', count: 22 },
  { id: 'templates', label: 'Шаблоны архитектур', icon: 'Boxes', group: 'Конструктор', count: 12 },
  { id: 'settings', label: 'Настройки', icon: 'Settings', group: 'Система' },
];

const GROUPS = ['Основное', 'Домены', 'Управление', 'Конструктор', 'Система'];

const ACTIVITY = [
  { user: 'А. Соколов', action: 'обновил требование', target: 'ИБ-204 · Шифрование данных', time: '12 мин', color: 'bg-accent' },
  { user: 'М. Орлова', action: 'согласовала архитектуру', target: 'Защищённый периметр v2', time: '48 мин', color: 'bg-success' },
  { user: 'Д. Климов', action: 'добавил конфигурацию', target: 'CIS Benchmark · Linux', time: '2 ч', color: 'bg-primary' },
  { user: 'Система', action: 'выявила несоответствие', target: 'Шаблон «Гибридное облако»', time: '4 ч', color: 'bg-warning' },
];

const ARCH_TEMPLATES = [
  { name: 'Защищённый периметр', desc: 'Эталон сетевой сегментации с DMZ', tags: ['Сеть', 'NGFW'], status: 'Утверждён', tone: 'success' },
  { name: 'Zero Trust доступ', desc: 'Контроль доступа по принципу минимальных привилегий', tags: ['IAM', 'MFA'], status: 'На проверке', tone: 'warning' },
  { name: 'Гибридное облако', desc: 'Безопасная интеграция on-prem и cloud', tags: ['Cloud', 'VPN'], status: 'Черновик', tone: 'muted' },
];

const Index = () => {
  const [active, setActive] = useState('library');
  const [menuOpen, setMenuOpen] = useState(true);

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Overlay (mobile) */}
      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 z-20 bg-black/40 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-30 w-72 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col transition-all duration-300 ${
          menuOpen ? 'translate-x-0 lg:w-72' : '-translate-x-full lg:w-0 lg:overflow-hidden lg:border-r-0'
        }`}
      >
        <div className="h-16 flex items-center gap-3 px-5 border-b border-sidebar-border shrink-0">
          <div className="size-9 rounded-md bg-sidebar-primary flex items-center justify-center shrink-0">
            <Icon name="ShieldCheck" size={20} className="text-sidebar-primary-foreground" />
          </div>
          <div className="leading-tight flex-1">
            <div className="font-semibold text-sidebar-accent-foreground tracking-tight">SecureArch</div>
            <div className="text-[11px] text-sidebar-foreground/60 font-mono">security architecture</div>
          </div>
          <button
            onClick={() => setMenuOpen(false)}
            className="size-8 rounded-md flex items-center justify-center text-sidebar-foreground/60 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/50 transition-colors"
          >
            <Icon name="PanelLeftClose" size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-2.5 space-y-5">
          {GROUPS.map((group) => (
            <div key={group}>
              <div className="px-2.5 mb-1.5 text-[10px] uppercase tracking-widest text-sidebar-foreground/40 font-medium">
                {group}
              </div>
              <div className="space-y-0.5">
                {NAV.filter((n) => n.group === group).map((item) => {
                  const isActive = active === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActive(item.id)}
                      className={`w-full flex items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors group ${
                        isActive
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                          : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                      }`}
                    >
                      <Icon
                        name={item.icon}
                        size={18}
                        className={isActive ? 'text-sidebar-primary' : 'text-sidebar-foreground/60'}
                      />
                      <span className="flex-1 text-left truncate">{item.label}</span>
                      {item.count != null && (
                        <span className="text-[11px] font-mono text-sidebar-foreground/50">{item.count}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 shrink-0 border-b border-border bg-card/80 backdrop-blur-sm flex items-center gap-4 px-6 sticky top-0 z-10">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="size-9 -ml-2 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Меню"
          >
            <Icon name={menuOpen ? 'PanelLeftClose' : 'Menu'} size={20} />
          </button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Платформа</span>
            <Icon name="ChevronRight" size={14} />
            <span className="text-foreground font-medium">
              {NAV.find((n) => n.id === active)?.label}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2 h-9 px-3 rounded-md border border-border bg-background text-sm text-muted-foreground w-64">
              <Icon name="Search" size={16} />
              <span>Поиск по требованиям, решениям…</span>
              <kbd className="ml-auto text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded">⌘K</kbd>
            </div>
            <button className="size-9 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-accent transition-colors">
              <Icon name="Upload" size={16} />
            </button>
            <button className="size-9 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-accent transition-colors">
              <Icon name="Download" size={16} />
            </button>
            <div className="flex -space-x-2 ml-1">
              {['А', 'М', 'Д'].map((l, i) => (
                <div
                  key={i}
                  className="size-9 rounded-full border-2 border-card bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center"
                >
                  {l}
                </div>
              ))}
            </div>
            <button className="h-9 px-4 rounded-md bg-accent text-accent-foreground text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity">
              <Icon name="Plus" size={16} />
              <span className="hidden sm:inline">Архитектура</span>
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          {/* Hero band */}
          <div className="relative border-b border-border bg-primary text-primary-foreground overflow-hidden">
            <div className="absolute inset-0 grid-texture opacity-[0.08]" />
            <div className="relative px-6 py-8 max-w-[1400px] mx-auto">
              <div className="flex items-start justify-between gap-6 flex-wrap">
                <div className="max-w-2xl animate-fade-up">
                  <div className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-accent mb-3 bg-accent/15 px-2.5 py-1 rounded">
                    <span className="size-1.5 rounded-full bg-accent animate-pulse" />
                    Управление требованиями ИБ
                  </div>
                  <h1 className="text-3xl md:text-4xl font-semibold tracking-tight leading-tight">
                    Типовые архитектуры безопасности
                  </h1>
                  <p className="mt-3 text-primary-foreground/70 leading-relaxed">
                    Проектируйте, валидируйте и переиспользуйте архитектуры ИБ. Единая база
                    требований, решений и конфигураций с контролем соответствия.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button className="h-10 px-5 rounded-md bg-accent text-accent-foreground text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity">
                      <Icon name="Workflow" size={16} /> Конструктор архитектур
                    </button>
                    <button className="h-10 px-5 rounded-md border border-primary-foreground/20 text-sm font-medium flex items-center gap-2 hover:bg-primary-foreground/10 transition-colors">
                      <Icon name="GitCompare" size={16} /> Сравнить версии
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 animate-fade-up" style={{ animationDelay: '0.1s' }}>
                  {[
                    { l: 'Доменов', v: '5' },
                    { l: 'Шаблонов', v: '12' },
                    { l: 'Команда', v: '8' },
                    { l: 'Валидаций', v: '1.2K' },
                  ].map((s) => (
                    <div key={s.l} className="rounded-lg border border-primary-foreground/15 bg-primary-foreground/5 px-5 py-4 min-w-[120px]">
                      <div className="text-2xl font-semibold font-mono">{s.v}</div>
                      <div className="text-xs text-primary-foreground/60 mt-1">{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-8 max-w-[1400px] mx-auto space-y-8">
            {/* Templates + Collaboration */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <section className="lg:col-span-2 rounded-lg border border-border bg-card p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-semibold tracking-tight flex items-center gap-2">
                    <Icon name="Boxes" size={18} className="text-accent" />
                    Шаблоны архитектур
                  </h2>
                  <button className="text-xs font-mono text-muted-foreground hover:text-accent flex items-center gap-1">
                    Все шаблоны <Icon name="ArrowRight" size={14} />
                  </button>
                </div>
                <div className="space-y-3">
                  {ARCH_TEMPLATES.map((t) => (
                    <div
                      key={t.name}
                      className="flex items-center gap-4 p-4 rounded-lg border border-border hover:border-accent/50 hover:bg-muted/40 transition-colors cursor-pointer group"
                    >
                      <div className="size-11 rounded-md bg-primary/5 border border-border flex items-center justify-center text-primary group-hover:text-accent transition-colors">
                        <Icon name="Network" size={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{t.name}</div>
                        <div className="text-sm text-muted-foreground truncate">{t.desc}</div>
                      </div>
                      <div className="hidden sm:flex gap-1.5">
                        {t.tags.map((tag) => (
                          <span key={tag} className="text-[11px] font-mono px-2 py-0.5 rounded border border-border text-muted-foreground">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <span
                        className={`text-[11px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${
                          t.tone === 'success'
                            ? 'bg-success/10 text-success'
                            : t.tone === 'warning'
                            ? 'bg-warning/10 text-warning'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {t.status}
                      </span>
                      <Icon name="ChevronRight" size={16} className="text-muted-foreground" />
                    </div>
                  ))}
                </div>
              </section>

              {/* Collaboration feed */}
              <section className="rounded-lg border border-border bg-card p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-semibold tracking-tight flex items-center gap-2">
                    <Icon name="Users" size={18} className="text-accent" />
                    Коллаборация
                  </h2>
                  <span className="size-2 rounded-full bg-success animate-pulse" />
                </div>
                <div className="space-y-1">
                  {ACTIVITY.map((a, i) => (
                    <div key={i} className="flex gap-3 py-2.5">
                      <div className="relative flex flex-col items-center">
                        <span className={`size-2.5 rounded-full ${a.color} mt-1.5 shrink-0`} />
                        {i < ACTIVITY.length - 1 && <span className="w-px flex-1 bg-border mt-1" />}
                      </div>
                      <div className="min-w-0 pb-1">
                        <p className="text-sm leading-snug">
                          <span className="font-medium">{a.user}</span>{' '}
                          <span className="text-muted-foreground">{a.action}</span>
                        </p>
                        <p className="text-sm text-foreground/80 truncate">{a.target}</p>
                        <span className="text-[11px] font-mono text-muted-foreground">{a.time} назад</span>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="mt-4 w-full h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                  <Icon name="MessageSquare" size={14} /> Открыть обсуждение
                </button>
              </section>
            </div>
          </div>

          <footer className="px-6 py-6 border-t border-border text-center text-xs font-mono text-muted-foreground">
            SecureArch · Платформа архитектур безопасности · v0.1
          </footer>
        </main>
      </div>
    </div>
  );
};

export default Index;