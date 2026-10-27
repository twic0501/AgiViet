#!/usr/bin/env python3
import hashlib, json, os, re, shutil, subprocess, tempfile, time
from pathlib import Path
s=Path(os.environ['STATE']);dest=s/'backups'
keep=int(os.environ['KEEP_BACKUPS']);budget=int(os.environ['MAX_BACKUP_BYTES']);reserve=int(os.environ['MIN_FREE_BYTES'])
if not 1<=keep<=100 or budget<1 or reserve<1:raise SystemExit('Sai retention/budget')
# Không có dung lượng dự phòng thì fail, giữ mọi bản cũ. Không xóa trước để lấy chỗ.
used=sum(p.stat().st_size for p in dest.iterdir() if p.is_file())
allow=min(budget-used,shutil.disk_usage(dest).free-reserve)
if allow<1024*1024:raise SystemExit('Thiếu budget/free disk; giữ nguyên backup cũ')
def digest(p):
 h=hashlib.sha256()
 with p.open("rb") as f:
  for chunk in iter(lambda:f.read(1024*1024),b""):h.update(chunk)
 return h.hexdigest()
manager=Path(__file__).with_name('tien-trinh.py')
resume=[]
for name in ('backend','ai'):
 p=s/'run'/f'{name}.json'
 if p.exists():
  d=json.loads(p.read_text())
  try:
   proc=Path(f'/proc/{d["pid"]}')
   raw=(proc/'environ').read_bytes()
   if b'AGV_LOCAL_PROCESS_TOKEN='+d['token'].encode()+b'\0' in raw:
    env=dict(x.split(b'=',1) for x in raw.split(b'\0') if b'=' in x)
    argv=[os.fsdecode(x) for x in (proc/'cmdline').read_bytes().split(b'\0') if x]
    resume.append((name,argv,{os.fsdecode(k):os.fsdecode(v) for k,v in env.items()},os.readlink(proc/'cwd')))
  except OSError:pass
# Dừng writer sạch như Oracle; giữ argv/env chỉ trong RAM, không ghi credential ra file.
stage=Path(tempfile.mkdtemp(prefix='.stage-',dir=dest));started=time.monotonic()
def bounded(cmd,path,maximum):
 with path.open('wb') as out:
  # RLIMIT_FSIZE is per output file; monitor total stage size and disk as well.
  import resource
  def limit():resource.setrlimit(resource.RLIMIT_FSIZE,(maximum,maximum))
  p=subprocess.Popen(cmd,stdout=out,stderr=subprocess.DEVNULL,preexec_fn=limit)
  try:
   while p.poll() is None:
    size=sum(x.stat().st_size for x in stage.iterdir() if x.is_file())
    if size>allow or shutil.disk_usage(dest).free<reserve or time.monotonic()-started>180:
     raise RuntimeError('Vượt budget/disk/deadline backup')
    time.sleep(.1)
   if p.returncode:raise RuntimeError(f'{cmd[0]} lỗi; không thay backup cũ')
  finally:
   if p.poll() is None:p.kill();p.wait()
try:
 subprocess.run(['python3',str(manager),str(s),'stop','backend','ai'],check=True,timeout=45)
 bounded(['pg_dump','-Fc','--no-password'],stage/'agiviet.dump',allow)
 subprocess.run(['pg_restore','--list',str(stage/'agiviet.dump')],stdout=subprocess.DEVNULL,check=True,timeout=30)
 bounded(['pg_dumpall','--roles-only','--no-role-passwords','--no-password'],stage/'roles.sql',allow)
 # Không chụp raw PGDATA đang chạy. Tar được giới hạn dung lượng và deadline.
 entries=[name for name in ('artifacts','ai/ket_qua') if (s/name).exists()]
 remaining=allow-sum(p.stat().st_size for p in stage.iterdir())
 bounded(['tar','-C',str(s),'-cf','-',*entries],stage/'files.tar',remaining)
 manifest={'utc':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'format':'agiviet-local-v1','writers_stopped':True,
   'sha256':{p.name:digest(p) for p in stage.iterdir()}}
 (stage/'manifest.json').write_text(json.dumps(manifest,indent=2))
 total=sum(p.stat().st_size for p in stage.iterdir())
 if total*2>allow or shutil.disk_usage(dest).free-total<reserve:raise RuntimeError('Không đủ budget cho archive; giữ bản cũ')
 name='local-'+time.strftime('%Y%m%dT%H%M%SZ',time.gmtime())+'-'+str(time.time_ns())+'.tar'
 bounded(['tar','-C',str(stage),'-cf','-', 'agiviet.dump','roles.sql','files.tar','manifest.json'],stage/'archive.partial',allow-total)
 target=dest/name
 os.replace(stage/'archive.partial',target)
 (dest/(name+'.sha256')).write_text(digest(target)+'  '+name+'\n')
 files=sorted(p for p in dest.iterdir() if re.fullmatch(r'local-\d{8}T\d{6}Z-\d+\.tar',p.name))
 for p in files[:-keep]:p.unlink();p.with_name(p.name+'.sha256').unlink(missing_ok=True)
 print(f'Đã kiểm dump, lưu {target}; giữ tối đa {keep} bản, budget {budget} byte.')
finally:
 failed=[]
 for name,argv,env,cwd in resume:
  try:subprocess.run(['python3',str(manager),str(s),'spawn',name,*argv],env=env,cwd=cwd,check=True,timeout=10)
  except Exception:failed.append(name)
 shutil.rmtree(stage)
 if failed:raise RuntimeError('Không bật lại writer: '+','.join(failed))
