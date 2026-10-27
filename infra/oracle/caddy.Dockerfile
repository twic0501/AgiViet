# Bản chuẩn không có rate_limit. Ghim plugin theo commit, không dùng @latest.
FROM caddy:2.10.2-builder AS builder
ENV GOMAXPROCS=2 GOFLAGS="-p=2 -buildvcs=false"
RUN xcaddy build v2.10.2 \
    --with github.com/mholt/caddy-ratelimit@5625512f24f6f59d6f64fb3aafe5eecff0b286db
FROM caddy:2.10.2-alpine
COPY --from=builder /usr/bin/caddy /usr/bin/caddy
RUN caddy list-modules | grep -Fx http.handlers.rate_limit
