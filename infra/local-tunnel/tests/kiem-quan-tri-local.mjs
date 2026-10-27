// Caddy + pilot + frontend thật, credential fixture, không chạm STATE/tunnel người dùng.
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdir,mkdtemp,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const state=await mkdtemp('/tmp/agv-admin-ingress-');
const env={...process.env,STATE:state,CADDY_PORT:'28888',OPERATOR_PORT:'28889',PILOT_PORT:'28091',FRONTEND_PORT:'28090',BACKEND_PORT:'8080',PILOT_PASSWORD:'fixture-only',PILOT_COOKIE_SECRET:'fixture-only-secret',PORT:'28090'};
const frontend=spawn(process.execPath,['--import','./infra/local-tunnel/loopback.mjs','frontend/server.mjs'],{env,stdio:'ignore'});
const pilot=spawn(process.execPath,['infra/local-tunnel/pilot.mjs'],{env,stdio:'ignore'});
const caddy=spawn('infra/.local/oracle-guard/bin/caddy',['run','--config','infra/local-tunnel/Caddyfile','--adapter','caddyfile'],{env:{...env,XDG_DATA_HOME:state+'/data',XDG_CONFIG_HOME:state+'/config'},stdio:['ignore','ignore','ignore']});
const authorization='Basic '+Buffer.from('pilot:fixture-only').toString('base64');
const results=[];
try {
  for(let n=0;n<40;n++) {try {await fetch('http://127.0.0.1:28888/');break;}catch {if(n===39)throw new Error('Ingress fixture chưa sẵn sàng');await new Promise(r=>setTimeout(r,100));}}
  for(const path of ['/quan-tri','/quan-tri/','/quan-tri/index.html','/quan-tri/admin.js','/quan-tri/test-pages.js','/quan-tri/case-engine.js','/quan-tri/launch.html','/quan-tri/launch.js','/quan-tri/fixture.png.base64','/quan-tri/profiles.js','/quan-tri/opponent.js','/quan-tri/play.html','/quan-tri/play.css','/quan-tri/play.js','/quan-tri/demo-data.js','/%71uan-tri/admin.js','/quan-tri%2fadmin.js','//quan-tri/admin.js','/quan-tri/no-such-file']) {
    for(const headers of [{},{authorization},{authorization,'X-Agv-Scope':'operator','X-Agv-Operator':'1'}]) {
      const r=await fetch('http://127.0.0.1:28888'+path,{headers});assert.equal(r.status,404,path);assert.equal(r.headers.get('www-authenticate'),null);results.push({scope:'external',path,status:r.status});
    }
  }
  for(const path of ['/quan-tri/','/quan-tri/admin.js','/quan-tri/test-pages.js','/quan-tri/case-engine.js','/quan-tri/launch.html','/quan-tri/launch.js','/quan-tri/fixture.png.base64','/quan-tri/profiles.js','/quan-tri/opponent.js','/quan-tri/play.html','/quan-tri/play.css','/quan-tri/play.js','/quan-tri/demo-data.js']) {
    const r=await fetch('http://127.0.0.1:28889'+path,{headers:{authorization}});assert.equal(r.status,200,path);results.push({scope:'operator',path,status:r.status});
  }
  assert.equal((await fetch('http://127.0.0.1:28889/quan-tri/')).status,401);
  assert.equal((await fetch('http://127.0.0.1:28090/quan-tri/')).status,404);
  for(const port of [28888,28889]) {
    const root=await fetch('http://127.0.0.1:'+port+'/',{headers:{authorization}});
    assert.equal(root.status,200,'Trang gốc phải phục vụ trang chọn hai app.');
    assert.doesNotMatch(await root.text(),/quan-tri/);
    const cap=await(await fetch('http://127.0.0.1:'+port+'/frontend-capabilities.json',{headers:{authorization}})).json();
    assert.equal(cap.test_tools,port===28889);
    for(const path of ['/ban/','/mua/','/shared/app.js']) assert.equal((await fetch('http://127.0.0.1:'+port+path,{headers:{authorization}})).status,200);
  }
  // Tải app công khai không kéo mã quản trị bị chặn.
  const {createRequire}=await import('node:module');
  const {chromium}=createRequire(process.env.HOME+'/rnd idea/package.json')('playwright');
  const browser=await chromium.launch({args:['--no-sandbox']});
  try {
    const ctx=await browser.newContext({httpCredentials:{username:'pilot',password:'fixture-only'}});
    const p=await ctx.newPage(),errors=[],requests=[];
    p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>requests.push(new URL(r.url()).pathname));
    for(const app of ['ban','mua']) {await p.goto('http://127.0.0.1:28888/'+app+'/');await p.locator('form[data-form=loginPhone]').waitFor();}
    assert.deepEqual(errors,[]);assert.equal(requests.some(p=>p.startsWith('/quan-tri/')),false);
  } finally {await browser.close();}
  await writeFile('docs/frontend/kiem-thu-quan-tri-ingress.json',JSON.stringify({at:new Date().toISOString(),fixture:true,ports:[28888,28889],results,publicLogin:true},null,2));
  console.log('ĐẠT: Caddy/pilot/frontend thật; external 404 trước pilot kể cả mã hóa/giả scope; operator có auth 200; gốc chỉ bán/mua; hai app công khai không tải mã quản trị.');
} finally {for(const child of [caddy,pilot,frontend]){child.kill('SIGTERM');if(child.exitCode===null)await once(child,'exit');}}
