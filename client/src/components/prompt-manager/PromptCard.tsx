import { getImageUrl, type Prompt } from "../../hooks/useApi";
import type { ImageSize } from "./types";

const LIST_IMAGE_SIZE: Record<ImageSize, string> = {
  sm: "w-12 h-12",
  md: "w-24 h-24",
  lg: "w-40 h-40",
};

interface PromptCardProps {
  prompt: Prompt;
  imageSize?: ImageSize;
  onEdit: (id: number) => void;
  onDelete: (id: number, title: string) => void;
}

export function PromptCard({ prompt, imageSize = "sm", onEdit, onDelete }: PromptCardProps) {
  const sizeClass = LIST_IMAGE_SIZE[imageSize];

  return (
    <div
      className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg"
      data-testid={`prompt-card-${prompt.id}`}
    >
      {prompt.image_path ? (
        <img
          src={getImageUrl(prompt.image_path)}
          alt=""
          className={`${sizeClass} object-cover rounded flex-shrink-0`}
        />
      ) : (
        <div
          className={`${sizeClass} bg-gray-100 rounded flex-shrink-0 flex items-center justify-center`}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-gray-300">
            <rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="7" cy="9" r="1.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M5 14l3-3 2 2 4-4 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {prompt.title}
        </p>
        <p className="text-xs text-gray-500 truncate">{prompt.description}</p>
        <p className="text-xs text-gray-400 truncate mt-0.5">
          {prompt.prompt}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-xs text-gray-400">
          {new Date(prompt.updated_at).toLocaleDateString("ja-JP")}
        </span>
        <button
          onClick={() => onEdit(prompt.id)}
          className="px-2 py-1 text-xs text-blue-600 border border-blue-300 rounded hover:bg-blue-50"
          aria-label={`${prompt.title}を編集`}
        >
          編集
        </button>
        <button
          onClick={() => onDelete(prompt.id, prompt.title)}
          className="px-2 py-1 text-xs text-red-600 border border-red-300 rounded hover:bg-red-50"
          aria-label={`${prompt.title}を削除`}
        >
          削除
        </button>
      </div>
    </div>
  );
}
