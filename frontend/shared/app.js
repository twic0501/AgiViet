import { Api, ApiError } from "./api.js";
import { clearFormErrors, showDemandError } from "./form-errors.js";
import { money, quantity, date, escapeHtml as e } from "./format.js";
import {
  heading,
  link,
  button,
  amount,
  line,
  rule,
  empty,
  field,
  select,
  badge,
  notice,
  icon,
  fraud,
  protection,
  otpBox,
} from "./ui.js";
import * as market from "./market.js";
import * as orders from "./orders.js";
import * as services from "./services.js";
import { enrollment } from "./enrollment.js";
import QRCode from "../assets/qr.js";
import { phoneSuggestions, discoverTestTools } from "./login-options.js";
import { virtualMoneyNotice } from "./virtual-money.js";
import * as ban from "./seller.js";
const app = document.body.dataset.app;
const seller = app === "ban";
const administrator = app === "quan-tri";
const admin = administrator ? await import("../quan-tri/admin.js") : null;
let toolsPromise;
const storeKey = "agv-session-" + app;
let device = localStorage.getItem("agv-device");
if (!device) {
  device = crypto.randomUUID();
  localStorage.setItem("agv-device", device);
}
const session = () => {
  try {
    return JSON.parse(sessionStorage.getItem(storeKey) || "null");
  } catch {
    return null;
  }
};
const api = new Api({
  token: session()?.token,
  deviceId: device + "-" + app,
  storage: sessionStorage,
});
const roleNames = {
  owner: "Quản lý / chủ",
  purchaser: "Mua hàng",
  accountant: "Kế toán",
  warehouse: "Kho",
  site_receiver: "Người nhận",
  helper: "Người giúp",
  coop_board: "Ban điều hành HTX",
  collection_staff: "Thu gom",
  coop_member: "Thành viên HTX",
};
const c = {
  api,
  app,
  seller,
  administrator,
  side: seller ? "seller" : "buyer",
  user: null,
  health: null,
  accounts: [],
  products: [],
  state: {},
  on: {},
  forms: {},
  change: {},
  can: (a) => c.user?.actions?.includes(a),
  go(path) {
    location.hash = "#/" + path;
  },
  flash(message) {
    c.message = message;
  },
  command: async (path, data = {}) => {
    const r = await api.command(path, data);
    c.flash(r.data?.thong_bao || "Đã ghi nhận.");
    return r;
  },
};
let dirty = false;
let epoch = 0,
  busy = false,
  mascot = null,
  blobs = [],
  installer = null;
