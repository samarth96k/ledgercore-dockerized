import { formatMoney } from "../utils/money";

type LedgerRow = {
  name: string;
  accountId: string | null;
  isSystemAccount: boolean;
  direction: "DEBIT" | "CREDIT";
  amount: string;
};

type Entry = {
  transactionId: string;
  date: string;
  type: string;
  status: string;
  currency: string;
  failureReason: string | null;
  balanceAfter: string;
  rows: LedgerRow[];
};

type Props = {
  loading: boolean;
  entries: Entry[];
};

export default function LedgerTable({
  loading,
  entries,
}: Props) {
  if (loading) {
    return (
      <div className="p-6 text-center text-slate-500">
        Loading ledger...
      </div>
    );
  }

  if (!entries.length) {
    return (
      <div className="p-6 text-center text-slate-500">
        No ledger entries found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl bg-white shadow">
      <table className="w-full border-collapse">
        <thead className="bg-slate-100">
          <tr>
            <Header>Date</Header>
            <Header>Details</Header>
            <Header>Type</Header>
            <Header align="right">Amount</Header>
            <Header align="right">Balance After</Header>
            <Header>Status</Header>
          </tr>
        </thead>

        <tbody>
          {entries.map((entry) => {
            const date = new Date(entry.date);

            const displayDate = date.toLocaleDateString(
              "en-IN",
              {
                day: "2-digit",
                month: "short",
                year: "numeric",
              },
            );

            const displayTime = date.toLocaleTimeString(
              "en-IN",
            );

            const failed =
              entry.status === "FAILED";

            return entry.rows.map((row, index) => {
              const isLastRow =
                index === entry.rows.length - 1;

              const amountColor = failed
                ? "text-gray-500"
                : row.direction === "DEBIT"
                  ? "text-red-600"
                  : "text-green-600";

              const amountPrefix =
                row.direction === "DEBIT"
                  ? "-"
                  : "+";

              return (
                <tr
                  key={`${entry.transactionId}-${index}`}
                  className={`
                    hover:bg-slate-50
                    ${
                      isLastRow
                        ? "border-b-2 border-black"
                        : ""
                    }
                  `}
                >
                  {/* DATE */}

                  {index === 0 && (
                    <td
                      rowSpan={entry.rows.length}
                      className="px-5 py-4 align-top"
                      title={displayTime}
                    >
                      {displayDate}
                    </td>
                  )}

                  {/* DETAILS */}

                  <td
                    className="px-5 py-4"
                    title={
                      row.isSystemAccount
                        ? ""
                        : row.accountId ?? ""
                    }
                  >
                    {row.name}
                  </td>

                  {/* TYPE */}

                  {index === 0 && (
                    <td
                      rowSpan={entry.rows.length}
                      className="px-5 py-4 align-top"
                    >
                      {toTitle(entry.type)}
                    </td>
                  )}

                  {/* AMOUNT */}

                  <td
                    className={`
                      px-5
                      py-4
                      text-right
                      font-semibold
                      ${amountColor}
                    `}
                  >
                    {amountPrefix}{" "}
                    {formatMoney(
                      BigInt(row.amount),
                    )}
                  </td>

                  {/* BALANCE AFTER */}

                  {index === 0 && (
                    <td
                      rowSpan={entry.rows.length}
                      className="px-5 py-4 text-right align-top"
                    >
                      {formatMoney(
                        BigInt(entry.balanceAfter),
                      )}
                    </td>
                  )}

                  {/* STATUS */}

                  {index === 0 && (
                    <td
                      rowSpan={entry.rows.length}
                      className={`
                        px-5
                        py-4
                        font-medium
                        align-top
                        ${
                          entry.status === "SUCCESS"
                            ? "text-green-600"
                            : entry.status ===
                                "FAILED"
                              ? "text-gray-500"
                              : "text-orange-500"
                        }
                      `}
                    >
                      {entry.status}
                    </td>
                  )}
                </tr>
              );
            });
          })}
        </tbody>
      </table>
    </div>
  );
}

function Header({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`px-5 py-4 font-semibold ${
        align === "right"
          ? "text-right"
          : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function toTitle(text: string) {
  return text
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}