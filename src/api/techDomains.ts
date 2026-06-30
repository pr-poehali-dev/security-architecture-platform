//const BASE = import.meta.env.VITE_TECH_DOMAINS_URL as string;

const BASE =
  "https://functions.poehali.dev/9fa81744-e3d1-4877-aad6-fe08b57027cd";

export type TechDomainStatus =
  | "active"
  | "in_development"
  | "inactive"
  | "archived";

export interface OrgDomainRef {
  id: string;
  name: string;
}

export interface TechDomain {
  id: string;
  name: string;
  owner: string;
  status: TechDomainStatus;
  statusLabel: string;
  description: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  orgDomainIds: string[];
  orgDomains: OrgDomainRef[];
}

export interface TechDomainVersion {
  id: number;
  version: string;
  name: string;
  owner: string;
  status: string;
  statusLabel: string;
  description: string;
  orgDomainIds: string[];
  changedAt: string;
  changeNote: string;
}

export interface TechDomainDetail extends TechDomain {
  allOrgDomains: OrgDomainRef[];
  versions: TechDomainVersion[];
}

export interface TechDomainForm {
  name: string;
  owner: string;
  status: TechDomainStatus;
  description: string;
  orgDomainIds: string[];
  changeNote?: string;
}

export const STATUS_OPTIONS: { value: TechDomainStatus; label: string }[] = [
  { value: "active", label: "Активен" },
  { value: "in_development", label: "В разработке" },
  { value: "inactive", label: "Не активен" },
  { value: "archived", label: "В архиве" },
];

export async function fetchTechDomains(): Promise<TechDomain[]> {
  const res = await fetch(BASE);
  if (!res.ok) throw new Error("Ошибка загрузки");
  return res.json();
}

export async function fetchTechDomain(id: string): Promise<TechDomainDetail> {
  const res = await fetch(`${BASE}?id=${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error("Домен не найден");
  return res.json();
}

export async function fetchOrgDomainsForPicker(): Promise<OrgDomainRef[]> {
  const res = await fetch(`${BASE}?orgList=1`);
  if (!res.ok) throw new Error("Ошибка загрузки орг. доменов");
  return res.json();
}

export async function createTechDomain(
  data: TechDomainForm,
): Promise<TechDomain> {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error((e as { error?: string }).error || "Ошибка создания");
  }
  return res.json();
}

export async function updateTechDomain(
  id: string,
  data: TechDomainForm,
): Promise<TechDomain> {
  const res = await fetch(BASE, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, ...data }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error((e as { error?: string }).error || "Ошибка обновления");
  }
  return res.json();
}
