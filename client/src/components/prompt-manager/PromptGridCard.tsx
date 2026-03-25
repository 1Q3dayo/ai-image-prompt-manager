import { getImageUrl, type Prompt } from "../../hooks/useApi";

interface PromptGridCardProps {
  prompt: Prompt;
  onEdit: (id: number) => void;
  onDelete: (id: number, title: string) => void;
}

export function PromptGridCard({ prompt, onEdit, onDelete }: PromptGridCardProps) {
  return (
    <div
      className="border border-gray-200 rounded-lg overflow-hidden"
      data-testid={`prompt-grid-card-${prompt.id}`}
    >
      <div className="relative aspect-square">
        {prompt.image_path ? (
          <img
            src={getImageUrl(prompt.image_path)}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 20 20" fill="none" className="text-gray-300">
              <rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="7" cy="9" r="1.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M5 14l3-3 2 2 4-4 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-2">
          <p className="text-white text-sm font-medium truncate">{prompt.title}</p>
        </div>
      </div>
      <div className="flex items-center justify-between px-2 py-1.5 bg-white">
        <span className="text-xs text-gray-400 truncate">
          {new Date(prompt.updated_at).toLocaleDateString("ja-JP")}
        </span>
        <div className="flex gap-1">
          <button
            onClick={() => onEdit(prompt.id)}
            className="px-1.5 py-0.5 text-xs text-blue-600 border border-blue-300 rounded hover:bg-blue-50"
            aria-label={`${prompt.title}を編集`}
          >
            編集
          </button>
          <button
            onClick={() => onDelete(prompt.id, prompt.title)}
            className="px-1.5 py-0.5 text-xs text-red-600 border border-red-300 rounded hover:bg-red-50"
            aria-label={`${prompt.title}を削除`}
          >
            削除
          </button>
        </div>
      </div>
    </div>
  );
}
