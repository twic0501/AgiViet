#!/usr/bin/env python3
"""HTTP smoke thật; không in OTP challenge/session/pilot secret."""
import base64, http.client, json, os, shlex
from pathlib import Path
s=Path(os.environ.get('AGV_LOCAL_STATE',str(Path.home()/'.local/share/agiviet')))
e=dict(line.strip().split('=',1) for line in (s/'local.env').read_text().splitlines() if '=' in line)
e={k:shlex.split(v)[0] for k,v in e.items()}
port=int(os.environ.get('AGV_CADDY_PORT','18888'));operator=int(os.environ.get('AGV_OPERATOR_PORT','18889'))
basic='Basic '+base64.b64encode(('pilot:'+e['PILOT_PASSWORD']).encode()).decode()
def call(path,method='GET',body=None,headers=None,p=port):
 c=http.client.HTTPConnection('127.0.0.1',p,timeout=8)
 hs=headers or {}
 if body is not None:hs={**hs,'Content-Type':'application/json'};body=json.dumps(body)
 c.request(method,path,body,hs);r=c.getresponse();data=r.read();head=dict(r.getheaders());status=r.status;c.close()
 return status,data,head
def check(name,ok):
 if not ok:raise SystemExit('FAIL: '+name)
 print('PASS: '+name)
for path in ('/ban/','/mua/','/health','/v1/products','/v1/auth/session'):
 check(path+' khóa toàn bộ khi chưa pilot',call(path)[0]==401)
status,data,head=call('/ban/',headers={'Authorization':basic})
check('Basic pilot mở /ban/',status==200)
cookie=head['Set-Cookie'].split(';')[0];hs={'Cookie':cookie}
check('cookie HttpOnly SameSite', 'HttpOnly' in head['Set-Cookie'] and 'SameSite=Strict' in head['Set-Cookie'])
for path in ('/mua/','/health','/health/ready'):
 check(path+' qua cookie pilot',call(path,headers=hs)[0]==200)
for path in ('/v1/test','/v1/test/clock','/v1/test-extra','/v1/sim','/v1/sim/bank/state','/v1/sim-extra','/v1/%74est/clock'):
 check(path+' bị chặn từ ingress ngoài',call(path,headers=hs)[0]==404)
check('header giả scope không mở test',call('/v1/test/clock',headers={**hs,'X-Agv-Scope':'operator'})[0]==404)
check('cookie giả bị từ chối',call('/health',headers={'Cookie':cookie+'x'})[0]==401)
check('Origin ngoài bị từ chối',call('/health',headers={**hs,'Origin':'https://example.org'})[0]==403)
for phone in ('0909000210','0918000421'):
 status,data,_=call('/v1/auth/otp/send','POST',{'phone':phone},hs)
 check('OTP send '+phone,status==200)
 challenge=json.loads(data)['challenge_id']
 status,data,_=call('/v1/auth/otp/verify','POST',{'phone':phone,'challenge_id':challenge,'code':'123456'},hs)
 check('OTP verify '+phone,status==200)
 token=json.loads(data)['token']
 check('Bearer + cookie session '+phone,call('/v1/auth/session',headers={**hs,'Authorization':'Bearer '+token})[0]==200)
 check('Bearer đơn lẻ không vượt pilot',call('/v1/auth/session',headers={'Authorization':'Bearer '+token})[0]==401)
for path in ('/v1/test/accounts','/v1/test/clock','/v1/sim/bank/state'):
 check('operator khóa '+path,call(path,p=operator)[0]==401)
 check('operator sau khóa '+path,call(path,headers={'Authorization':basic},p=operator)[0]==200)
status,data,head=call('/ban/',headers={'Authorization':basic,'Host':'agiviet.id.vn'})
check('Host tên miền qua Caddy',status==200)
check('cookie domain HTTPS Secure host-only','__Host-agv_pilot=' in head.get('Set-Cookie','') and '; Secure' in head['Set-Cookie'] and 'Domain=' not in head['Set-Cookie'])
# Cổng các process được quản lý chỉ loopback; runtime không chứa owner credential.
backend=json.loads((s/'run/backend.json').read_text())
env=Path(f'/proc/{backend["pid"]}/environ').read_bytes().split(b'\0')
db=next(x for x in env if x.startswith(b'DATABASE_URL='))
check('backend dùng gateway',b'//agv_backend_gateway:' in db)
check('backend không nhận owner/test-owner',not any(x.startswith((b'PGPASSWORD=',b'DB_PASSWORD=',b'AGV_TEST_PG_OWNER_URL=')) for x in env))
ports=[int(os.environ.get(k,str(v))) for k,v in [('AGV_PG_PORT',55436),('AGV_BACKEND_PORT',18080),('AGV_FRONTEND_PORT',18090),('AGV_PILOT_PORT',18091),('AGV_CADDY_PORT',18888),('AGV_OPERATOR_PORT',18889)]]
if (s/'run/ai.json').exists():
 ai_port=int(os.environ.get('AGV_AI_PORT','18092'));ports.append(ai_port)
 check('AI thiếu key bị từ chối',call('/health',p=ai_port)[0]==401)
 check('AI luật với key hoạt động',call('/health',headers={'x-ai-key':e['AGV_AI_API_KEY']},p=ai_port)[0]==200)
for line in Path('/proc/net/tcp').read_text().splitlines()[1:]:
 fields=line.split();addr,phex=fields[1].split(':')
 if int(phex,16) in ports and fields[3]=='0A':check('socket '+str(int(phex,16))+' chỉ loopback',addr=='0100007F')
def body_test(size,chunked=False):
 c=http.client.HTTPConnection('127.0.0.1',port,timeout=15)
 prefix=b'{"phone":"bad","padding":"';suffix=b'"}'
 payload=prefix+b'a'*(size-len(prefix)-len(suffix))+suffix
 content=[payload[i:i+65536] for i in range(0,len(payload),65536)] if chunked else payload
 headers={**hs,'Content-Type':'application/json'}
 try:c.request('POST','/v1/auth/otp/send',body=content,headers=headers,encode_chunked=chunked)
 except BrokenPipeError:pass
 r=c.getresponse();status=r.status;data=r.read();c.close();return status
check('body đúng 12 MiB đi tới backend (422)',body_test(12582912)==422)
check('body quá 1 byte trả 413',body_test(12582913)==413)
check('body chunked quá 1 byte trả 413',body_test(12582913,True)==413)
last=None
for i in range(32):
 status,data,head=call('/v1/auth/otp/send','POST',{'phone':'bad'},{'X-Forwarded-For':f'203.0.113.{i}'})
 if status==429:last=head;break
check('auth rate limit trả 429 dù đổi XFF',last is not None and 'Retry-After' in last)
