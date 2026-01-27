# Makefile for RMPP Management Tool
APP_NAME    := rm-server
DEVICE_IP   := 10.11.99.1
DEVICE_USER := root
REMOTE_PATH := /home/root/$(APP_NAME)
GO_ENV      := CGO_ENABLED=0 GOOS=linux GOARCH=arm64
GO_FLAGS    := -ldflags="-s -w"

.PHONY: all build push run deploy clean terminate kill-remote

all: deploy

build:
	@echo "Building React frontend..."
	@cd web-react && npm run build
	@echo "Building $(APP_NAME)..."
	@$(GO_ENV) go build $(GO_FLAGS) -o $(APP_NAME) cmd/server/main.go

terminate:
		@echo "Terminating remote process..."
		@-pgrep -f "ssh.*$(APP_NAME)" | xargs kill -9 2>/dev/null || true
		@echo "Terminating remote process..."
		@ssh $(DEVICE_USER)@$(DEVICE_IP) "ps | grep '$(APP_NAME)' | grep -v 'grep' | awk '{print \$$1}' | xargs kill -9 2>/dev/null || true"

push: terminate
		@echo "Transferring to device..."
		@scp ./$(APP_NAME) $(DEVICE_USER)@$(DEVICE_IP):$(REMOTE_PATH)
		@echo "Transferring React build files..."
		@ssh $(DEVICE_USER)@$(DEVICE_IP) "mkdir -p /home/root/web-react/dist"
		@scp -r ./web-react/dist/* $(DEVICE_USER)@$(DEVICE_IP):/home/root/web-react/dist/

run: push
		@ssh $(DEVICE_USER)@$(DEVICE_IP) "chmod +x $(REMOTE_PATH) && $(REMOTE_PATH)" &
		@sleep 1

deploy: build run
		@echo "Deployment cycle complete."

clean:
		@rm -f $(APP_NAME)
		@echo "Cleaned build artifacts."

kill-remote:
		@ssh $(DEVICE_USER)@$(DEVICE_IP) "ps | grep '$(APP_NAME)' | grep -v 'grep' | awk '{print \$$1}' | xargs kill -9 2>/dev/null || true"
		@echo "Remote app terminated."

# Local development targets
.PHONY: dev test-local clean-test

dev: 
	@echo "Setting up local development environment..."
	@chmod +x scripts/dev.sh scripts/test-setup.sh
	@./scripts/test-setup.sh
	@./scripts/dev.sh

test-local:
	@echo "Running local tests..."
	@DEV_MODE=true go test ./... -v

clean-test:
	@echo "Cleaning test data..."
	@rm -rf testdata/xochitl/*
	@rm -rf testdata/books/*
	@echo "Test data cleaned."
