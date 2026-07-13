.PHONY: install build lint typecheck test check

install:
	bun install

build:
	bun run build

lint:
	bun run lint

typecheck:
	bun run typecheck

test:
	bun test

check: lint typecheck test
