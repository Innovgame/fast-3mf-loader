import { expectTypeOf, test } from "vitest";
import { Fast3MFLoader, type Model3MF, type ParseResult } from "../lib/main";

test("parse returns a typed promise", () => {
    expectTypeOf<ReturnType<Fast3MFLoader["parse"]>>().toEqualTypeOf<Promise<ParseResult>>();
});

test("Model3MF aliases ParseResult", () => {
    expectTypeOf<Model3MF>().toEqualTypeOf<ParseResult>();
});
