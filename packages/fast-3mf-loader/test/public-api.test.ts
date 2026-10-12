import { expect, test } from "vitest";
import { Fast3MFLoader, fast3mfBuilder } from "../src/index";

test("exports the documented public API", () => {
    expect(typeof Fast3MFLoader).toBe("function");
    expect(typeof fast3mfBuilder).toBe("function");
});
