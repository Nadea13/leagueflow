# Stage 1: Build the Go binary
FROM golang:1.24-alpine AS builder

WORKDIR /app

# Install certificates and build dependencies
RUN apk add --no-cache ca-certificates git

# Cache go modules
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build statically linked binary without debug info for smaller size and speed
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o /app/bin/server ./cmd/server/main.go

# Stage 2: Minimal runtime image
FROM alpine:3.20 AS runner

WORKDIR /app

RUN apk add --no-cache ca-certificates tzdata

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy compiled binary from builder
COPY --from=builder /app/bin/server /app/server
COPY --from=builder /app/migrations /app/migrations

USER appuser

EXPOSE 8080

CMD ["/app/server"]
