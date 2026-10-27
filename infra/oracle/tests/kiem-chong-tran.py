#!/usr/bin/env python3
"""Kiểm hữu hạn, chỉ fixture trong /tmp; không DNS/ACME/prune/DB thật.

python3 infra/oracle/tests/kiem-chong-tran.py [--caddy /path/to/custom/caddy]
"""
import argparse
import base64
import http.client
import http.server
import json
import os
from pathlib import Path
import signal
import socket
import subprocess
import tempfile
import threading
import time
import unittest

ORACLE = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--caddy')
args, remaining = parser.parse_known_args()
CADDY = str(Path(args.caddy).resolve()) if args.caddy else None


class Guards(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='agiviet-guard-')
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.bin = self.root / 'bin'
        self.bin.mkdir()
        self.env = os.environ | {'PATH': f'{self.bin}:{os.environ["PATH"]}'}

    def shim(self, name, body):
        path = self.bin / name
        path.write_text('#!/usr/bin/env python3\n' + body)
        path.chmod(0o755)

    def dns(self, mode='good', ipv6=''):
        self.shim('dig', '''import os,sys
kind='AAAA' if 'AAAA' in sys.argv else 'A'
mode=os.environ['DNS_MODE']
print(';; ->>HEADER<<- opcode: QUERY, status: '+('SERVFAIL' if mode=='servfail' and kind=='AAAA' else 'NOERROR')+', id: 1')
if kind=='A':
    if mode=='cname': print('agiviet.id.vn. 300 IN CNAME elsewhere.example.')
    else: print('agiviet.id.vn. 300 IN A '+('9.9.9.9' if mode=='wrong' else '1.2.3.4'))
elif mode in ('stray6','dual'): print('agiviet.id.vn. 300 IN AAAA 2606:4700:4700::1111')
''')
        return subprocess.run(['bash', str(ORACLE / 'kiem-tra-dns.sh')],
                              env=self.env | {'DOMAIN': 'agiviet.id.vn', 'EXPECTED_IPV4': '1.2.3.4',
                                              'EXPECTED_IPV6': ipv6, 'DNS_MODE': mode},
                              text=True, capture_output=True, timeout=20)

    def test_dns_ipv4_and_dualstack(self):
        self.assertEqual(self.dns().returncode, 0)
        self.assertEqual(self.dns('dual', '2606:4700:4700::1111').returncode, 0)

    def test_dns_rejects_wrong_stray6_servfail_cname(self):
        for mode in ('wrong', 'stray6', 'servfail', 'cname'):
            with self.subTest(mode=mode):
                self.assertNotEqual(self.dns(mode).returncode, 0)

    def fixture_env(self):
        path = self.root / 'oracle.env'
        subprocess.run(['bash', str(ORACLE / 'tao-cau-hinh.sh'), str(path)],
                       check=True, capture_output=True, timeout=20)
        state = self.root / 'state'
        state.mkdir()
        backup = state / 'backups'
        backup.mkdir()
        cfg = path.read_text().replace("CADDY_PASSWORD_HASH='THAY_BANG_BCRYPT'",
                                       "CADDY_PASSWORD_HASH='$2a$14$" + 'a' * 53 + "'")
        cfg = cfg.replace('STATE_DIR=/var/lib/agiviet', f'STATE_DIR={state}')
        cfg = cfg.replace('BACKUP_DIR=/var/lib/agiviet/backups', f'BACKUP_DIR={backup}')
        # Chỉ cache quyết định có cảnh báo: RAM/disk tránh phụ thuộc tải máy kiểm.
        cfg = cfg.replace('RESOURCE_RAM_WARN_PCT=85', 'RESOURCE_RAM_WARN_PCT=100')
        cfg = cfg.replace('RESOURCE_DISK_WARN_PCT=80', 'RESOURCE_DISK_WARN_PCT=100')
        path.write_text(cfg)
        self.env |= {'ORACLE_ENV_FILE': str(path), 'FIXTURE': str(self.root)}
        for name in ('docker-root', 'agiviet_oracle_v2_pgdata', 'agiviet_oracle_v2_artifacts', 'agiviet_oracle_v2_ai_audit'):
            (self.root / name).mkdir()
        self.shim('docker', r'''import json,os,pathlib,sys
r=pathlib.Path(os.environ['FIXTURE']); a=sys.argv[1:]
with (r/'docker-calls').open('a') as f:f.write(json.dumps(a)+'\n')
if a[0]=='info': print(r/'docker-root')
elif a[:2]==['volume','inspect']: print(r/a[-1])
elif a[:3]==['volume','ls','-q']:
    for name in ('agiviet_oracle_v2_pgdata','agiviet_oracle_v2_artifacts','agiviet_oracle_v2_ai_audit'):
        if (r/name).exists(): print(name)
elif a[:2]==['system','df']:
    print(json.dumps({'Type':'Images','Size':os.environ.get('IMAGE_SIZE','6GB')}))
    print(json.dumps({'Type':'Build Cache','Size':'0B'}))
elif a[:2] not in (['image','prune'],['builder','prune']): raise SystemExit('Docker action forbidden in fixture')
''')
        return path, state, backup

    def test_monitor_safe_cleanup_and_lock(self):
        _, state, backup = self.fixture_env()
        temp = state / 'tmp'
        temp.mkdir()
        old = temp / 'old.tmp'
        old.write_text('disposable')
        recent = temp / 'new.part'
        recent.write_text('active')
        kept = [backup / 'backup.tmp', self.root / 'agiviet_oracle_v2_pgdata' / 'wal.tmp',
                self.root / 'agiviet_oracle_v2_artifacts' / 'upload.tmp', temp / 'keep.txt']
        for path in kept:
            path.write_text('preserve')
        old_time = time.time() - 3 * 86400
        for path in [old] + kept:
            os.utime(path, (old_time, old_time))
        (temp / 'linked').symlink_to(backup, target_is_directory=True)
        command = ['bash', str(ORACLE / 'canh-tai-nguyen.sh')]
        check = subprocess.run(command + ['--check'], env=self.env, capture_output=True, text=True, timeout=30)
        self.assertEqual(check.returncode, 1, check.stderr)
        self.assertTrue(old.exists())
        clean = subprocess.run(command + ['--clean'], env=self.env, capture_output=True, text=True, timeout=30)
        self.assertEqual(clean.returncode, 1, clean.stderr)
        self.assertFalse(old.exists())
        self.assertTrue(recent.exists())
        self.assertTrue(all(p.exists() for p in kept))
        calls = [json.loads(x) for x in (self.root / 'docker-calls').read_text().splitlines()]
        self.assertIn(['image', 'prune', '--force', '--filter', 'until=168h'], calls)
        self.assertIn(['builder', 'prune', '--force', '--filter', 'until=168h', '--keep-storage', '2GB'], calls)
        self.assertNotIn('--all', sum(calls, []))
        # Khóa bận phải dừng, không chạy Docker hoặc prune chen vào backup.
        import fcntl
        with (state / 'operation.lock').open('w') as lock:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            count = len(calls)
            busy = subprocess.run(command + ['--clean'], env=self.env, capture_output=True, timeout=10)
            self.assertEqual(busy.returncode, 2)
            self.assertEqual(len((self.root / 'docker-calls').read_text().splitlines()), count)

    def test_monitor_below_threshold_does_not_prune(self):
        self.fixture_env()
        result = subprocess.run(['bash', str(ORACLE / 'canh-tai-nguyen.sh'), '--clean'],
                                env=self.env | {'IMAGE_SIZE': '1GB'}, capture_output=True, text=True, timeout=30)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertNotIn('prune', (self.root / 'docker-calls').read_text())

    def test_monitor_refuses_backup_inside_tmp(self):
        cfg, state, _ = self.fixture_env()
        (state / 'tmp').mkdir()
        cfg.write_text(cfg.read_text().replace(f'BACKUP_DIR={state}/backups', f'BACKUP_DIR={state}/tmp/backups'))
        result = subprocess.run(['bash', str(ORACLE / 'canh-tai-nguyen.sh'), '--clean'],
                                env=self.env, capture_output=True, text=True, timeout=30)
        self.assertEqual(result.returncode, 2)
        self.assertNotIn('prune', (self.root / 'docker-calls').read_text())

    def compose(self):
        # Dùng CLI Docker thật, không shim; JSON chứa secret chỉ đọc trong bộ nhớ.
        env = self.env | {'PATH': os.environ['PATH']}
        command = ['bash', '-c', 'source "$1/chung.sh"; dc --profile setup config --format json', '_', str(ORACLE)]
        result = subprocess.run(command, env=env, check=True, capture_output=True, text=True, timeout=30)
        return json.loads(result.stdout)

    def test_compose_budgets_and_resize_preserves_volumes(self):
        path, _, _ = self.fixture_env()
        original = path.read_text()
        volumes = None
        for size, cpu, mib, pool in ((6, 1.0, 3456, 4), (12, 2.0, 5888, 6), (24, 2.0, 8960, 6)):
            with self.subTest(size=size):
                path.write_text(original.replace('OCI_SIZE=12', f'OCI_SIZE={size}').replace('OCI_24GB_CONFIRMED=0', 'OCI_24GB_CONFIRMED=1'))
                config = self.compose()
                services = config['services']
                self.assertAlmostEqual(sum(float(s['cpus']) for s in services.values()), cpu)
                self.assertEqual(sum(int(s['mem_limit']) for s in services.values()), mib * 1024**2)
                self.assertEqual(int(services['backend']['environment']['AGV_PG_POOL_MAX']), pool)
                self.assertEqual(services['backend']['environment']['AI_URL'], 'http://ai:8091')
                self.assertNotIn('ports', services['db'])
                for name, service in services.items():
                    self.assertEqual(service['memswap_limit'], service['mem_limit'])
                    self.assertEqual(service['restart'], 'no' if name == 'migrate' else 'unless-stopped')
                self.assertIn('build', services['https'])
                if volumes is not None:
                    self.assertEqual(config['volumes'], volumes)
                volumes = config['volumes']

    def test_ai_off_excludes_service_and_clears_backend_url(self):
        path, _, _ = self.fixture_env()
        path.write_text(path.read_text().replace('OCI_SIZE=12', 'OCI_SIZE=6').replace('ENABLE_AI=1', 'ENABLE_AI=0'))
        config = self.compose()
        self.assertNotIn('ai', config['services'])
        self.assertEqual(config['services']['backend']['environment']['AI_URL'], '')
        self.assertAlmostEqual(sum(float(s['cpus']) for s in config['services'].values()), 0.88)
        self.assertEqual(sum(int(s['mem_limit']) for s in config['services'].values()), 2944 * 1024**2)

    def test_rejects_invalid_size_ai_and_oversized_small_pool(self):
        path, _, _ = self.fixture_env()
        original = path.read_text()
        for old, new in (('OCI_SIZE=12', 'OCI_SIZE=7'), ('ENABLE_AI=1', 'ENABLE_AI=2'),
                         ('OCI_SIZE=12', 'OCI_SIZE=24'),
                         ('OCI_SIZE=12', 'OCI_SIZE=6\nAGV_PG_POOL_MAX=5')):
            with self.subTest(new=new):
                config = original.replace(old, new)
                # Mẫu để trống pool ở cuối: đặt lại pool sau cùng cho ca từ chối.
                if 'POOL_MAX=5' in new:
                    config += '\nAGV_PG_POOL_MAX=5\n'
                path.write_text(config)
                result = subprocess.run(['bash', '-c', 'source "$1/chung.sh"', '_', str(ORACLE)],
                                        env=self.env, capture_output=True, timeout=10)
                self.assertEqual(result.returncode, 2)

    def test_monitor_ai_off_with_absent_or_existing_audit(self):
        path, _, _ = self.fixture_env()
        path.write_text(path.read_text().replace('ENABLE_AI=1', 'ENABLE_AI=0'))
        audit = self.root / 'agiviet_oracle_v2_ai_audit'
        audit.rmdir()
        command = ['bash', str(ORACLE / 'canh-tai-nguyen.sh'), '--check']
        result = subprocess.run(command, env=self.env | {'IMAGE_SIZE': '1GB'}, capture_output=True, text=True, timeout=30)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('chưa có volume audit', result.stdout)
        audit.mkdir()
        (audit / 'retained.json').write_text('old audit')
        result = subprocess.run(command, env=self.env | {'IMAGE_SIZE': '1GB'}, capture_output=True, text=True, timeout=30)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('agiviet_oracle_v2_ai_audit bytes=', result.stdout)
        self.assertTrue((audit / 'retained.json').exists())

    def test_deploy_ai_off_never_builds_or_starts_ai(self):
        path, _, _ = self.fixture_env()
        path.write_text(path.read_text().replace('OCI_SIZE=12', 'OCI_SIZE=6').replace('ENABLE_AI=1', 'ENABLE_AI=0')
                        .replace('EXPECTED_IPV4=THAY_BANG_IPV4_PUBLIC', 'EXPECTED_IPV4=1.2.3.4'))
        self.dns()  # Cài shim dig; không dùng DNS thật.
        self.env |= {'DOMAIN': 'agiviet.id.vn', 'EXPECTED_IPV4': '1.2.3.4', 'DNS_MODE': 'good'}
        self.shim('uname', "print('aarch64')\n")
        self.shim('curl', "import sys\nif '--write-out' in sys.argv: print('401')\n")
        self.shim('docker', '''import json,os,pathlib,sys
r=pathlib.Path(os.environ['FIXTURE']); a=sys.argv[1:]
with (r/'deploy-calls').open('a') as f:f.write(json.dumps(a)+'\\n')
if a[:2]==['volume','ls']: pass  # Volume DB chưa tồn tại trong fixture.
elif a[0]!='compose': raise SystemExit('Unexpected docker action')
''')
        result = subprocess.run(['bash', str(ORACLE / 'trien-khai.sh'), '--local'],
                                env=self.env, capture_output=True, text=True, timeout=30)
        self.assertEqual(result.returncode, 0, result.stderr)
        calls = [json.loads(x) for x in (self.root / 'deploy-calls').read_text().splitlines()]
        builds = [a[a.index('build') + 1:] for a in calls if 'build' in a]
        self.assertEqual(builds, [['https'], ['backend'], ['frontend']])
        self.assertTrue(any('up' in a and 'backend' in a for a in calls))
        self.assertFalse(any('ai' in a for a in calls if 'up' in a or 'build' in a))
        # Vẫn phải dừng AI cũ nếu lần trước bật, trước khi migrate.
        self.assertTrue(any('stop' in a and 'ai' in a for a in calls))

    def test_backup_ai_off_pauses_old_writer_and_snapshots_existing_audit(self):
        path, _, _ = self.fixture_env()
        path.write_text(path.read_text().replace('ENABLE_AI=1', 'ENABLE_AI=0'))
        rclone_cfg = self.root / 'rclone.conf'
        rclone_cfg.write_text('# fixture')
        path.write_text(path.read_text() + f'\nRCLONE_CONFIG={rclone_cfg}\n')
        audit = self.root / 'agiviet_oracle_v2_ai_audit' / 'old.json'
        audit.write_text('preserve')
        self.shim('rclone', "import sys\nif 'lsjson' in sys.argv: print('[]')\n")
        self.shim('age', "raise SystemExit('fixture must stop before encryption')\n")
        self.shim('docker', '''import json,os,pathlib,sys
r=pathlib.Path(os.environ['FIXTURE']); a=sys.argv[1:]
with (r/'backup-calls').open('a') as f:f.write(json.dumps(a)+'\\n')
if a[:3]==['volume','ls','-q']: print('agiviet_oracle_v2_ai_audit')
elif 'ps' in a: print('backend\\nai')
elif 'pg_dump' in a: print('fixture dump')
elif 'pg_restore' in a: sys.stdin.buffer.read()
elif 'psql' in a: raise SystemExit(9)  # Chủ động lỗi sau snapshot, không remote write.
elif 'tar' in a: print('fixture archive')
''')
        result = subprocess.run(['bash', str(ORACLE / 'sao-luu.sh')],
                                env=self.env, capture_output=True, text=True, timeout=30)
        self.assertNotEqual(result.returncode, 0)
        calls = [json.loads(x) for x in (self.root / 'backup-calls').read_text().splitlines()]
        self.assertTrue(any('--profile' in a and 'ai' in a and 'ps' in a for a in calls))
        stop_index = next(i for i, a in enumerate(calls) if 'stop' in a and 'backend' in a and 'ai' in a)
        tar_index = next(i for i, a in enumerate(calls) if '/ai-audit' in a)
        start_index = next(i for i, a in enumerate(calls) if 'start' in a and 'backend' in a and 'ai' in a)
        self.assertLess(stop_index, tar_index)
        self.assertLess(tar_index, start_index)
        self.assertIn('agiviet_oracle_v2_ai_audit:/ai-audit:ro', calls[tar_index])
        self.assertIn('backend', calls[tar_index])
        self.assertFalse(any('ai' in a for a in calls if 'run' in a or 'build' in a))
        self.assertEqual(audit.read_text(), 'preserve')


