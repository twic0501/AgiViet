// Gọi API backend. Phiên dùng chung khóa "agv-phien" với app cũ (đăng nhập OTP ở dang-nhap.html), nên chuyển qua lại không phải đăng nhập lại.
const KHOA_PHIEN = "agv-phien";
const THU = new URLSearchParams(location.search).get("thu");
let token: string | null = null;

export class LoiApi extends Error { constructor(msg: string, public status: number) { super(msg); } }

/** Lấy phiên: sessionStorage, hoặc số thử (?thu=) khi máy chủ bật công cụ thử. Không có thì null (về màn đăng nhập). */
export async function layPhien(): Promise<string | null> {
  try { const t = sessionStorage.getItem(KHOA_PHIEN); if (t && (!THU || sessionStorage.getItem("agv-phien-thu") === THU)) return (token = t); } catch { /* chế độ riêng tư */ }
  if (!THU) return null;
  const cap = await fetch("/frontend-capabilities.json").then((r) => r.json()).catch(() => ({}));
  if (!cap.test_tools) return null;
  const r = await fetch("/v1/test/impersonate", { method: "POST", headers: { "content-type": "application/json", "x-agv-may": mayNay() }, body: JSON.stringify({ phone: THU }) });
  if (!r.ok) return null;
  token = (await r.json()).token as string;
  try { sessionStorage.setItem(KHOA_PHIEN, token); sessionStorage.setItem("agv-phien-thu", THU); } catch { /* bỏ qua */ }
  return token;
}

/** Mã máy (khóa hộ thử): cùng khóa localStorage với app cũ. */
export function mayNay(): string {
  try { let m = localStorage.getItem("agv-may"); if (!m) { m = crypto.randomUUID(); localStorage.setItem("agv-may", m); } return m; } catch { return "khong-luu"; }
}

export async function api<T = any>(duong: string, than?: object): Promise<T> {
  const headers: Record<string, string> = { authorization: "Bearer " + token, "x-agv-may": mayNay() };
  const r = await fetch(duong, than ? { method: "POST", headers: { ...headers, "content-type": "application/json" }, body: JSON.stringify({ idempotency_key: crypto.randomUUID(), ...than }) } : { headers });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401) { try { sessionStorage.removeItem(KHOA_PHIEN); } catch { /* bỏ qua */ } location.href = "/thiet-ke/dang-nhap.html?ben=mua"; }
  if (!r.ok) throw new LoiApi([j.errors?.[0]?.message, j.errors?.[0]?.fix].filter(Boolean).join(" ") || `Lỗi ${r.status}`, r.status);
  return (j.data ?? j) as T;
}

/** Phần phụ lỗi thì để trống (null), không làm hỏng cả màn. */
export const thu = <T>(p: Promise<T>): Promise<T | null> => p.catch(() => null);

/** Màn sâu còn ở app cũ (ký OTP, cọc, giao nhận, khung): mở trong cùng phiên. */
// shortcut: thao tác sâu vẫn ở mua.html (JS cũ, đã kiểm E2E); chuyển dần sang TS khi màn đó được viết lại.
export const manCu = (man: string, q = "") => `/thiet-ke/mua.html?man=${man}${q ? "&" + q : ""}${THU ? `&thu=${THU}` : ""}`;
