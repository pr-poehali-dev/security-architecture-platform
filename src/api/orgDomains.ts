const BASE = import.meta.env.VITE_ORG_DOMAINS_URL as string;

export type OrgDomainStatus = 'active' | 'in_development' | 'inactive' | 'archived';

export interface OrgDomain {
  id: string;
  name: string;
  owner: string;
  status: OrgDomainStatus;
  statusLabel: string;
  description: string;
  version: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrgDomainVersion {
  id: number;
  version: string;
  name: string;
  owner: string;
  status: string;
  statusLabel: string;
  description: string;
  changedAt: string;
  changeNote: string;
}

export interface OrgDomainDetail extends OrgDomain {
  versions: OrgDomainVersion[];
}

export interface OrgDomainForm {
  name: string;
  owner: string;
  status: OrgDomainStatus;
  description: string;
  changeNote?: string;
}

export const STATUS_OPTIONS: { value: OrgDomainStatus; label: string }[] = [
  { value: 'active',        label: 'Активен'       },
  { value: 'in_development', label: 'В разработке'  },
  { value: 'inactive',      label: 'Не активен'    },
  { value: 'archived',      label: 'В архиве'      },
];

export async function fetchOrgDomains(): Promise<OrgDomain[]> {
  const res = await fetch(BASE);
  if (!res.ok) throw new Error('Ошибка загрузки');
  return res.json();
}

export async function fetchOrgDomain(id: string): Promise<OrgDomainDetail> {
  const res = await fetch(`${BASE}?id=${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error('Домен не найден');
  return res.json();
}

export async function createOrgDomain(data: OrgDomainForm): Promise<OrgDomain> {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || 'Ошибка создания');
  }
  return res.json();
}

export async function updateOrgDomain(id: string, data: OrgDomainForm): Promise<OrgDomain> {
  const res = await fetch(BASE, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...data }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || 'Ошибка обновления');
  }
  return res.json();
}