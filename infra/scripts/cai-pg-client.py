#!/usr/bin/env python3
"""Chỉ tải/giải nén client vào infra/.local; không cài gói hệ thống. Linux x64."""
import hashlib,subprocess,urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
DEST=ROOT/'.local/pg-client'
DEST.mkdir(parents=True,exist_ok=True)
URL='https://apt.postgresql.org/pub/repos/apt/pool/main/p/postgresql-17/postgresql-client-17_17.11-1.pgdg12+2_amd64.deb'
SHA='1e286c060f8f9ab6485b1b02df6543ce38610bc828c63695528f0593658113ed'
pkg=DEST/'postgresql-client-17.deb'
if not pkg.exists() or hashlib.sha256(pkg.read_bytes()).hexdigest()!=SHA:
 with urllib.request.urlopen(URL,timeout=30) as r: pkg.write_bytes(r.read())
assert hashlib.sha256(pkg.read_bytes()).hexdigest()==SHA,'Checksum client không khớp'
target=DEST/'postgresql-client-17';target.mkdir(exist_ok=True)
subprocess.run(['ar','x',str(pkg)],cwd=target,check=True)
subprocess.run(['tar','-xf',str(next(target.glob('data.tar.*'))),'-C',str(target)],check=True)
print('Đã giải nén PostgreSQL client 17.11 từ PGDG vào',target)
print('Không chạy apt/dpkg install; thư viện libpq dùng bộ PG nhúng đã có.')