const root = document.querySelector("#app");
const icons = {
  home: "home",
  lots: "lots",
  post: "plus",
  offers: "offers",
  orders: "orders",
  demands: "leaf",
  ledger: "money",
  organization: "users",
  plans: "orders",
  messages: "offers",
};
const sellerNav = ban.navBan;
const adminNav = admin?.navigation || [];
const buyerNav = [
  ["home", "Tổng quan"],
  ["lots", "Nguồn hàng"],
  ["demands", "Nhu cầu mua"],
  ["offers", "So báo giá"],
  ["orders", "Hợp đồng"],
  ["ledger", "Tiền và công nợ"],
  ["organization", "Tổ chức"],
];
function current() {
  return (location.hash.slice(2) || "home").split("/");
}
function navLink([key, title], bottom = false) {
  const route = current()[0];
  const active = route === key || (key === "orders" && route === "order") || (seller && key === "lots" && route === "offers");
  return `<a class="${bottom ? "" : "nav-link"} ${key === "post" ? "post" : ""}" href="#/${key}" ${active ? 'aria-current="page"' : ""}>${bottom && seller && key !== "post" ? `<span class="nav-o">${icon(icons[key])}</span>` : icon(icons[key])}<span>${e(title)}</span></a>`;
}
function testStrip() {
  if (c.health?.moi_truong !== "thu" || !administrator) return "";
  return `<div class="test-strip"><div><span>Môi trường thử</span><a href="/${seller ? "mua" : "ban"}/">Mở app ${seller ? "mua" : "bán"}</a></div>${c.accounts.length && !administrator ? `<details><summary>Công cụ thử</summary><div class="test-tools"><p>OTP: 123456 · PIN biên bản: 2468. Dữ liệu dùng chung ở cả hai app.</p><form data-form="testRole">${select(
    "Đóng vai bên kia hoặc đổi người",
    "phone",
    c.accounts
      .filter((a) =>
        seller ? a.can_sell || (!a.org_code && !a.staff_roles) : a.can_buy,
      )
      .map((a) => [
        a.phone,
        `${a.display_name} · ${a.org_name || "Chưa có thông tin tổ chức"} · ${(
          a.roles || ""
        )
          .split(",")
          .map((r) => roleNames[r] || "Thành viên")
          .join(", ")}`,
      ]),
  )}<button>Đóng vai tài khoản này</button></form>${c.depositInstruction && c.currentOrder?.status === "awaiting_deposit" ? button("Ngân hàng xác nhận đủ cọc", "testDeposit", true) : ""}${c.currentOrder?.dot_giao?.length ? button("Đặt giờ tới lúc giao hàng", "testDeliveryTime", true) : ""}${button("Ngân hàng xử lý lệnh chi", "testBank", true)}${button("Đối soát bằng vai vận hành", "testReconcile", true)}</div></details>` : ""}</div>`;
}
function shell(content) {
  const logged = !!c.user;
  return (
    `<div data-test-strip>${testStrip()}</div>` +
    (!navigator.onLine
      ? `<div class="offline" role="alert">Mất mạng. Kết nối lại trước khi ký, xác nhận tiền hoặc ghi cân.</div>`
      : "") +
    `<header class="top"><a class="brand" href="#/home"><img src="/assets/logo.svg" alt=""><span>AgiViet<small>Sổ làm ăn · ${administrator ? "Quản trị" : seller ? "Bán hàng" : "Thu mua"}</small></span></a>${logged ? `<div class="identity"><strong>${e(c.user.name)}</strong><span>${e(c.user.org.name)}</span><br><button class="quiet" data-action="logout">Đăng xuất</button></div>` : button("Nghe hướng dẫn", "listen", true)}</header>${logged ? `<div class="shell"><aside class="sidebar"><p class="caption">SỔ LÀM ĂN</p>${(administrator ? adminNav : seller ? sellerNav : buyerNav).map((n) => navLink(n)).join("")}<div class="install-tip">${administrator ? '<a class="button secondary" href="/ban/">App bán</a><a class="button secondary" href="/mua/">App mua</a>' : link("Thông báo", "notifications", true) + link("Hỗ trợ", "support", true) + link("Tin nhắn", "messages", true)}</div></aside><main class="content" id="content">${virtualMoneyNotice(c)}${c.message ? `<div class="toast" role="status">${e(c.message)}</div>` : ""}<div id="error-slot"></div>${!logged ? virtualMoneyNotice(c) : ""}${api.hasPending() ? notice("Thao tác trước chưa rõ kết quả. Giữ nguyên nội dung khi gửi lại.") + button("Gửi lại thao tác trước", "retryPending", true) : ""}${content}</main></div>${seller ? `${ban.dongNhac(current())}<nav class="bottom-nav" aria-label="Điều hướng chính">${sellerNav.map((n) => navLink(n, true)).join("")}</nav>` : ""}` : `<main class="content" id="content"><div id="error-slot"></div>${!logged ? virtualMoneyNotice(c) : ""}${api.hasPending() ? notice("Thao tác trước chưa rõ kết quả. Giữ nguyên nội dung khi gửi lại.") + button("Gửi lại thao tác trước", "retryPending", true) : ""}${content}</main>`}`
  );
}
function fail(error) {
  console.error(error instanceof ApiError ? error.code : error.message);
  const target = document.querySelector("#error-slot") || root;
  target.innerHTML = `<div class="notice error" role="alert"><h3>${e(error.message)}</h3>${error.fix ? `<p>${e(error.fix)}</p>` : ""}${error.requestId ? `<p class="support-code">Mã hỗ trợ: ${e(error.requestId)}</p>` : ""}<div class="actions">${button("Tải lại để kiểm tra", "reload", true)}${api.hasPending() ? button("Gửi lại thao tác trước", "retryPending", true) : ""}${button("Cần hỗ trợ", "support", true)}</div><p data-support></p></div>`;
  c.error = error;
  target.scrollIntoView({ block: "start", behavior: "instant" });
}
async function setSession(result) {
  api.token = result.token;
  sessionStorage.setItem(storeKey, JSON.stringify({ token: result.token }));
  c.user = result.user;
  api.setActor(c.user.user_id);
  c.state = {};
}
function bindCommon() {
  c.on.reload = () => {};
  c.on.retryPending = async () => {
    await api.retryPending();
    c.state.otp = null;
    c.flash("Đã kiểm tra lại thao tác trước.");
  };
  c.on.listen = () => {
    if (!("speechSynthesis" in window))
      throw new Error("Máy này chưa hỗ trợ đọc hướng dẫn.");
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(
      document.querySelector("#content")?.innerText ||
        "AgiViet, sổ làm ăn nông sản và thủy sản.",
    );
    u.lang = "vi-VN";
    u.rate = 0.85;
    speechSynthesis.speak(u);
  };
  c.on.logout = async () => {
    await api.post("/v1/auth/logout");
    sessionStorage.removeItem(storeKey);
    api.token = "";
    api.setActor("");
    c.user = null;
    c.state = {};
    c.go("home");
  };
  c.on.support = () => c.go("support");
  c.on.huongDan = () => ban.moHuongDan(c, current());
  c.forms.testRole = async (f) => {
    if (!c.accounts.length) return;
    await setSession(
      await api.post("/v1/test/impersonate", { phone: f.get("phone") }),
    );
    c.go("home");
  };
  c.on.testDeposit = async () => {
    if (!c.accounts.length || !c.depositInstruction) return;
    const d = c.depositInstruction;
    await api.post("/v1/sim/bank/transfers", {
      payment_ref: d.payment_ref,
      amount_vnd: d.total_vnd,
    });
    await api.post("/v1/sim/bank/deliver", {});
    c.flash("Đã nhận kết quả từ ngân hàng.");
  };
  c.on.testDeliveryTime = async () => {
    const o = c.currentOrder;
    if (!c.accounts.length || !o?.dot_giao.length) return;
    await api.post("/v1/test/clock", { set: c.delivery?.window_from || o.dot_giao[0].window_from });
  };
  c.on.testBank = async () => {
    if (!c.accounts.length) return;
    await api.post("/v1/sim/bank/process-instructions", {});
    await api.post("/v1/sim/bank/deliver", {});
    c.flash("Đã nhận kết quả xử lý lệnh ngân hàng.");
  };
  c.on.testReconcile = async () => {
    if (!c.accounts.length) return;
    const staff = await api.post("/v1/test/impersonate", {
      phone: "0901000005",
    });
    const ops = new Api({ token: staff.token, deviceId: device });
    await ops.command("/v1/ops/reconcile");
    await ops.post("/v1/auth/logout");
    c.flash("Đã đối soát lệnh ngân hàng.");
  };
  c.on.install = async () => {
    if (installer) {
      await installer.prompt();
      installer = null;
    } else {
      c.flash(
        /iPhone|iPad/.test(navigator.userAgent) ? "Trên iPhone: bấm nút Chia sẻ (hình vuông có mũi tên) ở Safari, rồi chọn Thêm vào MH chính." : "Mở menu trình duyệt (ba chấm), chọn Cài đặt ứng dụng hoặc Thêm vào màn hình chính.",
      );
    }
  };
  c.forms.openDispute = (f) =>
    c.go("dispute/" + encodeURIComponent(f.get("dispute").trim()));
  c.forms.switchOrg = async (f) => {
    c.user = await api.post("/v1/auth/switch-org", { org_code: f.get("org") });
    c.state = {};
    c.go("home");
  };
}
c.setSession = setSession;
async function login() {
  c.on.changeLoginPhone = () => { delete c.state.login; };
  c.forms.loginPhone = async (f) => {
    const phone = f.get("phone");
    const result = await api.post("/v1/auth/otp/send", { phone });
    c.state.login = { phone, ...result };
  };
  c.forms.loginOtp = async (f, form) => {
    const o = form?.querySelectorAll(".otp-o") || [];
    let r;
    try {
      r = await api.post("/v1/auth/otp/verify", {
        phone: c.state.login.phone,
        challenge_id: c.state.login.challenge_id,
        code: f.get("code"),
        device_id: device + "-" + app,
      });
    } catch (err) {
      if (o.length && window.HieuUng) { await window.HieuUng.otp(o, f.get("code"), false).catch(() => {}); const i = form.querySelector(".otp-that"); i.value = ""; o.forEach((x) => { x.textContent = ""; x.classList.remove("sai"); }); }
      throw err;
    }
    if (o.length && window.HieuUng) await window.HieuUng.otp(o, f.get("code"), true).catch(() => {});
    await setSession(r);
  };
  if (seller) return ban.welcome(c);
  return `<section class="login direct-login"><div class="card">${heading("Đăng nhập", administrator ? "Sổ làm ăn · Quản trị AgiViet" : seller ? "Sổ làm ăn · App bán" : "Sổ làm ăn · App mua")}${!c.state.login ? `<form data-form="loginPhone">${field("Số điện thoại của bạn", "phone", "tel", "", `inputmode="tel" autocomplete="tel" pattern="${c.health?.moi_truong === "thu" ? "0[0-9]{9}|00(0[1-9]|10)" : "0[0-9]{9}"}" required`)}${phoneSuggestions(app, c.health, c.accounts.length > 0)}<button>Nhận mã đăng nhập</button></form>` : `<p>Mã đã gửi tới ${e(c.state.login.phone)}.</p>${notice(fraud)}<form data-form="loginOtp">${otpBox("Mã OTP đăng nhập")}<button>Đăng nhập</button></form>${button("Đổi số điện thoại", "changeLoginPhone", true)}`}${!seller && !administrator ? `<div class="actions">${link("Đăng ký doanh nghiệp", "register", true)}</div>` : ""}${seller ? '<p class="caption">Tài khoản người bán do vận hành hoặc tổ chức mời.</p>' : ''}</div></section>`;
}
async function home() {
  const [list, offers] = await Promise.all([
    api.get("/v1/orders"),
    api.get("/v1/offers"),
  ]);
  const mine = list.filter((o) => o.hien_thi.toi_luot?.phia === c.side);
  const replies = offers.filter(
    (o) => o.status === "sent" && o.vong_cuoi.from_side !== c.side,
  );
  const shortcuts = seller
    ? [
        ["post", "Đăng lô"],
        ["lots", "Lô của tôi"],
        ["offers", "Chào giá"],
        ["orders", "Hợp đồng"],
        ["demands", "Bên mua cần"],
        ["ledger", "Sổ tiền"], ["organization", "Tổ chức"], ["notifications", "Thông báo"], ["support", "Hỗ trợ"],
      ]
    : [
        ["lots", "Tìm nguồn hàng"],
        ["demands", "Nhu cầu mua"],
        ["offers", "So báo giá"],
        ["orders", "Theo dõi đơn"],
        ["ledger", "Tiền và công nợ"],
        ["organization", "Tổ chức"],
      ];
  return (
    heading(seller ? "Việc hôm nay" : "Tổng quan thu mua", c.user.org.name) +
    `${!c.user.roles.length?notice("Bạn chưa có vai đã hiệu lực. Tổ chức mới cần chờ xác minh và cấp quyền; thành viên mới cần chờ vai có hiệu lực."):""}<div class="guide"><div class="mascot" data-mascot></div><p>${seller ? "Xem việc tới lượt. Đọc kỹ trước khi ký, kiểm tra tài khoản trước khi xác nhận tiền." : "Theo dõi việc cần xử lý của tổ chức. Mỗi vai chỉ thực hiện việc được giao."}</p></div><div class="grid two"><section class="card"><p class="eyebrow">${seller ? "Sổ làm ăn hôm nay" : "Hồ sơ đang theo dõi"}</p><div class="amount">${list.length} hợp đồng</div>${line("Việc tới lượt phía bạn", mine.length)}${line("Lời chào cần trả lời", replies.length)}<div class="actions">${link("Mở sổ hợp đồng", "orders", true)}</div></section><section class="card"><p class="eyebrow">${seller ? "Bán hàng" : "Nguồn nguyên liệu"}</p><h2>${seller ? "Có hàng mới? Ghi lô trước." : "Đặt đúng nhu cầu, gặp đúng nguồn."}</h2><p class="muted">${seller ? "Loại hàng, lượng và ngày có hàng giúp bên mua chào đúng." : "Ghép theo loại, lượng và thời gian. Mỗi kết quả có lý do phù hợp."}</p><div class="actions">${c.can(seller?"lot.create":"demand.create")?link(seller ? "Đăng lô mới" : "Tạo nhu cầu mua", seller ? "post" : "demand-new"):link("Xem quyền và thành viên", "organization", true)}</div></section></div><div class="section-title"><h2>Tới lượt ${seller ? "bạn" : "tổ chức"}</h2><span class="caption">${mine.length + replies.length} việc</span></div><div class="grid two">${mine.map((o) => `<article class="card task">${badge("Tới lượt " + side(o.hien_thi.toi_luot.phia), true)}<h3>${e(o.hien_thi.toi_luot.viec)}</h3><p>${e(o.code)} · ${e(seller ? o.buyer_name : o.seller_name)}</p><div class="actions">${link("Mở việc cần làm", `order/${o.id}/${{ Ký: "terms", Cọc: "deposit", "Giao nhận": "delivery", "Thanh toán": "payments" }[o.hien_thi.chang] || "terms"}`)}</div></article>`).join("")}${replies.map((o) => `<article class="card task">${badge("Lời chào cần trả lời", true)}<h3>${e(o.code)} · lô ${e(o.lot_code)}</h3><p>${e(quantity(o.vong_cuoi.qty_g))} · ${e(money(o.vong_cuoi.price_vnd))}/kg</p><div class="actions">${link("Xem lời chào", `offers/${o.id}`)}</div></article>`).join("")}</div>${!mine.length && !replies.length ? empty("Chưa có việc tới lượt", "Bạn có thể xem lô, tìm khách hoặc kiểm tra các hợp đồng đang chờ bên kia.") : ""}<div class="section-title"><h2>Mở nhanh</h2></div><div class="grid two">${shortcuts.filter(([r]) => r !== "post" || c.can("lot.create")).map(([r, t]) => `<a class="card row" href="#/${r}"><strong>${t}</strong>${icon(icons[r] || "leaf")}</a>`).join("")}</div><div class="install-tip">${button("Thêm AgiViet vào màn hình chính", "install", true)}</div>`
  );
}
const side = (s) =>
  ({ buyer: "bên mua", seller: "người bán", bank: "ngân hàng" })[s] ||
  "đối tác";
