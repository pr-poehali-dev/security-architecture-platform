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

export interface ReqImage {
  id: number;
  filename: string;
  s3Key: string;
  contentType: string;
  sizeBytes: number;
  sortOrder: number;
  createdAt: string;
  url: string;
}

export type EnvName = 'prod' | 'prodlike' | 'stage' | 'test' | 'dev';
export type EnvStatus = 'required' | 'not_required' | 'conditional';
export type EnvStatusMap = Record<EnvName, EnvStatus>;

export interface EnvStatusDual {
  noIod: EnvStatusMap;
  iod: EnvStatusMap;
}

export const ENVS: { key: EnvName; label: string }[] = [
  { key: 'prod',     label: 'Prod'     },
  { key: 'prodlike', label: 'ProdLike' },
  { key: 'stage',    label: 'Stage'    },
  { key: 'test',     label: 'Test'     },
  { key: 'dev',      label: 'Dev'      },
];

export const ENV_STATUS_OPTIONS: { value: EnvStatus; label: string }[] = [
  { value: 'required',     label: 'Обязательно'  },
  { value: 'conditional',  label: 'Условие'      },
  { value: 'not_required', label: 'Не требуется' },
];

export const DEFAULT_ENV_STATUS: EnvStatusMap = {
  prod: 'not_required', prodlike: 'not_required', stage: 'not_required',
  test: 'not_required', dev: 'not_required',
};

export const DEFAULT_ENV_STATUS_DUAL: EnvStatusDual = {
  noIod: { ...DEFAULT_ENV_STATUS },
  iod:   { ...DEFAULT_ENV_STATUS },
};

export interface ReqContent {
  markdown: string;
  updatedAt: string | null;
  images: ReqImage[];
  envStatus: EnvStatusDual;
}

export async function fetchReqContent(hardeningId: string, requirementId: string): Promise<ReqContent> {
  const res = await fetch(`${BASE}?req_content&hid=${encodeURIComponent(hardeningId)}&rid=${encodeURIComponent(requirementId)}`);
  if (!res.ok) return { markdown: '', updatedAt: null, images: [], envStatus: { ...DEFAULT_ENV_STATUS_DUAL } };
  return res.json();
}

export async function saveEnvStatus(hardeningId: string, requirementId: string, statuses: EnvStatusDual): Promise<EnvStatusDual> {
  const res = await fetch(`${BASE}?action=save_env_status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hardeningId, requirementId, statuses }),
  });
  if (!res.ok) throw new Error('Ошибка сохранения статусов сред');
  return res.json();
}

export async function saveReqMarkdown(hardeningId: string, requirementId: string, markdown: string): Promise<ReqContent> {
  const res = await fetch(`${BASE}?action=save_req_content`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hardeningId, requirementId, markdown }),
  });
  if (!res.ok) throw new Error('Ошибка сохранения');
  return res.json();
}

export async function uploadReqImage(hardeningId: string, requirementId: string, file: File): Promise<ReqImage> {
  const arrayBuffer = await file.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i]);
  const dataBase64 = btoa(binary);
  const res = await fetch(`${BASE}?action=upload_req_image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      hardeningId, requirementId,
      filename: file.name,
      contentType: file.type || 'image/png',
      dataBase64,
    }),
  });
  if (!res.ok) throw new Error('Ошибка загрузки изображения');
  return res.json();
}