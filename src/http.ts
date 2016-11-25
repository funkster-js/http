import { always, compose, never, Pipe, Result } from "funkster-core";
import { IncomingMessage, ServerResponse } from "http";
import * as pathToRegexp from "path-to-regexp";
import * as querystring from "querystring";
import { Url } from "url";

// tslint:disable-next-line:no-var-requires
const parseurl = require("parseurl");
// tslint:disable-next-line:no-var-requires
const getRawBody = require("raw-body");

export type HttpRequest = IncomingMessage;
export type HttpResponse = ServerResponse;
export interface HttpContext {
  req: HttpRequest;
  res: HttpResponse;
};

export interface HttpPipe extends Pipe<HttpContext> { }
export interface HttpResult extends Result<HttpContext> { };

export interface HttpStatus {
  code: number;
  reason?: string;
}

export function request(handler: (req: HttpRequest) => HttpPipe): HttpPipe {
  return (ctx: HttpContext) => handler(ctx.req)(ctx);
}

export function parseUrl(handler: (url: Url) => HttpPipe): HttpPipe {
  return request(req => handler(parseurl(req)));
}

export function parsePath<Params>(path: string, paramHandler: (params: Params) => HttpPipe): HttpPipe {
  const keys: pathToRegexp.Key[] = [];
  const regex = pathToRegexp(path, keys);

  const keyNames = keys.map(k => k.name);

  return parseUrl(url => {
    const matches = regex.exec(url.pathname);

    if (!matches || matches.length < 1) {
      return never;
    }

    const sanitizedMatches =
      matches
        .slice(1, matches.length)
        .map(x => decodeURIComponent(x));

    if (sanitizedMatches.length === keyNames.length) {
      const params = keyNames.reduce((accu: any, key, i) => {
        accu[key] = sanitizedMatches[i];
        return accu;
      }, {});

      return paramHandler(params);
    }

    return never;
  });
};

export function parseQuery<Query>(handler: (query: Query) => HttpPipe): HttpPipe {
  return parseUrl(url => {
    const parsedQuery = querystring.parse(url.query);
    return handler(parsedQuery);
  });
}

export function ifPath(urlPath: string, handler: () => HttpPipe): HttpPipe {
  return parseUrl(url => url.pathname === urlPath ? handler() : never);
}

export function method(handler: (method: string) => HttpPipe): HttpPipe {
  return request(req => handler(req.method));
}

export function ifMethod(httpMethod: string, part: HttpPipe): HttpPipe {
  return method(verb => verb === httpMethod ? part : never);
}

export function httpVersion(handler: (version: string) => HttpPipe): HttpPipe {
  return request(req => handler(req.httpVersion));
}

export function ifHttpVersion(version: string, part: HttpPipe): HttpPipe {
  return httpVersion(v => v === version ? part : never);
}

export function body(handler: (body: Buffer) => HttpPipe): HttpPipe {
  return async (ctx: HttpContext) => {
    const buffer = await getRawBody(ctx.req);
    const part = handler(buffer);

    return part(ctx);
  };
};

export function headers(handler: (headers: any) => HttpPipe): HttpPipe {
  return request(req => handler(req.headers));
}

export function header(name: string, handler: (value?: string) => HttpPipe): HttpPipe {
  return headers(hs => {
    const value = hs[name.toLowerCase()];
    return handler(value);
  });
}

export function GET(part: HttpPipe): HttpPipe { return ifMethod("GET", part); }
export function POST(part: HttpPipe): HttpPipe { return ifMethod("POST", part); }
export function HEAD(part: HttpPipe): HttpPipe { return ifMethod("HEAD", part); }
export function PUT(part: HttpPipe): HttpPipe { return ifMethod("PUT", part); }
export function DELETE(part: HttpPipe): HttpPipe { return ifMethod("DELETE", part); }
export function TRACE(part: HttpPipe): HttpPipe { return ifMethod("TRACE", part); }
export function OPTIONS(part: HttpPipe): HttpPipe { return ifMethod("OPTIONS", part); }
export function CONNECT(part: HttpPipe): HttpPipe { return ifMethod("CONNECT", part); }
export function PATCH(part: HttpPipe): HttpPipe { return ifMethod("PATCH", part); }
export function OTHER(name: string, part: HttpPipe): HttpPipe { return ifMethod(name, part); }

