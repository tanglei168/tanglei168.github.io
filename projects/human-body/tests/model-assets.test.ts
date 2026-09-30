import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import manifest from "../docs/upstream-models.json";
import { bodyPlacements } from "../app/lib/three/body-layout";

describe("shared 3D assets", () => {
  it("keeps all nine organ models byte-identical to upstream", () => {
    for (const model of manifest.models) {
      const data = readFileSync(model.path);
      const hash = createHash("sha1")
        .update(`blob ${data.length}\0`)
        .update(data)
        .digest("hex");
      expect(hash, model.path).toBe(model.gitBlobSha);
    }
  });
  it("uses library model IDs for every assembled organ and a valid detailed human mesh", () => {
    for (const placement of bodyPlacements)
      expect(
        manifest.models.some(
          (m) => m.path === `public/models/${placement.id}.glb`,
        ),
      ).toBe(true);
    const body = readFileSync("public/models/human-body.glb");
    expect(body.toString("ascii", 0, 4)).toBe("glTF");
    expect(body.readUInt32LE(8)).toBe(body.length);
    const jsonSize = body.readUInt32LE(12);
    const json = JSON.parse(body.toString("utf8", 20, 20 + jsonSize));
    expect(json.accessors[0].count).toBeGreaterThan(10000);
    expect(json.accessors[2].count).toBeGreaterThan(70000);
  });
  it("ships a complete bilateral skeleton with its redistribution notice", () => {
    const bytes = readFileSync("public/models/skeleton.glb");
    expect(bytes.toString("ascii", 0, 4)).toBe("glTF");
    expect(bytes.readUInt32LE(8)).toBe(bytes.length);
    const json = JSON.parse(bytes.toString("utf8", 20, 20 + bytes.readUInt32LE(12)));
    const names = json.nodes.map((node: { name: string }) => node.name);
    for (const bone of ["Femur.r", "Femur.l", "Humerus.r", "Humerus.l", "Frontal bone", "Sacrum"])
      expect(names).toContain(bone);
    expect(json.meshes.length).toBeGreaterThan(200);
    const bounds = (name: string) => {
      const node = json.nodes.find((n: { name: string }) => n.name === name);
      return json.accessors[json.meshes[node.mesh].primitives[0].attributes.POSITION];
    };
    const coccyx = bounds("Coccyx"), sacrum = bounds("Sacrum");
    // Tailbone must stay on the spinal midline immediately below the sacrum,
    // not receive the wrist transform just because its source height overlaps.
    expect(Math.abs((coccyx.min[0] + coccyx.max[0]) / 2)).toBeLessThan(.02);
    expect(coccyx.max[1]).toBeLessThan(sacrum.min[1] + .03);
    expect(Math.abs(coccyx.max[1] - sacrum.min[1])).toBeLessThan(.08);
    expect(readFileSync("public/licenses/skeleton.md", "utf8")).toContain("CC BY-SA 4.0");
  });
});
