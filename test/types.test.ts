import { expectTypeOf, test } from "vitest";
import { Fast3MFLoader, type Model3MF, type ParseOptions, type ParseResult, type ParsedModelPart, type Relationship } from "../lib/main";

test("parse returns a typed promise", () => {
    expectTypeOf<ReturnType<Fast3MFLoader["parse"]>>().toEqualTypeOf<Promise<ParseResult>>();
});

test("Model3MF aliases ParseResult", () => {
    expectTypeOf<Model3MF>().toEqualTypeOf<ParseResult>();
});

test("public helper types stay aligned with the documented contract", () => {
    expectTypeOf<Parameters<Fast3MFLoader["parse"]>[1]>().toEqualTypeOf<ParseOptions | undefined>();
    expectTypeOf<ParseResult["rels"][number]>().toEqualTypeOf<Relationship>();
});

test("parse keeps parsed model part and typed array result shapes stable", () => {
    type ParseOutput = Awaited<ReturnType<Fast3MFLoader["parse"]>>;
    type ParsedObjectMesh = ParseOutput["model"][string]["resources"]["object"][string]["mesh"];

    expectTypeOf<ParseOutput["model"][string]>().toEqualTypeOf<ParsedModelPart>();
    expectTypeOf<ParsedObjectMesh["vertices"]>().toEqualTypeOf<Float32Array>();
    expectTypeOf<ParsedObjectMesh["triangles"]>().toEqualTypeOf<Uint32Array>();
});
