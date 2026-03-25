interface PaginationProps {
  total: number;
  offset: number;
  limit: number;
  onChange: (offset: number) => void;
}

export function Pagination({ total, offset, limit, onChange }: PaginationProps) {
  if (total <= limit) return null;

  const totalPages = Math.ceil(total / limit);
  const clampedOffset = Math.min(offset, (totalPages - 1) * limit);
  const currentPage = Math.floor(clampedOffset / limit) + 1;

  return (
    <div
      className="flex items-center justify-center gap-3 mt-4"
      data-testid="pagination"
    >
      <button
        onClick={() => onChange(clampedOffset - limit)}
        disabled={currentPage <= 1}
        className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        data-testid="pagination-prev"
      >
        前へ
      </button>
      <span className="text-sm text-gray-600" data-testid="pagination-info">
        {currentPage} / {totalPages}
      </span>
      <button
        onClick={() => onChange(clampedOffset + limit)}
        disabled={currentPage >= totalPages}
        className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        data-testid="pagination-next"
      >
        次へ
      </button>
    </div>
  );
}
