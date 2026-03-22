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

export function getImageUrl(imagePath: string): string {
  return `${BASE_URL}/images/${imagePath}`;
}
