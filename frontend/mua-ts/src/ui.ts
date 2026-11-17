// Tiện ích hiển thị dùng chung.
export const esc = (s: unknown): string => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
export const vnd = (n: unknown): string => Number(n || 0).toLocaleString("vi-VN");
export const kg = (g: unknown): number => Number(g || 0) / 1000;
export const maHD = (c?: string): string => String(c || "").replace(/^HD-/, "HĐ-");
export const ngay = (s?: string): string => (s ? new Date(s).toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit" }) : "");
export const gio = (s?: string): string => (s ? new Date(s).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }) : "");
export const $ = <T extends Element = HTMLElement>(s: string, goc: ParentNode = document): T => goc.querySelector(s) as T;

const TINH: Record<string, string> = { DT: "Đồng Tháp", CT: "Cần Thơ", TN: "Tây Ninh", VL: "Vĩnh Long", AG: "An Giang", TG: "Tiền Giang", BT: "Bến Tre", HCM: "TP.HCM", ST: "Sóc Trăng", CM: "Cà Mau", KG: "Kiên Giang", LA: "Long An" };
export const tinh = (m?: string): string => TINH[m || ""] || m || "";
export const tenLoai = (m?: string): string => (/^L(\d)$/.test(m || "") ? `loại ${m!.slice(1)}` : m === "A" || m === "B" ? `loại ${m}` : m || "");

/** Thông báo ngắn dưới màn (thay alert). */
export function bao(chu: string): void {
  const o = $("#bao"); o.textContent = chu; o.hidden = false;
  clearTimeout((bao as any).hen); (bao as any).hen = setTimeout(() => (o.hidden = true), 4000);
}

/** Khung trống có lời nhắn + nút (khi chưa có dữ liệu). */
export const trong = (chu: string, nut = ""): string => `<div class="trong"><p>${esc(chu)}</p>${nut}</div>`;
