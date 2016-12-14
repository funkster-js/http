import { always, compose, never, Pipe } from "funkster-core";
import { IncomingMessage, ServerResponse } from "http";
import * as parseurl from "parseurl";
import * as pathToRegexp from "path-to-regexp";
import * as querystring from "querystring";
import * as getRawBody from "raw-body";
import { Url } from "url";

export interface HttpContext {
    req: IncomingMessage;
    res: ServerResponse;
};

export interface HttpPipe extends Pipe<HttpContext> { }

export interface HttpStatus {
    code: number;
    reason?: string;
}

export function request(handler: (req: IncomingMessage) => HttpPipe): HttpPipe {
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

async function getRawBodyAsBuffer(req: IncomingMessage) {
    const body = await getRawBody(req);

    return typeof body === "string" ? new Buffer(body) : body;
}

export function body(handler: (body: Buffer) => HttpPipe): HttpPipe {
    return async (ctx: HttpContext) => {
        const buffer = await getRawBodyAsBuffer(ctx.req);
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

export function response(handler: (res: ServerResponse) => HttpPipe): HttpPipe {
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

export const Continue: HttpPipe = setStatus(100);
export const SwitchingProtocols: HttpPipe = setStatus(101);

export const Ok = (result?: string | Buffer, encoding?: string): HttpPipe => respond(200, result, encoding);
export const Created = (result?: string | Buffer, encoding?: string): HttpPipe => respond(201, result, encoding);
export const Accepted = (result?: string | Buffer, encoding?: string): HttpPipe => respond(202, result, encoding);
export const NoContent: HttpPipe = setStatus(204);

export const MovedPermanently = (location: string): HttpPipe =>
    compose(setHeader("Location", location), setStatus(301));

export const Found = (location: string): HttpPipe => compose(setHeader("Location", location), setStatus(302));
export const NotModified: HttpPipe = setStatus(304);

export const BadRequest = (result?: string | Buffer, encoding?: string): HttpPipe => respond(400, result, encoding);
export const Unauthorized = (challenge: string | string[], result?: string | Buffer, encoding?: string): HttpPipe =>
    compose(setHeader("WWW-Authenticate", challenge), respond(401, result, encoding));

export const Forbidden = (result?: string | Buffer, encoding?: string): HttpPipe => respond(403, result, encoding);
export const NotFound = (result?: string | Buffer, encoding?: string): HttpPipe => respond(404, result, encoding);
export const MethodNotAllowed = (result?: string | Buffer, encoding?: string): HttpPipe =>
    respond(405, result, encoding);
export const NotAcceptable = (result?: string | Buffer, encoding?: string): HttpPipe => respond(406, result, encoding);
export const RequestTimeout: HttpPipe = setStatus(408);
export const Conflict = (result?: string | Buffer, encoding?: string): HttpPipe => respond(409, result, encoding);
export const Gone = (result?: string | Buffer, encoding?: string): HttpPipe => respond(410, result, encoding);
export const UnsupportedMediaType = (result?: string | Buffer, encoding?: string): HttpPipe =>
    respond(415, result, encoding);
export const UnprocessableEntity = (result?: string | Buffer, encoding?: string): HttpPipe =>
    respond(422, result, encoding);
export const PreconditionRequired = (result?: string | Buffer, encoding?: string): HttpPipe =>
    respond(428, result, encoding);
export const TooManyRequests = (result?: string | Buffer, encoding?: string): HttpPipe =>
    respond(429, result, encoding);

export const InternalServerError = (result?: string | Buffer, encoding?: string): HttpPipe =>
    respond(500, result, encoding);

export const NotImplemented = (result?: string | Buffer, encoding?: string): HttpPipe =>
    respond(501, result, encoding);

export const BadGateway = (result?: string | Buffer, encoding?: string): HttpPipe =>
    respond(502, result, encoding);

export const ServiceUnavailable = (result?: string | Buffer, encoding?: string): HttpPipe =>
    respond(503, result, encoding);

export const GatewayTimeout = (result?: string | Buffer, encoding?: string): HttpPipe =>
    respond(504, result, encoding);

export const InvalidHttpVersion = (result?: string | Buffer, encoding?: string): HttpPipe =>
    respond(505, result, encoding);
