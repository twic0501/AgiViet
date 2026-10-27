#!/usr/bin/env python3
"""Chỉ tạo lần đầu; không ghi đè khóa hoặc mật khẩu của DB đang có."""
import os, secrets, shlex, subprocess, sys
from pathlib import Path
state=Path(sys.argv[1]); state.mkdir(mode=0o700,parents=True,exist_ok=True)
if state.is_symlink() or state.stat().st_uid!=os.getuid() or state.stat().st_mode&0o777!=0o700:
    raise SystemExit('STATE cần owner hiện tại và mode 0700')
p=state/'local.env'
if p.exists(): raise SystemExit(0)
if (state/'pg'/'PG_VERSION').exists(): raise SystemExit('Có PGDATA nhưng thiếu khóa; khôi phục local.env, không sinh đè')
data={k:secrets.token_hex(32) for k in ('DB_PASSWORD','AGV_GATEWAY_PASSWORD','AGV_SESSION_SECRET','AGV_OTP_PEPPER','AGV_WEBHOOK_SECRET','AGV_FALLBACK_SECRET','AGV_AI_API_KEY','PILOT_COOKIE_SECRET')}
data['PILOT_PASSWORD']=secrets.token_urlsafe(24)
import base64
for kind in ('QR','PDF'):
    pem=subprocess.check_output(['openssl','genpkey','-algorithm','ED25519'],stderr=subprocess.DEVNULL)
    data[f'AGV_{kind}_PRIVATE_PEM_B64']=base64.b64encode(pem).decode()
fd=os.open(p,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
with os.fdopen(fd,'w') as f:
    for k,v in data.items(): f.write(f'{k}={shlex.quote(v)}\n')
