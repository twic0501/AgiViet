import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=createRequire(process.env.HOME+'/rnd idea/package.json')('playwright');
const browser=await chromium.launch({args:['--no-sandbox']});
const results=[];
try {
  for (const app of ['ban','mua','quan-tri']) for (const status of [403,404]) {
    const ctx=await browser.newContext();const p=await ctx.newPage();const errors=[];
    p.on('pageerror',e=>errors.push(e.message));
    await p.route('**/frontend-capabilities.json',r=>r.fulfill({json:{test_tools:true}}));
    await p.route('**/v1/test/accounts',r=>r.fulfill({status,body:''}));
    const denied=p.waitForResponse(r=>r.url().endsWith('/v1/test/accounts'));
    await p.goto('http://127.0.0.1:8090/'+app+'/');await denied;
    await p.getByRole('heading',{name:'Đăng nhập',exact:true}).waitFor();
    assert.equal(await p.locator('[role=alert]').count(),0);
    assert.equal(await p.getByText('Công cụ thử',{exact:true}).count(),0);
    assert.deepEqual(errors,[]);
    results.push({app,status,pass:true});await ctx.close();
  }
  // Đường #/register cũ không tạo lại đăng ký ở app bán.
  const ctx=await browser.newContext();const p=await ctx.newPage();
  await p.goto('http://127.0.0.1:8090/ban/#/register');
  await p.getByRole('heading',{name:'Đăng nhập',exact:true}).waitFor();
  assert.equal(await p.locator('form[data-form=enrollPhone]').count(),0);
  results.push({name:'App bán chặn đăng ký kể cả deep link cũ',pass:true});
  console.log('ĐẠT',results.length,'kiểm cô lập công cụ thử / đăng ký bán');
} finally {
  await browser.close();
  await mkdir(new URL('../../docs/frontend/',import.meta.url),{recursive:true});
  await writeFile(new URL('../../docs/frontend/kiem-thu-luot-5-co-lap.json',import.meta.url),JSON.stringify({results},null,2));
}
