.PHONY: install build buildtypes lint typecheck test check prepublish publish publish_dryrun

install:
	bun install

build:
	bun run build

buildtypes:
	bun run build:types

lint:
	bun run lint

typecheck:
	bun run typecheck

test:
	bun test

check: lint typecheck test

prepublish: check build buildtypes

publish: prepublish
	npm publish

publish_dryrun: prepublish
	npm publish --dry-run
