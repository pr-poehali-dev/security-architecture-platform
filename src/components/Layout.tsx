import { useState } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import SectionContent from '@/components/SectionContent';

type NavItem = { id: string; label: string; icon: string; group: string; count?: number };

export const NAV: NavItem[] = [
  { id: 'library',       label: 'Пользовательская библиотека',   icon: 'Library',      group: 'Основное',    count: 128 },
  { id: 'org-domain',    label: 'Организационный домен',          icon: 'Building2',    group: 'Домены',       count: 34  },
  { id: 'tech-domain',   label: 'Технический домен',              icon: 'Server',       group: 'Домены',       count: 41  },
  { id: 'technologies',  label: 'Технологии',                     icon: 'Cpu',          group: 'Домены',       count: 76  },
  { id: 'requirements',  label: 'Требования',                     icon: 'ListChecks',   group: 'Управление',   count: 312 },
  { id: 'solutions',     label: 'Орг. и технические решения',     icon: 'Workflow',     group: 'Управление',   count: 58  },
  { id: 'hardening',     label: 'Харденинг и конфигурации',       icon: 'ShieldCheck',  group: 'Управление',   count: 94  },
  { id: 'architectures', label: 'Архитектуры',                    icon: 'Network',      group: 'Конструктор',  count: 22  },
  { id: 'templates',     label: 'Шаблоны архитектур',             icon: 'Boxes',        group: 'Конструктор',  count: 12  },
  { id: 'settings',      label: 'Настройки',                      icon: 'Settings',     group: 'Система'               },
];

const GROUPS = ['Основное', 'Домены', 'Управление', 'Конструктор', 'Система'];
const VALID_SECTIONS = NAV.map((n) => n.id);

const Layout = () => {
  const { section = 'library' } = useParams<{ section: string }>();
  const [menuOpen, setMenuOpen] = useState(true);

  if (!VALID_SECTIONS.includes(section)) {
    return <Navigate to="/library" replace />;
  }

  const current = NAV.find((n) => n.id === section)!;

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Mobile overlay */}
      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 z-20 bg-black/40 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-30 w-72 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col transition-all duration-300 ${
          menuOpen
            ? 'translate-x-0 lg:w-72'
            : '-translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden lg:border-r-0'
        }`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-sidebar-border shrink-0">
          <Link to="/library" className="size-9 rounded-md bg-sidebar-primary flex items-center justify-center shrink-0">
            <Icon name="ShieldCheck" size={20} className="text-sidebar-primary-foreground" />
          </Link>
          <div className="leading-tight flex-1 min-w-0">
            <div className="font-semibold text-sidebar-accent-foreground tracking-tight">SecureArch</div>
            <div className="text-[11px] text-sidebar-foreground/60 font-mono truncate">security architecture</div>
          </div>
          <button
            onClick={() => setMenuOpen(false)}
            className="size-8 rounded-md flex items-center justify-center text-sidebar-foreground/60 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/50 transition-colors shrink-0"
          >
            <Icon name="PanelLeftClose" size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-2.5 space-y-5">
          {GROUPS.map((group) => {
            const items = NAV.filter((n) => n.group === group);
            if (!items.length) return null;
            return (
              <div key={group}>
                <div className="px-2.5 mb-1.5 text-[10px] uppercase tracking-widest text-sidebar-foreground/40 font-medium">
                  {group}
                </div>
                <div className="space-y-0.5">
                  {items.map((item) => {
                    const isActive = section === item.id;
                    return (
                      <Link
                        key={item.id}
                        to={`/${item.id}`}
                        onClick={() => { if (window.innerWidth < 1024) setMenuOpen(false); }}
                        className={`flex items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors ${
                          isActive
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                            : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                        }`}
                      >
                        <Icon
                          name={item.icon}
                          size={18}
                          className={isActive ? 'text-sidebar-primary shrink-0' : 'text-sidebar-foreground/60 shrink-0'}
                        />
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.count != null && (
                          <span className="text-[11px] font-mono text-sidebar-foreground/50">{item.count}</span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
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

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Платформа</span>
            <Icon name="ChevronRight" size={14} />
            <span className="text-foreground font-medium">{current.label}</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2 h-9 px-3 rounded-md border border-border bg-background text-sm text-muted-foreground w-64">
              <Icon name="Search" size={16} />
              <span>Поиск…</span>
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
                <div key={i} className="size-9 rounded-full border-2 border-card bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center">
                  {l}
                </div>
              ))}
            </div>
            <button className="h-9 px-4 rounded-md bg-accent text-accent-foreground text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity">
              <Icon name="Plus" size={16} />
              <span className="hidden sm:inline">Создать</span>
            </button>
          </div>
        </header>

        {/* Section content */}
        <main className="flex-1 overflow-y-auto">
          <SectionContent section={section} />
        </main>

        <footer className="px-6 py-4 border-t border-border text-center text-xs font-mono text-muted-foreground">
          SecureArch · v0.1
        </footer>
      </div>
    </div>
  );
};

export default Layout;
