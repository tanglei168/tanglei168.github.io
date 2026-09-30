import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
const base = process.env.PREVIEW_URL ?? "http://127.0.0.1:4317";

test("serves the complete Chinese overview with six navigation destinations", async () => {
  const response = await fetch(`${base}/zh`);
  assert.equal(response.status, 200);
  const html = await response.text();
  for (const text of [
    "从整体，看见每一部分。",
    "人体总览",
    "器官探索",
    "身体系统",
    "学习路径",
    "知识资源",
    "我的笔记",
    "人体整体三维视图",
    "LIVE 3D",
  ])
    assert.ok(html.includes(text), text);
  assert.ok(!html.includes("Internal Server Error"));
});
test("serves each retained model as a complete GLB and returns 404 for an invalid locale", async () => {
  for (const id of [
    "heart",
    "brain",
    "lungs",
    "liver",
    "kidneys",
    "eyeball",
    "intestine",
    "pancreas",
    "skin",
    "human-body",
  ]) {
    const response = await fetch(`${base}/models/${id}.glb`);
    assert.equal(response.status, 200, id);
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.equal(bytes.toString("ascii", 0, 4), "glTF", id);
    assert.equal(bytes.length, bytes.readUInt32LE(8), id);
    assert.equal(
      bytes.length,
      (await readFile(new URL(`../public/models/${id}.glb`, import.meta.url)))
        .length,
    );
  }
  assert.equal((await fetch(`${base}/not-a-locale`)).status, 404);
});