export function response(handler: (res: HttpResponse) => HttpPipe): HttpPipe {
  return (ctx: HttpContext) => handler(ctx.res)(ctx);
}

export function statusCode(handler: (statusCode: number) => HttpPipe): HttpPipe {
  return response(res => handler(res.statusCode));
}

export function statusMessage(handler: (statusMessage: string) => HttpPipe): HttpPipe {
  return response(res => handler(res.statusMessage));
}

export function status(handler: (status: HttpStatus) => HttpPipe): HttpPipe {
  return response(res => handler({ code: res.statusCode, reason: res.statusMessage }));
}

export function setHeader(key: string, value: string | string[]): HttpPipe {
  return response(res => {
    res.setHeader(key, value);

    return always;
  });
}

export function addHeader(key: string, value: string | string[]): HttpPipe {
  return response(res => {
    const current = res.getHeader(key);

    if (current) {
      const conc = Array.isArray(value) ? [current].concat(value) : [current, value];
      res.setHeader(key, conc);
    } else {
      res.setHeader(key, value);
    }

    return always;
  });
}

export function setStatus(statusOrstatusCode: HttpStatus | number, reason?: string): HttpPipe {
  return response(res => {
    if (typeof statusOrstatusCode === "number") {
      res.writeHead(statusOrstatusCode, reason);
    } else {
      res.writeHead(statusOrstatusCode.code, statusOrstatusCode.reason || reason);
    }

    return always;
  });
}

export function writeBody(body: string | Buffer, encoding?: string): HttpPipe {
  return response(res => {
    res.write(body, encoding);
    return always;
  });
}

export function respond(statusCode: number, body?: string | Buffer, encoding?: string): HttpPipe {
  return compose(setStatus(statusCode), body ? writeBody(body, encoding) : always);
}

export const Continue = setStatus(100);
export const SwitchingProtocols = setStatus(101);

export const Ok = (result?: string | Buffer, encoding?: string) => respond(200, result, encoding);
export const Created = (result?: string | Buffer, encoding?: string) => respond(201, result, encoding);
export const Accepted = (result?: string | Buffer, encoding?: string) => respond(202, result, encoding);
export const NoContent = setStatus(204);

export const MovedPermanently = (location: string) => compose(setHeader("Location", location), setStatus(301));
export const Found = (location: string) => compose(setHeader("Location", location), setStatus(302));
export const NotModified = setStatus(304);

export const BadRequest = (result?: string | Buffer, encoding?: string) => respond(400, result, encoding);
export const Unauthorized = (challenge: string | string[], result?: string | Buffer, encoding?: string) =>
  compose(setHeader("WWW-Authenticate", challenge), respond(401, result, encoding));

export const Forbidden = (result?: string | Buffer, encoding?: string) => respond(403, result, encoding);
export const NotFound = (result?: string | Buffer, encoding?: string) => respond(404, result, encoding);
export const MethodNotAllowed = (result?: string | Buffer, encoding?: string) => respond(405, result, encoding);
export const NotAcceptable = (result?: string | Buffer, encoding?: string) => respond(406, result, encoding);
export const RequestTimeout = setStatus(408);
export const Conflict = (result?: string | Buffer, encoding?: string) => respond(409, result, encoding);
export const Gone = (result?: string | Buffer, encoding?: string) => respond(410, result, encoding);
export const UnsupportedMediaType = (result?: string | Buffer, encoding?: string) => respond(415, result, encoding);
export const UnprocessableEntity = (result?: string | Buffer, encoding?: string) => respond(422, result, encoding);
export const PreconditionRequired = (result?: string | Buffer, encoding?: string) => respond(428, result, encoding);
export const TooManyRequests = (result?: string | Buffer, encoding?: string) => respond(429, result, encoding);

export const InternalServerError = (result?: string | Buffer, encoding?: string) => respond(500, result, encoding);
export const NotImplemented = (result?: string | Buffer, encoding?: string) => respond(501, result, encoding);
export const BadGateway = (result?: string | Buffer, encoding?: string) => respond(502, result, encoding);
export const ServiceUnavailable = (result?: string | Buffer, encoding?: string) => respond(503, result, encoding);
export const GatewayTimeout = (result?: string | Buffer, encoding?: string) => respond(504, result, encoding);
export const InvalidHttpVersion = (result?: string | Buffer, encoding?: string) => respond(505, result, encoding);
