"use client";
import { publicPath } from "../lib/public-path";
import { useEffect, useRef, useState } from "react";
import {
  Box,
  Bone,
  Eye,
  Expand,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { bodyModelIds } from "../lib/three/body-layout";
import type { BodyViewer } from "../lib/three/body-viewer";
import type { OrganId } from "../lib/anatomy-data";

type Props = {
  selectedId: string;
  selectedName: string;
  visibleIds: string[];
  onSelect: (id: string) => void;
  onExplore: (id: string) => void;
};
export function BodyAtlas({
  selectedId,
  selectedName,
  visibleIds,
  onSelect,
  onExplore,
}: Props) {
  const mount = useRef<HTMLDivElement>(null);
  const viewer = useRef<BodyViewer | null>(null);
  const callback = useRef(onSelect);
  const selection = useRef({ selectedId, visibleIds });
  const [progress, setProgress] = useState({
    loaded: 0,
    total: bodyModelIds.length,
  });
  const [error, setError] = useState("");
  const [failed, setFailed] = useState<string[]>([]);
  const [envelope, setEnvelope] = useState(true);
  const [skeleton, setSkeleton] = useState(true);
  const [rotating, setRotating] = useState(false);
  const [isolate, setIsolate] = useState(false);
  const [spread, setSpread] = useState(false);
  const [retry, setRetry] = useState(0);
  const hasModel = bodyModelIds.includes(selectedId as OrganId);
  const canIsolate = hasModel || selectedId === "bones";
  useEffect(() => {
    callback.current = onSelect;
    selection.current = { selectedId, visibleIds };
    viewer.current?.select(
      selectedId,
      visibleIds.length === 20 ? null : visibleIds,
    );
  }, [onSelect, selectedId, visibleIds]);
  useEffect(() => {
    let cancelled = false;
    let instance: BodyViewer | null = null;
    void import("../lib/three/body-viewer")
      .then(({ BodyViewer }) => {
        if (cancelled || !mount.current) return;
        try {
          instance = new BodyViewer(mount.current, {
            onSelect: (id) => callback.current(id),
            onProgress: (loaded, total) => setProgress({ loaded, total }),
            onError: (ids) =>
              setFailed((previous) => [...new Set([...previous, ...ids])]),
          });
          viewer.current = instance;
          instance.select(
            selection.current.selectedId,
            selection.current.visibleIds.length === 20
              ? null
              : selection.current.visibleIds,
          );
        } catch {
          setError(
            "3D 视图暂时无法启动。请确认浏览器已启用 WebGL，或重试加载。",
          );
        }
      })
      .catch(() => {
        if (!cancelled) setError("3D 组件加载失败，请检查网络后重试。");
      });
    return () => {
      cancelled = true;
      instance?.dispose();
      viewer.current = null;
    };
  }, [retry]);
  useEffect(() => {
    viewer.current?.setEnvelope(envelope);
  }, [envelope]);
  useEffect(() => {
    viewer.current?.setSkeleton(skeleton);
  }, [skeleton]);
  useEffect(() => {
    viewer.current?.setRotate(rotating);
  }, [rotating]);
  useEffect(() => {
    viewer.current?.setIsolate(isolate && canIsolate);
  }, [isolate, canIsolate, selectedId]);
  useEffect(() => {
    viewer.current?.setSpread(spread);
  }, [spread, progress.loaded]);
  const restart = () => {
    setError("");
    setFailed([]);
    setProgress({ loaded: 0, total: bodyModelIds.length });
    setEnvelope(true);
    setSkeleton(true);
    setRotating(false);
    setIsolate(false);
    setSpread(false);
    setRetry((n) => n + 1);
  };
  return (
    <section className="aa-panel aa-body-stage" aria-label="人体整体三维视图">
      <div className="aa-body-stage-heading">
        <div>
          <span className="aa-eyebrow">人体结构 · 整体与局部</span>
          <h2>看见身体里的联系</h2>
        </div>
        <span className="aa-3d-badge">
          <Box size={13} /> LIVE 3D
        </span>
      </div>
      <div className="aa-body-camera" aria-label="观察方向">
        {[
          ["front", "正面"],
          ["side", "侧面"],
          ["back", "背面"],
        ].map(([view, label]) => (
          <button
            key={view}
            onClick={() => {
              viewer.current?.reset(view as "front" | "side" | "back");
              setRotating(false);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div ref={mount} className="aa-body-canvas" />
      <div className="aa-body-reading">
        <span>正在观察</span>
        <strong>{selectedName}</strong>
        {hasModel && (
          <button
            className="aa-body-open"
            onClick={() => onExplore(selectedId)}
          >
            进入器官 3D →
          </button>
        )}
        <small>
          {selectedId === "bones" ? "完整骨骼层 · 可旋转与单独查看" : hasModel
            ? "与 Explore 共享原始器官模型"
            : "此结构暂无整体视图模型，可阅读右侧知识卡"}
        </small>
      </div>
      {!error && progress.loaded < progress.total && (
        <div className="aa-model-loading" role="status">
          <span className="aa-loading-orbit" />
          <div>
            <strong>正在组合人体器官</strong>
            <small>
              加载原库模型 · {progress.loaded} / {progress.total}
            </small>
            <progress value={progress.loaded} max={progress.total} />
          </div>
        </div>
      )}
      {error && (
        <div className="aa-model-error" role="alert">
          <p>{error}</p>
          <button className="aa-button" onClick={restart}>
            重新加载
          </button>
        </div>
      )}
      {!!failed.length && (
        <div className="aa-model-error" role="alert">
          <p>{failed.length} 个模型加载失败，其他模型可继续使用。</p>
          <button className="aa-button" onClick={restart}>
            重新加载模型
          </button>
        </div>
      )}
      <div className="aa-body-tools">
        <button
          title="显示骨骼"
          aria-label="显示骨骼"
          aria-pressed={skeleton}
          onClick={() => setSkeleton(!skeleton)}
        >
          <Bone size={17} />
        </button>
        <button
          title="显示身体轮廓"
          aria-label="显示身体轮廓"
          aria-pressed={envelope}
          onClick={() => setEnvelope(!envelope)}
        >
          <Eye size={17} />
        </button>
        <button
          title="自动旋转"
          aria-label="自动旋转"
          aria-pressed={rotating}
          onClick={() => setRotating(!rotating)}
        >
          <RotateCw size={17} />
        </button>
        <button
          title="放大"
          aria-label="放大整体模型"
          onClick={() => viewer.current?.zoom(0.85)}
        >
          <ZoomIn size={17} />
        </button>
        <button
          title="缩小"
          aria-label="缩小整体模型"
          onClick={() => viewer.current?.zoom(1.15)}
        >
          <ZoomOut size={17} />
        </button>
        <button
          title="复位"
          aria-label="复位整体模型"
          onClick={() => {
            viewer.current?.reset();
            setRotating(false);
            setIsolate(false);
            setSpread(false);
          }}
        >
          <RotateCcw size={17} />
        </button>
      </div>
      <div className="aa-body-bottom">
        <div className="aa-body-modes">
          <button
            aria-pressed={isolate}
            disabled={!canIsolate}
            onClick={() => setIsolate(!isolate)}
          >
            <Box size={14} />
            {isolate ? "显示全部器官" : "单独查看所选"}
          </button>
          <button aria-pressed={spread} onClick={() => setSpread(!spread)}>
            <Expand size={14} />
            {spread ? "回到解剖位置" : "展开器官关系"}
          </button>
        </div>
        <p>
          {spread
            ? "当前为展开视图：器官已移开以便观察，非真实解剖位置。"
            : "拖动旋转 · 滚轮缩放 · 点击器官选择"}
        </p>
      </div>
      <div className="aa-body-caption">
        器官与 Explore 共享模型；骨骼、器官和真人比例轮廓可分层观察。
        <a href={publicPath("/licenses/skeleton.md")} target="_blank" rel="noreferrer">骨骼：Open3Dmodel · CC BY-SA 4.0</a>
      </div>
    </section>
  );
}
