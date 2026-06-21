import Icon from '@/components/ui/icon';

const ACTIVITY = [
  { user: 'А. Соколов',  action: 'обновил требование',     target: 'ИБ-204 · Шифрование данных',       time: '12 мин', color: 'bg-accent'   },
  { user: 'М. Орлова',   action: 'согласовала архитектуру', target: 'Защищённый периметр v2',            time: '48 мин', color: 'bg-success'  },
  { user: 'Д. Климов',   action: 'добавил конфигурацию',    target: 'CIS Benchmark · Linux',             time: '2 ч',    color: 'bg-primary'  },
  { user: 'Система',     action: 'выявила несоответствие',  target: 'Шаблон «Гибридное облако»',         time: '4 ч',    color: 'bg-warning'  },
];

const ARCH_TEMPLATES = [
  { name: 'Защищённый периметр', desc: 'Эталон сетевой сегментации с DMZ',                    tags: ['Сеть', 'NGFW'],  status: 'Утверждён',    tone: 'success' },
  { name: 'Zero Trust доступ',   desc: 'Контроль доступа по принципу минимальных привилегий', tags: ['IAM', 'MFA'],    status: 'На проверке',  tone: 'warning' },
  { name: 'Гибридное облако',    desc: 'Безопасная интеграция on-prem и cloud',                tags: ['Cloud', 'VPN'],  status: 'Черновик',     tone: 'muted'   },
];

/* ─── helpers ─────────────────────────────────────────── */

const Hero = ({ title, desc, icon, badge }: { title: string; desc: string; icon: string; badge?: string }) => (
  <div className="relative border-b border-border bg-primary text-primary-foreground overflow-hidden">
    <div className="absolute inset-0 grid-texture opacity-[0.08]" />
    <div className="relative px-6 py-8 max-w-[1400px] mx-auto">
      <div className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-accent mb-3 bg-accent/15 px-2.5 py-1 rounded">
        <span className="size-1.5 rounded-full bg-accent animate-pulse" />
        {badge ?? 'Платформа'}
      </div>
      <div className="flex items-start gap-4">
        <div className="size-12 rounded-xl bg-primary-foreground/10 border border-primary-foreground/15 flex items-center justify-center shrink-0">
          <Icon name={icon} size={24} className="text-accent" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1.5 text-primary-foreground/65 leading-relaxed max-w-xl">{desc}</p>
        </div>
      </div>
    </div>
  </div>
);

const Placeholder = ({ label }: { label: string }) => (
  <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground gap-3">
    <div className="size-14 rounded-full bg-muted flex items-center justify-center">
      <Icon name="Construction" size={26} className="text-muted-foreground/50" />
    </div>
    <p className="font-medium">{label}</p>
    <p className="text-sm max-w-xs">Раздел находится в разработке. Скоро здесь появится контент.</p>
  </div>
);

const statusCls = (tone: string) =>
  tone === 'success'
    ? 'bg-success/10 text-success'
    : tone === 'warning'
    ? 'bg-warning/10 text-warning'
    : 'bg-muted text-muted-foreground';

/* ─── sections ────────────────────────────────────────── */

