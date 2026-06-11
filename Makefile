.PHONY: infra-up infra-down backend-run backend-test web-dev

infra-up:
	docker compose up -d mysql redis

infra-down:
	docker compose down

backend-run:
	cd backend && go run .

backend-test:
	cd backend && go test ./...

web-dev:
	cd web && pnpm dev
