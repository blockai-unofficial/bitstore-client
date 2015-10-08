export NODE_ENV = development
SHELL := /bin/bash

.PHONY: build lint test clean

build: clean
	./node_modules/.bin/babel "./src" --out-dir "./lib" --copy-files

lint:
	npm run lint

test:
	npm test

browserify: build
	./node_modules/.bin/browserify ./lib/index.js -s bitstore -o ./browser/bundle.js"

clean:
	rm -rf ./lib


