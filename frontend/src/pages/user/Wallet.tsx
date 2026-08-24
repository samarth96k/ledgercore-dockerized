import { useMemo, useState } from "react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/api";
import { createIdempotencyKey } from "../../utils/idempotency";
import { formatMoney, parseMoneyToMinorUnits } from "../../utils/money";

type TransactionMode = "TRANSFER" | "DEPOSIT" | "WITHDRAWAL";

export default function Wallet() {
  const [mode, setMode] = useState<TransactionMode>("TRANSFER");
  // Transfer
  const [toAccountId, setToAccountId] = useState("");

  const [transferAmount, setTransferAmount] = useState("");

  // ATM
  const [atmAmount, setAtmAmount] = useState("");

  // Options
  const [applyTax, setApplyTax] = useState(false);

  const [tax, setTax] = useState("");

  const [applyPlatformFee, setApplyPlatformFee] = useState(false);

  const [platformFee, setPlatformFee] = useState("");

  const navigate = useNavigate();

  const [idempotencyKey, setIdempotencyKey] = useState("");

  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    generateNewIdempotencyKey();
  }, []);
  useEffect(() => {
    if (!processing) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handler);

    return () => window.removeEventListener("beforeunload", handler);
  }, [processing]);

  function generateNewIdempotencyKey() {
    setIdempotencyKey(createIdempotencyKey());
  }

  function buildRequest() {
    const amount = mode === "TRANSFER" ? transferAmount : atmAmount;

    return {
      toAccountId: mode === "TRANSFER" ? toAccountId : "",

      amount: parseMoneyToMinorUnits(amount),

      idempotencyKey,

      lockingStrategy: "PESSIMISTIC",

      transactionType: mode,

      ...(applyPlatformFee &&
        platformFee && {
          platformFee: parseMoneyToMinorUnits(platformFee),
        }),

      ...(applyTax &&
        tax && {
          tax: parseMoneyToMinorUnits(tax),
        }),
    };
  }

  async function handlePayment() {
    if (processing) return;

    if (mode === "TRANSFER" && !toAccountId.trim()) {
      alert("Recipient Account ID is required.");
      return;
    }

    const enteredAmount = mode === "TRANSFER" ? transferAmount : atmAmount;
    const amountInMinorUnits = Number(parseMoneyToMinorUnits(enteredAmount));

    if (amountInMinorUnits <= 0) {
      alert("Amount must be greater than zero.");
      return;
    }

    if (applyTax && !tax) {
      alert("Enter tax amount.");
      return;
    }

    if (applyPlatformFee && !platformFee) {
      alert("Enter platform fee.");
      return;
    }

    if (!enteredAmount) {
      alert("Amount is required.");
      return;
    }

    setProcessing(true);

    try {
      const request = buildRequest();

      const response = await api.post("/payments", request);

      navigate("/wallet/result", {
        state: {
          success: true,
          transaction: response.data,
        },
      });
    } catch (error: any) {
      navigate("/wallet/result", {
        state: {
          success: false,
          error: error.response?.data?.message ?? "Payment failed.",
        },
      });
    } finally {
      generateNewIdempotencyKey();
      setProcessing(false);
      setTransferAmount("");
      setAtmAmount("");
      setToAccountId("");

      setTax("");
      setPlatformFee("");

      setApplyTax(false);
      setApplyPlatformFee(false);

      setMode("TRANSFER");
    }
  }

  const summary = useMemo(() => {
    const amount = mode === "TRANSFER" ? transferAmount : atmAmount;

    try {
      const base = amount ? BigInt(parseMoneyToMinorUnits(amount)) : 0n;

      const taxAmount =
        applyTax && tax ? BigInt(parseMoneyToMinorUnits(tax)) : 0n;

      const fee =
        applyPlatformFee && platformFee
          ? BigInt(parseMoneyToMinorUnits(platformFee))
          : 0n;

      return {
        amount: base,
        tax: taxAmount,
        fee,
        total: base + taxAmount + fee,
      };
    } catch {
      return {
        amount: 0n,
        tax: 0n,
        fee: 0n,
        total: 0n,
      };
    }
  }, [
    mode,
    transferAmount,
    atmAmount,
    tax,
    platformFee,
    applyTax,
    applyPlatformFee,
  ]);

  return (
    <div className="grid grid-cols-5 gap-6">
      {/* LEFT */}

      <div
        className={`col-span-4 rounded-xl bg-white p-6 shadow ${
          processing ? "pointer-events-none opacity-70" : ""
        }`}
      >
        <h2 className="mb-6 text-2xl font-semibold">New Transaction/Payment</h2>

        {/* Transaction Type */}

        <div className="mb-8 flex gap-8">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={mode === "TRANSFER"}
              onChange={() => setMode("TRANSFER")}
              disabled={processing}
            />
            Wallet Transfer
          </label>

          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={mode === "DEPOSIT"}
              onChange={() => setMode("DEPOSIT")}
              disabled={processing}
            />
            Deposit
          </label>

          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={mode === "WITHDRAWAL"}
              onChange={() => setMode("WITHDRAWAL")}
              disabled={processing}
            />
            Withdrawal
          </label>
        </div>

        {/* Dynamic Form */}

        {mode === "TRANSFER" && (
          <div className="space-y-5">
            <div>
              <label className="mb-2 block">Recipient Account ID</label>

              <input
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
                className="w-full rounded border p-3"
                disabled={processing}
              />
            </div>

            <div>
              <label className="mb-2 block">Amount</label>

              <input
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                placeholder="100.50"
                className="w-full rounded border p-3"
                disabled={processing}
              />
            </div>
          </div>
        )}

        {mode !== "TRANSFER" && (
          <div>
            <label className="mb-2 block">Amount</label>

            <input
              value={atmAmount}
              onChange={(e) => setAtmAmount(e.target.value)}
              placeholder="100.50"
              className="w-full rounded border p-3"
              disabled={processing}
            />
          </div>
        )}

        {/* Options */}

        <div className="mt-10 rounded-lg border p-5">
          <h3 className="mb-5 text-lg font-semibold">Transaction Options</h3>

          <div className="space-y-5">
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={applyTax}
                  onChange={(e) => setApplyTax(e.target.checked)}
                  disabled={processing}
                />
                Apply Tax
              </label>

              <input
                disabled={!applyTax || processing}
                value={tax}
                onChange={(e) => setTax(e.target.value)}
                placeholder="18.00"
                className="mt-2 w-full rounded border p-2 disabled:bg-slate-100"
              />
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={applyPlatformFee}
                  onChange={(e) => setApplyPlatformFee(e.target.checked)}
                  disabled={processing}
                />
                Platform Fee
              </label>

              <input
                disabled={!applyPlatformFee || processing}
                value={platformFee}
                onChange={(e) => setPlatformFee(e.target.value)}
                placeholder="5.00"
                className="mt-2 w-full rounded border p-2 disabled:bg-slate-100"
              />
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT */}

      <div className="rounded-xl bg-white p-6 shadow">
        <h2 className="mb-6 text-xl font-semibold">Payment Summary</h2>

        <Summary label="Amount" value={summary.amount} />

        <Summary label="Platform Fee" value={summary.fee} />

        <Summary label="Tax" value={summary.tax} />

        <hr className="my-5" />

        <Summary label="Total" value={summary.total} bold />

        <button
          onClick={handlePayment}
          disabled={processing}
          className="mt-8 w-full rounded bg-blue-600 py-3 font-medium text-white hover:bg-blue-700"
        >
          {processing ? "Processing..." : "Proceed Transaction"}
        </button>

        <button
          className="mt-4 w-full rounded border py-3 px-2"
          disabled={processing}
          onClick={()=>navigate("/ledger")}
        >
          View Transaction History
        </button>
      </div>
    </div>
  );
}

function Summary({
  label,
  value,
  bold = false,
}: {
  label: string;
  value: bigint;
  bold?: boolean;
}) {
  return (
    <div className="mb-4 flex justify-between">
      <span className={bold ? "font-semibold" : ""}>{label}</span>

      <span className={bold ? "font-semibold" : ""}>{formatMoney(value)}</span>
    </div>
  );
}
