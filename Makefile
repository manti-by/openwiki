.PHONY: test

install:
	bun install

build:
	bun run build

buildtypes:
	bun run build:types

lint:
	bun run lint

format:
	bun run format

check:
	bun run typecheck

test:
	bun test

git-add:
	git add .

ci: git-add lint check test

prepublish: check build buildtypes

publish: prepublish
	npm publish

publish_dryrun: prepublish
	npm publish --dry-run
