const BASE =
  "https://functions.poehali.dev/4fdf5121-01c9-4ac7-9cca-0c8c17829d68";

//const BASE = 'http://localhost:8000/decisions';

//const BASE = import.meta.env.VITE_DECISIONS_URL as string;

export type DecisionStatus =
  | "active"
  | "in_development"
  | "inactive"
  | "archived";
export type DecisionType = "technical" | "organizational";

export interface TagRef {
  id: number;
  name: string;
}

export interface MermaidDiagram {
  id: number;
  title: string;
  code: string;
  createdAt: string;
  updatedAt: string;
}

export interface DecisionFile {
  id: number;
  filename: string;
  s3Key: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string;
  url: string;
}

export interface DecisionVersion {
  id: number;
  version: string;
  changeNote: string;
  changedAt: string;
}

export interface DecisionRef {
  id: string;
  name: string;
  decisionType: DecisionType;
  typeLabel: string;
  status: DecisionStatus;
  statusLabel: string;
}

export interface TechRef {
  id: string;
  name: string;
  status: string;
  statusLabel: string;
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

export interface Decision {
  id: string;
  name: string;
  owner: string;
  status: DecisionStatus;
  statusLabel: string;
  decisionType: DecisionType;
  typeLabel: string;
  description: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  tags: TagRef[];
}

export interface DecisionDetail extends Decision {
  mermaidDiagrams: MermaidDiagram[];
  files: DecisionFile[];
  versions: DecisionVersion[];
  relatedDecisions: DecisionRef[];
  technologies: TechRef[];
  requirementsByDomain: RequirementDomainGroup[];
}

export interface DecisionFormData {
  name: string;
  owner: string;
  status: DecisionStatus;
  decisionType: DecisionType;
  description: string;
  tags: string[];
  relatedDecisionIds: string[];
  technologyIds: string[];
  changeNote?: string;
}

export const STATUS_OPTIONS: { value: DecisionStatus; label: string }[] = [
  { value: "active", label: "Активен" },
  { value: "in_development", label: "В разработке" },
  { value: "inactive", label: "Не активен" },
  { value: "archived", label: "В архиве" },
];

export const TYPE_OPTIONS: { value: DecisionType; label: string }[] = [
  { value: "technical", label: "Техническое" },
  { value: "organizational", label: "Организационное" },
];

export async function fetchDecisions(): Promise<Decision[]> {
  const res = await fetch(BASE);
  if (!res.ok) throw new Error("Ошибка загрузки");
  return res.json();
}

export async function fetchDecision(id: string): Promise<DecisionDetail> {
  const res = await fetch(`${BASE}?id=${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error("Решение не найдено");
  return res.json();
}

export async function fetchTagsSuggest(query: string): Promise<TagRef[]> {
  const res = await fetch(`${BASE}?tags_suggest=${encodeURIComponent(query)}`);
  if (!res.ok) return [];
  return res.json();
}

export async function fetchDecisionsSuggest(
  query: string,
): Promise<DecisionRef[]> {
  const res = await fetch(
    `${BASE}?decisions_suggest=${encodeURIComponent(query)}`,
  );
  if (!res.ok) return [];
  return res.json();
}

export async function fetchTechSuggest(query: string): Promise<TechRef[]> {
  const res = await fetch(`${BASE}?tech_suggest=${encodeURIComponent(query)}`);
  if (!res.ok) return [];
  return res.json();
}

export async function createDecision(
  data: DecisionFormData,
): Promise<Decision> {
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

export async function updateDecision(
  id: string,
  data: DecisionFormData,
): Promise<Decision> {
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

export async function addMermaid(
  decision_id: string,
  title: string,
  code: string,
): Promise<MermaidDiagram> {
  const res = await fetch(`${BASE}?action=add_mermaid`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision_id, title, code }),
  });
  if (!res.ok) throw new Error("Ошибка сохранения схемы");
  return res.json();
}

export async function updateMermaid(
  id: number,
  title: string,
  code: string,
): Promise<MermaidDiagram> {
  const res = await fetch(`${BASE}?action=update_mermaid`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, title, code }),
  });
  if (!res.ok) throw new Error("Ошибка обновления схемы");
  return res.json();
}

export async function uploadFile(
  decision_id: string,
  file: File,
): Promise<DecisionFile> {
  const arrayBuffer = await file.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let i = 0; i < uint8.length; i++)
    binary += String.fromCharCode(uint8[i]);
  const data_base64 = btoa(binary);

  const res = await fetch(`${BASE}?action=upload_file`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      decision_id,
      filename: file.name,
      content_type: file.type || "application/octet-stream",
      data_base64,
    }),
  });
  if (!res.ok) throw new Error("Ошибка загрузки файла");
  return res.json();
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}
