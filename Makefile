.PHONY: dev build start lint install docker

install:
	npm install

dev:
	npm run dev

build:
	npm run build

start:
	npm run start

lint:
	npm run lint

docker:
	docker build -t autohost-cloud-lite .

compose-up:
	docker compose up -d

compose-down:
	docker compose down
