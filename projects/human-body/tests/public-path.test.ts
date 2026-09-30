import { afterEach, expect, it, vi } from "vitest";
import { publicPath } from "../app/lib/public-path";

afterEach(() => vi.unstubAllEnvs());
it("serves models, images and language links below the personal website directory", () => {
  vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "/k1-k12/human-body/");
  for (const path of ["/models/eyeball.glb", "/anatomy/heart/thumb.webp", "/zh/", "/licenses/skeleton.md"])
    expect(publicPath(path)).toBe(`/k1-k12/human-body${path}`);
  expect(publicPath("/k1-k12/human-body/models/skeleton.glb")).toBe("/k1-k12/human-body/models/skeleton.glb");
  expect(publicPath("https://example.org/reference")).toBe("https://example.org/reference");
});
it("preserves root asset URLs for the existing server preview", () => {
  vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "");
  expect(publicPath("/models/heart.glb")).toBe("/models/heart.glb");
});
