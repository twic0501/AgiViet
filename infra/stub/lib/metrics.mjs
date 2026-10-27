// Chỉ số kiểu Prometheus tối giản, không phụ thuộc thư viện. GIẢ LẬP phục vụ đo tải.
import { monitorEventLoopDelay } from 'node:perf_hooks';

const BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];
const hist = new Map();   // key route|method -> {counts[], sum, n}
const codes = new Map();  // key route|status -> n
const loop = monitorEventLoopDelay({ resolution: 10 });
loop.enable();

export function observe(route, method, status, seconds) {
  const k = `${method} ${route}`;
  let h = hist.get(k);
  if (!h) { h = { counts: new Array(BUCKETS.length).fill(0), sum: 0, n: 0 }; hist.set(k, h); }
  for (let i = 0; i < BUCKETS.length; i++) if (seconds <= BUCKETS[i]) h.counts[i]++;
  h.sum += seconds; h.n++;
  const ck = `${k}|${status}`;
  codes.set(ck, (codes.get(ck) || 0) + 1);
}

export function render(extra = {}) {
  const out = [];
  out.push('# HELP http_request_duration_seconds Thời gian xử lý yêu cầu (phía server)');
  out.push('# TYPE http_request_duration_seconds histogram');
  for (const [k, h] of hist) {
    const [method, route] = k.split(' ');
    const l = `method="${method}",route="${route}"`;
    BUCKETS.forEach((b, i) => out.push(`http_request_duration_seconds_bucket{${l},le="${b}"} ${h.counts[i]}`));
    out.push(`http_request_duration_seconds_bucket{${l},le="+Inf"} ${h.n}`);
    out.push(`http_request_duration_seconds_sum{${l}} ${h.sum}`);
    out.push(`http_request_duration_seconds_count{${l}} ${h.n}`);
  }
  out.push('# TYPE http_requests_total counter');
  for (const [k, n] of codes) {
    const [mr, status] = k.split('|');
    const [method, route] = mr.split(' ');
    out.push(`http_requests_total{method="${method}",route="${route}",status="${status}"} ${n}`);
  }
  out.push('# TYPE nodejs_eventloop_lag_p99_seconds gauge');
  out.push(`nodejs_eventloop_lag_p99_seconds ${loop.percentile(99) / 1e9}`);
  out.push('# TYPE process_resident_memory_bytes gauge');
  out.push(`process_resident_memory_bytes ${process.memoryUsage().rss}`);
  for (const [name, v] of Object.entries(extra)) {
    out.push(`# TYPE ${name} gauge`);
    out.push(`${name} ${v}`);
  }
  return out.join('\n') + '\n';
}
