// Bản thử: AI đóng vai người bán (POST /v1/test/doi-tac-ao/vong, chỉ khi máy chủ bật test_tools). Port từ chung.js của app cũ.
// Mỗi 8 giây khi tab đang xem; vừa nhắn tin / trả giá thì gọi ngay (chi_tin) để người bán trả lời không phải chờ.
// Việc AI làm xong mà dính tới mình → khung "Ting! Có tin mới" + tiếng ting + nạp lại dữ liệu.
import { api, manCu, mayNay } from "./api";
import { esc } from "./ui";

interface ViecAi { viec: string; ket_qua: string; to_chuc: string; doi_tuong: string }
const ma = (c: unknown) => String(c ?? "").replace("HĐ-", "HD-");
const KHOA_LAN_DAU = "agv-lan-dau-thu";

const cau = (v: ViecAi): string => {
  const ai = v.to_chuc.startsWith("TC-M") ? "Bên mua" : "Người bán", c = v.doi_tuong;
  const m = /^(chào|trả) giá (.+)$/.exec(v.viec); if (m) return `${ai} trả giá ${m[2]} cho lô ${c}`;
  const b = /^báo giá (.+) cho nhu cầu$/.exec(v.viec); if (b) return `${ai} báo giá ${b[1]} cho nhu cầu ${c}`;
  if (v.viec === "trả lời tin nhắn") return `${ai} vừa nhắn tin cho bạn`;
  return `${ai} ${v.viec} · ${c}`;
};

let am: AudioContext | null = null;
const moAm = () => { try { am ??= new AudioContext(); if (am.state === "suspended") am.resume(); } catch { /* không có âm thanh */ } };
function ting(): void {
  try { navigator.vibrate?.([70, 50, 70]); } catch { /* bỏ qua */ }
  if (!am || am.state !== "running") return;
  const t0 = am.currentTime;
  for (const [tan, tre] of [[1318.5, 0], [1760, 0.16]]) {
    const o = am.createOscillator(), g = am.createGain(); o.type = "sine"; o.frequency.value = tan;
    g.gain.setValueAtTime(0.0001, t0 + tre); g.gain.exponentialRampToValueAtTime(0.25, t0 + tre + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + tre + 0.35);
    o.connect(g).connect(am.destination); o.start(t0 + tre); o.stop(t0 + tre + 0.4);
  }
}

function baoTin(ds: ViecAi[], den: string): void {
  let d = document.getElementById("ai-bao");
  if (!d) { d = document.createElement("div"); d.id = "ai-bao"; d.setAttribute("role", "status"); document.body.append(d); }
  let lanDau = false; try { lanDau = !localStorage.getItem(KHOA_LAN_DAU); localStorage.setItem(KHOA_LAN_DAU, "1"); } catch { /* bỏ qua */ }
  d.innerHTML = `<span><b>Ting! Có tin mới</b>${esc(cau(ds[0]) + (ds.length > 1 ? ` · và ${ds.length - 1} việc khác` : ""))}
    ${lanDau ? `<small>Lần đầu dùng thử: người bán này do AI đóng vai. Bấm Xem để đồng ý giá, trả giá lại hoặc không mua.</small>` : ""}</span>
    <a class="nut chinh nho" href="${den}">Xem</a><button type="button" class="dong" aria-label="Đóng">×</button>`;
  d.querySelector<HTMLButtonElement>(".dong")!.onclick = () => (d!.hidden = true);
  d.querySelector<HTMLAnchorElement>("a")!.onclick = () => (d!.hidden = true);
  d.hidden = false; ting(); clearTimeout((d as any).hen); if (!lanDau) (d as any).hen = setTimeout(() => (d!.hidden = true), 15000);
}

/** Đường mở thẳng việc vừa tới, theo màn của app mới (đơn, chat lời chào) hoặc màn lời chào của app cũ. */
function duongToi(v: ViecAi, of: any[], don: any[]): string {
  const c = ma(v.doi_tuong);
  const d = don.find((x) => ma(x.code) === c); if (d) return `#don/${d.id}`;
  const o = of.find((x) => x.code === c || x.lot_code === c);
  if (o && v.viec === "trả lời tin nhắn") return `#tin/offer/${o.id}`;
  const oc = o ?? of.find((x) => x.direction === "seller_quote" && x.status === "sent");
  return oc ? manCu("bao-gia", `loi-chao=${oc.id}`) : "#hom-nay";
}

export async function batDoiTacAo(): Promise<void> {
  const cap = await fetch("/frontend-capabilities.json").then((r) => r.json()).catch(() => ({}));
  if (!cap.test_tools) return; // bản thật: không có đối tác ảo
  addEventListener("pointerdown", moAm, true); addEventListener("keydown", moAm, true);
  let dangChay = false, dangTin = false;
  const vong = async (nhanh = false) => {
    if (nhanh ? dangTin : document.hidden || dangChay) return;
    if (nhanh) dangTin = true; else { dangChay = true; setTimeout(() => (dangChay = false), 30000); }
    let j: any = null;
    try { j = await api("/v1/test/doi-tac-ao/vong", nhanh ? { chi_tin: true } : {}); } catch { /* AI chậm/lỗi: vòng sau thử lại */ }
    if (nhanh) dangTin = false; else dangChay = false;
    let xong: ViecAi[] = (j?.viec ?? []).filter((v: ViecAi) => v.ket_qua === "xong");
    if (!xong.length) return;
    const lay = (u: string) => api(u).then((x: any) => x?.items ?? x ?? []).catch(() => []);
    const [of, don, nc] = await Promise.all([lay("/v1/offers"), lay("/v1/orders"), lay("/v1/demands?mine=true")]);
    const cua = new Set([...of.flatMap((o: any) => [o.code, o.lot_code]), ...don.map((d: any) => d.code), ...nc.map((n: any) => n.code)].filter(Boolean).map(ma));
    xong = xong.filter((v) => cua.has(ma(v.doi_tuong)));
    if (!xong.length) return;
    baoTin(xong, duongToi(xong[0], of, don));
    window.dispatchEvent(new Event("agv-lam-moi"));
  };
  void mayNay();
  setTimeout(() => vong(), 2500); setInterval(() => vong(), 8000);
  addEventListener("agv-vong-ngay", () => setTimeout(() => vong(true), 300));
}
