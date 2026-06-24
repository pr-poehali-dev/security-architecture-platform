const BASE = 'https://functions.poehali.dev/c7ab52b7-af0c-44db-9d2e-3ee901e15e55';

export type HardeningStatus = 'active' | 'in_development' | 'inactive' | 'archived';

export interface TagRef { id: number; name: string }

export interface HardeningVersion {
  id: number;
  version: string;
  changeNote: string;
  changedAt: string;
}

export interface SolutionRef {
  id: string;
  name: string;
  status: string;
  statusLabel: string;
  decisionType: string;
  typeLabel: string;
}

export interface RequirementRef {
  id: string;
  shortDesc: string;
  status: string;
  techId: string;
  techName: string;
}

export interface RequirementDomainGroup {
  domainId: string | null;
  domainName: string;
  requirements: RequirementRef[];
}

export interface Hardening {
  id: string;
  name: string;
  owner: string;
  status: HardeningStatus;
  statusLabel: string;
  description: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  tags: TagRef[];
}

export interface HardeningDetail extends Hardening {
  versions: HardeningVersion[];
  solutions: SolutionRef[];
  requirementsByDomain: RequirementDomainGroup[];
}

export interface HardeningFormData {
  name: string;
  owner: string;
  status: HardeningStatus;
  description: string;
  tags: string[];
  solutionIds: string[];
  changeNote?: string;
}

export const STATUS_OPTIONS: { value: HardeningStatus; label: string }[] = [
  { value: 'active',         label: 'Активен'      },
  { value: 'in_development', label: 'В разработке' },
  { value: 'inactive',       label: 'Не активен'   },
  { value: 'archived',       label: 'В архиве'     },
];

export async function fetchHardenings(): Promise<Hardening[]> {
  const res = await fetch(BASE);
  if (!res.ok) throw new Error('Ошибка загрузки');
  return res.json();
}

export async function fetchHardening(id: string): Promise<HardeningDetail> {
  const res = await fetch(`${BASE}?id=${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error('Карточка не найдена');
  return res.json();
}

export async function fetchTagsSuggest(query: string): Promise<TagRef[]> {
  const res = await fetch(`${BASE}?tags_suggest=${encodeURIComponent(query)}`);
  if (!res.ok) return [];
  return res.json();
}

export async function fetchSolutionsSuggest(query: string): Promise<SolutionRef[]> {
  const res = await fetch(`${BASE}?solutions_suggest=${encodeURIComponent(query)}`);
  if (!res.ok) return [];
  return res.json();
}

export async function createHardening(data: HardeningFormData): Promise<Hardening> {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error((e as { error?: string }).error || 'Ошибка создания');
  }
  return res.json();
}

export async function updateHardening(id: string, data: HardeningFormData): Promise<Hardening> {
  const res = await fetch(BASE, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...data }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error((e as { error?: string }).error || 'Ошибка обновления');
  }
  return res.json();
}
