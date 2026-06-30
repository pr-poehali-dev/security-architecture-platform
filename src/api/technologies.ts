const BASE = 'https://functions.poehali.dev/b63791b9-6309-4098-aec2-6847a4871e31';

export type TechStatus = 'active' | 'in_development' | 'inactive' | 'archived';

export interface TagRef { id: number; name: string }

export interface MermaidDiagram {
  id: number;
  title: string;
  code: string;
  createdAt: string;
  updatedAt: string;
}

export interface TechFile {
  id: number;
  filename: string;
  s3Key: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string;
  url: string;
}

export interface TechnologyVersion {
  id: number;
  version: string;
  name: string;
  owner: string;
  status: string;
  statusLabel: string;
  description: string;
  tagsSnapshot: string[];
  changedAt: string;
  changeNote: string;
}

export interface Technology {
  id: string;
  name: string;
  owner: string;
  status: TechStatus;
  statusLabel: string;
  description: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  tags: TagRef[];
}

export interface TechnologyDetail extends Technology {
  mermaidDiagrams: MermaidDiagram[];
  files: TechFile[];
  versions: TechnologyVersion[];
}

export interface TechnologyForm {
  name: string;
  owner: string;
  status: TechStatus;
  description: string;
  tags: string[];
  changeNote?: string;
}

export const STATUS_OPTIONS: { value: TechStatus; label: string }[] = [
  { value: 'active',         label: 'Активен'      },
  { value: 'in_development', label: 'В разработке' },
  { value: 'inactive',       label: 'Не активен'   },
  { value: 'archived',       label: 'В архиве'     },
];

export async function fetchTechnologies(): Promise<Technology[]> {
  const res = await fetch(BASE);
  if (!res.ok) throw new Error('Ошибка загрузки');
  return res.json();
}

export async function fetchTechnology(id: string): Promise<TechnologyDetail> {
  const res = await fetch(`${BASE}?id=${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error('Технология не найдена');
  return res.json();
}

export async function fetchTagsSuggest(query: string): Promise<TagRef[]> {
  const res = await fetch(`${BASE}?tags_suggest=${encodeURIComponent(query)}`);
  if (!res.ok) return [];
  return res.json();
}

export async function createTechnology(data: TechnologyForm): Promise<Technology> {
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

export async function updateTechnology(id: string, data: TechnologyForm): Promise<Technology> {
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

export async function addMermaid(technology_id: string, title: string, code: string): Promise<MermaidDiagram> {
  const res = await fetch(`${BASE}?action=add_mermaid`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ technology_id, title, code }),
  });
  if (!res.ok) throw new Error('Ошибка сохранения схемы');
  return res.json();
}

export async function updateMermaid(id: number, title: string, code: string): Promise<MermaidDiagram> {
  const res = await fetch(`${BASE}?action=update_mermaid`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, title, code }),
  });
  if (!res.ok) throw new Error('Ошибка обновления схемы');
  return res.json();
}

export async function uploadFile(
  technology_id: string,
  file: File,
): Promise<TechFile> {
  const arrayBuffer = await file.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i]);
  const data_base64 = btoa(binary);

  const res = await fetch(`${BASE}?action=upload_file`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      technology_id,
      filename: file.name,
      content_type: file.type || 'application/octet-stream',
      data_base64,
    }),
  });
  if (!res.ok) throw new Error('Ошибка загрузки файла');
  return res.json();
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}
