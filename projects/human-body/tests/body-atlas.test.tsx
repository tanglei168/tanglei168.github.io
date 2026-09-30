import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { BodyAtlas } from "../app/components/BodyAtlas";

const methods = vi.hoisted(() => ({
  select: vi.fn(), setEnvelope: vi.fn(), setSkinOpacity: vi.fn(),
  setSkeleton: vi.fn(), setRotate: vi.fn(), setIsolate: vi.fn(),
  setSpread: vi.fn(), reset: vi.fn(), zoom: vi.fn(), dispose: vi.fn(),
}));
vi.mock("../app/lib/three/body-viewer", () => ({ BodyViewer: class {
  constructor() { Object.assign(this, methods); }
} }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("offers opaque skin, remembers translucency when hidden, and uncovers an isolated skeleton", async () => {
  render(<BodyAtlas selectedId="bones" selectedName="骨骼" visibleIds={["bones"]} onSelect={() => {}} onExplore={() => {}} />);
  await waitFor(() => expect(methods.setSkinOpacity).toHaveBeenCalledWith(1));
  expect(screen.getByRole("button", { name: "显示皮肤" }).getAttribute("aria-pressed")).toBe("true");
  fireEvent.change(screen.getByRole("slider", { name: "皮肤不透明度" }), { target: { value: "35" } });
  expect(methods.setSkinOpacity).toHaveBeenLastCalledWith(.35);
  fireEvent.click(screen.getByRole("button", { name: "显示皮肤" }));
  expect(methods.setEnvelope).toHaveBeenLastCalledWith(false);
  expect(screen.queryByRole("slider")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "显示皮肤" }));
  expect((screen.getByRole("slider") as HTMLInputElement).value).toBe("35");
  fireEvent.click(screen.getByRole("button", { name: "单独查看所选" }));
  expect(methods.setIsolate).toHaveBeenLastCalledWith(true);
  expect(methods.setEnvelope).toHaveBeenLastCalledWith(false);
  await act(async () => {});
});
