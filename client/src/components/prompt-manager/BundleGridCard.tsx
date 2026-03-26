import { getImageUrl, type BundleSummary } from "../../hooks/useApi";

interface BundleGridCardProps {
  bundle: BundleSummary;
  onOpen?: (id: number, title: string) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number, title: string) => void;
}

export function BundleGridCard({ bundle, onOpen, onEdit, onDelete }: BundleGridCardProps) {
  return (
    <div
      className="border border-gray-200 rounded-lg overflow-hidden"
      data-testid={`bundle-grid-card-${bundle.id}`}
    >
      <div className="relative aspect-square">
        {bundle.image_path ? (
          <img
            src={getImageUrl(bundle.image_path)}
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
          <p className="text-white text-sm font-medium truncate">{bundle.title}</p>
          <p className="text-white/70 text-xs">{bundle.item_count}件</p>
        </div>
      </div>
      <div className="flex items-center justify-between px-2 py-1.5 bg-white">
        <span className="text-xs text-gray-400 truncate">
          {new Date(bundle.updated_at).toLocaleDateString("ja-JP")}
        </span>
        <div className="flex gap-1">
          {onOpen && (
            <button
              onClick={() => onOpen(bundle.id, bundle.title)}
              className="px-1.5 py-0.5 text-xs text-teal-600 border border-teal-300 rounded hover:bg-teal-50"
              aria-label={`${bundle.title}を開く`}
            >
              開く
            </button>
          )}
          <button
            onClick={() => onEdit(bundle.id)}
            className="px-1.5 py-0.5 text-xs text-blue-600 border border-blue-300 rounded hover:bg-blue-50"
            aria-label={`${bundle.title}を編集`}
          >
            編集
          </button>
          <button
            onClick={() => onDelete(bundle.id, bundle.title)}
            className="px-1.5 py-0.5 text-xs text-red-600 border border-red-300 rounded hover:bg-red-50"
            aria-label={`${bundle.title}を削除`}
          >
            削除
          </button>
        </div>
      </div>
    </div>
  );
}
