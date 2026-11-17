# Cổng AgiViet (Go) + lõi nghiệp vụ (Rust) trong một dịch vụ Render.
# Hai app gọi cổng; cổng tự phục vụ /v2 qua gRPC tới lõi, mọi đường khác chuyển tiếp về agiviet-api (BACKEND_URL).
# Build từ gốc repo: docker build -f infra/render/cong.Dockerfile .
FROM rust:1-slim-bookworm AS loi
RUN apt-get update && apt-get install -y --no-install-recommends protobuf-compiler && rm -rf /var/lib/apt/lists/*
WORKDIR /src
COPY proto ./proto
COPY core ./core
RUN cargo build --release --locked --manifest-path core/Cargo.toml -p may-chu

FROM golang:1-bookworm AS cong
WORKDIR /src/gateway
COPY gateway/go.mod gateway/go.sum ./
RUN go mod download
COPY gateway ./
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/gateway ./cmd/gateway

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/* && useradd -r -u 10001 agv
COPY --from=loi /src/core/target/release/may-chu /usr/local/bin/may-chu
COPY --from=cong /out/gateway /usr/local/bin/gateway
USER agv
ENV PORT=10000 CORE_ADDR=127.0.0.1:50051
EXPOSE 10000
# Lõi chỉ nghe trong container; cổng là tiến trình chính, dừng cổng thì dừng cả dịch vụ
CMD ["sh", "-c", "may-chu & exec gateway"]
