// AgiViet · App Nhà sản xuất: dải "Mô phỏng" trên cùng (bản thử, chưa có giao dịch hay tiền thật) và lối vào hai công cụ.
(() => {
  const app = document.querySelector('.app');
  if (!app || !window.AVN) return;
  try { if (localStorage.getItem('av.quay-video') === '1') return; } catch { /* bỏ qua */ }
  const dai = document.createElement('div');
  dai.className = 'dai-mo-phong';
  dai.setAttribute('role', 'note');
  dai.innerHTML = '<span>Mô phỏng · dữ liệu mẫu</span><a href="cong-cu.html#gia-lap">Giả lập bên mua</a><a href="cong-cu.html#phong-thu">Phòng thử</a>';
  app.prepend(dai);
})();
