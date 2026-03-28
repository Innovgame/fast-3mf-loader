import { describe, expect, test } from "vitest";
import "./helpers/mock-inline-workers";
import { readFixture } from "./helpers/read-fixture";

const { Fast3MFLoader } = await import("../lib/main");

describe("Fast3MFLoader.parse", () => {
    test("parses cube_gears.3mf", async () => {
        const loader = new Fast3MFLoader();
        const data = await loader.parse(await readFixture("cube_gears.3mf"));

        expect(data).toBeDefined();
        expect(Object.keys(data!.model).length).toBeGreaterThan(0);
        expect(data!.rels.length).toBeGreaterThan(0);
    });

    test("parses multipletextures.3mf with embedded texture payloads", async () => {
        const loader = new Fast3MFLoader();
        const data = await loader.parse(await readFixture("multipletextures.3mf"));

        expect(Object.keys(data!.texture).length).toBeGreaterThan(0);
    });

    test("parses truck.3mf with multiple objects or components", async () => {
        const loader = new Fast3MFLoader();
        const data = await loader.parse(await readFixture("truck.3mf"));
        const objectValues = Object.values(data!.model).flatMap((model) => Object.values(model.resources.object));
        const hasComponents = objectValues.some((object) => object.components.length > 0);

        expect(objectValues.length).toBeGreaterThan(1);
        expect(hasComponents).toBe(true);
    });

    test("parses volumetric.3mf without throwing", async () => {
        const loader = new Fast3MFLoader();
        const data = await loader.parse(await readFixture("volumetric.3mf"));

        expect(data).toBeDefined();
        expect(Object.keys(data!.model).length).toBeGreaterThan(0);
    });
});
