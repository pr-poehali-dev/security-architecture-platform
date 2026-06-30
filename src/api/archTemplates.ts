const BASE =
  "https://functions.poehali.dev/b15826a2-ecbe-459a-9bd1-1517629d5f29";

//const BASE = 'http://localhost:8000/arch-templates';

//const BASE = import.meta.env.VITE_ARCH_TEMPLATES_URL as string;

export type TemplateStatus =
  | "active"
  | "on_review"
  | "in_development"
  | "inactive"
  | "archived";
export type TemplateType = "technical" | "organizational";

export const STATUS_OPTIONS: { value: TemplateStatus; label: string }[] = [
  { value: "active", label: "Активен" },
  { value: "on_review", label: "На ревью" },
  { value: "in_development", label: "В разработке" },
  { value: "inactive", label: "Не активен" },
  { value: "archived", label: "В архиве" },
];

export const TYPE_OPTIONS: { value: TemplateType; label: string }[] = [
  { value: "technical", label: "Техническое" },
  { value: "organizational", label: "Организационное" },
];

export interface TagRef {
  id: number;
  name: string;
}
export interface TemplateVersion {
  id: number;
  version: string;
  changeNote: string;
  changedAt: string;
}
export interface TemplateRef {
  id: string;
  name: string;
  templateType: TemplateType;
  typeLabel: string;
  status: TemplateStatus;
  statusLabel: string;
}
export interface TechRef {
  id: string;
  name: string;
  status: string;
  statusLabel: string;
}
export interface DecisionRef {
  id: string;
  name: string;
  decisionType: string;
  typeLabel: string;
  status: string;
  statusLabel: string;
}
export interface MermaidDiagram {
  id: number;
  title: string;
  code: string;
  createdAt: string;
  updatedAt: string;
}
export interface TemplateFile {
  id: number;
  filename: string;
  s3Key: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string;
  url: string;
}

export type EnvStatus = "required" | "not_required" | "conditional";
export type EnvName = "prod" | "prodlike" | "stage" | "test" | "dev";
export type EnvStatusMap = Record<EnvName, EnvStatus>;
export interface EnvStatusDual {
  noIod: EnvStatusMap;
  iod: EnvStatusMap;
}

export const ENVS: { key: EnvName; label: string }[] = [
  { key: "prod", label: "Prod" },
  { key: "prodlike", label: "ProdLike" },
  { key: "stage", label: "Stage" },
  { key: "test", label: "Test" },
  { key: "dev", label: "Dev" },
];

export interface RequirementRef {
  id: string;
  shortDesc: string;
  status: string;
  techId: string;
  techName: string;
  source: string;
  hardeningId?: string | null;
  envStatus?: EnvStatusDual;
}
export interface RequirementDomainGroup {
  domainId: string | null;
  domainName: string;
  requirements: RequirementRef[];
}

export interface ArchTemplate {
  id: string;
  name: string;
  owner: string;
  status: TemplateStatus;
  statusLabel: string;
  templateType: TemplateType;
  typeLabel: string;
  description: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  tags: TagRef[];
}

export interface ArchTemplateDetail extends ArchTemplate {
  versions: TemplateVersion[];
  relatedTemplates: TemplateRef[];
  technologies: TechRef[];
  decisions: DecisionRef[];
  mermaidDiagrams: MermaidDiagram[];
  files: TemplateFile[];
  requirementsByDomain: RequirementDomainGroup[];
}

export interface ArchTemplateFormData {
  name: string;
  owner: string;
  status: TemplateStatus;
  templateType: TemplateType;
  description: string;
  tags: string[];
  relatedTemplateIds: string[];
  technologyIds: string[];
  decisionIds: string[];
  changeNote?: string;
}

async function req<T>(url: string, opts?: RequestInit): Promise<T> {
  const r = await fetch(url, opts);
  const data = await r.json();
  if (!r.ok)
    throw new Error((data as { error?: string }).error ?? `HTTP ${r.status}`);
  return data as T;
}

export const fetchArchTemplates = () => req<ArchTemplate[]>(BASE);

export const fetchArchTemplate = (id: string) =>
  req<ArchTemplateDetail>(`${BASE}?id=${encodeURIComponent(id)}`);

export interface ExportRequirement extends RequirementRef {
  description?: string;
  reqType?: string;
  reqTypeLabel?: string;
  owner?: string;
  normativeDoc?: string;
  controlMetrics?: string;
  fulfillmentMethod?: string;
  isProcurement?: boolean;
  scorePoint?: number;
  scoreWeight?: number;
}
export interface ExportRequirementGroup {
  domainId: string | null;
  domainName: string;
  requirements: ExportRequirement[];
}
export interface ExternalLink {
  id: number;
  url: string;
  label: string;
}
export interface ExportData {
  id: string;
  name: string;
  owner: string;
  status: string;
  statusLabel: string;
  templateType: string;
  typeLabel: string;
  description: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  tags: TagRef[];
  technologies: TechRef[];
  decisions: DecisionRef[];
  mermaidDiagrams: MermaidDiagram[];
  files: TemplateFile[];
  externalLinks: ExternalLink[];
  relatedTemplates: TemplateRef[];
  versions: TemplateVersion[];
  requirementsByDomain: ExportRequirementGroup[];
}

export const fetchArchTemplateExport = (id: string) =>
  req<ExportData>(`${BASE}?id=${encodeURIComponent(id)}&action=export`);

export const fetchTagsSuggest = (q: string) =>
  req<TagRef[]>(`${BASE}?tags_suggest=${encodeURIComponent(q)}`);

export const fetchTemplatesSuggest = (q: string) =>
  req<TemplateRef[]>(`${BASE}?templates_suggest=${encodeURIComponent(q)}`);

export const fetchTechSuggest = (q: string) =>
  req<TechRef[]>(`${BASE}?tech_suggest=${encodeURIComponent(q)}`);

export const fetchDecisionsSuggest = (q: string) =>
  req<DecisionRef[]>(`${BASE}?decisions_suggest=${encodeURIComponent(q)}`);

export const createArchTemplate = (data: ArchTemplateFormData) =>
  req<ArchTemplate>(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

export const updateArchTemplate = (id: string, data: ArchTemplateFormData) =>
  req<ArchTemplate>(BASE, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...data, id }),
  });

export const addMermaid = (template_id: string, title: string, code: string) =>
  req<MermaidDiagram>(`${BASE}?action=add_mermaid`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ template_id, title, code }),
  });

export const updateMermaid = (id: number, title: string, code: string) =>
  req<MermaidDiagram>(`${BASE}?action=update_mermaid`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, title, code }),
  });

export const uploadFile = async (
  template_id: string,
  file: File,
): Promise<TemplateFile> => {
  const buf = await file.arrayBuffer();
  const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
  return req<TemplateFile>(`${BASE}?action=upload_file`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      template_id,
      filename: file.name,
      content_type: file.type,
      data_base64: b64,
    }),
  });
};
