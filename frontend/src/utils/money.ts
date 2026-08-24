/**
 * Backend stores money in minor units.
 *
 * ₹100.60 => 10060
 *
 * Backend may return BigInt values serialized as strings.
 */
export function formatMoney(
  minorUnits: string | number | bigint,
): string {
  const value = BigInt(minorUnits);

  const negative = value < 0n;

  const absolute = negative
    ? -value
    : value;

  const rupees = absolute / 100n;
  const paise = absolute % 100n;

  const formattedRupees =
    rupees.toLocaleString("en-IN");

  const formattedPaise =
    paise.toString().padStart(2, "0");

  return `${negative ? "-" : ""}₹${formattedRupees}.${formattedPaise}`;
}

export function parseMoneyToMinorUnits(
  input: string,
): string {
  const value = input.trim();

  if (!/^\d+(\.\d{0,2})?$/.test(value)) {
    throw new Error(
      "Enter a valid amount with at most 2 decimal places.",
    );
  }

  const [rupees, paise = ""] =
    value.split(".");

  const normalizedPaise =
    paise.padEnd(2, "0");

  return (
    BigInt(rupees) * 100n +
    BigInt(normalizedPaise)
  ).toString();
}