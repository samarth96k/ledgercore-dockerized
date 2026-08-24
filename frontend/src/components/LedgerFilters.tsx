type Props = {
  filters: any;
  setFilters: React.Dispatch<React.SetStateAction<any>>;
};

export default function LedgerFilters({
  filters,
  setFilters,
}: Props) {
  function update(name: string, value: string) {
    setFilters((prev: any) => ({
      ...prev,
      [name]: value,
    }));
  }

  return (
    <div className="rounded-xl bg-white p-5 shadow">
      <div className="grid grid-cols-6 gap-4">

        {/* <input
          placeholder="Search..."
          value={filters.search}
          onChange={(e) => update("search", e.target.value)}
          className="rounded border p-2"
        /> */}

        <select
          value={filters.direction}
          onChange={(e) => update("direction", e.target.value)}
          className="rounded border p-2"
        >
          <option value="">All</option>
          <option value="DEBIT">Debit</option>
          <option value="CREDIT">Credit</option>
        </select>

        <select
          value={filters.type}
          onChange={(e) => update("type", e.target.value)}
          className="rounded border p-2"
        >
          <option value="">Type</option>
          <option value="TRANSFER">Transfer</option>
          <option value="DEPOSIT">Deposit</option>
          <option value="WITHDRAWAL">Withdrawal</option>
          <option value="REVERSAL">Reversal</option>
        </select>

        <select
          value={filters.status}
          onChange={(e) => update("status", e.target.value)}
          className="rounded border p-2"
        >
          <option value="">Status</option>
          <option value="SUCCESS">Success</option>
          <option value="FAILED">Failed</option>
          <option value="PENDING">Pending</option>
        </select>

        {/* <input
          type="date"
          value={filters.from}
          onChange={(e) => update("from", e.target.value)}
          className="rounded border p-2"
        />

        <input
          type="date"
          value={filters.to}
          onChange={(e) => update("to", e.target.value)}
          className="rounded border p-2"
        /> */}
      </div>
    </div>
  );
}