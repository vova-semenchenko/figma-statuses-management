interface Props {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: Props) {
  return (
    <div class="pagination">
      <button
        class="btn btn-ghost btn-sm btn-icon"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        title="Previous page"
      >
        ‹
      </button>

      <span class="page-info">{currentPage} / {totalPages}</span>

      <button
        class="btn btn-ghost btn-sm btn-icon"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        title="Next page"
      >
        ›
      </button>
    </div>
  );
}
