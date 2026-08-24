import { useEffect, useState } from "react";
import { api } from "../../api/api";
import LedgerFilters from "../../components/LedgerFilters";
import LedgerTable from "../../components/LedgerTable";
import Pagination from "../../components/Pagination";
import { useNavigate } from "react-router-dom";

export default function Ledger() {
  const [entries, setEntries] = useState([]);

  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);

  const [pagination, setPagination] = useState<any>();

  const [filters, setFilters] = useState({
    direction: "",
    type: "",
    status: "",
    from: "",
    to: "",
    search: "",
  });
  const navigate = useNavigate();
  useEffect(() => {
    loadLedger();
  }, [page, filters]);

  async function loadLedger() {
    try {
      setLoading(true);

const params: Record<string, any> = {
  page,
};

Object.entries(filters).forEach(([key, value]) => {
  if (value !== "" && value !== null && value !== undefined) {
    params[key] = value;
  }
});

const response = await api.get(
  "/api/account/me/transactions",
  {
    params,
  },
);

      setEntries(response.data.entries);

      setPagination(response.data.pagination);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">

      <LedgerFilters
        filters={filters}
        setFilters={setFilters}
      />

      <button onClick={()=>navigate("/wallet")} className="cursor-pointer">← Back to Home</button>

      <LedgerTable
        loading={loading}
        entries={entries}
      />

      {pagination && (
        <Pagination
          page={page}
          pagination={pagination}
          onPageChange={setPage}
        />
      )}

    </div>
  );
}