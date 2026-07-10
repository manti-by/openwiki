.PHONY: install lint test check

install:
	npm install

lint:
	npm run lint

test:
	npm test

check: lint test
