const BASE = 'https://functions.poehali.dev/14afbc19-4fdc-4803-b634-10174f2a44dd';

export type ReqStatus = 'active' | 'in_development' | 'inactive' | 'archived';
export type ReqType = 'technical' | 'functional' | 'non_functional' | 'organizational';

export interface TagRef { id: number; name: string }
export interface TechRef { id: string; name: string; status: string }
export interface TechDomainRef { id: string; name: string; status: string; statusLabel: string }

export interface RequirementVersion {
  id: number;
  version: string;
  changeNote: string;
  changedAt: string;
}

export interface Requirement {
  id: string;
  shortDesc: string;
  description: string;
  reqType: ReqType;
  reqTypeLabel: string;
  owner: string;
  status: ReqStatus;
  statusLabel: string;
  normativeDoc: string;
  controlMetrics: string;
  fulfillmentMethod: string;
  isProcurement: boolean;
  scorePoint: number;
  scoreWeight: number;
  version: string;
  createdAt: string;
  updatedAt: string;
  tags: TagRef[];
  technologies: TechRef[];
  techDomain: TechDomainRef | null;
}

export interface RequirementDetail extends Requirement {
  versions: RequirementVersion[];
}

export interface RequirementFormData {
  shortDesc: string;
  description: string;
  reqType: ReqType;
  owner: string;
  status: ReqStatus;
  normativeDoc: string;
  controlMetrics: string;
  fulfillmentMethod: string;
  isProcurement: boolean;
  scorePoint: number;
  scoreWeight: number;
  tags: string[];
  technologyIds: string[];
  techDomainId: string | null;
  changeNote?: string;
}

export const STATUS_OPTIONS: { value: ReqStatus; label: string }[] = [
  { value: 'active',         label: 'Активен'      },
  { value: 'in_development', label: 'В разработке' },
  { value: 'inactive',       label: 'Не активен'   },
  { value: 'archived',       label: 'В архиве'     },
];

export const TYPE_OPTIONS: { value: ReqType; label: string }[] = [
  { value: 'technical',      label: 'Технические'       },
  { value: 'functional',     label: 'Функциональные'    },
  { value: 'non_functional', label: 'Не функциональные' },
  { value: 'organizational', label: 'Организационный'   },
];

export async function fetchRequirements(): Promise<Requirement[]> {
  const res = await fetch(BASE);
  if (!res.ok) throw new Error('Ошибка загрузки');
  return res.json();
}

export async function fetchRequirement(id: string): Promise<RequirementDetail> {
  const res = await fetch(`${BASE}?id=${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error('Требование не найдено');
  return res.json();
}

export async function fetchTagsSuggest(query: string): Promise<TagRef[]> {
  const res = await fetch(`${BASE}?tags_suggest=${encodeURIComponent(query)}`);
  if (!res.ok) return [];
  return res.json();
}

export async function fetchTechSuggest(query: string): Promise<TechRef[]> {
  const res = await fetch(`${BASE}?tech_suggest=${encodeURIComponent(query)}`);
  if (!res.ok) return [];
  return res.json();
}

export async function fetchTechDomainSuggest(query: string): Promise<TechDomainRef[]> {
  const res = await fetch(`${BASE}?tech_domain_suggest=${encodeURIComponent(query)}`);
  if (!res.ok) return [];
  return res.json();
}

export async function createRequirement(data: RequirementFormData): Promise<Requirement> {
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

export async function updateRequirement(id: string, data: RequirementFormData): Promise<Requirement> {
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