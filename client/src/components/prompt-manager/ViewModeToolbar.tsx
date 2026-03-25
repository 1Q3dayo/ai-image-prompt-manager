import type { ViewMode, ImageSize } from "./types";

interface ViewModeToolbarProps {
  viewMode: ViewMode;
  imageSize: ImageSize;
  onViewModeChange: (mode: ViewMode) => void;
  onImageSizeChange: (size: ImageSize) => void;
}

const viewModes: { value: ViewMode; label: string; icon: JSX.Element }[] = [
  {
    value: "list",
    label: "リスト",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <rect x="1" y="2" width="14" height="2" rx="0.5" />
        <rect x="1" y="7" width="14" height="2" rx="0.5" />
        <rect x="1" y="12" width="14" height="2" rx="0.5" />
      </svg>
    ),
  },
  {
    value: "grid",
    label: "グリッド",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <rect x="1" y="1" width="6" height="6" rx="1" />
        <rect x="9" y="1" width="6" height="6" rx="1" />
        <rect x="1" y="9" width="6" height="6" rx="1" />
        <rect x="9" y="9" width="6" height="6" rx="1" />
      </svg>
    ),
  },
];

const imageSizes: { value: ImageSize; label: string }[] = [
  { value: "sm", label: "小" },
  { value: "md", label: "中" },
  { value: "lg", label: "大" },
];

export function ViewModeToolbar({
  viewMode,
  imageSize,
  onViewModeChange,
  onImageSizeChange,
}: ViewModeToolbarProps) {
  return (
    <div className="flex items-center gap-2" data-testid="view-mode-toolbar">
      <div className="inline-flex rounded-lg border border-gray-300 p-0.5">
        {viewModes.map((m) => (
          <button
            key={m.value}
            onClick={() => onViewModeChange(m.value)}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-md transition-colors ${
              viewMode === m.value
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:text-gray-900"
            }`}
            title={m.label}
            data-testid={`view-mode-${m.value}`}
          >
            {m.icon}
          </button>
        ))}
      </div>

      <div className="inline-flex rounded-lg border border-gray-300 p-0.5">
        {imageSizes.map((s) => (
          <button
            key={s.value}
            onClick={() => onImageSizeChange(s.value)}
            className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
              imageSize === s.value
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:text-gray-900"
            }`}
            data-testid={`image-size-${s.value}`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
