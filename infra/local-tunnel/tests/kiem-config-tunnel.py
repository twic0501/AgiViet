#!/usr/bin/env python3
"""Không gọi cloudflared: kiểm helper với credential giả, hoàn toàn ngoài repo."""
import json, os, subprocess, tempfile, uuid
from pathlib import Path
helper=Path(__file__).resolve().parents[1]/'tao-config-tunnel.sh'
with tempfile.TemporaryDirectory(prefix='agv-cf-config-') as temp:
 root=Path(temp);state=root/'state';state.mkdir(mode=0o700)
 config=state/'local.env';config.write_text('');config.chmod(0o600)
 cred=root/'credentials';cred.mkdir(mode=0o700)
 u=str(uuid.uuid4());j=cred/(u+'.json');j.write_text(json.dumps({'TunnelID':u,'TunnelSecret':'FAKE-NOT-A-CREDENTIAL'}))
 env={**os.environ,'AGV_LOCAL_STATE':str(state),'AGV_CLOUDFLARED_DIR':str(cred),'AGV_CADDY_PORT':'18888'}
 subprocess.run([str(helper),u],env=env,check=True)
 out=state/'cloudflared.yml';text=out.read_text()
 assert oct(out.stat().st_mode&0o777)=='0o600'
 assert oct(j.stat().st_mode&0o777)=='0o600'
 assert f'tunnel: {u}' in text and 'REPLACE' not in '\n'.join(x for x in text.splitlines() if not x.startswith('#'))
 assert text.count('service: http://127.0.0.1:18888')==2 and text.rstrip().endswith('- service: http_status:404')
 assert '18889' not in text
 r=subprocess.run([str(helper),u],env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 assert r.returncode!=0 and out.read_text()==text
 print('PASS: config mode 0600, hai hostname, ingress loopback + catch-all 404, không operator/ghi đè; không login hay chạy tunnel')
