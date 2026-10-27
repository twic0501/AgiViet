#!/usr/bin/env python3
"""Quản lý session riêng; kiểm token /proc để không kill PID tái sử dụng."""
import json, os, secrets, signal, subprocess, sys, time
from pathlib import Path
state=Path(sys.argv[1]); action=sys.argv[2]; names=('caddy','pilot','frontend','backend','ai','postgres')
def members(info):
    found=[]
    for p in Path('/proc').iterdir():
        if not p.name.isdigit(): continue
        try:
            pid=int(p.name)
            if os.getsid(pid)!=info['pid']: continue
            if (b'AGV_LOCAL_PROCESS_TOKEN='+info['token'].encode()+b'\0') not in (p/'environ').read_bytes(): continue
            if (p/'stat').read_text().rsplit(')',1)[1].split()[0]=='Z': continue
            found.append(pid)
        except (OSError,ValueError,ProcessLookupError): pass
    return found
if action=='spawn':
    name=sys.argv[3]; p=state/'run'/f'{name}.json'
    if p.exists() and members(json.loads(p.read_text())): raise SystemExit(f'{name} đang chạy')
    token=secrets.token_hex(24)
    with (state/'logs'/f'{name}.log').open('ab',buffering=0) as log:
        child=subprocess.Popen(sys.argv[4:],stdin=subprocess.DEVNULL,stdout=log,stderr=log,
            env={**os.environ,'AGV_LOCAL_PROCESS_TOKEN':token},start_new_session=True,close_fds=True)
    p.write_text(json.dumps({'pid':child.pid,'token':token}))
elif action=='check-ports':
    import socket
    ports=list(map(int,sys.argv[3:]))
    if len(ports)!=len(set(ports)): raise SystemExit('Các cổng phải khác nhau')
    for port in ports:
        if not 1024<=port<=65535: raise SystemExit('Cổng cần 1024..65535')
        with socket.socket() as s:
            s.setsockopt(socket.SOL_SOCKET,socket.SO_REUSEADDR,1)
            try:s.bind(('127.0.0.1',port))
            except OSError:raise SystemExit(f'Cổng {port} đang bận; không đụng tiến trình khác')
else:
    failed=False
    for name in sys.argv[3:] or names:
        p=state/'run'/f'{name}.json'
        info=json.loads(p.read_text()) if p.exists() else None
        live=members(info) if info else []
        if action=='alive':raise SystemExit(0 if live else 1)
        if action=='status':
            print(f'{name}: '+('đang chạy' if live else 'đã dừng')); continue
        if action!='stop': raise SystemExit('Sai action')
        for sig,seconds in ((signal.SIGTERM,15),(signal.SIGKILL,3)):
            for pid in live:
                try:os.kill(pid,sig)
                except ProcessLookupError:pass
            deadline=time.monotonic()+seconds
            while live and time.monotonic()<deadline:
                time.sleep(.1);live=members(info)
            if not live:break
        if live:failed=True;print(f'Không dừng được {name}',file=sys.stderr)
        else:p.unlink(missing_ok=True)
    if failed:raise SystemExit(1)
