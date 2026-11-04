// Máy tính (màn rộng, có chuột): app chạy trong khung điện thoại (khung-dt.html) để cuộn/header giống app thật.
// Trong iframe (khung, hai-ben, testquytrinhapp) thì không chuyển.
if (window.top === window && /\/thiet-ke\/(ban-[^/]+|dang-nhap|mua-app)\.html$/.test(location.pathname)
  && matchMedia("(min-width: 700px) and (pointer: fine)").matches) {
  location.replace("/thiet-ke/khung-dt.html?u=" + encodeURIComponent(location.pathname + location.search + location.hash));
  throw new Error("chuyển sang khung điện thoại"); // dừng mã của trang gốc (module phụ thuộc không chạy)
}
