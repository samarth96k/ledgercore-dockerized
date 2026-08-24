type Props = {
  page: number;
  pagination: any;
  onPageChange: (page: number) => void;
};

export default function Pagination({
  page,
  pagination,
  onPageChange,
}: Props) {
  return (
    <div className="flex items-center justify-between">

      <button
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
        className="rounded border px-4 py-2 disabled:opacity-50"
      >
        Previous
      </button>

      <span>
        Showing Page {pagination.page} of {pagination.totalPages}
      </span>

      <button
        disabled={page === pagination.totalPages}
        onClick={() => onPageChange(page + 1)}
        className="rounded border px-4 py-2 disabled:opacity-50"
      >
        Next
      </button>

    </div>
  );
}