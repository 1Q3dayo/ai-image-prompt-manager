const BASE_URL = "/api";

export interface TagKey {
  id: number;
  name: string;
  sort_order: number;
}

export interface TagValue {
  id: number;
  tag_key_id: number;
  value: string;
}

export interface TagKeyWithValues extends TagKey {
  values: TagValue[];
}

export interface Tag {
  key_id: number;
  key_name: string;
  value_id: number;
  value: string;
}

export interface Prompt {
  id: number;
  title: string;
  prompt: string;
  has_break: number;
  description: string;
  image_path: string | null;
  created_at: string;
  updated_at: string;
  tags?: Tag[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

export async function fetchPrompts(
  q = "",
  limit = 50,
  offset = 0,
  tagValueIds: number[] = [],
): Promise<PaginatedResponse<Prompt>> {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  for (const id of tagValueIds) {
    params.append("tag_value_ids", String(id));
  }
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
  copy_image_from?: string;
  tags?: Array<{ key_id: number; value: string }>;
}): Promise<Prompt> {
  const form = new FormData();
  form.append("title", data.title);
  form.append("prompt", data.prompt);
  form.append("has_break", data.has_break ? "true" : "false");
  form.append("description", data.description);
  if (data.image) form.append("image", data.image);
  else if (data.copy_image_from) form.append("copy_image_from", data.copy_image_from);
  if (data.tags) form.append("tags", JSON.stringify(data.tags));
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
  tags?: Tag[];
}

export interface Bundle extends BundleSummary {
  items: BundleItem[];
}

export async function fetchBundles(
  q = "",
  limit = 50,
  offset = 0,
  tagValueIds: number[] = [],
): Promise<PaginatedResponse<BundleSummary>> {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  for (const id of tagValueIds) {
    params.append("tag_value_ids", String(id));
  }
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
  copy_image_from?: string;
  tags?: Array<{ key_id: number; value: string }>;
}): Promise<Bundle> {
  const form = new FormData();
  form.append("title", data.title);
  form.append("description", data.description);
  form.append("items", JSON.stringify(data.items));
  if (data.image) form.append("image", data.image);
  else if (data.copy_image_from) form.append("copy_image_from", data.copy_image_from);
  if (data.tags) form.append("tags", JSON.stringify(data.tags));
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
    tags?: Array<{ key_id: number; value: string }>;
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
  if (data.tags !== undefined) form.append("tags", JSON.stringify(data.tags));
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
    items?: Array<{ title: string; prompt: string; has_break: boolean }>;
    image?: File;
    tags?: Array<{ key_id: number; value: string }>;
  },
): Promise<Bundle> {
  const form = new FormData();
  if (data.title !== undefined) form.append("title", data.title);
  if (data.description !== undefined)
    form.append("description", data.description);
  if (data.items !== undefined) form.append("items", JSON.stringify(data.items));
  if (data.image) form.append("image", data.image);
  if (data.tags !== undefined) form.append("tags", JSON.stringify(data.tags));
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

// Admin API

export interface AdminStats {
  promptCount: number;
  bundleCount: number;
  imageCount: number;
  storageBytes: {
    images: number;
    database: number;
    total: number;
  };
  lastUpdatedAt: string | null;
}

export async function fetchAdminStats(): Promise<AdminStats> {
  const res = await fetch(`${BASE_URL}/admin/stats`);
  if (!res.ok) throw new Error("統計情報の取得に失敗しました");
  return res.json();
}

export async function exportJson(includeImages: boolean): Promise<Blob> {
  const res = await fetch(
    `${BASE_URL}/admin/export/json?includeImages=${includeImages}`,
  );
  if (!res.ok) throw new Error("JSONエクスポートに失敗しました");
  return res.blob();
}

export async function exportDb(): Promise<Blob> {
  const res = await fetch(`${BASE_URL}/admin/export/db`);
  if (!res.ok) throw new Error("DBエクスポートに失敗しました");
  return res.blob();
}

export interface ImportResult {
  imported: {
    prompts: number;
    bundles: number;
    images: number;
  };
}

export async function importJson(
  file: File,
  mode: "replace" | "append",
): Promise<ImportResult> {
  const form = new FormData();
  form.append("file", file);
  form.append("mode", mode);
  const res = await fetch(`${BASE_URL}/admin/import/json`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? "JSONインポートに失敗しました");
  }
  return res.json();
}

// Tags API

export async function fetchTagKeys(
  includeValues = false,
): Promise<TagKey[] | TagKeyWithValues[]> {
  const params = includeValues ? "?includeValues=true" : "";
  const res = await fetch(`${BASE_URL}/tags/keys${params}`);
  if (!res.ok) throw new Error("タグキー一覧の取得に失敗しました");
  return res.json();
}

export async function createTagKey(name: string): Promise<TagKey> {
  const res = await fetch(`${BASE_URL}/tags/keys`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error("タグキーの作成に失敗しました");
  return res.json();
}

export async function updateTagKey(
  id: number,
  data: { name?: string; sort_order?: number },
): Promise<TagKey> {
  const res = await fetch(`${BASE_URL}/tags/keys/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("タグキーの更新に失敗しました");
  return res.json();
}

export async function deleteTagKey(id: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/tags/keys/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("タグキーの削除に失敗しました");
}

export async function fetchTagValues(
  keyId: number,
  q = "",
): Promise<TagValue[]> {
  const params = q ? `?q=${encodeURIComponent(q)}` : "";
  const res = await fetch(`${BASE_URL}/tags/keys/${keyId}/values${params}`);
  if (!res.ok) throw new Error("タグ値一覧の取得に失敗しました");
  return res.json();
}

export async function createTagValue(
  keyId: number,
  value: string,
): Promise<TagValue> {
  const res = await fetch(`${BASE_URL}/tags/keys/${keyId}/values`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value }),
  });
  if (!res.ok) throw new Error("タグ値の作成に失敗しました");
  return res.json();
}

export async function updateTagValue(
  id: number,
  value: string,
): Promise<TagValue> {
  const res = await fetch(`${BASE_URL}/tags/values/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value }),
  });
  if (!res.ok) throw new Error("タグ値の更新に失敗しました");
  return res.json();
}

export async function deleteTagValue(id: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/tags/values/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("タグ値の削除に失敗しました");
}

export interface TagSuggestion extends Tag {
  count: number;
}

export async function fetchTagSuggestions(
  type: "prompts" | "bundles",
  selectedValueIds: number[] = [],
): Promise<TagSuggestion[]> {
  const params = new URLSearchParams();
  params.set("type", type);
  if (selectedValueIds.length > 0) {
    params.set("selected", selectedValueIds.join(","));
  }
  const res = await fetch(`${BASE_URL}/tags/suggestions?${params}`);
  if (!res.ok) throw new Error("タグ候補の取得に失敗しました");
  return res.json();
}

export async function importDb(file: File): Promise<{ status: string }> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE_URL}/admin/import/db`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? "DBリストアに失敗しました");
  }
  return res.json();
}
