import { getImageUrl, type BundleSummary } from "../../hooks/useApi";

interface BundleCardProps {
  bundle: BundleSummary;
  onEdit: (id: number) => void;
  onDelete: (id: number, title: string) => void;
}

export function BundleCard({ bundle, onEdit, onDelete }: BundleCardProps) {
  return (
    <div
      className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg"
      data-testid={`bundle-card-${bundle.id}`}
    >
      {bundle.image_path && (
        <img
          src={getImageUrl(bundle.image_path)}
          alt=""
          className="w-12 h-12 object-cover rounded flex-shrink-0"
        />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {bundle.title}
        </p>
        <p className="text-xs text-gray-500 truncate">{bundle.description}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {bundle.item_count}件のプロンプト
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-xs text-gray-400">
          {new Date(bundle.updated_at).toLocaleDateString("ja-JP")}
        </span>
        <button
          onClick={() => onEdit(bundle.id)}
          className="px-2 py-1 text-xs text-blue-600 border border-blue-300 rounded hover:bg-blue-50"
          aria-label={`${bundle.title}を編集`}
        >
          編集
        </button>
        <button
          onClick={() => onDelete(bundle.id, bundle.title)}
          className="px-2 py-1 text-xs text-red-600 border border-red-300 rounded hover:bg-red-50"
          aria-label={`${bundle.title}を削除`}
        >
          削除
        </button>
      </div>
    </div>
  );
}
