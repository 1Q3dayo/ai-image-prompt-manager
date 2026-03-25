const BASE_URL = "/api";

export interface Prompt {
  id: number;
  title: string;
  prompt: string;
  has_break: number;
  description: string;
  image_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

export async function fetchPrompts(
  q = "",
  limit = 50,
  offset = 0,
): Promise<PaginatedResponse<Prompt>> {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  const res = await fetch(`${BASE_URL}/prompts?${params}`);
  if (!res.ok) throw new Error("プロンプト一覧の取得に失敗しました");
  return res.json();
}

export async function fetchPrompt(id: number): Promise<Prompt> {
  const res = await fetch(`${BASE_URL}/prompts/${id}`);
  if (!res.ok) throw new Error("プロンプトの取得に失敗しました");
  return res.json();
}

export async function savePrompt(data: {
  title: string;
  prompt: string;
  has_break: boolean;
  description: string;
  image?: File;
}): Promise<Prompt> {
  const form = new FormData();
  form.append("title", data.title);
  form.append("prompt", data.prompt);
  form.append("has_break", data.has_break ? "true" : "false");
  form.append("description", data.description);
  if (data.image) form.append("image", data.image);
  const res = await fetch(`${BASE_URL}/prompts`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error("プロンプトの保存に失敗しました");
  return res.json();
}

export async function deletePrompt(id: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/prompts/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("プロンプトの削除に失敗しました");
}

export interface BundleItem {
  title: string;
  prompt: string;
  has_break: number;
  sort_order: number;
}

export interface BundleSummary {
  id: number;
  title: string;
  description: string;
  image_path: string | null;
  item_count: number;
  created_at: string;
  updated_at: string;
}

export interface Bundle extends BundleSummary {
  items: BundleItem[];
}

export async function fetchBundles(
  q = "",
  limit = 50,
  offset = 0,
): Promise<PaginatedResponse<BundleSummary>> {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  const res = await fetch(`${BASE_URL}/bundles?${params}`);
  if (!res.ok) throw new Error("バンドル一覧の取得に失敗しました");
  return res.json();
}

export async function fetchBundle(id: number): Promise<Bundle> {
  const res = await fetch(`${BASE_URL}/bundles/${id}`);
  if (!res.ok) throw new Error("バンドルの取得に失敗しました");
  return res.json();
}

export async function saveBundle(data: {
  title: string;
  description: string;
  items: Array<{ title: string; prompt: string; has_break: boolean }>;
  image?: File;
}): Promise<Bundle> {
  const form = new FormData();
  form.append("title", data.title);
  form.append("description", data.description);
  form.append("items", JSON.stringify(data.items));
  if (data.image) form.append("image", data.image);
  const res = await fetch(`${BASE_URL}/bundles`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error("バンドルの保存に失敗しました");
  return res.json();
}

export async function updatePrompt(
  id: number,
  data: {
    title?: string;
    prompt?: string;
    has_break?: boolean;
    description?: string;
    image?: File;
  },
): Promise<Prompt> {
  const form = new FormData();
  if (data.title !== undefined) form.append("title", data.title);
  if (data.prompt !== undefined) form.append("prompt", data.prompt);
  if (data.has_break !== undefined)
    form.append("has_break", data.has_break ? "true" : "false");
  if (data.description !== undefined)
    form.append("description", data.description);
  if (data.image) form.append("image", data.image);
  const res = await fetch(`${BASE_URL}/prompts/${id}`, {
    method: "PUT",
    body: form,
  });
  if (!res.ok) throw new Error("プロンプトの更新に失敗しました");
  return res.json();
}

export async function updateBundle(
  id: number,
  data: {
    title?: string;
    description?: string;
    image?: File;
  },
): Promise<Bundle> {
  const form = new FormData();
  if (data.title !== undefined) form.append("title", data.title);
  if (data.description !== undefined)
    form.append("description", data.description);
  if (data.image) form.append("image", data.image);
  const res = await fetch(`${BASE_URL}/bundles/${id}`, {
    method: "PUT",
    body: form,
  });
  if (!res.ok) throw new Error("バンドルの更新に失敗しました");
  return res.json();
}

export async function deleteBundle(id: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/bundles/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("バンドルの削除に失敗しました");
}

export function getImageUrl(imagePath: string): string {
  return `${BASE_URL}/images/${imagePath}`;
}
