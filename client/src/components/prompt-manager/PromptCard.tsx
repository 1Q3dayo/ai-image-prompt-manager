import { getImageUrl, type Prompt } from "../../hooks/useApi";

interface PromptCardProps {
  prompt: Prompt;
  onEdit: (id: number) => void;
  onDelete: (id: number, title: string) => void;
}

export function PromptCard({ prompt, onEdit, onDelete }: PromptCardProps) {
  return (
    <div
      className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg"
      data-testid={`prompt-card-${prompt.id}`}
    >
      {prompt.image_path && (
        <img
          src={getImageUrl(prompt.image_path)}
          alt=""
          className="w-12 h-12 object-cover rounded flex-shrink-0"
        />
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
