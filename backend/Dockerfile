# syntax=docker/dockerfile:1
# 构建上下文为仓库根目录：docker compose build backend

FROM golang:1.22-alpine AS builder

WORKDIR /app

RUN apk add --no-cache git ca-certificates

COPY backend/go.mod backend/go.sum ./
RUN go mod download

COPY backend/ .
COPY database/migrations ./migrations

ENV MIGRATIONS_PATH=migrations

RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o server .

FROM alpine:3.19

RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

COPY --from=builder /app/server .

ENV GIN_MODE=release
ENV PORT=8080
ENV MIGRATIONS_PATH=migrations

EXPOSE 8080

CMD ["./server"]