@unittest.skipUnless(CADDY, 'Truyền --caddy để thử HTTP bằng custom binary')
class CaddyHTTP(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory(prefix='agiviet-caddy-')
        cls.root = Path(cls.tmp.name)
        cls.env = os.environ | {'DOMAIN': 'agiviet.id.vn', 'ACME_EMAIL': 'infra-test@example.com',
                                'ACME_CA': 'https://acme-v02.api.letsencrypt.org/directory',
                                'XDG_DATA_HOME': str(cls.root / 'data'), 'XDG_CONFIG_HOME': str(cls.root / 'config')}
        cls.env['CADDY_PASSWORD_HASH'] = subprocess.check_output(
            [CADDY, 'hash-password', '--plaintext', 'fixture'], text=True).strip()
        cls.log = (cls.root / 'caddy.log').open('w')
        source = (ORACLE / 'Caddyfile').read_text()
        subprocess.run([CADDY, 'validate', '--config', str(ORACLE / 'Caddyfile'), '--adapter', 'caddyfile'],
                       env=cls.env, check=True, stdout=cls.log, stderr=cls.log, timeout=20)

        class Sink(http.server.BaseHTTPRequestHandler):
            def log_message(self, *_):
                pass

            def do_GET(self):
                self.send_response(200)
                self.end_headers()
                self.wfile.write(b'ok')

            def do_POST(self):
                try:
                    if self.headers.get('Transfer-Encoding') == 'chunked':
                        while True:
                            line = self.rfile.readline()
                            if not line:
                                return
                            size = int(line.strip(), 16)
                            if size == 0:
                                self.rfile.readline()
                                break
                            self.rfile.read(size)
                            self.rfile.read(2)
                    else:
                        self.rfile.read(int(self.headers.get('Content-Length', '0')))
                    self.do_GET()
                except (OSError, ValueError):
                    pass

        cls.sink = http.server.ThreadingHTTPServer(('127.0.0.1', 0), Sink)
        cls.thread = threading.Thread(target=cls.sink.serve_forever, daemon=True)
        cls.thread.start()
        with socket.socket() as port:
            port.bind(('127.0.0.1', 0))
            cls.port = port.getsockname()[1]
        config = source.replace('{$DOMAIN:agiviet.id.vn}', f'http://127.0.0.1:{cls.port}')
        config = config.replace('\temail ', '\tadmin off\n\tauto_https off\n\temail ', 1)
        for upstream in ('127.0.0.1:8080', '127.0.0.1:8090'):
            config = config.replace(upstream, f'127.0.0.1:{cls.sink.server_port}')
        cfg = cls.root / 'Caddyfile.http'
        cfg.write_text(config)
        subprocess.run([CADDY, 'start', '--config', str(cfg), '--adapter', 'caddyfile', '--pidfile', str(cls.root / 'pid')],
                       env=cls.env, check=True, stdout=cls.log, stderr=cls.log, timeout=20)
        cls.pid = int((cls.root / 'pid').read_text())

    @classmethod
    def tearDownClass(cls):
        if hasattr(cls, 'pid'):
            os.kill(cls.pid, signal.SIGTERM)
        cls.sink.shutdown()
        cls.sink.server_close()
        cls.log.close()
        cls.tmp.cleanup()

    def request(self, path, method='GET', body=None, headers=None, chunked=False):
        connection = http.client.HTTPConnection('127.0.0.1', self.port, timeout=15)
        try:
            connection.request(method, path, body=body, headers=headers or {}, encode_chunked=chunked)
            response = connection.getresponse()
            status, hdr = response.status, dict(response.getheaders())
            response.read()
            return status, {k.lower(): v for k, v in hdr.items()}
        finally:
            connection.close()

    def test_a_routing(self):
        self.assertEqual(self.request('/ban/')[0], 401)
        auth = {'Authorization': 'Basic ' + base64.b64encode(b'pilot:fixture').decode()}
        self.assertEqual(self.request('/mua/', headers=auth)[0], 200)
        self.assertEqual(self.request('/v1/test/clock')[0], 404)
        self.assertEqual(self.request('/v1/sim/bank/state')[0], 404)

    def test_b_body_exact_and_oversize(self):
        limit = 12 * 1024**2
        self.assertEqual(self.request('/v1/upload', 'POST', b'x' * limit)[0], 200)
        self.assertEqual(self.request('/v1/upload', 'POST', b'x' * (limit + 1))[0], 413)
        # Không có Content-Length: kiểm giới hạn khi đọc stream, không chỉ header.
        chunks = iter([b'x' * 65536] * 192 + [b'x'])
        self.assertEqual(self.request('/v1/upload', 'POST', chunks, chunked=True)[0], 413)

    def test_c_auth_and_api_limits(self):
        for i in range(10):
            # XFF thay đổi không được tạo bucket IP mới.
            self.assertEqual(self.request('/v1/auth/otp', headers={'X-Forwarded-For': f'2.3.4.{i}'})[0], 200)
        status, headers = self.request('/v1/auth-extra', headers={'X-Forwarded-For': '8.8.8.8'})
        self.assertEqual(status, 429)
        self.assertGreater(int(headers['retry-after']), 0)
        statuses = [self.request('/v1/products')[0] for _ in range(121)]
        self.assertIn(200, statuses)
        self.assertEqual(statuses[-1], 429)


if __name__ == '__main__':
    unittest.main(argv=[__file__] + remaining, verbosity=2)
