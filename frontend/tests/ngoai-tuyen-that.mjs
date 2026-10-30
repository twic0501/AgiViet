// Kiểm hàng đợi ngoại tuyến với backend thật trên stack thử (mặc định 127.0.0.1:18980).
// Kịch bản: mất mạng lúc ghi nhật ký → đồng bộ; lần gửi đầu tới được máy chủ nhưng MẤT phản hồi → gửi lại cùng khóa
// → backend phải trả đúng bản ghi cũ, nhật ký chỉ có 1 dòng. Lệnh ký bị chặn trước khi tới mạng.
// Dùng: node tests/ngoai-tuyen-that.mjs
import assert from "node:assert/strict";
import { NgoaiTuyen, guiQuaFetch, khoBoNho } from "../shared/ngoai-tuyen.js";

const GOC = process.env.AGV_API || "http://127.0.0.1:18980";
const suc = await (await fetch(GOC + "/health")).json();
if (suc.moi_truong !== "thu") throw new Error("chỉ chạy trên môi trường thử");
const post = (d, b, tk) => fetch(GOC + d, { method: "POST", headers: { "content-type": "application/json", ...(tk ? { authorization: "Bearer " + tk } : {}) }, body: JSON.stringify(b) }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));
const get = (d, tk) => fetch(GOC + d, { headers: { authorization: "Bearer " + tk } }).then((r) => r.json());

// Tìm một người bán trong dữ liệu mẫu, tạo vườn riêng cho lượt thử.
let token = null; let site_id = null;
for (const sdt of ["0939000120", "0939000140", "0939000160", "0906000105", "0903000410", "0977000620", "0966000520", "0908000510"]) {
  const r = await post("/v1/test/impersonate", { phone: sdt });
  if (r.status !== 200) continue;
  const me = await get("/v1/me", r.body.token);
  if (!me.org?.can_sell) continue;
  const s = await post("/v1/production-sites", { kind: "orchard", name: "Vườn thử ngoại tuyến " + Date.now(), idempotency_key: crypto.randomUUID() }, r.body.token);
  if (s.status === 200) { token = r.body.token; site_id = s.body.id; console.log("người bán:", sdt, me.org.name); break; }
}
assert.ok(site_id, "không tìm được người bán tạo được vườn trong dữ liệu mẫu");

const that = guiQuaFetch(GOC, () => token);
let che_do = "mat_mang"; let so_lan_toi_may = 0;
const gui = async (duong, than) => {
  if (che_do === "mat_mang") throw new TypeError("Failed to fetch");
  so_lan_toi_may++;
  const r = await that(duong, than);
  if (che_do === "mat_phan_hoi") { che_do = "binh_thuong"; throw new TypeError("network error sau khi gửi"); }
  return r;
};
const nt = new NgoaiTuyen({ kho: khoBoNho(), gui });

// 1) Lệnh ký bị chặn, không tới mạng
await assert.rejects(nt.them("/v1/orders/x/sign", {}), (e) => e.code === "CAN_MANG");

// 2) Mất mạng: ghi vào hàng, chưa có gì trên máy chủ
const m = await nt.them("/v1/farm-diary", { site_id, activity: Object.keys({ fertilize: 1 })[0], occurred_on: "2026-10-30", note: "Bón phân hữu cơ (ghi khi mất mạng)" });
let kq = await nt.dongBo();
assert.equal(kq.mat_mang, true);
const truoc = await get(`/v1/farm-diary?site_id=${site_id}`, token);

// 3) Có mạng nhưng mất phản hồi lần đầu → mục vẫn chờ; lần sau gửi lại cùng khóa
che_do = "mat_phan_hoi";
kq = await nt.dongBo();
assert.equal(kq.mat_mang, true);
assert.equal((await nt.danhSach())[0].trang_thai, "cho");
kq = await nt.dongBo();
const sau = await get(`/v1/farm-diary?site_id=${site_id}`, token);
const ds = sau.viec;
const ds_truoc = truoc.viec;
console.log("kết quả đồng bộ:", kq, "| lần tới máy chủ:", so_lan_toi_may, "| nhật ký trước/sau:", ds_truoc.length, ds.length);
assert.equal(kq.da_gui, 1, JSON.stringify(await nt.danhSach()));
assert.equal(so_lan_toi_may, 2);
assert.equal(ds.length - ds_truoc.length, 1, "gửi lại cùng khóa không được tạo dòng thứ hai");
assert.equal((await nt.danhSach()).length, 0);
console.log("ĐẠT: chặn ký; mất mạng giữ lệnh; mất phản hồi gửi lại cùng khóa chỉ tạo 1 dòng nhật ký (idempotency_key", m.than.idempotency_key.slice(0, 8) + "…)");
