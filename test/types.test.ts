import { expectTypeOf, test } from "vitest";
import { Fast3MFLoader, type ParseResult } from "../lib/main";

test("parse returns a typed promise", () => {
    expectTypeOf<ReturnType<Fast3MFLoader["parse"]>>().toEqualTypeOf<Promise<ParseResult>>();
});
