// Thu nhỏ ảnh người dùng chụp trước khi lưu (máy chủ mô phỏng nằm trong bộ nhớ trình duyệt, chỉ vài MB).
export function anhNho(tep: File, canhDai = 480, chatLuong = 0.72): Promise<string> {
  return new Promise((xong, loi) => {
    const doc = new FileReader();
    doc.onerror = () => loi(new Error('Không đọc được ảnh.'));
    doc.onload = () => {
      const img = new Image();
      img.onerror = () => loi(new Error('Tệp này không phải ảnh.'));
      img.onload = () => {
        const tile = Math.min(1, canhDai / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * tile); c.height = Math.round(img.height * tile);
        c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
        xong(c.toDataURL('image/jpeg', chatLuong));
      };
      img.src = String(doc.result);
    };
    doc.readAsDataURL(tep);
  });
}
