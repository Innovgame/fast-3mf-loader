import { configDefaults } from "vitest/config";
import { describe, expect, test } from "vitest";
import config from "../vite.config";

describe("vite config", () => {
    test("excludes local worktree directories from Vitest discovery", () => {
        const exclude = config.test?.exclude ?? [];

        expect(exclude).toEqual(
            expect.arrayContaining(["**/.worktrees/**", "**/worktrees/**"]),
        );
    });

    test("preserves Vitest default exclusion patterns", () => {
        const exclude = config.test?.exclude ?? [];

        expect(exclude).toEqual(
            expect.arrayContaining(configDefaults.exclude),
        );
    });
});
