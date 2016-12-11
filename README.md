# funkster-http

[![npm](https://img.shields.io/npm/v/funkster-http.svg?style=flat-square)](https://www.npmjs.com/package/funkster-http)
[![node](https://img.shields.io/node/v/funkster-http.svg?style=flat-square)](http://nodejs.org/download/)
[![npm](https://img.shields.io/npm/dt/funkster-http.svg?style=flat-square)](https://www.npmjs.com/package/funkster-http)
[![Known Vulnerabilities](https://snyk.io/test/github/bomret/funkster-http/badge.svg?style=flat-square)](https://snyk.io/test/github/bomret/funkster-http)
[![bitHound](https://img.shields.io/bithound/code/github/Bomret/funkster-http.svg?style=flat-square)](https://www.bithound.io/github/Bomret/funkster-http)
[![Travis](https://img.shields.io/travis/Bomret/funkster-http.svg?style=flat-square)](https://travis-ci.org/Bomret/funkster-http)

![Icon](./icon.png)

Funkster is a compositional server library. This package contains the basic combinators to write HTTP(S) servers.
It allows to describe your api in a declarative, functional manner and compose it by using the existing combinators to write higher level ones.

> [Typscript](http://www.typescriptlang.org/) is used to illustrate the examples.

## Install
```bash
$ npm install funkster-http
```

## Build
```bash
$ npm install && npm run build
```

## Test
```bash
$ npm run test
```

## Basics
This package introduces the `HttpContext` type which contains the request and response references and the `HttpPipe` which is every combinators basic signature.

## Examples
### Echo server
The following example demonstrates a basic echo server which just responds with the sent body of POST requests.

```javascript
import * as http from 'http';
import { asRequestListener, body, Ok, POST } from 'funkster-http';

const echo = POST(body(buffer => Ok(String(buffer)))); 
const server = http.createServer(asRequestListener(greet));

// start the node HTTP server and send e.g. a POST with body 'Hello World!'.
```

### Basic routing and different HTTP verbs
The following example demonstrates basic routing and using different HTTP Verbs. All routes that have not been registered will return a `404`.

```javascript
import * as http from 'http';
import { choose } from 'funkster-core';
import { asRequestListener, body, GET, ifPath, Ok, parsePath, POST } from 'funkster-http';

interface Greeting {
  name: string;
}

const api =
  choose([
    GET(choose([
      ifPath("/", () => Ok("Hello World!")),
      parsePath<Greeting>("/:name", params => Ok("Hello from GET, " + params.name))
    ])),
    POST(
      ifPath("/", () => body(name => Ok("Hello from POST, " + String(name))))
    )
  ]);
const server = http.createServer(asRequestListener(api));

// start the node HTTP server and send e.g. a GET to '$HOST/John'.
```

## Api
### Using `HttpPipe`s in node or as connect middleware
Using `asRequestListener` on a `HttpPipe` returns a node compatible `(req, res) => void` callback which can be passed to `http.createServer`.
Using `asConnectMiddleware` on a `HttpPipe` returns a connect compatible `(req, res, next) => void` callback which, for example, can be passed to `app.use` in express.

### Using a node callback or connect middleware in Funkster
Using `fromRequestListener` on a `(req, res) => void` callback returns a `HttpPipe` which can then be combined with other Funkster combinators.
Using `fromConnectMiddleware` on a `(req, res, next) => void` callback returns a `HttpPipe` which can then be combined with other Funkster combinators.

## Meta
Icon [funky](https://thenounproject.com/search/?q=funky&i=72105) by [iconsmind.com](https://thenounproject.com/imicons/) from the Noun Project.
