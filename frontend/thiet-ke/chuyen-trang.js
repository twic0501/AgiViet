// Chuyển trang mượt (đi cùng chuyen-trang.css). Nạp trong <head> bằng script thường (không defer) để kịp trang mới vẽ lần đầu.
// 1) Khi bấm: đoán hướng (tab trái/phải, lùi, tới) và ghi vào sessionStorage.
// 2) Trang mới hiện ra (pagereveal): gắn hướng làm "loại chuyển cảnh" để CSS chọn kiểu trượt.
// 3) Dựng sẵn trang kế tiếp khi ngón tay chạm vào liên kết (Speculation Rules) — mở gần như tức thì.
(function () {
  var co = "onpagereveal" in window;                       // trình duyệt hỗ trợ chuyển cảnh giữa hai trang
  document.documentElement.toggleAttribute("data-hu-vt", co);
  if (!co) return;
  var TAB = ["ban-hom-nay", "ban-hang-hoa", "ban-dang-bai", "ban-tin-nhan", "ban-tien"];
  var viTri = function (href) {
    try { var u = new URL(href, location.href); var p = u.pathname.split("/").pop().replace(".html", ""); var i = TAB.indexOf(p); if (i >= 0) return i; var m = u.searchParams.get("man"); return m ? m : -1; } catch (e) { return -1; }
  };
  var ghi = function (h) { try { sessionStorage.setItem("hu-vt", h); } catch (e) {} };
  document.addEventListener("click", function (e) {
    var el = e.target.closest && e.target.closest("a[href], #dong, .sl-lui, [data-lui]");
    if (!el) return;
    if (el.matches("#dong, .sl-lui, [data-lui]") || /quay lại/i.test(el.getAttribute("aria-label") || "")) { ghi("lui"); return; }
    var trongTab = el.closest(".tab, .sl-tab, .sl-menu, .m-tab");
    if (trongTab) {
      var a = viTri(location.href), b = viTri(el.href);
      if (typeof a === "number" && typeof b === "number" && a >= 0 && b >= 0) { ghi(b > a ? "tab-phai" : "tab-trai"); return; }
      // app mua/vận hành: so thứ tự mục trong menu/tab
      var ds = Array.prototype.slice.call(trongTab.querySelectorAll("a[href]"));
      var cu = ds.findIndex(function (x) { return x.getAttribute("aria-current") === "page"; }), moi = ds.indexOf(el);
      ghi(cu >= 0 && moi >= 0 ? (moi > cu ? "tab-phai" : "tab-trai") : "tab-phai");
      return;
    }
    ghi("toi");
  }, true);
  // Nút lùi của trình duyệt / vuốt lùi
  addEventListener("popstate", function () { ghi("lui"); });
  // Phía trang cũ: cũng nuốt lỗi hủy; trong khung thì bỏ chuyển cảnh ngay từ lúc rời
  addEventListener("pageswap", function (e) {
    if (!e.viewTransition) return;
    var nuot = function () {}; e.viewTransition.ready.catch(nuot); e.viewTransition.finished.catch(nuot); e.viewTransition.updateCallbackDone.catch(nuot);
    if (window.top !== window) e.viewTransition.skipTransition();
  });
  addEventListener("pagereveal", function (e) {
    var h = null; try { h = sessionStorage.getItem("hu-vt"); sessionStorage.removeItem("hu-vt"); } catch (x) {}
    if (!e.viewTransition) return;
    // Bị hủy giữa chừng (tải lại nhanh, trang ẩn) là bình thường — không để thành lỗi
    var nuot = function () {}; e.viewTransition.ready.catch(nuot); e.viewTransition.finished.catch(nuot); e.viewTransition.updateCallbackDone.catch(nuot);
    // Trong khung (trang thử hai bên) không cần chuyển cảnh
    if (window.top !== window) { e.viewTransition.skipTransition(); return; }
    var nav = window.navigation && navigation.activation;
    if (!h && nav && nav.navigationType === "traverse") h = "lui";
    if (h) { e.viewTransition.types.add(h); document.documentElement.dataset.huVtLoai = h; }
  });
  // Dựng sẵn trang kế tiếp lúc ngón tay chạm xuống (conservative): kịp mở nhanh mà không dựng sẵn bằng dữ liệu đơn cũ
  if (HTMLScriptElement.supports && HTMLScriptElement.supports("speculationrules")) {
    var s = document.createElement("script"); s.type = "speculationrules";
    s.textContent = JSON.stringify({ prerender: [{ where: { and: [{ href_matches: "/thiet-ke/*" }, { not: { href_matches: "/thiet-ke/(index|hai-ben|testquytrinhapp).html" } }] }, eagerness: "conservative" }] });
    document.head.appendChild(s);
  }
})();