async function route() {
  const [view, id, sub] = current();
  if (view === "invitation" && !administrator) return enrollment(c, view, id);
  if (view === "register" && !seller && !administrator) return enrollment(c, view, id);
  if (!c.user) return login();
  if (administrator) return admin.route(c, view, id);
  if ((c.seller && !c.user.org.can_sell) || (!c.seller && !c.user.org.can_buy))
    return empty(
      "Tài khoản này thuộc app bên kia",
      "Mở đúng app của tổ chức hoặc đổi tài khoản.",
      `<a class="button" href="/${seller ? "mua" : "ban"}/">Mở app ${seller ? "mua" : "bán"}</a>`,
    );
  switch (view) {
    case "home":
      return seller ? ban.home(c) : home();
    case "them":
      if (seller) { location.replace("#/home"); return ""; }
      return empty("Không tìm thấy màn này", "Mở lại trang chủ để tiếp tục.", link("Về trang chủ", "home"));
    case "toi": return ban.manToi(c);
    case "cai-dat": return ban.caiDat(c);
    case "rieng-tu": return ban.riengTu(c);
    case "gia": return ban.gia(c);
    case "hoc": return ban.hoc(c);
    case "vuon": return ban.vuon(c);
    case "nhat-ky": return ban.nhatKy(c);
    case "thoi-tiet": case "tin-tuc": case "lich-su": case "dat-truoc": case "bao-tieu": case "ban-gap":
      if (seller) return ban.tienIch(c, current());
      return empty("Không tìm thấy màn này", "Mở lại trang chủ để tiếp tục.", link("Về trang chủ", "home"));
    case "lots":
      if (seller && id === "ben-mua") return ban.benMuaCan(c);
      return seller ? (id ? ban.lotDetail(c, id) : ban.lotList(c)) : market.lots(c, id);
    case "post":
      return c.can("lot.create")
        ? (seller ? ban.postLot(c) : market.postLot(c))
        : empty(
            "Bạn chưa có quyền đăng lô",
            "Chủ tài khoản hoặc người được giao đăng lô thực hiện việc này.",
          );
    case "demands":
      if (seller && !id) { location.replace("#/lots/ben-mua"); return ""; }
      return market.demands(c, id);
    case "matches":
      return market.demands(c, id, true);
    case "demand-new":
      return c.can("demand.create")
        ? market.demandNew(c)
        : empty(
            "Bạn chưa có quyền tạo nhu cầu",
            "Người mua hàng hoặc quản lý thực hiện việc này.",
          );
    case "bid":
      return market.bid(c, id, sub);
    case "quote":
      return market.bid(c, id, sub, true);
    case "offers":
      return seller ? (id ? ban.offer(c, id) : ban.offerList(c)) : market.offers(c, id);
    case "orders":
      return seller ? ban.orderList(c) : orders.orderList(c);
    case "create-order":
      return orders.createOrder(c, id);
    case "order":
      return seller ? ban.order(c, id, sub) : orders.order(c, id, sub);
    case "dispute":
      return orders.dispute(c, id);
    case "ledger":
      return seller && id !== "chi-tiet" ? ban.ledger(c) : services.ledger(c);
    case "organization":
      return services.organization(c);
    case "plans":
      location.replace("#/home");
      return "";
    case "support": return seller ? ban.hoTro(c, await services.support(c)) : services.support(c);
    case "notifications": return seller ? ban.thongBao(c) : services.notifications(c);
    case "payout": return services.payout(c);
    case "messages":
      return (
        heading("Tin nhắn") +
        empty(
          "Chưa có tin nhắn trong app",
          "Chưa có chức năng gửi tin nhắn hoặc gọi qua app. Giao dịch ngoài app không được bảo vệ.",
        )
      );
    default:
      return empty(
        "Không tìm thấy màn này",
        "Mở lại trang chủ để tiếp tục.",
        link("Về hôm nay", "home"),
      );
  }
}
async function render() {
  root.setAttribute("aria-busy", "true");
  dirty = false;
  const ticket = ++epoch;
  mascot?.huy();
  mascot = null;
  blobs.forEach(URL.revokeObjectURL);
  blobs = [];
  c.on = {};
  c.forms = {};
  c.change = {};
  c.currentOrder = null;
  c.delivery = null;
  c.depositInstruction = null;
  bindCommon();
  root.innerHTML = shell(
    '<div class="skeleton" role="status" aria-label="Đang tải"></div>',
  );
  try {
    c.health = await api.get("/health").catch(() => null);
    if (api.token) {
      try {
        c.user = await api.get("/v1/auth/session");
      } catch (err) {
        if (err.status === 401) {
          sessionStorage.removeItem(storeKey);
          api.token = "";
          c.user = null;
        } else throw err;
      }
    }
    if (c.user) api.setActor(c.user.user_id);
    if (c.user && !administrator && !c.products.length)
      c.products = await api.get("/v1/products");
    const html = await route();
    if (ticket !== epoch) return;
    root.innerHTML = shell(html);
    toolsPromise ||= discoverTestTools(api, c.health);
    toolsPromise.then(accounts => {
      c.accounts = accounts;
      const strip = document.querySelector("[data-test-strip]");
      if (strip) strip.innerHTML = testStrip();
    });
    c.message = "";
    await hydrate();
    document.querySelector("h1")?.focus({ preventScroll: true });
    if (seller && c.user) ban.tuMoHuongDan(c, current());
  } catch (err) {
    if (ticket !== epoch) return;
    root.innerHTML = shell("");
    fail(err);
  } finally {
    if(ticket === epoch) {
      root.dataset.renderedRoute = location.hash;
      root.removeAttribute("aria-busy");
    }
  }
}
async function hydrate() {
  const target = document.querySelector("[data-mascot]");
  if (target) {
    try {
      if (
        !matchMedia("(prefers-reduced-motion: reduce)").matches &&
        document.createElement("canvas").getContext("webgl")
      ) {
        mascot = new window.LinhVatNguyen(target, {
          goc: "/tham-khao/hieu-ung-va-linh-vat/trau/",
          co: 76,
          nen: "dung",
        });
      } else
        target.innerHTML =
          '<img src="/tham-khao/hieu-ung-va-linh-vat/trau/01-dung.webp" alt="Trâu AgiViet">';
    } catch {
      target.innerHTML =
        '<img src="/tham-khao/hieu-ung-va-linh-vat/trau/01-dung.webp" alt="Trâu AgiViet">';
    }
  }
  for (const el of document.querySelectorAll("[data-qr]"))
    await QRCode.toCanvas(el, el.dataset.qr, {
      width: 220,
      margin: 2,
      errorCorrectionLevel: "M",
    });
  for (const img of document.querySelectorAll("[data-document-image]")) {
    try {
      const blob = await api.request(
        "/v1/documents/" + img.dataset.documentImage + "/file",
        { blob: true },
      );
      const url = URL.createObjectURL(blob);
      blobs.push(url);
      img.src = url;
      await img.decode();
      img.hidden = false;
      if(img.dataset.lotPhoto) {
        img.alt = "Ảnh lô hàng";
        const caption=img.parentElement.querySelector("figcaption,small");
        if(caption) caption.textContent=img.dataset.photoLabel || "Ảnh lô hàng";
      }
    } catch {
      if(img.dataset.lotPhoto) {
        const caption=img.parentElement.querySelector("figcaption,small");
        img.remove();
        if(caption) caption.textContent="Chưa tải được ảnh lô. Tải lại để thử lại.";
        continue;
      }
      img.replaceWith(
        Object.assign(document.createElement("p"), {
          textContent: "Chưa tải được ảnh.",
        }),
      );
    }
  }
  if (window.HieuUng) {
    // Đếm số tiền đã xác nhận, mỗi màn một lần trong phiên.
    for (const el of document.querySelectorAll("[data-dem]")) {
      const den = Number(el.dataset.dem), khoa = "agv-dem-" + location.hash + el.dataset.dem;
      try { if (sessionStorage.getItem(khoa)) continue; sessionStorage.setItem(khoa, "1"); } catch {}
      if (den > 0) window.HieuUng.demSo(el, 0, den, { hau: el.dataset.hau || "", ms: 900 }).catch(() => {});
    }
  }
}
async function showPdf(id) {
  const host = document.querySelector("[data-pdf-host]");
  if (!host) return;
  const blob = await api.request("/v1/documents/" + id + "/file", {
    blob: true,
  });
  const url = URL.createObjectURL(blob);
  blobs.push(url);
  host.innerHTML = `<section class="card"><h2>Toàn văn tài liệu</h2><a class="button secondary" href="${url}" target="_blank" rel="noopener">Mở tài liệu riêng</a><a class="button quiet" href="${url}" download="AgiViet.pdf">Tải PDF</a><iframe class="pdf-frame" title="Tài liệu PDF của hợp đồng" src="${url}"></iframe></section>`;
  host.scrollIntoView({ block: "start" });
}
// Chữ hiện cạnh dấu tick xanh khi việc đã được máy chủ xác nhận.
const OK = {
  loginOtp: "Mã đúng", loginPhone: "Đã gửi mã", accept: "Đã đồng ý giá", reject: "Đã ghi nhận",
  counter: "Đã gửi giá", post: "Đã lưu", sign: "Đã ký", confirm: "Đã xác nhận",
  report: "Đã báo trả", publish: "Đã đăng", agree: "Đã đồng ý",
};
function okLabel(el) {
  if (el.dataset.ok) return el.dataset.ok;
  const key = (el.dataset.action || el.closest("form")?.dataset.form || "").toLowerCase();
  const hit = Object.keys(OK).find((k) => key.includes(k.toLowerCase()));
  return hit ? OK[hit] : "Xong";
}
async function execute(fn, element, refresh = true) {
  if (busy || !fn) return;
  if (!navigator.onLine) {
    fail(new Error("Mất mạng. Kết nối lại rồi thử lại thao tác."));
    return;
  }
  busy = true;
  element?.setAttribute("aria-busy", "true");
  if (element) element.disabled = true;
  try {
    await fn(element);
    // Hiệu ứng chỉ chạy SAU khi máy chủ đã xác nhận (nguyên tắc của bộ hiệu ứng).
    if (refresh && element && window.HieuUng && element.matches("button")) {
      await window.HieuUng.thanhCong(element, okLabel(element)).catch(() => {});
      await new Promise((r) => setTimeout(r, 350));
    }
    const thongBao = c.message;
    if (refresh) await render();
    if (thongBao && window.HieuUng) {
      document.querySelector(".toast")?.remove();
      window.HieuUng.thongBao(document.body, thongBao).catch(() => {});
    }
  } catch (err) {
    c.error = err;
    if (!showDemandError(element?.closest('form'), err)) fail(err);
    if (err.code === "REVISION_XUNG_DOT") c.state.otp = null;
  } finally {
    busy = false;
    if (element) {
      element.disabled = false;
      element.removeAttribute("aria-busy");
    }
  }
}
root.addEventListener("click", (event) => {
  const sample = event.target.closest("[data-phone]");
  if (sample) {
    const input = root.querySelector('form[data-form="loginPhone"] input[name="phone"]');
    if (input) { input.value = sample.dataset.phone; input.focus(); dirty = true; }
    return;
  }
  const b = event.target.closest("[data-action]");
  if (!b) return;
  const action = b.dataset.action;
  if(action === "copyReference") return execute(async()=>{
    const section=b.closest('.transfer-reference'), input=section.querySelector('[data-copy-value]');
    input.select(); input.setSelectionRange(0,input.value.length);
    try {await navigator.clipboard.writeText(input.value);section.querySelector('[data-copy-status]').textContent='Đã sao chép mã chuyển tiền.';}
    catch {section.querySelector('[data-copy-status]').textContent='Đã chọn mã. Nhấn giữ hoặc dùng lệnh Sao chép trên máy.';}
  }, b, false);
  if (action.startsWith("pdf:"))
    return execute(() => showPdf(action.slice(4)), b, false);
  execute(c.on[action], b, !["listen", "support", "huongDan"].includes(action));
});
root.addEventListener("submit", (event) => {
  const form = event.target;
  if (!form.matches("[data-form]")) return;
  event.preventDefault();
  clearFormErrors(form);
  const f = new FormData(form);
  execute(
    () => c.forms[form.dataset.form]?.(f, form),
    form.querySelector("button[type=submit],button:not([type])"),
  );
});
root.addEventListener("input", (ev) => {
  const t = ev.target;
  if (t.classList?.contains("otp-that")) {
    t.value = t.value.replace(/\D/g, "").slice(0, 6);
    t.parentElement.querySelectorAll(".otp-o").forEach((o, i) => { o.textContent = t.value[i] || ""; o.classList.toggle("dang", i === t.value.length); });
    // Chỉ tự gửi khi ô mã là ô duy nhất của form (không bỏ qua ô khác như biển số xe).
    const oKhac = t.form ? [...t.form.querySelectorAll("input:not([type=hidden]):not(.otp-that),textarea,select")].length : 1;
    if (t.value.length === 6 && !oKhac) t.form.requestSubmit();
  }

  dirty = true;
});
root.addEventListener("change", (event) => {
  const input = event.target;
  if (input.type === "file") {
    const name = input.parentElement.querySelector("[data-file-name]");
    if (name) name.textContent = input.files[0]?.name || "Chưa chọn tệp";
  }
  const form = input.closest("form");
  if (form && c.change[input.name])
    execute(() => c.change[input.name](form, input), null, false);
});
window.addEventListener("hashchange", () => {
  c.message = "";
  c.state = {};
  window.scrollTo(0, 0);
  root.scrollTop = 0; // app bán cuộn trong #app (khung cố định)
  render();
});
document.addEventListener("visibilitychange", () => {
  if (
    document.visibilityState === "visible" &&
    c.user &&
    !busy &&
    !dirty &&
    !c.state.otp
  )
    render();
});
window.addEventListener("online", render);
window.addEventListener("offline", () => {
  const target = document.querySelector("#content");
  if (target)
    target.insertAdjacentHTML(
      "afterbegin",
      '<div class="offline" role="alert">Mất mạng. Kết nối lại trước khi ghi nhận giao dịch.</div>',
    );
});
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installer = event;
});
if ("serviceWorker" in navigator)
  navigator.serviceWorker
    .register("/sw.js", { scope: `/${app}/` })
    .catch(() => {});
render();
