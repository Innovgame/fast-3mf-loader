import { expect, test } from "vitest";
import { Fast3MFLoader } from "../lib/main";

test("loader exposes a parse method", () => {
    const loader = new Fast3MFLoader();
    expect(typeof loader.parse).toBe("function");
});
