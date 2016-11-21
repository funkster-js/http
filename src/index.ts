import { IncomingMessage, ServerRequest, ServerResponse } from "http";
import { Result } from "funkster-core";
import * as finalhandler from "finalhandler";

import { HttpContext, HttpPipe } from "./http";

export * from "./http";

export interface NodeListener {
  (req: IncomingMessage, res: ServerResponse): void;
}

export interface ConnectNext {
  (err?: Error): void;
}

export interface ConnectMiddleware {
  (req: IncomingMessage, res: ServerResponse, next: ConnectNext): void;
}

export function createHttpContext(req: IncomingMessage, res: ServerResponse): HttpContext {
  return { req, res };
}

async function run(req: IncomingMessage, res: ServerResponse, part: HttpPipe): Result<HttpContext> {
  const ctx = createHttpContext(req, res);
  return part(ctx);
}

export function asRequestListener(part: HttpPipe): NodeListener {
  return async (req: IncomingMessage, res: ServerResponse) => {
    const done = finalhandler(<ServerRequest> req, res);
    try {
      const result = await run(req, res, part);
      if (result) {
        res.end();
      } else {
        done(null);
      }
    } catch (error) {
      done(error);
    }
  };
}

export function asConnectMiddleware(part: HttpPipe): ConnectMiddleware {
  return async (req: ServerRequest, res: ServerResponse, next: ConnectNext) => {
    try {
      const result = await run(req, res, part);
      if (!result) {
          next();
      }
    } catch (error) {
      next(error);
    }
  };
}
