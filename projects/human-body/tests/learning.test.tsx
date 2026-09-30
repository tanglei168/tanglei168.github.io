import React from "react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LearningApp } from "../app/components/LearningApp";
import {
  atlas,
  systems,
  chains,
  lessons,
  resources,
  sources,
  parseLearningState,
  emptyLearningState,
} from "../app/lib/learning-data";
import { getLocale } from "../app/i18n/config";
import type { Dictionary } from "../app/i18n/types";
vi.mock("../app/components/AnatomyApp", () => ({
  AnatomyApp: ({ initialOrgan }: { initialOrgan: string }) => (
    <div>
      <span>Original 3D Explorer</span>
      <output aria-label="当前详情器官">{initialOrgan}</output>
    </div>
  ),
}));
vi.mock("../app/components/BodyAtlas", () => ({
  BodyAtlas: ({ selectedName }: { selectedName: string }) => (
    <div>3D 总览：{selectedName}</div>
  ),
}));
const key = "anatomy-atelier:learning:v1";
const mount = () =>
  render(
    <LearningApp locale={getLocale("zh")} dictionary={{} as Dictionary} />,
  );
beforeEach(() => {
  localStorage.clear();
  history.replaceState(null, "", "/zh");
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
describe("content integrity", () => {
  it("resolves all system, organ, chain, prerequisite and source links", () => {
    const ids = (items: { id: string }[]) => new Set(items.map((i) => i.id));
    const organIds = ids(atlas),
      systemIds = ids(systems),
      lessonIds = ids(lessons),
      sourceIds = ids(sources);
    expect(organIds.size).toBe(20);
    expect(systemIds.size).toBe(11);
    expect(ids(resources).size).toBe(resources.length);
    for (const o of atlas)
      for (const id of o.systems) expect(systemIds.has(id)).toBe(true);
    for (const s of systems)
      for (const id of s.partners) expect(systemIds.has(id)).toBe(true);
    for (const c of chains)
      for (const e of c.relations) {
        expect(organIds.has(e.from)).toBe(true);
        expect(organIds.has(e.to)).toBe(true);
      }
    for (const l of lessons) {
      expect(l.quiz.options[l.quiz.answer]).toBeTruthy();
      for (const id of l.prerequisites) expect(lessonIds.has(id)).toBe(true);
      for (const id of l.organIds) expect(organIds.has(id)).toBe(true);
    }
    for (const item of [...lessons, ...chains, ...resources])
      for (const id of item.sourceIds) expect(sourceIds.has(id)).toBe(true);
  });
  it("rejects corrupt backups and round-trips valid state", () => {
    expect(parseLearningState(JSON.stringify(emptyLearningState))).toEqual(
      emptyLearningState,
    );
    expect(() => parseLearningState("{")).toThrow();
    expect(() =>
      parseLearningState(
        JSON.stringify({ ...emptyLearningState, notes: [{ id: "bad" }] }),
      ),
    ).toThrow();
    expect(() =>
      parseLearningState(JSON.stringify({ ...emptyLearningState, version: 2 })),
    ).toThrow();
  });
});
describe("learning journeys", () => {
  it("opens all six modules and supports deep links", async () => {
    const user = userEvent.setup();
    mount();
    expect(
      screen.getByRole("heading", { name: "从整体，看见每一部分。" }),
    ).toBeTruthy();
    for (const [tab, heading] of [
      ["Systems 身体系统", "每个系统，都有伙伴。"],
      ["Lessons 学习路径", "把好奇，变成理解。"],
      ["Library 知识资源", "值得留下的身体知识。"],
      ["Notes 我的笔记", "让知识成为自己的。"],
    ]) {
      await user.click(screen.getByRole("button", { name: tab }));
      expect(screen.getByRole("heading", { name: heading })).toBeTruthy();
    }
    await user.click(screen.getByRole("button", { name: "Explore 器官探索" }));
    expect(await screen.findByText("Original 3D Explorer")).toBeTruthy();
  });
  it("opens the same selected organ in the detailed 3D explorer", async () => {
    const user = userEvent.setup();
    history.replaceState(null, "", "/zh#overview/brain");
    mount();
    await user.click(
      await screen.findByRole("button", { name: /探索 3D 器官/ }),
    );
    expect((await screen.findByLabelText("当前详情器官")).textContent).toBe(
      "brain",
    );
    expect(location.hash).toBe("#explore/brain");
  });
  it("persists a resource bookmark and shows it after remount", async () => {
    const user = userEvent.setup();
    const view = mount();
    await user.click(screen.getByRole("button", { name: "收藏知识卡" }));
    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem(key)!).savedIds).toContain(
        "organ:heart",
      ),
    );
    view.unmount();
    mount();
    await user.click(screen.getByRole("button", { name: "Library 知识资源" }));
    await user.click(screen.getByLabelText(/只看我的收藏/));
    expect(screen.getByText(/1 项资源/)).toBeTruthy();
  });
  it("requires a correct answer and prerequisites before completion", async () => {
    const user = userEvent.setup();
    mount();
    await user.click(screen.getByRole("button", { name: "Lessons 学习路径" }));
    expect(
      (screen.getByRole("button", { name: "完成本课" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    await user.click(screen.getByLabelText("被观察者的身体左侧"));
    expect(
      (screen.getByRole("button", { name: "完成本课" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    await user.click(screen.getByLabelText("被观察者的身体右侧"));
    await user.click(screen.getByRole("button", { name: "完成本课" }));
    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem(key)!).completedIds).toContain(
        "body-map",
      ),
    );
    await user.click(
      screen.getByRole("button", { name: /03 · 整合应用 · 7 分钟/ }),
    );
    await user.click(screen.getByLabelText("输尿管"));
    expect(
      (screen.getByRole("button", { name: "完成本课" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });
  it("creates, edits, archives and restores linked notes across reloads", async () => {
    const user = userEvent.setup();
    const view = mount();
    await user.click(screen.getByRole("button", { name: "写笔记" }));
    await user.type(screen.getByLabelText("标题"), "心肺协作");
    await user.type(
      screen.getByLabelText("内容"),
      "肺负责交换，心脏负责运输。",
    );
    await user.type(screen.getByLabelText("标签（逗号分隔）"), "循环,复习");
    await user.click(screen.getByRole("button", { name: "保存笔记" }));
    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem(key)!).notes[0].resourceId).toBe(
        "organ:heart",
      ),
    );
    view.unmount();
    mount();
    await user.click(
      await screen.findByRole("button", { name: /理解 .*心肺协作/ }),
    );
    await user.clear(screen.getByLabelText("内容"));
    await user.type(screen.getByLabelText("内容"), "更新后的理解。");
    await user.click(screen.getByRole("button", { name: "保存笔记" }));
    await user.click(screen.getByRole("button", { name: "归档笔记" }));
    expect(JSON.parse(localStorage.getItem(key)!).notes[0].archived).toBe(true);
    await user.click(screen.getByLabelText("查看归档"));
    await user.click(screen.getByRole("button", { name: /理解 .*心肺协作/ }));
    await user.click(screen.getByRole("button", { name: "恢复笔记" }));
    expect(JSON.parse(localStorage.getItem(key)!).notes[0].archived).toBe(
      false,
    );
  });
  it("does not silently overwrite corrupt local data", async () => {
    localStorage.setItem(key, "corrupt");
    mount();
    expect(await screen.findByText(/无法读取本地数据/)).toBeTruthy();
    expect(localStorage.getItem(key)).toBe("corrupt");
  });
  it("opens a bookmarked organ link on first load", async () => {
    history.replaceState(null, "", "/zh#overview/kidneys");
    mount();
    expect(
      await screen.findByRole("heading", { name: /肾脏.*Kidneys/ }),
    ).toBeTruthy();
  });
  it("handles malformed hash input without crashing", () => {
    history.replaceState(null, "", "/zh#overview/%ZZ");
    mount();
    expect(
      screen.getByRole("heading", { name: "从整体，看见每一部分。" }),
    ).toBeTruthy();
  });
});
