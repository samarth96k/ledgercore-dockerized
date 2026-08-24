import { CheckCircle, XCircle } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

export default function TransactionResult() {
  const navigate = useNavigate();
  const { state } = useLocation();
  if (!state) {
  navigate("/wallet");
  return null;
}

  const success = state?.success ?? false;

  const transaction = state?.transaction;

  const error = state?.error;

  return (
    <div className="mx-auto mt-12 max-w-2xl rounded-xl bg-white p-10 shadow">

      <div className="flex flex-col items-center">

        {success ? (
          <CheckCircle
            className="mb-4 text-green-600"
            size={90}
          />
        ) : (
          <XCircle
            className="mb-4 text-red-600"
            size={90}
          />
        )}

        <h1 className="mb-6 text-3xl font-bold">

          {success
            ? "Payment Successful"
            : "Payment Failed"}

        </h1>

      </div>

      {success ? (
        <div className="space-y-5">

          <Info
            label="Transaction ID"
            value={transaction?.transactionId}
          />

          <Info
            label="Status"
            value={transaction?.status}
          />

        </div>
      ) : (
        <div className="rounded border border-red-200 bg-red-50 p-5">

          <h2 className="mb-2 font-semibold text-red-700">
            Failure Reason
          </h2>

          <p>{error}</p>

        </div>
      )}

      <div className="mt-10 flex justify-center gap-5">

        <button
          onClick={() => navigate("/wallet")}
          className="rounded bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
        >
          New Transaction
        </button>

        <button
          onClick={() =>
            navigate("/ledger")
          }
          className="rounded border px-6 py-3 hover:bg-slate-100"
        >
          View Transactions
        </button>

      </div>

    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  return (
    <div className="flex justify-between border-b pb-3">

      <span className="font-medium">
        {label}
      </span>

      <span className="font-mono break-all">
        {value}
      </span>

    </div>
  );
}