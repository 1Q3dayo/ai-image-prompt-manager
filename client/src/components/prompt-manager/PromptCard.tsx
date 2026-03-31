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
  onOpen?: (prompt: Prompt) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number, title: string) => void;
}

export function PromptCard({ prompt, imageSize = "sm", onOpen, onEdit, onDelete }: PromptCardProps) {
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
        {prompt.tags && prompt.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {prompt.tags.slice(0, 3).map((tag) => (
              <span key={`${tag.key_id}-${tag.value_id}`} className="px-1.5 py-0 text-[10px] bg-blue-50 text-blue-600 rounded-full border border-blue-200">
                {tag.key_name}:{tag.value}
              </span>
            ))}
            {prompt.tags.length > 3 && (
              <span className="px-1.5 py-0 text-[10px] text-gray-400">+{prompt.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-xs text-gray-400">
          {new Date(prompt.updated_at).toLocaleDateString("ja-JP")}
        </span>
        {onOpen && (
          <button
            onClick={() => onOpen(prompt)}
            className="px-2 py-1 text-xs text-teal-600 border border-teal-300 rounded hover:bg-teal-50"
            aria-label={`${prompt.title}を開く`}
          >
            開く
          </button>
        )}
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
