.PHONY: run build tidy test fmt vet

run:
	go run .

build:
	go build -o bin/server .

tidy:
	go mod tidy

test:
	go test ./...

fmt:
	go fmt ./...

vet:
	go vet ./...
