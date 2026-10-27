// Chọn cùng một giá trị nghiệp vụ trên select hoặc chip radio của giao diện hiện hành.
export async function choose(page, selector, value) {
  const controls=page.locator(selector);
  if(await controls.first().evaluate(el=>el.tagName==='SELECT')) await controls.selectOption(value);
  else {
    const control=page.locator(`${selector}[value="${value}"]`);
    await control.locator("..").click();
    if(!await control.isChecked()) throw new Error("Chưa chọn được "+selector+" = "+value);
  }
}
export async function signedIn(page, role) {
  if(role==='ban') await page.locator('.sl-dau-chu h1').waitFor();
  else await page.getByRole('heading',{name:'Tổng quan thu mua',exact:true}).waitFor();
}
export async function skipGuides(context) {
  await context.addInitScript(()=>{
    try {for(const key of ['home','offer','order','post','order-payments','ledger']) localStorage.setItem('agv-ban-da-xem-'+key,'1');} catch {}
  });
}
// Giữ nút gốc đến hết execute/finally; app có hiệu ứng thành công sau phản hồi API.
export async function press(locator) {
  const handle=await locator.elementHandle();
  await locator.click();
  await locator.page().waitForFunction(el=>!el.disabled && el.getAttribute('aria-busy')!=='true',handle);
  await handle.dispose();
}
export async function horizontalOverflow(page) {
  return page.evaluate(()=>{
    if(document.body.dataset.app!=='ban') return document.documentElement.scrollWidth>innerWidth;
    // App bán cuộn trong #app; radio opacity=0 có hộp tuyệt đối rộng nhưng không vẽ ra màn.
    return [...document.querySelectorAll('#content *,.bottom-nav *')].some(el=>{
      const r=el.getBoundingClientRect(),s=getComputedStyle(el);
      return r.width>0&&r.height>0&&s.opacity!=='0'&&s.visibility!=='hidden'&&(r.left < -1 || r.right>innerWidth+1);
    });
  });
}
