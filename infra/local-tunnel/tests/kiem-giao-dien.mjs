// Kiểm bridge thật bằng credential fixture, không đọc khóa người dùng.
import http from 'node:http';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import assert from 'node:assert/strict';
const listen=async server=>{server.listen(0,'127.0.0.1');await once(server,'listening');return server.address().port;};
const upstream=http.createServer((req,res)=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify({path:req.url}));});
const upstreamPort=await listen(upstream);
const reservation=http.createServer();const port=await listen(reservation);await new Promise(r=>reservation.close(r));
const pilot=spawn(process.execPath,[new URL('../pilot.mjs',import.meta.url).pathname],{env:{...process.env,PILOT_PORT:String(port),FRONTEND_PORT:String(upstreamPort),BACKEND_PORT:String(upstreamPort),PILOT_PASSWORD:'fixture-only',PILOT_COOKIE_SECRET:'fixture-only-cookie-key'},stdio:'ignore'});
const url='http://127.0.0.1:'+port;
const authorization='Basic '+Buffer.from('pilot:fixture-only').toString('base64');
try {
  // Chờ có giới hạn trong sự kiện kết nối, không vòng lặp polling.
  await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error('pilot readiness timeout')),3000);const attempt=()=>{const req=http.get(url,r=>{r.resume();clearTimeout(timeout);resolve();});req.on('error',()=>{if(pilot.exitCode!==null){clearTimeout(timeout);reject(new Error('pilot stopped'));}else setTimeout(attempt,25);});};attempt();});
  assert.equal((await fetch(url+'/quan-tri/')).status,404);
  for(const path of ['/quan-tri','/quan-tri/admin.js','/quan-tri/launch.html','/%71uan-tri/admin.js','/quan-tri%2fadmin.js','/%2571uan-tri/admin.js','//quan-tri/admin.js','/assets/../quan-tri/admin.js']) {
    for(const authorization of ['', 'Basic '+Buffer.from('pilot:fixture-only').toString('base64')])
      assert.equal((await fetch(url+path,{headers:{authorization,'x-agv-scope':'external'}})).status,404,path);
  }
  for(const scope of ['external','operator']){
    const headers={authorization,'x-agv-scope':scope};
    assert.equal((await fetch(url+'/quan-tri/',{headers})).status,scope==='external'?404:200);
    const capability=await fetch(url+'/frontend-capabilities.json',{headers});
    assert.equal((await capability.json()).test_tools,scope==='operator');
    assert.equal(capability.headers.get('cache-control'),'no-store');
    for(const path of ['/v1/test/accounts','/v1/sim/bank/state'])assert.equal((await fetch(url+path,{headers})).status,scope==='external'?404:200);
  }
  console.log('ĐẠT: quản trị external 404 trước pilot, operator sau pilot; capability theo ingress; external test/sim vẫn 404; operator vẫn chuyển tiếp.');
} finally {
  pilot.kill('SIGTERM');await once(pilot,'exit');await new Promise(r=>upstream.close(r));
}
