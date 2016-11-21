import { asRequestListener } from "../src";
import { Ok, pathScan } from "../src/http";

import * as request from "supertest";
import * as assert from "assert";
import "mocha";

describe("When using pathScan", () => {
    describe("on a url path with placeholders", () => {
        interface Params {
            foo: string;
            bar: string;
        }

        const pipe = pathScan<Params>("/route/:foo/some/:bar", params => Ok(JSON.stringify(params)));

        it("should parse the placeholder values correctly.", done => {
            request(asRequestListener(pipe))
                .get("/route/first/some/beer")
                .expect(200, JSON.stringify({ foo: "first", bar: "beer" }), done);
        });
    });
});
