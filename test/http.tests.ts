import * as request from "supertest";
import "mocha";

import { asRequestListener } from "../src";
import { Ok, parsePath } from "../src/http";

describe("When using pathScan", () => {
    describe("on a url path with placeholders", () => {
        interface Params {
            foo: string;
            bar: string;
        }

        const pipe = parsePath<Params>("/route/:foo/some/:bar", params => Ok(JSON.stringify(params)));

        it("should parse the placeholder values correctly.", done => {
            request(asRequestListener(pipe))
                .get("/route/first/some/beer")
                .expect(200, JSON.stringify({ foo: "first", bar: "beer" }), done);
        });
    });
});
