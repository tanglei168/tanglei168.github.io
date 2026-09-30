"use client";
import { publicPath } from "../lib/public-path";

import { lazy, Suspense, useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Bookmark,
  BrainCircuit,
  Check,
  Compass,
  Download,
  LibraryBig,
  Map,
  NotebookPen,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
const AnatomyApp = lazy(() =>
  import("./AnatomyApp").then((module) => ({ default: module.AnatomyApp })),
);
import type { LocaleConfig } from "../i18n/config";
import type { Dictionary } from "../i18n/types";
import { BodyAtlas } from "./BodyAtlas";
import type { OrganId } from "../lib/anatomy-data";
import {
  atlas,
  systems,
  chains,
  lessons,
  resources,
  sources,
  emptyLearningState,
  parseLearningState,
  type ModuleId,
  type LearningState,
  type Note,
  type Chain,
} from "../lib/learning-data";

const tabs = [
  { id: "overview", label: "人体总览", en: "Overview", icon: Map },
  { id: "explore", label: "器官探索", en: "Explore", icon: Compass },
  { id: "systems", label: "身体系统", en: "Systems", icon: BrainCircuit },
  { id: "lessons", label: "学习路径", en: "Lessons", icon: BookOpen },
  { id: "library", label: "知识资源", en: "Library", icon: LibraryBig },
  { id: "notes", label: "我的笔记", en: "Notes", icon: NotebookPen },
] as const;
const storageKey = "anatomy-atelier:learning:v1";
const organName = (id: string) => atlas.find((o) => o.id === id)?.name ?? id;
const systemName = (id: string) => systems.find((s) => s.id === id)?.name ?? id;

function SourceLinks({ ids }: { ids: string[] }) {
  return (
    <div className="aa-sources">
      <small>参考来源</small>
      {ids.map((id) => {
        const s = sources.find((s) => s.id === id);
        return (
          s && (
            <a key={id} href={s.url} target="_blank" rel="noreferrer">
              {s.title} ↗
            </a>
          )
        );
      })}
    </div>
  );
}
function ChainView({
  chain,
  onOrgan,
}: {
  chain: Chain;
  onOrgan: (id: string) => void;
}) {
  return (
    <div className="aa-chain">
      <p>{chain.summary}</p>
      <ol>
        {chain.relations.map((edge, i) => (
          <li key={`${edge.from}-${edge.to}-${i}`}>
            <button onClick={() => onOrgan(edge.from)}>
              {organName(edge.from)}
            </button>
            <span>
              <small>
                {edge.kind === "control"
                  ? "神经控制"
                  : edge.kind === "support"
                    ? "功能协作"
                    : "物质运输"}
              </small>
              {edge.label}
              <ArrowRight size={15} />
            </span>
            <button onClick={() => onOrgan(edge.to)}>
              {organName(edge.to)}
            </button>
          </li>
        ))}
      </ol>
      <SourceLinks ids={chain.sourceIds} />
    </div>
  );
}

export function LearningApp({
  locale,
  dictionary,
}: {
  locale: LocaleConfig;
  dictionary: Dictionary;
}) {
  const [module, setModule] = useState<ModuleId>("overview");
  const [organId, setOrganId] = useState<OrganId>("heart");
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("全部区域");
  const [systemFilter, setSystemFilter] = useState("all");
  const [atlasId, setAtlasId] = useState("heart");
  const [chainId, setChainId] = useState("oxygen");
  const [lessonId, setLessonId] = useState("body-map");
  const [answer, setAnswer] = useState<number | null>(null);
  const [resourceType, setResourceType] = useState("all");
  const [savedOnly, setSavedOnly] = useState(false);
  const [resourceId, setResourceId] = useState<string | null>(null);
  const [state, setState] = useState<LearningState>(emptyLearningState);
  const [ready, setReady] = useState(false);
  const [storageBlocked, setStorageBlocked] = useState(false);
  const [notice, setNotice] = useState("");
  const [draft, setDraft] = useState<Note | null>(null);
  const [archived, setArchived] = useState(false);
  const [noteKind, setNoteKind] = useState("all");
  const [replacing, setReplacing] = useState<LearningState | null>(null);
  const [dirty, setDirty] = useState(false);

  // One-time hydration from browser storage must follow SSR; keep the server snapshot stable.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setState(parseLearningState(raw));
    } catch {
      setStorageBlocked(true);
      setNotice("无法读取本地数据。当前更改只保留在本次会话，请导出备份。");
    }
    setReady(true);
    const sync = () => {
      let parts: string[];
      try {
        parts = location.hash
          .slice(1)
          .split("/")
          .map((x) => decodeURIComponent(x));
      } catch {
        setModule("overview");
        return;
      }
      const [section, id = ""] = parts;
      if (tabs.some((t) => t.id === section)) {
        setModule(section as ModuleId);
        setQuery("");
        if (section === "overview" && atlas.some((o) => o.id === id))
          setAtlasId(id);
        if (section === "lessons" && lessons.some((l) => l.id === id)) {
          setLessonId(id);
          setAnswer(null);
        }
        if (section === "systems")
          setSystemFilter(systems.some((s) => s.id === id) ? id : "all");
        if (section === "library")
          setResourceId(resources.some((r) => r.id === id) ? id : null);
        if (section === "explore") {
          const o = atlas.find((o) => o.id === id);
          if (o?.modelId) setOrganId(o.modelId);
        }
      } else {
        setModule("overview");
      }
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  useEffect(() => {
    if (!ready || storageBlocked) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      setStorageBlocked(true);
      setNotice("浏览器未能保存数据，请导出备份；关闭页面会丢失当前更改。");
    }
  }, [state, ready, storageBlocked]);
  /* eslint-enable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const go = (next: ModuleId, id = "") => {
    setModule(next);
    setQuery("");
    setAnswer(null);
    if (next === "overview" && id) setAtlasId(id);
    if (next === "systems") setSystemFilter(id || "all");
    if (next === "lessons" && id) setLessonId(id);
    if (next === "library") setResourceId(id || null);
    location.hash = `${next}${id ? "/" + encodeURIComponent(id) : ""}`;
  };
  const explore = (id: string) => {
    const organ = atlas.find((o) => o.id === id);
    if (organ?.modelId) {
      setOrganId(organ.modelId);
      go("explore", id);
    } else go("overview", id);
  };
  const toggleSave = (id: string) => {
    setState((prev) => ({
      ...prev,
      savedIds: prev.savedIds.includes(id)
        ? prev.savedIds.filter((s) => s !== id)
        : [...prev.savedIds, id],
    }));
  };
  const newNote = (id: string | null = null, title = "") => {
    if (dirty) {
      setNotice("请先保存或放弃当前笔记草稿，再新建笔记。");
      go("notes");
      return;
    }
    const now = new Date().toISOString();
    setDraft({
      id: crypto.randomUUID(),
      title,
      body: "",
      kind: "理解",
      resourceId: id,
      tags: [],
      createdAt: now,
      updatedAt: now,
      archived: false,
    });
    setDirty(false);
    go("notes");
  };
  const saveNote = () => {
    if (!draft || !draft.title.trim() || !draft.body.trim()) {
      setNotice("请填写笔记标题和内容。");
      return;
    }
    const note = {
      ...draft,
      title: draft.title.trim(),
      body: draft.body.trim(),
      tags: [...new Set(draft.tags.map((t) => t.trim()).filter(Boolean))],
      updatedAt: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      notes: [note, ...prev.notes.filter((n) => n.id !== note.id)],
    }));
    setDraft(note);
    setDirty(false);
    setNotice("笔记已保存。");
  };
  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `人体结构-学习记录-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const activeOrgan = atlas.find((o) => o.id === atlasId)!;
  const activeSystem = systems.find((s) => s.id === systemFilter);
  const activeLesson = lessons.find((l) => l.id === lessonId)!;
  const activeResource = resources.find((r) => r.id === resourceId);
  const selectedChain = chains.find((c) => c.id === chainId)!;
  const matches = (text: string) =>
    text.toLowerCase().includes(query.trim().toLowerCase());
  const filteredAtlas = atlas.filter(
    (o) =>
      (region === "全部区域" || o.region === region) &&
      (systemFilter === "all" || o.systems.includes(systemFilter)) &&
      matches(
        `${o.name} ${o.en} ${o.location} ${o.systems.map(systemName).join(" ")}`,
      ),
  );
  const relatedChains = chains.filter((c) =>
    c.relations.some(
      (e) => e.from === activeOrgan.id || e.to === activeOrgan.id,
    ),
  );
  const visibleResources = resources.filter(
    (r) =>
      (resourceType === "all" || r.type === resourceType) &&
      (!savedOnly || state.savedIds.includes(r.id)) &&
      matches(`${r.title} ${r.summary} ${r.tags.join(" ")}`),
  );
  const visibleNotes = state.notes.filter(
    (n) =>
      n.archived === archived &&
      (noteKind === "all" || n.kind === noteKind) &&
      matches(`${n.title} ${n.body} ${n.tags.join(" ")}`),
  );
  const prereqsMet = activeLesson.prerequisites.every((id) =>
    state.completedIds.includes(id),
  );
  const chooseLesson = (id: string) => {
    setLessonId(id);
    setAnswer(null);
    go("lessons", id);
  };
  const saveButton = (id: string) => (
    <button
      className={`aa-button ${state.savedIds.includes(id) ? "selected" : ""}`}
      disabled={!ready}
      aria-pressed={state.savedIds.includes(id)}
      onClick={() => toggleSave(id)}
    >
      <Bookmark size={15} />
      {state.savedIds.includes(id) ? "已收藏" : "收藏知识卡"}
    </button>
  );

  return (
    <main className="app-shell aa-shell">
      <header className="topbar aa-topbar">
        <button className="brand" onClick={() => go("overview")}>
          <strong>
            人体结构<sup>✦</sup>
          </strong>
          <em>一场关于身体的探索</em>
        </button>
        <nav className="main-nav" aria-label="Primary navigation">
          {tabs.map((t) => (
            <button
              key={t.id}
              aria-label={`${t.en} ${t.label}`}
              className={module === t.id ? "active" : ""}
              aria-current={module === t.id ? "page" : undefined}
              onClick={() => go(t.id)}
            >
              <t.icon size={16} />
              <span>
                {t.en}
                <small>{t.label}</small>
              </span>
            </button>
          ))}
        </nav>
        <span className="aa-edition">
          FIELD GUIDE <b>01</b>
        </span>
      </header>
      {notice && (
        <div role="status" className="aa-notice">
          {notice}
          <button onClick={() => setNotice("")} aria-label="关闭提示">
            ×
          </button>
        </div>
      )}
      {module === "explore" ? (
        <>
          <div className="aa-explore-link">
            <button onClick={() => go("overview", organId)}>
              ← 回到人体地图
            </button>
            <button onClick={() => newNote(`organ:${organId}`)}>
              记录探索笔记 <NotebookPen size={14} />
            </button>
            <button onClick={() => go("library", `organ:${organId}`)}>
              查看知识卡 →
            </button>
          </div>
          <Suspense
            fallback={
              <div className="aa-empty" role="status">
                正在准备 3D 探索…
              </div>
            }
          >
            <AnatomyApp
              key={organId}
              locale={locale}
              dictionary={dictionary}
              initialOrgan={organId}
              onOrganChange={setOrganId}
              onNavigate={(next, id) =>
                go(
                  next,
                  id ??
                    (next === "systems"
                      ? (atlas.find((o) => o.id === organId)?.systems[0] ?? "")
                      : next === "lessons"
                        ? (lessons.find(
                            (l) => l.chainId && l.organIds.includes(organId),
                          )?.id ?? "body-map")
                        : ""),
                )
              }
            />
          </Suspense>
        </>
      ) : (
        <div className="aa-page" lang="zh-CN">
          <div className="aa-heading">
            <div>
              <span className="aa-eyebrow">
                THE HUMAN BODY ·{" "}
                {tabs.findIndex((t) => t.id === module) + 1 < 10 ? "0" : ""}
                {tabs.findIndex((t) => t.id === module) + 1}
              </span>
              <h1>
                {
                  {
                    overview: "从整体，看见每一部分。",
                    systems: "每个系统，都有伙伴。",
                    lessons: "把好奇，变成理解。",
                    library: "值得留下的身体知识。",
                    notes: "让知识成为自己的。",
                  }[module]
                }
              </h1>
              <p>
                {
                  {
                    overview: "先找到器官在哪里，再理解它们如何一起工作。",
                    systems: "按功能建立联系，沿着一条真实的协作路径探索身体。",
                    lessons:
                      "从人体地图出发，经过系统协作，建立可解释的知识体系。",
                    library:
                      "器官知识卡、协作链路与参考原文。收藏是索引，理解写进笔记。",
                    notes:
                      "记录理解、保留问题、安排复习。笔记关联到知识卡，方便回到上下文。",
                  }[module]
                }
              </p>
            </div>
            <label className="aa-search">
              <Search size={17} />
              <input
                aria-label="搜索当前模块"
                placeholder={
                  module === "notes" ? "搜索标题、正文、标签…" : "搜索当前模块…"
                }
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
          </div>

          {module === "overview" && (
            <>
              <div className="aa-overview-layout">
                <aside className="aa-panel aa-index">
                  <div className="aa-panel-title">
                    身体索引{" "}
                    <small>
                      {filteredAtlas.length} / {atlas.length}
                    </small>
                  </div>
                  <label className="aa-field">
                    身体区域
                    <select
                      value={region}
                      onChange={(e) => {
                        const value = e.target.value;
                        setRegion(value);
                        const first = atlas.find(
                          (o) =>
                            (value === "全部区域" || o.region === value) &&
                            (systemFilter === "all" ||
                              o.systems.includes(systemFilter)),
                        );
                        if (
                          first &&
                          value !== "全部区域" &&
                          activeOrgan.region !== value
                        )
                          setAtlasId(first.id);
                      }}
                    >
                      {["全部区域", "头颈", "胸部", "腹部", "盆腔", "全身"].map(
                        (r) => (
                          <option key={r}>{r}</option>
                        ),
                      )}
                    </select>
                  </label>
                  <label className="aa-field">
                    所属系统
                    <select
                      value={systemFilter}
                      onChange={(e) => {
                        const value = e.target.value;
                        setSystemFilter(value);
                        const first = atlas.find(
                          (o) =>
                            (value === "all" || o.systems.includes(value)) &&
                            (region === "全部区域" || o.region === region),
                        );
                        if (
                          first &&
                          value !== "all" &&
                          !activeOrgan.systems.includes(value)
                        )
                          setAtlasId(first.id);
                      }}
                    >
                      <option value="all">全部系统</option>
                      {systems.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="aa-organ-list">
                    {filteredAtlas.map((o) => (
                      <button
                        key={o.id}
                        aria-pressed={atlasId === o.id}
                        className={atlasId === o.id ? "selected" : ""}
                        onClick={() => {
                          setAtlasId(o.id);
                          go("overview", o.id);
                        }}
                      >
                        <span>
                          {o.name}
                          <small>{o.en}</small>
                        </span>
                        <small>{o.region}</small>
                      </button>
                    ))}
                    {!filteredAtlas.length && (
                      <p className="aa-empty">
                        没有匹配的结构。请调整区域、系统或搜索词。
                      </p>
                    )}
                  </div>
                </aside>
                <BodyAtlas
                  selectedId={atlasId}
                  selectedName={activeOrgan.name}
                  onExplore={explore}
                  visibleIds={filteredAtlas.map((o) => o.id)}
                  onSelect={(id) => go("overview", id)}
                />
                <aside className="aa-panel aa-organ-detail">
                  <span className="aa-eyebrow">
                    {activeOrgan.region} · ORGAN FIELD NOTE
                  </span>
                  <h2>
                    {activeOrgan.name}
                    <em>{activeOrgan.en}</em>
                  </h2>
                  {activeOrgan.modelId &&
                    ["heart", "brain", "lungs", "liver", "kidneys"].includes(
                      activeOrgan.id,
                    ) && (
                      <img
                        className="aa-organ-art"
                        src={publicPath(`/anatomy/${activeOrgan.modelId}/organ.webp`)}
                        alt={`${activeOrgan.name}插画`}
                      />
                    )}
                  <h3>在哪里</h3>
                  <p>{activeOrgan.location}</p>
                  <h3>做什么</h3>
                  <p>{activeOrgan.role}</p>
                  <h3>属于哪些系统</h3>
                  <div className="aa-chips">
                    {activeOrgan.systems.map((id) => (
                      <button
                        key={id}
                        className="aa-chip"
                        onClick={() => go("systems", id)}
                      >
                        {systemName(id)} ↗
                      </button>
                    ))}
                  </div>
                  <h3>与谁协作</h3>
                  {relatedChains.length ? (
                    relatedChains.map((c) => (
                      <button
                        key={c.id}
                        className="aa-text-link"
                        onClick={() => {
                          setChainId(c.id);
                          go("systems");
                        }}
                      >
                        {c.title}
                        <ArrowRight size={15} />
                      </button>
                    ))
                  ) : (
                    <p>从所属系统了解其功能伙伴。</p>
                  )}
                  <div className="aa-actions">
                    {activeOrgan.modelId && (
                      <button
                        className="aa-button primary"
                        onClick={() => explore(activeOrgan.id)}
                      >
                        探索 3D 器官 <ArrowRight size={15} />
                      </button>
                    )}
                    {saveButton(`organ:${activeOrgan.id}`)}
                    <button
                      className="aa-button"
                      onClick={() => newNote(`organ:${activeOrgan.id}`)}
                    >
                      写笔记
                    </button>
                  </div>
                  <SourceLinks ids={["organization", "position"]} />
                </aside>
              </div>
              <div className="aa-start">
                <Sparkles size={23} />
                <div>
                  <h3>第一次来？先认识身体的地图。</h3>
                  <p>6 分钟，建立空间位置与系统归属的基本概念。</p>
                </div>
                <button
                  className="aa-button primary"
                  onClick={() => chooseLesson("body-map")}
                >
                  开始第一课 <ArrowRight size={16} />
                </button>
              </div>
            </>
          )}

          {module === "systems" && (
            <>
              <div className="aa-system-grid">
                {systems
                  .filter((s) => matches(`${s.name} ${s.en} ${s.role}`))
                  .map((s) => (
                    <button
                      className={`aa-panel aa-system-card ${systemFilter === s.id ? "selected" : ""}`}
                      key={s.id}
                      onClick={() => go("systems", s.id)}
                      aria-pressed={systemFilter === s.id}
                    >
                      <span style={{ color: s.color }}>◈</span>
                      <div>
                        <small>{s.en}</small>
                        <h2>{s.name}</h2>
                        <p>{s.role}</p>
                      </div>
                      <ArrowRight size={17} />
                    </button>
                  ))}
              </div>
              {!systems.some((s) => matches(`${s.name} ${s.en} ${s.role}`)) && (
                <p className="aa-empty">没有匹配的系统。</p>
              )}
              {activeSystem && (
                <section className="aa-panel aa-system-detail">
                  <h2>{activeSystem.name}</h2>
                  <p>{activeSystem.role}</p>
                  <h3>主要结构</h3>
                  <div className="aa-chips">
                    {atlas
                      .filter((o) => o.systems.includes(activeSystem.id))
                      .map((o) => (
                        <button
                          className="aa-chip"
                          key={o.id}
                          onClick={() => go("overview", o.id)}
                        >
                          {o.name} · {o.region} ↗
                        </button>
                      ))}
                  </div>
                  <h3>功能伙伴</h3>
                  <div className="aa-chips">
                    {activeSystem.partners.map((id) => (
                      <button
                        className="aa-chip"
                        key={id}
                        onClick={() => go("systems", id)}
                      >
                        {systemName(id)} ↗
                      </button>
                    ))}
                  </div>
                  <SourceLinks ids={["organization"]} />
                </section>
              )}
              <div className="aa-section-title">
                <div>
                  <span className="aa-eyebrow">CONNECTED, NOT ISOLATED</span>
                  <h2>身体如何一起工作</h2>
                </div>
                <span className="aa-muted">4 条跨系统协作链路</span>
              </div>
              <div className="aa-chain-layout">
                <aside className="aa-panel aa-chain-tabs">
                  {chains.map((c) => (
                    <button
                      key={c.id}
                      className={c.id === chainId ? "selected" : ""}
                      onClick={() => setChainId(c.id)}
                      aria-pressed={c.id === chainId}
                    >
                      <h3>{c.title}</h3>
                      <p>{c.question}</p>
                    </button>
                  ))}
                </aside>
                <section className="aa-panel aa-chain-detail">
                  <h2>{selectedChain.title}</h2>
                  <ChainView
                    chain={selectedChain}
                    onOrgan={(id) => go("overview", id)}
                  />
                  <div className="aa-actions">
                    {saveButton(`chain:${selectedChain.id}`)}
                    <button
                      className="aa-button"
                      onClick={() => newNote(`chain:${selectedChain.id}`)}
                    >
                      记录我的理解
                    </button>
                    <button
                      className="aa-button primary"
                      onClick={() =>
                        chooseLesson(
                          lessons.find((l) => l.chainId === selectedChain.id)!
                            .id,
                        )
                      }
                    >
                      进入对应课程 <ArrowRight size={15} />
                    </button>
                  </div>
                </section>
              </div>
            </>
          )}

          {module === "lessons" && (
            <>
              <div className="aa-progress">
                <span>
                  {
                    state.completedIds.filter((id) =>
                      lessons.some((l) => l.id === id),
                    ).length
                  }{" "}
                  / {lessons.length} 节已完成
                </span>
                <progress
                  max={lessons.length}
                  value={
                    state.completedIds.filter((id) =>
                      lessons.some((l) => l.id === id),
                    ).length
                  }
                />
                <small>整体认识 → 系统协作 → 整合应用</small>
              </div>
              <div className="aa-lesson-layout">
                <aside className="aa-panel aa-lesson-list">
                  {lessons
                    .filter((l) =>
                      matches(
                        `${l.title} ${l.stage} ${l.objectives.join(" ")}`,
                      ),
                    )
                    .map((l) => (
                      <button
                        key={l.id}
                        className={lessonId === l.id ? "selected" : ""}
                        onClick={() => chooseLesson(l.id)}
                      >
                        <small>
                          {l.stage} · {l.minutes} 分钟
                        </small>
                        <h3>{l.title}</h3>
                        <span>
                          {state.completedIds.includes(l.id)
                            ? "✓ 已完成"
                            : l.prerequisites.every((id) =>
                                  state.completedIds.includes(id),
                                )
                              ? "可以开始"
                              : "建议先完成前置课程"}
                        </span>
                      </button>
                    ))}
                  {!lessons.some((l) =>
                    matches(`${l.title} ${l.stage} ${l.objectives.join(" ")}`),
                  ) && <p className="aa-empty">没有匹配的课程。</p>}
                </aside>
                <article className="aa-panel aa-lesson">
                  <span className="aa-eyebrow">
                    {activeLesson.stage} · {activeLesson.minutes} MIN
                  </span>
                  <h2>{activeLesson.title}</h2>
                  <div className="aa-objectives">
                    <h3>学完后，你将能够</h3>
                    <ul>
                      {activeLesson.objectives.map((o) => (
                        <li key={o}>{o}</li>
                      ))}
                    </ul>
                  </div>
                  {!prereqsMet && (
                    <div className="aa-prerequisites">
                      可以预览本课；完成前请先学习：
                      {activeLesson.prerequisites
                        .filter((id) => !state.completedIds.includes(id))
                        .map((id) => (
                          <button key={id} onClick={() => chooseLesson(id)}>
                            {lessons.find((l) => l.id === id)!.title} ↗
                          </button>
                        ))}
                    </div>
                  )}
                  {activeLesson.paragraphs.map((p, i) => (
                    <section key={p.title}>
                      <span className="aa-eyebrow">0{i + 1}</span>
                      <h3>{p.title}</h3>
                      <p>{p.body}</p>
                    </section>
                  ))}
                  <div className="aa-chips">
                    {activeLesson.organIds.map((id) => (
                      <button
                        className="aa-chip"
                        key={id}
                        onClick={() => go("overview", id)}
                      >
                        {organName(id)} · 定位 ↗
                      </button>
                    ))}
                  </div>
                  {activeLesson.chainId && (
                    <ChainView
                      chain={chains.find((c) => c.id === activeLesson.chainId)!}
                      onOrgan={(id) => go("overview", id)}
                    />
                  )}
                  <fieldset className="aa-quiz">
                    <legend>检查一下理解</legend>
                    <h3>{activeLesson.quiz.question}</h3>
                    {activeLesson.quiz.options.map((option, i) => (
                      <label key={option}>
                        <input
                          type="radio"
                          name={activeLesson.id}
                          checked={answer === i}
                          onChange={() => setAnswer(i)}
                        />
                        {option}
                      </label>
                    ))}
                    {answer !== null && (
                      <p
                        role="status"
                        className={
                          answer === activeLesson.quiz.answer
                            ? "aa-correct"
                            : "aa-retry"
                        }
                      >
                        {answer === activeLesson.quiz.answer
                          ? "✓ 回答正确。"
                          : "再想一想。"}
                        {activeLesson.quiz.explanation}
                      </p>
                    )}
                  </fieldset>
                  <div className="aa-actions">
                    <button
                      className="aa-button primary"
                      disabled={
                        !ready ||
                        !prereqsMet ||
                        answer !== activeLesson.quiz.answer
                      }
                      onClick={() => {
                        setState((prev) => ({
                          ...prev,
                          completedIds: [
                            ...new Set([...prev.completedIds, activeLesson.id]),
                          ],
                        }));
                        setNotice(
                          "本课已完成。可以继续下一课，或记录自己的理解。",
                        );
                      }}
                    >
                      <Check size={16} />
                      {state.completedIds.includes(activeLesson.id)
                        ? "已完成 · 再次巩固"
                        : "完成本课"}
                    </button>
                    <button
                      className="aa-button"
                      onClick={() =>
                        newNote(
                          activeLesson.chainId
                            ? `chain:${activeLesson.chainId}`
                            : null,
                          `学习笔记 · ${activeLesson.title}`,
                        )
                      }
                    >
                      写学习笔记
                    </button>
                    {lessons.indexOf(activeLesson) < lessons.length - 1 && (
                      <button
                        className="aa-button"
                        onClick={() =>
                          chooseLesson(
                            lessons[lessons.indexOf(activeLesson) + 1].id,
                          )
                        }
                      >
                        下一课 →
                      </button>
                    )}
                  </div>
                  <SourceLinks ids={activeLesson.sourceIds} />
                </article>
              </div>
            </>
          )}

          {module === "library" && (
            <>
              <div className="aa-filterbar">
                <div className="aa-chips">
                  {[
                    ["all", "全部资源"],
                    ["organ", "器官知识卡"],
                    ["chain", "协作链路"],
                    ["reference", "参考原文"],
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      className={`aa-chip ${resourceType === id ? "selected" : ""}`}
                      onClick={() => setResourceType(id)}
                      aria-pressed={resourceType === id}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <label>
                  <input
                    type="checkbox"
                    checked={savedOnly}
                    onChange={(e) => setSavedOnly(e.target.checked)}
                  />{" "}
                  只看我的收藏（{state.savedIds.length}）
                </label>
              </div>
              <p className="aa-muted">
                {visibleResources.length} 项资源 · 知识内容版本 1 ·
                参考资料核对于 2026-09-16
              </p>
              {activeResource && (
                <article className="aa-panel aa-resource-detail">
                  <button
                    className="aa-text-link"
                    onClick={() => go("library")}
                  >
                    ← 关闭详情
                  </button>
                  <span className="aa-eyebrow">
                    RESOURCE · V{activeResource.version}
                  </span>
                  <h2>{activeResource.title}</h2>
                  <p>{activeResource.summary}</p>
                  {activeResource.type === "chain" && (
                    <ChainView
                      chain={chains.find(
                        (c) => c.id === activeResource.entityId,
                      )!}
                      onOrgan={(id) => go("overview", id)}
                    />
                  )}
                  <div className="aa-actions">
                    {saveButton(activeResource.id)}
                    <button
                      className="aa-button"
                      onClick={() => newNote(activeResource.id)}
                    >
                      写关联笔记
                    </button>
                    {activeResource.type === "organ" && (
                      <button
                        className="aa-button primary"
                        onClick={() => go("overview", activeResource.entityId)}
                      >
                        在身体上定位 →
                      </button>
                    )}
                  </div>
                  <SourceLinks ids={activeResource.sourceIds} />
                </article>
              )}
              <div className="aa-resource-grid">
                {visibleResources.map((r) => (
                  <article className="aa-panel aa-resource-card" key={r.id}>
                    <div className="aa-resource-top">
                      <span className="aa-eyebrow">
                        {r.type === "organ"
                          ? "ORGAN CARD"
                          : r.type === "chain"
                            ? "CONNECTION"
                            : "REFERENCE"}
                      </span>
                      <button
                        aria-label={`${state.savedIds.includes(r.id) ? "取消收藏" : "收藏"}${r.title}`}
                        aria-pressed={state.savedIds.includes(r.id)}
                        disabled={!ready}
                        className="aa-icon-button"
                        onClick={() => toggleSave(r.id)}
                      >
                        <Bookmark
                          size={18}
                          fill={
                            state.savedIds.includes(r.id)
                              ? "currentColor"
                              : "none"
                          }
                        />
                      </button>
                    </div>
                    <h2>{r.title}</h2>
                    <p>{r.summary}</p>
                    <div className="aa-chips">
                      {r.tags.map((t) => (
                        <span key={t} className="aa-chip">
                          {t}
                        </span>
                      ))}
                    </div>
                    <button
                      className="aa-text-link"
                      onClick={() => go("library", r.id)}
                    >
                      查看知识卡 <ArrowRight size={16} />
                    </button>
                  </article>
                ))}
              </div>
              {!visibleResources.length && (
                <div className="aa-panel aa-empty">
                  <LibraryBig size={30} />
                  <h2>
                    {savedOnly ? "还没有符合条件的收藏" : "没有找到相关资源"}
                  </h2>
                  <p>尝试调整搜索或资源类型，也可以从器官卡点击收藏。</p>
                  <button
                    className="aa-button"
                    onClick={() => {
                      setQuery("");
                      setResourceType("all");
                      setSavedOnly(false);
                    }}
                  >
                    查看全部资源
                  </button>
                </div>
              )}
            </>
          )}

          {module === "notes" && (
            <>
              <div className="aa-filterbar">
                <div className="aa-actions">
                  <button
                    className="aa-button primary"
                    disabled={!ready}
                    onClick={() => newNote()}
                  >
                    <Plus size={16} />
                    新建笔记
                  </button>
                  <button
                    className="aa-button"
                    disabled={!ready}
                    onClick={exportData}
                  >
                    <Download size={15} />
                    导出全部学习数据
                  </button>
                  <label className="aa-button">
                    导入备份
                    <input
                      type="file"
                      accept="application/json,.json"
                      disabled={!ready}
                      className="aa-file-input"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            if (file.size > 5_000_000)
                              throw new Error("文件超过 5 MB");
                            setReplacing(parseLearningState(await file.text()));
                          } catch {
                            setNotice(
                              "无法导入：请使用本应用导出的 v1 JSON 备份（不超过 5 MB）。",
                            );
                          }
                        }
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
                <span className="aa-muted">
                  {storageBlocked
                    ? "仅本次会话"
                    : "保存在此浏览器 · 不会跨设备同步"}
                </span>
              </div>
              {replacing && (
                <div className="aa-panel aa-import-confirm">
                  <p>
                    备份包含 {replacing.notes.length} 条笔记、
                    {replacing.savedIds.length}{" "}
                    项收藏。导入将替换当前学习记录。建议先导出当前数据。
                  </p>
                  <button
                    className="aa-button primary"
                    onClick={() => {
                      setState(replacing);
                      setReplacing(null);
                      setDraft(null);
                      setDirty(false);
                      setNotice("备份已导入。");
                    }}
                  >
                    确认替换
                  </button>
                  <button
                    className="aa-button"
                    onClick={() => setReplacing(null)}
                  >
                    取消
                  </button>
                </div>
              )}
              <div className="aa-notes-layout">
                <aside className="aa-panel aa-note-list">
                  <div className="aa-filterbar">
                    <label>
                      <input
                        type="checkbox"
                        checked={archived}
                        onChange={(e) => setArchived(e.target.checked)}
                      />{" "}
                      查看归档
                    </label>
                    <select
                      aria-label="筛选笔记类型"
                      value={noteKind}
                      onChange={(e) => setNoteKind(e.target.value)}
                    >
                      <option value="all">全部类型</option>
                      {["理解", "问题", "复习"].map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  {visibleNotes.map((n) => (
                    <button
                      key={n.id}
                      className={draft?.id === n.id ? "selected" : ""}
                      onClick={() => {
                        if (dirty) {
                          setNotice("请先保存或放弃当前笔记草稿。");
                          return;
                        }
                        setDraft({ ...n });
                        setDirty(false);
                      }}
                    >
                      <small>
                        {n.kind} ·{" "}
                        {new Date(n.updatedAt).toLocaleDateString("zh-CN")}
                      </small>
                      <h3>{n.title}</h3>
                      <p>{n.body.slice(0, 80)}</p>
                      <small>{n.tags.map((t) => "#" + t).join(" ")}</small>
                    </button>
                  ))}
                  {!visibleNotes.length && (
                    <div className="aa-empty">
                      <NotebookPen size={30} />
                      <h3>
                        {archived ? "暂无归档笔记" : "从一个自己的问题开始"}
                      </h3>
                      <p>例如：为什么肺需要心脏一起工作？</p>
                    </div>
                  )}
                </aside>
                <section className="aa-panel aa-editor">
                  {draft ? (
                    <>
                      <div className="aa-panel-title">
                        {draft.archived ? "已归档笔记" : "我的学习记录"}
                        <small>
                          {dirty
                            ? "尚未保存"
                            : state.notes.some((n) => n.id === draft.id)
                              ? "已保存"
                              : "新草稿"}
                        </small>
                      </div>
                      <label className="aa-field">
                        标题
                        <input
                          value={draft.title}
                          maxLength={120}
                          onChange={(e) => {
                            setDraft({ ...draft, title: e.target.value });
                            setDirty(true);
                          }}
                          placeholder="用自己的话，提出一个问题或结论"
                        />
                      </label>
                      <div className="aa-editor-meta">
                        <label className="aa-field">
                          笔记类型
                          <select
                            value={draft.kind}
                            onChange={(e) => {
                              setDraft({
                                ...draft,
                                kind: e.target.value as Note["kind"],
                              });
                              setDirty(true);
                            }}
                          >
                            {["理解", "问题", "复习"].map((t) => (
                              <option key={t}>{t}</option>
                            ))}
                          </select>
                        </label>
                        <label className="aa-field">
                          关联知识卡
                          <select
                            value={draft.resourceId ?? ""}
                            onChange={(e) => {
                              setDraft({
                                ...draft,
                                resourceId: e.target.value || null,
                              });
                              setDirty(true);
                            }}
                          >
                            <option value="">独立笔记</option>
                            {resources.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.title}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <label className="aa-field">
                        内容
                        <textarea
                          rows={12}
                          value={draft.body}
                          onChange={(e) => {
                            setDraft({ ...draft, body: e.target.value });
                            setDirty(true);
                          }}
                          placeholder="我理解的是…\n还不确定的是…\n下次复习时，我想解释…"
                        />
                      </label>
                      <label className="aa-field">
                        标签（逗号分隔）
                        <input
                          value={draft.tags.join(",")}
                          onChange={(e) => {
                            setDraft({
                              ...draft,
                              tags: e.target.value.split(/[,，]/),
                            });
                            setDirty(true);
                          }}
                          placeholder="循环, 待复习"
                        />
                      </label>
                      <div className="aa-actions">
                        <button
                          className="aa-button primary"
                          disabled={!ready}
                          onClick={saveNote}
                        >
                          保存笔记
                        </button>
                        <button
                          className="aa-button"
                          onClick={() => {
                            setDraft(null);
                            setDirty(false);
                          }}
                        >
                          放弃草稿
                        </button>
                        {state.notes.some((n) => n.id === draft.id) && (
                          <button
                            className="aa-button"
                            disabled={dirty}
                            onClick={() => {
                              setState((prev) => ({
                                ...prev,
                                notes: prev.notes.map((n) =>
                                  n.id === draft.id
                                    ? {
                                        ...n,
                                        archived: !n.archived,
                                        updatedAt: new Date().toISOString(),
                                      }
                                    : n,
                                ),
                              }));
                              setDraft(null);
                              setDirty(false);
                              setNotice(
                                draft.archived
                                  ? "笔记已恢复。"
                                  : "笔记已归档，可从归档列表恢复。",
                              );
                            }}
                          >
                            {draft.archived ? "恢复笔记" : "归档笔记"}
                          </button>
                        )}
                        {draft.resourceId && (
                          <button
                            className="aa-button"
                            onClick={() => go("library", draft.resourceId!)}
                          >
                            打开关联资源 ↗
                          </button>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="aa-empty aa-editor-empty">
                      <span>✎</span>
                      <h2>把刚才的发现，写下来。</h2>
                      <p>笔记会留下知识卡的关联，帮助你再次找到上下文。</p>
                      <button className="aa-button" onClick={() => newNote()}>
                        写第一条笔记
                      </button>
                    </div>
                  )}
                </section>
              </div>
            </>
          )}
          <footer className="aa-footer">
            <span>
              人体结构 <em>· Learn the connections.</em>
            </span>
            <span>
              人体入门学习 · 概念示意，非诊疗工具 · 首版新增内容为中文
            </span>
          </footer>
        </div>
      )}
    </main>
  );
}
