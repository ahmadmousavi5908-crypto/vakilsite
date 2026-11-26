export const PUBLIC_OFFICE_PHONE_FALLBACKS = Object.freeze(["09169165902", "09388322230"]);

export function formatIranianPhoneLabel(value) {
  if (typeof value !== "string") return null;

  const digits = value.replace(/^tel:/i, "").replace(/[^0-9]/g, "");
  if (digits.length === 11 && digits.startsWith("0")) {
    return "+98 " + digits.slice(1, 4) + " " + digits.slice(4, 7) + " " + digits.slice(7);
  }
  if (digits.length === 12 && digits.startsWith("98")) {
    return "+98 " + digits.slice(2, 5) + " " + digits.slice(5, 8) + " " + digits.slice(8);
  }
  return null;
}
