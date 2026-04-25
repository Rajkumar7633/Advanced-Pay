.PHONY: build run test clean docker-up docker-down migrate dev

build:
	go build -o bin/payment-gateway cmd/api/main.go

run:
	go run cmd/api/main.go

dev:
	$$(go env GOPATH)/bin/air

test:
	go test -v ./...

clean:
	rm -rf bin/ tmp/

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

migrate:
	PGPASSWORD='Raj@76330Raj' psql -h localhost -p 15432 -U postgres -d advancePayment -f migrations/001_create_tables.sql

install:
	go mod download
	go install github.com/cosmtrek/air@latest

lint:
	golangci-lint run