const Library = () => (
  <>
    <Hero icon="Library" title="Пользовательская библиотека" desc="Централизованное хранилище всех объектов платформы: требований, решений, архитектур и конфигураций." badge="Библиотека" />
    <div className="px-6 py-8 max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
      <section className="lg:col-span-2 rounded-lg border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold tracking-tight flex items-center gap-2">
            <Icon name="Boxes" size={18} className="text-accent" /> Шаблоны архитектур
          </h2>
          <button className="text-xs font-mono text-muted-foreground hover:text-accent flex items-center gap-1">
            Все <Icon name="ArrowRight" size={14} />
          </button>
        </div>
        <div className="space-y-3">
          {ARCH_TEMPLATES.map((t) => (
            <div key={t.name} className="flex items-center gap-4 p-4 rounded-lg border border-border hover:border-accent/50 hover:bg-muted/40 transition-colors cursor-pointer group">
              <div className="size-11 rounded-md bg-primary/5 border border-border flex items-center justify-center text-primary group-hover:text-accent transition-colors">
                <Icon name="Network" size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{t.name}</div>
                <div className="text-sm text-muted-foreground truncate">{t.desc}</div>
              </div>
              <div className="hidden sm:flex gap-1.5">
                {t.tags.map((tag) => (
                  <span key={tag} className="text-[11px] font-mono px-2 py-0.5 rounded border border-border text-muted-foreground">{tag}</span>
                ))}
              </div>
              <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${statusCls(t.tone)}`}>{t.status}</span>
              <Icon name="ChevronRight" size={16} className="text-muted-foreground" />
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold tracking-tight flex items-center gap-2">
            <Icon name="Users" size={18} className="text-accent" /> Коллаборация
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
  </>
);

const OrgDomain = () => (
  <>
    <Hero icon="Building2" title="Организационный домен" desc="Структура организации, роли, политики и организационные меры защиты информации." badge="Домен" />
    <div className="px-6 py-8 max-w-[1400px] mx-auto"><Placeholder label="Организационный домен" /></div>
  </>
);

const TechDomain = () => (
  <>
    <Hero icon="Server" title="Технический домен" desc="Техническая инфраструктура, компоненты и технические меры обеспечения ИБ." badge="Домен" />
    <div className="px-6 py-8 max-w-[1400px] mx-auto"><Placeholder label="Технический домен" /></div>
  </>
);

const Technologies = () => (
  <>
    <Hero icon="Cpu" title="Технологии" desc="Каталог технологий, продуктов и средств защиты с привязкой к доменам и требованиям." badge="Каталог" />
    <div className="px-6 py-8 max-w-[1400px] mx-auto"><Placeholder label="Каталог технологий" /></div>
  </>
);

const Requirements = () => (
  <>
    <Hero icon="ListChecks" title="Требования" desc="Реестр требований информационной безопасности с трассировкой к решениям и архитектурам." badge="Управление" />
    <div className="px-6 py-8 max-w-[1400px] mx-auto"><Placeholder label="Реестр требований" /></div>
  </>
);

const Solutions = () => (
  <>
    <Hero icon="Workflow" title="Организационные и технические решения" desc="Библиотека решений для выполнения требований ИБ: организационные меры и технические контроли." badge="Управление" />
    <div className="px-6 py-8 max-w-[1400px] mx-auto"><Placeholder label="Библиотека решений" /></div>
  </>
);

const Hardening = () => (
  <>
    <Hero icon="ShieldCheck" title="Харденинг и конфигурации" desc="Руководства по усилению защиты систем, базовые конфигурации и профили безопасности." badge="Управление" />
    <div className="px-6 py-8 max-w-[1400px] mx-auto"><Placeholder label="Конфигурации и харденинг" /></div>
  </>
);

const Architectures = () => (
  <>
    <Hero icon="Network" title="Архитектуры" desc="Конструктор типовых архитектур безопасности с компонентами, связями и обоснованием решений." badge="Конструктор" />
    <div className="px-6 py-8 max-w-[1400px] mx-auto"><Placeholder label="Конструктор архитектур" /></div>
  </>
);

const Templates = () => (
  <>
    <Hero icon="Boxes" title="Шаблоны архитектур" desc="Готовые эталонные архитектуры для типовых сценариев защиты: переиспользуйте и адаптируйте под задачи." badge="Конструктор" />
    <div className="px-6 py-8 max-w-[1400px] mx-auto">
      <div className="space-y-3">
        {ARCH_TEMPLATES.map((t) => (
          <div key={t.name} className="flex items-center gap-4 p-5 rounded-lg border border-border bg-card hover:border-accent/50 hover:bg-muted/40 transition-colors cursor-pointer group">
            <div className="size-12 rounded-lg bg-primary/5 border border-border flex items-center justify-center text-primary group-hover:text-accent transition-colors shrink-0">
              <Icon name="Network" size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium">{t.name}</div>
              <div className="text-sm text-muted-foreground mt-0.5">{t.desc}</div>
              <div className="flex gap-1.5 mt-2">
                {t.tags.map((tag) => (
                  <span key={tag} className="text-[11px] font-mono px-2 py-0.5 rounded border border-border text-muted-foreground">{tag}</span>
                ))}
              </div>
            </div>
            <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${statusCls(t.tone)}`}>{t.status}</span>
            <Icon name="ChevronRight" size={16} className="text-muted-foreground" />
          </div>
        ))}
      </div>
    </div>
  </>
);

const Settings = () => (
  <>
    <Hero icon="Settings" title="Настройки" desc="Управление параметрами платформы, пользователями, интеграциями и экспортом данных." badge="Система" />
    <div className="px-6 py-8 max-w-[1400px] mx-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { icon: 'Users',       label: 'Пользователи и роли',   desc: 'Управление доступом и командой' },
          { icon: 'Plug',        label: 'Интеграции',             desc: 'API, экспорт, импорт данных' },
          { icon: 'Bell',        label: 'Уведомления',            desc: 'Настройка оповещений' },
          { icon: 'Palette',     label: 'Интерфейс',              desc: 'Тема, язык, формат дат' },
          { icon: 'Database',    label: 'Резервное копирование',  desc: 'Экспорт и восстановление' },
          { icon: 'ShieldAlert', label: 'Безопасность',           desc: 'SSO, 2FA, журнал аудита' },
        ].map((s) => (
          <button key={s.label} className="flex items-start gap-4 p-5 rounded-lg border border-border bg-card hover:border-accent/50 text-left transition-colors group">
            <div className="size-10 rounded-lg bg-muted flex items-center justify-center shrink-0 group-hover:bg-accent/10 transition-colors">
              <Icon name={s.icon} size={20} className="text-muted-foreground group-hover:text-accent transition-colors" />
            </div>
            <div>
              <div className="font-medium">{s.label}</div>
              <div className="text-sm text-muted-foreground mt-0.5">{s.desc}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  </>
);

/* ─── router ──────────────────────────────────────────── */

const SECTIONS: Record<string, React.FC> = {
  library:       Library,
  'org-domain':  OrgDomain,
  'tech-domain': TechDomain,
  technologies:  Technologies,
  requirements:  Requirements,
  solutions:     Solutions,
  hardening:     Hardening,
  architectures: Architectures,
  templates:     Templates,
  settings:      Settings,
};

const SectionContent = ({ section }: { section: string }) => {
  const Component = SECTIONS[section];
  return Component ? <Component /> : null;
};

export default SectionContent;
