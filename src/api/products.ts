const BASE =
  "https://functions.poehali.dev/faf70ba6-9e1b-44d0-a0cf-34b1ef34d241";

export type ProductStatus =
  | "active"
  | "in_development"
  | "inactive"
  | "archived";

export interface TagRef {
  id: number;
  name: string;
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

export type AssessmentStatus =
  | "not_assessed"
  | "compliant"
  | "partial"
  | "non_compliant";

export interface AssessedRequirement {
  id: string;
  shortDesc: string;
  reqType: string;
  reqTypeLabel: string;
  techId: string;
  techName: string;
  assessmentStatus: AssessmentStatus;
  assessmentStatusLabel: string;
  assessmentComment: string;
  assessmentUpdatedAt: string | null;
}

export interface RequirementDomainGroup {
  domainId: string | null;
  domainName: string;
  requirements: AssessedRequirement[];
}

export interface ComplianceSummary {
  total: number;
  compliant: number;
  partial: number;
  nonCompliant: number;
  notAssessed: number;
  scorePercent: number;
}

export interface TemplateMatch {
  id: string;
  name: string;
  templateType: string;
  typeLabel: string;
  status: string;
  statusLabel: string;
  matchPercent: number;
  matchedTechnologies: number;
  totalTechnologies: number;
  matchedDecisions: number;
  totalDecisions: number;
}

export interface Product {
  id: string;
  name: string;
  owner: string;
  status: ProductStatus;
  statusLabel: string;
  description: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  tags: TagRef[];
  compliance: ComplianceSummary;
  technologiesCount: number;
  decisionsCount: number;
}

export interface ProductDetail extends Product {
  technologies: TechRef[];
  decisions: DecisionRef[];
  requirementsByDomain: RequirementDomainGroup[];
  templateMatches: TemplateMatch[];
}

export interface ProductFormData {
  name: string;
  owner: string;
  status: ProductStatus;
  description: string;
  tags: string[];
  technologyIds: string[];
  decisionIds: string[];
}

export const STATUS_OPTIONS: { value: ProductStatus; label: string }[] = [
  { value: "active", label: "Активен" },
  { value: "in_development", label: "В разработке" },
  { value: "inactive", label: "Не активен" },
  { value: "archived", label: "В архиве" },
];

export const ASSESSMENT_OPTIONS: { value: AssessmentStatus; label: string }[] = [
  { value: "not_assessed", label: "Не оценено" },
  { value: "compliant", label: "Соответствует" },
  { value: "partial", label: "Частично соответствует" },
  { value: "non_compliant", label: "Не соответствует" },
];

async function req<T>(url: string, opts?: RequestInit): Promise<T> {
  const r = await fetch(url, opts);
  const data = await r.json();
  if (!r.ok)
    throw new Error((data as { error?: string }).error ?? `HTTP ${r.status}`);
  return data as T;
}

export const fetchProducts = () => req<Product[]>(BASE);

export const fetchProduct = (id: string) =>
  req<ProductDetail>(`${BASE}?id=${encodeURIComponent(id)}`);

export const fetchTagsSuggest = (q: string) =>
  req<TagRef[]>(`${BASE}?tags_suggest=${encodeURIComponent(q)}`);

export const fetchTechSuggest = (q: string) =>
  req<TechRef[]>(`${BASE}?tech_suggest=${encodeURIComponent(q)}`);

export const fetchDecisionsSuggest = (q: string) =>
  req<DecisionRef[]>(`${BASE}?decisions_suggest=${encodeURIComponent(q)}`);

export const createProduct = (data: ProductFormData) =>
  req<Product>(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

export const updateProduct = (id: string, data: ProductFormData) =>
  req<Product>(BASE, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...data, id }),
  });

export const setRequirementAssessment = (
  productId: string,
  requirementId: string,
  status: AssessmentStatus,
  comment: string,
) =>
  req<{ productId: string; requirementId: string; status: AssessmentStatus; statusLabel: string; comment: string }>(
    `${BASE}?action=set_requirement_assessment`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_id: productId, requirement_id: requirementId, status, comment }),
    },
  );
