// Basic pilot cấp cookie riêng; Bearer ứng dụng luôn được giữ nguyên.
import http from 'node:http';
import {createHmac, timingSafeEqual} from 'node:crypto';
const e=process.env;
const equal=(a,b)=> {const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);};
const sign=s=>createHmac('sha256',e.PILOT_COOKIE_SECRET).update(s).digest('hex');
const server=http.createServer(async (req,res)=>{
  const external=req.headers['x-agv-scope']!=='operator';
  const host=String(req.headers.host||'');
  const secure=['agiviet.id.vn','www.agiviet.id.vn'].includes(host);
  const cookieName=secure?'__Host-agv_pilot':'agv_pilot_local';
  let path;
  try {path=new URL('http://localhost'+req.url).pathname;for(let i=0;i<3;i++)path=decodeURIComponent(path);}
  catch {res.writeHead(400).end();return;}
  path=new URL('http://localhost'+path.replaceAll('\\','/').replace(/\/+/g,'/')).pathname;
  if(external && (/^\/v1\/(test|sim)/i.test(path) || /^\/quan-tri(?:\/|$)/i.test(path))){res.writeHead(404).end();return;}
  const binding=`${external?'external':'operator'}:${host}`;
  const cookie=String(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName+'='))?.slice(cookieName.length+1)||'';
  const [expires,mac]=cookie.split('.');
  const valid=/^\d+$/.test(expires||'')&&Number(expires)>Date.now()&&Number(expires)<Date.now()+8*3600000+10000&&equal(mac||'',sign(`${binding}:${expires}`));
  const basic=String(req.headers.authorization||'');
  const basicOK=basic.startsWith('Basic ')&&equal(basic.slice(6),Buffer.from(`pilot:${e.PILOT_PASSWORD}`).toString('base64'));
  res.setHeader('Cache-Control','no-store');
  if(!valid&&!basicOK){res.writeHead(401,{'WWW-Authenticate':'Basic realm="AgiViet pilot", charset="UTF-8"'}).end('Cần tài khoản pilot.');return;}
  if(req.headers['sec-fetch-site']==='cross-site'||(req.headers.origin&&req.headers.origin!==`${secure?'https':'http'}://${host}`)){
    res.writeHead(403).end();return;
  }
  if(basicOK){const expiry=String(Date.now()+8*3600000);res.setHeader('Set-Cookie',`${cookieName}=${expiry}.${sign(`${binding}:${expiry}`)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800${secure?'; Secure':''}`);}
  if(path==='/frontend-capabilities.json'){res.writeHead(200,{'Content-Type':'application/json'}).end(JSON.stringify({test_tools:!external,database_test_clock:!external && e.AGV_RESET_ON_START==='1'}));return;}
  const api=path==='/v1'||path.startsWith('/v1/')||path.startsWith('/health');
  const headers={...req.headers,host:`127.0.0.1:${api?e.BACKEND_PORT:e.FRONTEND_PORT}`};
  if(basic.startsWith('Basic '))delete headers.authorization;
  delete headers['x-agv-scope'];
  // Backend/frontend trực tiếp là loopback nội bộ. Không tin header operator từ client.
  delete headers['x-agv-operator'];
  if(!external) headers['x-agv-operator']='1';
  // Không truyền cookie pilot vào ứng dụng hoặc log ứng dụng.
  delete headers.cookie;
  // Kiểm đủ body trước khi chuyển tiếp, không để parser backend nhận stream quá lớn.
  const chunks=[];let total=0;
  try {
    for await(const part of req){total+=part.length;if(total>12582912){res.writeHead(413).end();return;}chunks.push(part);}
  } catch {res.destroy();return;}
  const body=Buffer.concat(chunks,total);
  delete headers['transfer-encoding'];
  if(total||headers['content-length'])headers['content-length']=String(total);
  const upstream=http.request({host:'127.0.0.1',port:api?e.BACKEND_PORT:e.FRONTEND_PORT,path:req.url,method:req.method,headers},r=>{
    const safe={...r.headers,'cache-control':'no-store'};delete safe['set-cookie'];
    res.writeHead(r.statusCode,safe);r.pipe(res);
  });
  upstream.setTimeout(60000,()=>upstream.destroy());
  upstream.on('error',()=>{if(!res.headersSent)res.writeHead(502);res.end();});
  upstream.end(body);
});
server.requestTimeout=65000;server.headersTimeout=10000;
server.listen(Number(e.PILOT_PORT),'127.0.0.1');
