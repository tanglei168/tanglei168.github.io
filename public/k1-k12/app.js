"use strict";

var DATA = window.DATA;
var ORD = ["壹","贰","叁","肆","伍","陆","柒","捌","玖","拾"];
var NAV = [
  {path:"/", label:"总览", sub:"序", seal:"序", title:"K1–K12 知行图谱 · 总览"},
  {path:"/graph", label:"知识图谱", sub:"经纬", seal:"经", title:"知识图谱 · 经纬"},
  {path:"/projects", label:"项目地图", sub:"行", seal:"行", title:"项目地图 · 行"},
  {path:"/library", label:"资源馆", sub:"藏", seal:"藏", title:"资源馆 · 藏"},
  {path:"/guide", label:"家长指南", sub:"导", seal:"导", title:"家长指南 · 导"}
];
var GRADES = [
  {v:"K1", l:"K1 学前"},{v:"G1", l:"G1"},{v:"G2", l:"G2"},{v:"G3", l:"G3"},{v:"G4", l:"G4"},
  {v:"G5", l:"G5"},{v:"G6", l:"G6"},{v:"G7", l:"G7"},{v:"G8", l:"G8"},{v:"G9", l:"G9"},
  {v:"G10", l:"G10"},{v:"G11", l:"G11"},{v:"G12", l:"G12"}
];
var GRADE_BAND = {K1:"K1",G1:"G12",G2:"G12",G3:"G34",G4:"G34",G5:"G56",G6:"G56",G7:"G79",G8:"G79",G9:"G79",G10:"G1012",G11:"G1012",G12:"G1012"};
var CAT_CHIP = {"游戏":"lv","制作工程":"qing","调查研究":"huang","长期项目":"","实践研学":"zhe"};
var scrollMap = {};
var lastView = "/";
var drawerDidPush = false;
var focusBeforeDrawer = null;

function $(id){ return document.getElementById(id); }
function el(tag, cls, text){
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined && text !== null) e.textContent = text;
  return e;
}

function parseHash(){
  var h = location.hash || "#/";
  h = h.replace(/^#/, "");
  var q = h.indexOf("?");
  var path = q >= 0 ? h.slice(0, q) : h;
  var params = {};
  if (q >= 0){
    h.slice(q + 1).split("&").forEach(function(p){
      var kv = p.split("=");
      if (kv[0]) params[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || "");
    });
  }
  if (!path || path === "/") path = "/";
  var m = path.match(/^\/project\/(P\d+)$/i);
  if (m) return {view:"/projects", projectId:m[1].toUpperCase(), params:params};
  return {view:path, projectId:null, params:params};
}

function buildHash(view, params, projectId){
  if (projectId) return "#/project/" + projectId;
  var base = "#" + (view === "/" ? "/" : view);
  var keys = Object.keys(params || {}).filter(function(k){ return params[k] !== "" && params[k] != null; });
  if (!keys.length) return base;
  return base + "?" + keys.map(function(k){ return encodeURIComponent(k) + "=" + encodeURIComponent(params[k]); }).join("&");
}

function navigate(view, params, opts){
  opts = opts || {};
  var hash = buildHash(view, params, opts.projectId);
  if (opts.replace){
    // replaceState does not fire hashchange — re-render explicitly.
    if ((location.hash || "#/") !== hash) history.replaceState(null, "", hash);
    renderCurrent(!!opts.silent);
  } else {
    location.hash = hash;
  }
}

function saveScroll(view){
  scrollMap[view] = window.scrollY;
}
function restoreScroll(view){
  var y = scrollMap[view];
  window.scrollTo(0, typeof y === "number" ? y : 0);
}

function getGrade(){
  return localStorage.getItem("k12.grade") || "";
}
function setGrade(v){
  localStorage.setItem("k12.grade", v);
  syncGradePickers();
  if (parseHash().view === "/") renderCurrent(true);
}

function syncGradePickers(){
  var g = getGrade();
  document.querySelectorAll(".grade-picker").forEach(function(s){
    var next = g && GRADE_BAND[g] ? g : "";
    if (s.value !== next) s.value = next;
  });
}

function fillGradeSelect(sel){
  sel.innerHTML = "";
  var ph = el("option", null, "选择年级");
  ph.value = "";
  sel.appendChild(ph);
  GRADES.forEach(function(g){
    var o = el("option", null, g.l);
    o.value = g.v;
    sel.appendChild(o);
  });
  var g = getGrade();
  sel.value = g && GRADE_BAND[g] ? g : "";
  if (!sel.dataset.bound){
    sel.dataset.bound = "1";
    sel.addEventListener("change", function(){ setGrade(sel.value); });
  }
}

function syncFilterChipUi(container, params){
  var keys = ["band", "cat", "dim"];
  container.querySelectorAll(".filter-group").forEach(function(wrap, gi){
    var key = keys[gi];
    if (!key) return;
    wrap.querySelectorAll(".chip-btn").forEach(function(btn){
      var val = btn.getAttribute("data-val");
      var active = val === "" ? !params[key] : params[key] === val;
      btn.classList.toggle("active", active);
    });
  });
}

function renderSiteNav(activeView){
  var desk = $("navDesktop");
  var mob = $("navMobile");
  desk.innerHTML = "";
  mob.innerHTML = "";
  NAV.forEach(function(n){
    var href = "#" + (n.path === "/" ? "/" : n.path);
    var a = el("a", null);
    a.href = href;
    if (n.path === activeView || (activeView === "/projects" && n.path === "/projects")) a.setAttribute("aria-current", "page");
    a.appendChild(document.createTextNode(n.label));
    var sub = el("span", "nav-sub", n.sub);
    a.appendChild(sub);
    desk.appendChild(a);

    var ma = el("a", null);
    ma.href = href;
    if (a.getAttribute("aria-current")) ma.setAttribute("aria-current", "page");
    var seal = el("span", "tab-seal", n.seal);
    ma.appendChild(seal);
    ma.appendChild(el("span", null, n.label));
    mob.appendChild(ma);
  });
}

function secTitle(ord, text){
  var h = el("h2", "sec-title");
  h.tabIndex = -1;
  h.appendChild(el("span", "ord", ord));
  h.appendChild(document.createTextNode(text));
  return h;
}
function secDivider(){ return el("div", "sec-divider"); }

function projLinkFragment(text){
  var frag = document.createDocumentFragment();
  var re = /P\d\d/g;
  var last = 0, m;
  var s = String(text || "");
  while ((m = re.exec(s))){
    if (m.index > last) frag.appendChild(document.createTextNode(s.slice(last, m.index)));
    var btn = el("button", "link-chip", m[0]);
    btn.type = "button";
    (function(id){ btn.addEventListener("click", function(){ openProject(id, true); }); })(m[0]);
    frag.appendChild(btn);
    last = m.index + m[0].length;
  }
  if (last < s.length) frag.appendChild(document.createTextNode(s.slice(last)));
  return frag;
}

function filterProjects(params){
  var band = params.band || "";
  var cat = params.cat || "";
  var dim = params.dim !== undefined && params.dim !== "" ? Number(params.dim) : null;
  var q = (params.q || "").trim().toLowerCase();
  var list = [];
  DATA.projects.forEach(function(p){
    if (band && p.band !== band) return;
    if (cat && p.cat !== cat) return;
    if (dim !== null && (p.dims || []).indexOf(dim) < 0) return;
    if (q){
      var hay = [p.name,p.knowledge,p.type,p.materials,(p.steps||[]).join(" ")].join(" ").toLowerCase();
      if (hay.indexOf(q) < 0) return;
    }
    list.push(p);
  });
  return list;
}

function renderOverview(host){
  host.innerHTML = "";
  var hero = el("div", "hero-scroll");
  var body = el("div");
  body.appendChild(el("h1", null, "一张图看懂孩子 13 年的学习路线"));
  var lead = el("p", "lead", "纵线定位进度，横联选题做项目——在余杭教材与高考框架下，用 40 张项目卡把知识变成可做的成果。");
  body.appendChild(lead);
  var stats = el("div", "stats");
  [["6","学段带"],["10","学科纵线"],["8","能力维度"],["40","项目卡"],["5","主题路线"]].forEach(function(x){
    var st = el("div", "stat");
    st.appendChild(el("b", null, x[0]));
    st.appendChild(el("span", null, x[1]));
    stats.appendChild(st);
  });
  body.appendChild(stats);
  hero.appendChild(body);
  hero.appendChild(el("div", "hero-vert", "知行合一 · 格物致知"));
  host.appendChild(hero);

  var gp = el("div", "card grade-panel");
  var gl = el("label", null, "我的孩子在");
  gl.htmlFor = "gradePickerOverview";
  gp.appendChild(gl);
  var sel = el("select", "grade-picker");
  sel.id = "gradePickerOverview";
  sel.setAttribute("aria-label", "选择年级");
  fillGradeSelect(sel);
  gp.appendChild(sel);
  var rec = el("div", "recommend");
  gp.appendChild(rec);
  function updateRec(){
    rec.innerHTML = "";
    var g = getGrade();
    if (!g){ rec.appendChild(el("p", "sub", "选择年级后，会推荐该学段简介与 3 个项目。")); return; }
    var band = GRADE_BAND[g];
    var intro = DATA.bandIntro[band];
    rec.appendChild(el("h3", null, "为你推荐 · " + DATA.bandMeta[band].label));
    var p = el("p", "intro-clamp sub");
    p.textContent = intro ? intro.intro : "";
    var toggle = el("button", "btn btn-ghost");
    toggle.type = "button";
    toggle.textContent = "展开";
    toggle.addEventListener("click", function(){
      p.classList.toggle("is-open");
      toggle.textContent = p.classList.contains("is-open") ? "收起" : "展开";
    });
    rec.appendChild(p);
    rec.appendChild(toggle);
    var grid = el("div", "proj-mini-grid");
    var picks = DATA.projects.filter(function(x){ return x.band === band; }).slice(0, 3);
    picks.forEach(function(pj){
      var c = el("div", "proj-mini");
      c.appendChild(el("div", "pid", pj.id));
      c.appendChild(el("h4", null, pj.name));
      c.addEventListener("click", function(){ openProject(pj.id, true); });
      grid.appendChild(c);
    });
    rec.appendChild(grid);
    var btn = el("button", "btn btn-primary");
    btn.type = "button";
    btn.textContent = "看这一学段的知识图谱";
    btn.addEventListener("click", function(){ navigate("/graph", {mode:"band", band:band}); });
    rec.appendChild(btn);
  }
  sel.addEventListener("change", function(){ setGrade(sel.value); updateRec(); });
  updateRec();
  host.appendChild(gp);

  host.appendChild(secTitle(ORD[1], "为什么在高考框架下做 PBL"));
  host.appendChild(secDivider());
  var whyG = el("div", "grid teaser-grid");
  (DATA.why || []).forEach(function(w){
    var c = el("div", "card");
    c.appendChild(el("h3", null, w.t));
    c.appendChild(el("p", null, w.d));
    whyG.appendChild(c);
  });
  host.appendChild(whyG);

  host.appendChild(secTitle(ORD[2], "三大方向"));
  host.appendChild(secDivider());
  var tg = el("div", "grid teaser-grid");
  [{c:"lv",t:"人体结构",d:"3D 探索与生命系统"},{c:"zhe",t:"地理科学",d:"历史地图与文明对照"},{c:"qing",t:"科学 3D 实验室",d:"格物致知 · 互动实验"}].forEach(function(x){
    var c = el("div", "teaser-card " + x.c);
    var seal = el("div", "seal", x.t.charAt(0));
    c.appendChild(seal);
    c.appendChild(el("h3", null, x.t));
    c.appendChild(el("p", null, x.d));
    c.addEventListener("click", function(){ navigate("/library"); });
    tg.appendChild(c);
  });
  host.appendChild(tg);

  host.appendChild(secTitle(ORD[3], "八维能力模型"));
  host.appendChild(secDivider());
  host.appendChild(el("p", "sub", "知识会遗忘，能力可迁移——40 个项目全部用这 8 个维度标注目标"));
  var dg = el("div", "grid dims-grid");
  DATA.dims.forEach(function(d){
    var c = el("div", "card dim-card");
    c.appendChild(el("div", "num", d.n));
    var b = el("div");
    b.appendChild(el("h3", null, d.name));
    b.appendChild(el("p", null, d.desc));
    b.appendChild(el("span", "ev", "行为证据：" + d.ev));
    c.appendChild(b);
    dg.appendChild(c);
  });
  host.appendChild(dg);

  host.appendChild(secTitle(ORD[4], "这张图谱怎么读"));
  host.appendChild(secDivider());
  var hg = el("div", "grid how-grid");
  DATA.howToRead.forEach(function(h){
    var c = el("div", "card how-card");
    c.appendChild(el("h3", null, h.t));
    c.appendChild(el("p", null, h.d));
    hg.appendChild(c);
  });
  host.appendChild(hg);

  var det = document.createElement("details");
  det.className = "collapsible";
  det.open = false;
  var sum = document.createElement("summary");
  sum.textContent = "余杭教材版本总表";
  det.appendChild(sum);
  var ts = el("div", "table-scroll");
  var table = el("table", "vt");
  table.id = "versionTable";
  DATA.versionTable.forEach(function(r, i){
    var tr = document.createElement("tr");
    r.forEach(function(c){
      tr.appendChild(el(i === 0 ? "th" : "td", null, c));
    });
    table.appendChild(tr);
  });
  ts.appendChild(table);
  det.appendChild(ts);
  det.appendChild(el("h3", "sec-title", "版本要点 · 家长须知"));
  var ul = el("ul", "notes");
  DATA.versionNotes.forEach(function(n){ ul.appendChild(el("li", null, n)); });
  det.appendChild(ul);
  host.appendChild(det);
}

function renderGraph(host, params){
  host.innerHTML = "";
  var h = secTitle(ORD[0], "知识图谱");
  host.appendChild(h);
  host.appendChild(el("p", "sub", "纵线＝学科进阶（经）；横联＝跨学科锚点（纬）。按学段或按学科切换视图。"));
  host.appendChild(secDivider());

  var mode = params.mode === "subject" ? "subject" : "band";
  var band = params.band || DATA.bandOrder[0];
  var subject = params.s || (DATA.verticals[0] && DATA.verticals[0].id);

  var toggle = el("div", "mode-toggle");
  [["band","按学段"],["subject","按学科"]].forEach(function(pair){
    var b = el("button", pair[0] === mode ? "active" : "", pair[1]);
    b.type = "button";
    b.addEventListener("click", function(){
      navigate("/graph", Object.assign({}, params, {mode:pair[0]}), {replace:true});
    });
    toggle.appendChild(b);
  });
  host.appendChild(toggle);

  if (mode === "band"){
    var tl = el("div", "band-timeline");
    DATA.bandOrder.forEach(function(bid){
      var m = DATA.bandMeta[bid];
      var btn = el("button", "band-node" + (bid === band ? " active" : ""));
      btn.type = "button";
      btn.appendChild(el("b", null, m.label));
      btn.appendChild(el("span", null, m.sub));
      btn.addEventListener("click", function(){
        navigate("/graph", {mode:"band", band:bid}, {replace:true});
      });
      tl.appendChild(btn);
    });
    host.appendChild(tl);
    var intro = el("div", "band-intro");
    var info = DATA.bandIntro[band];
    intro.textContent = info ? info.intro : "";
    host.appendChild(intro);
    var sg = el("div", "grid subj-grid");
    var tbl = DATA.bands[band];
    if (tbl && tbl.rows){
      tbl.rows.forEach(function(r){
        var c = el("div", "card subj-card");
        c.appendChild(el("h3", null, r[0]));
        var pts = el("div", "pts clamped");
        pts.textContent = r[1];
        c.appendChild(pts);
        var exp = el("button", "btn btn-ghost");
        exp.type = "button";
        exp.textContent = "展开";
        exp.addEventListener("click", function(){
          pts.classList.toggle("clamped");
          exp.textContent = pts.classList.contains("clamped") ? "展开" : "收起";
        });
        c.appendChild(exp);
        if (r[2]){
          var g = el("div", "goal");
          g.appendChild(el("b", null, "落点 "));
          g.appendChild(document.createTextNode(r[2]));
          c.appendChild(g);
        }
        var chips = el("div", "proj-chips");
        DATA.projects.filter(function(p){ return p.band === band; }).slice(0, 6).forEach(function(p){
          var ch = el("button", "chip-btn", p.id);
          ch.type = "button";
          ch.addEventListener("click", function(){ openProject(p.id, true); });
          chips.appendChild(ch);
        });
        c.appendChild(chips);
        sg.appendChild(c);
      });
    }
    host.appendChild(sg);
  } else {
    var picker = el("div", "vt-picker");
    DATA.verticals.forEach(function(v){
      var b = el("button", "vt-btn" + (v.id === subject ? " active" : ""));
      b.type = "button";
      b.appendChild(el("span", "seal-sm", v.icon));
      b.appendChild(document.createTextNode(v.name));
      b.addEventListener("click", function(){
        navigate("/graph", {mode:"subject", s:v.id}, {replace:true});
      });
      picker.appendChild(b);
    });
    host.appendChild(picker);
    var v = DATA.verticals.filter(function(x){ return x.id === subject; })[0];
    if (v){
      host.appendChild(el("div", "card", v.summary));
      var timeline = el("div", "timeline");
      DATA.bandOrder.forEach(function(bid){
        var bd = v.bands[bid];
        if (!bd) return;
        var node = el("div", "tl-node");
        var card = el("div", "card");
        card.appendChild(el("h4", null, DATA.bandMeta[bid].label));
        card.appendChild(el("div", "pts", bd.points || ""));
        if (bd.goal) card.appendChild(el("div", "goal", "落点 " + bd.goal));
        node.appendChild(card);
        timeline.appendChild(node);
      });
      host.appendChild(timeline);
      var lk = el("div", "card");
      lk.appendChild(el("b", null, "衔接点 "));
      lk.appendChild(document.createTextNode(v.links));
      host.appendChild(lk);
    }
  }

  host.appendChild(secTitle(ORD[1], "横联锚点"));
  host.appendChild(secDivider());
  host.appendChild(el("p", "sub", "同一主题跨学科挂接，是 PBL 的天然接口——项目编号可直达详情。"));
  var al = el("div", "grid anchor-list");
  DATA.anchors.forEach(function(a){
    var c = el("div", "card anchor-card");
    c.appendChild(el("div", "ano", String(a.n)));
    var body = el("div");
    body.appendChild(el("h3", null, a.name));
    body.appendChild(el("div", "lk", a.link));
    if (a.proj){
      var pj = el("div", "proj-chips");
      pj.appendChild(document.createTextNode("对应项目 "));
      pj.appendChild(projLinkFragment(a.proj));
      body.appendChild(pj);
    }
    c.appendChild(body);
    al.appendChild(c);
  });
  host.appendChild(al);
  return h;
}

function renderFilterControls(params, onChange, container, mobileSheet){
  container.innerHTML = "";
  function chipGroup(label, key, options, allLabel){
    var wrap = el("div", "filter-group");
    wrap.appendChild(el("span", "filter-label", label));
    var all = el("button", "chip-btn" + (!params[key] ? " active" : ""), allLabel || "全部");
    all.type = "button";
    all.setAttribute("data-val", "");
    all.addEventListener("click", function(){
      params[key] = "";
      if (mobileSheet) syncFilterChipUi(container, params);
      else onChange();
    });
    wrap.appendChild(all);
    options.forEach(function(opt){
      var val = opt.v != null ? opt.v : opt;
      var lab = opt.l != null ? opt.l : opt;
      var b = el("button", "chip-btn" + (params[key] === String(val) ? " active" : ""), lab);
      b.type = "button";
      b.setAttribute("data-val", String(val));
      b.addEventListener("click", function(){
        params[key] = String(val);
        if (mobileSheet) syncFilterChipUi(container, params);
        else onChange();
      });
      wrap.appendChild(b);
    });
    container.appendChild(wrap);
  }
  chipGroup("学段", "band", DATA.bandOrder.map(function(b){ return {v:b, l:DATA.bandMeta[b].label}; }));
  chipGroup("类型", "cat", DATA.cats);
  chipGroup("能力", "dim", DATA.dims.map(function(d,i){ return {v:String(i), l:d.n + " " + d.name}; }));
  if (!mobileSheet){
    var search = el("input", "filter-search");
    search.type = "search";
    search.placeholder = "搜索名称、知识点、步骤…";
    search.value = params.q || "";
    search.addEventListener("input", function(){
      params.q = search.value;
      onChange(true);
    });
    container.appendChild(search);
  }
}

function renderProjects(host, params){
  host.innerHTML = "";
  var h = secTitle(ORD[0], "项目地图 · 40 个项目");
  host.appendChild(h);
  host.appendChild(el("p", "sub", "点击卡片打开详情；筛选条件会写入地址栏，便于分享。"));
  host.appendChild(secDivider());

  var bar = el("div", "filter-bar filter-desktop-only");
  var barInner = el("div");
  barInner.style.flex = "1";
  bar.appendChild(barInner);
  var countEl = el("span", null, "");
  var meta = el("div", "filter-meta");
  meta.appendChild(countEl);
  var clear = el("button", "btn btn-ghost");
  clear.type = "button";
  clear.textContent = "清除筛选";
  clear.addEventListener("click", function(){
    navigate("/projects", {}, {replace:true});
  });
  meta.appendChild(clear);
  bar.appendChild(meta);
  host.appendChild(bar);

  var mobRow = el("div", "filter-mobile-only");
  mobRow.style.margin = "12px 0";
  var mobBtn = el("button", "btn");
  mobBtn.type = "button";
  mobBtn.textContent = "筛选";
  mobRow.appendChild(mobBtn);
  var mobSearch = el("input", "filter-search");
  mobSearch.type = "search";
  mobSearch.placeholder = "搜索…";
  mobSearch.value = params.q || "";
  mobSearch.style.marginTop = "8px";
  mobSearch.style.width = "100%";
  mobRow.appendChild(mobSearch);
  host.appendChild(mobRow);

  var grid = el("div", "grid proj-grid");
  grid.id = "projGrid";
  host.appendChild(grid);

  function syncProjectUrl(){
    var hash = buildHash("/projects", params);
    if ((location.hash || "#/") !== hash) history.replaceState(null, "", hash);
  }
  function applyParams(liveSearch){
    if (liveSearch){
      // Keep the search input focused; only refresh the grid + URL.
      syncProjectUrl();
      renderProjectGrid(grid, params, countEl);
      syncFilterChipUi(barInner, params);
      return;
    }
    navigate("/projects", params, {replace:true, silent:true});
  }
  renderFilterControls(params, function(repl){ applyParams(repl); }, barInner, false);
  mobSearch.addEventListener("input", function(){
    params.q = mobSearch.value;
    applyParams(true);
  });
  mobBtn.addEventListener("click", function(){
    var sheet = $("filterSheet");
    var body = $("filterSheetBody");
    body.innerHTML = "";
    window.__sheetFilterParams = Object.assign({}, params);
    renderFilterControls(window.__sheetFilterParams, function(){}, body, true);
    sheet.hidden = false;
  });

  renderProjectGrid(grid, params, countEl);

  host.appendChild(secTitle(ORD[1], "跨学段主题路线"));
  host.appendChild(secDivider());
  var rl = el("div", null);
  DATA.routes.forEach(function(r){
    var c = el("div", "card route-card");
    c.appendChild(el("div", "ric", r.icon));
    var body = el("div");
    body.appendChild(el("h3", null, "路线 " + r.id + " · " + r.name));
    var ch = el("div", "chain");
    ch.appendChild(projLinkFragment(r.chain));
    body.appendChild(ch);
    body.appendChild(el("div", "rnote", r.note));
    c.appendChild(body);
    rl.appendChild(c);
  });
  host.appendChild(rl);
  return h;
}

function renderProjectGrid(grid, params, countEl){
  grid.innerHTML = "";
  var list = filterProjects(params);
  countEl.textContent = "显示 " + list.length + " / " + DATA.projects.length;
  window.__filteredProjects = list;
  list.forEach(function(p){
    var c = el("div", "card proj-compact");
    var head = el("div", "head");
    head.appendChild(el("span", "pid-seal", p.id));
    var hb = el("div");
    hb.appendChild(el("h3", null, p.name));
    hb.appendChild(el("div", "meta", DATA.bandMeta[p.band].label + " · " + p.cat));
    head.appendChild(hb);
    c.appendChild(head);
    c.appendChild(el("div", "line1", p.type));
    c.appendChild(el("div", "line2", p.materials));
    var foot = el("div", "foot");
    (p.dims || []).forEach(function(i){
      var d = DATA.dims[i];
      if (d) foot.appendChild(el("span", "chip", d.name.slice(0, 2)));
    });
    c.appendChild(foot);
    c.addEventListener("click", function(e){
      focusBeforeDrawer = c;
      openProject(p.id, true);
    });
    grid.appendChild(c);
  });
  if (!list.length) grid.appendChild(el("div", "card", "没有符合筛选条件的项目。"));
}

function renderLibrary(host){
  host.innerHTML = "";
  host.appendChild(secTitle(ORD[0], "资源馆"));
  host.appendChild(el("p", "sub", "三大方向分馆陈列；本地进入，外链查看源项目。"));
  host.appendChild(secDivider());
  host.appendChild(el("p", "mirror-note", "本站镜像仅作非商业学习，版权归原作者。"));

  (DATA.library || []).forEach(function(sec){
    var wrap = el("section", "library-section");
    var head = el("div", "library-head " + sec.pigment);
    head.appendChild(el("div", "big-seal", sec.seal));
    var hb = el("div");
    hb.appendChild(el("h2", null, sec.name + (sec.subtitle ? " · " + sec.subtitle : "")));
    hb.appendChild(el("p", null, sec.desc));
    if (sec.projects){
      var ch = el("div", "proj-chips");
      ch.appendChild(document.createTextNode("相关项目 "));
      ch.appendChild(projLinkFragment(sec.projects.join(" ")));
      hb.appendChild(ch);
    }
    head.appendChild(hb);
    wrap.appendChild(head);
    var card = el("div", "card");
    (sec.items || []).forEach(function(it){
      var row = el("div", "resource-row");
      var info = el("div");
      info.appendChild(el("strong", null, it.name));
      info.appendChild(el("div", "sub", it.license || sec.license || ""));
      row.appendChild(info);
      var actions = el("div");
      if (it.local){
        var enter = el("a", "btn btn-primary", "进入");
        enter.href = it.local;
        actions.appendChild(enter);
      }
      if (it.upstream){
        var up = el("a", "btn btn-ghost", "源项目 ↗");
        up.href = it.upstream;
        up.target = "_blank";
        up.rel = "noopener";
        actions.appendChild(up);
      }
      row.appendChild(actions);
      card.appendChild(row);
    });
    card.appendChild(el("p", "sub", "适合学段：" + sec.bands));
    wrap.appendChild(card);
    host.appendChild(wrap);
  });
}

function renderGuide(host){
  host.innerHTML = "";
  host.appendChild(secTitle(ORD[0], "如何选择起点项目"));
  host.appendChild(secDivider());
  var tg = el("div", "grid tree-grid");
  DATA.guide.decisionTree.forEach(function(t, i){
    var c = el("div", "card tree-card");
    c.appendChild(el("div", "tno", String(i + 1)));
    c.appendChild(el("p", null, t));
    tg.appendChild(c);
  });
  host.appendChild(tg);

  host.appendChild(secTitle(ORD[1], "家长角色 · 脚手架"));
  host.appendChild(secDivider());
  var sl = el("div", "q-list");
  DATA.guide.scaffold.forEach(function(q){
    sl.appendChild(el("div", "q-item", q));
  });
  host.appendChild(sl);

  host.appendChild(secTitle(ORD[2], "避坑清单"));
  var pl = el("div", "grid pit-list");
  DATA.guide.pitfalls.forEach(function(t, i){
    var d = el("div", "pit");
    d.appendChild(el("b", null, "坑 " + (i + 1)));
    d.appendChild(document.createTextNode(t));
    pl.appendChild(d);
  });
  host.appendChild(pl);

  host.appendChild(secTitle(ORD[3], "AI 时代的家庭 PBL 守则"));
  host.appendChild(secDivider());
  var ul = el("ul", "ai-rules");
  (DATA.aiRules || []).forEach(function(r){ ul.appendChild(el("li", null, r)); });
  host.appendChild(ul);

  host.appendChild(secTitle(ORD[4], "项目反思单（可打印）"));
  host.appendChild(secDivider());
  var sheet = el("div");
  sheet.id = "reflectionSheet";
  var sh = DATA.guide.sheet;
  sheet.appendChild(el("h3", null, sh.title));
  var inlineRow = el("div", "row");
  sh.fields.forEach(function(f){
    if (f.inline) inlineRow.appendChild(el("span", null, f.label));
    else {
      if (inlineRow.childNodes.length){ sheet.appendChild(inlineRow); inlineRow = el("div", "row"); }
      sheet.appendChild(el("div", "q", f.label));
      var wl = el("div", "wlines");
      for (var i = 0; i < (f.lines || 2); i++) wl.appendChild(document.createElement("div"));
      sheet.appendChild(wl);
    }
  });
  if (inlineRow.childNodes.length) sheet.appendChild(inlineRow);
  sheet.appendChild(el("div", "note", sh.note));
  host.appendChild(sheet);
  var pb = el("button", "btn btn-primary");
  pb.type = "button";
  pb.textContent = "打印反思单";
  pb.addEventListener("click", function(){
    document.body.classList.add("print-reflection");
    window.print();
    document.body.classList.remove("print-reflection");
  });
  host.appendChild(pb);

  var foot = el("footer", "site-footer");
  foot.innerHTML = "数据底本：《K1–K12知识图谱与项目式学习地图.md》（余杭区教材版本知识点清单）· 学前段依据《3–6岁儿童学习与发展指南》<br>教材改版时单元名可微调，学科主线结构长期稳定 · v2.0";
  host.appendChild(foot);
}

function findProject(id){
  for (var i = 0; i < DATA.projects.length; i++){
    if (DATA.projects[i].id === id) return DATA.projects[i];
  }
  return null;
}

function relatedAnchors(pid){
  return DATA.anchors.filter(function(a){
    return (a.proj || "").indexOf(pid) >= 0;
  });
}

function renderDrawerContent(p){
  var box = $("drawerContent");
  box.innerHTML = "";
  var head = el("div", "drawer-head");
  head.appendChild(el("span", "pid-seal", p.id));
  var hb = el("div");
  var title = el("h2");
  title.id = "drawerTitle";
  title.textContent = p.name;
  hb.appendChild(title);
  hb.appendChild(el("div", "meta", DATA.bandMeta[p.band].label + " · " + p.cat));
  head.appendChild(hb);
  box.appendChild(head);
  function field(label, text){
    if (!text) return;
    var f = el("div", "field");
    f.appendChild(el("span", "flabel", label));
    f.appendChild(el("p", null, text));
    box.appendChild(f);
  }
  field("类型 / 时长", p.type);
  field("调用知识点", p.knowledge);
  field("能力目标", p.abilities);
  field("材料与成本", p.materials);
  if (p.steps && p.steps.length){
    var f = el("div", "field");
    f.appendChild(el("span", "flabel", "步骤"));
    var ol = document.createElement("ol");
    p.steps.forEach(function(s){ ol.appendChild(el("li", null, s)); });
    f.appendChild(ol);
    box.appendChild(f);
  }
  field("成果与评估", p.outcome);
  field("进阶与变体", p.advance);
  field("教材衔接", p.textbook);
  var chips = el("div", "foot");
  (p.dims || []).forEach(function(i){
    var d = DATA.dims[i];
    if (d) chips.appendChild(el("span", "chip", d.n + " " + d.name));
  });
  chips.appendChild(el("span", "chip " + (CAT_CHIP[p.cat] || ""), p.cat));
  box.appendChild(chips);
  var rel = relatedAnchors(p.id);
  if (rel.length){
    var rf = el("div", "field");
    rf.appendChild(el("span", "flabel", "相关横联锚点"));
    rel.forEach(function(a){
      rf.appendChild(el("p", null, a.n + " · " + a.name));
    });
    box.appendChild(rf);
  }
}

function drawerFocusables(){
  var drawer = $("projectDrawer");
  if (!drawer) return [];
  return Array.prototype.filter.call(
    drawer.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'),
    function(node){ return !node.disabled && node.offsetParent !== null; }
  );
}

function openProject(id, push){
  var p = findProject(id);
  if (!p) return;
  if (push && !focusBeforeDrawer && document.activeElement && document.activeElement !== document.body){
    focusBeforeDrawer = document.activeElement;
  }
  var cur = parseHash();
  if (cur.projectId !== id && push){
    drawerDidPush = true;
    location.hash = "#/project/" + id;
    return;
  }
  renderDrawerContent(p);
  var drawer = $("projectDrawer");
  var backdrop = $("drawerBackdrop");
  backdrop.hidden = false;
  drawer.hidden = false;
  drawer.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  var title = $("drawerTitle");
  if (title){
    title.tabIndex = -1;
    try { title.focus({preventScroll:true}); } catch (err) { title.focus(); }
  }
}

function closeDrawer(useHistory){
  var drawer = $("projectDrawer");
  var backdrop = $("drawerBackdrop");
  backdrop.hidden = true;
  drawer.hidden = true;
  drawer.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  var onProject = /\/project\//.test(location.hash || "");
  if (useHistory && onProject){
    if (drawerDidPush){
      drawerDidPush = false;
      history.back();
    } else {
      // Landed directly on #/project/… — don't leave the site via history.back().
      navigate("/projects", parseHash().params, {replace:true, silent:true});
    }
  } else if (onProject){
    navigate("/projects", parseHash().params, {replace:true, silent:true});
  } else {
    drawerDidPush = false;
  }
  if (focusBeforeDrawer && typeof focusBeforeDrawer.focus === "function"){
    try { focusBeforeDrawer.focus({preventScroll:true}); } catch (err) {
      try { focusBeforeDrawer.focus(); } catch (err2) { /* ignore */ }
    }
  }
  focusBeforeDrawer = null;
}

function drawerNav(delta){
  var list = window.__filteredProjects || DATA.projects;
  var cur = parseHash().projectId;
  var idx = -1;
  for (var i = 0; i < list.length; i++){ if (list[i].id === cur) idx = i; }
  if (idx < 0) return;
  var next = list[idx + delta];
  if (!next) return;
  location.hash = "#/project/" + next.id;
}

function renderCurrent(skipFade){
  var route = parseHash();
  var view = route.view;
  NAV.forEach(function(n){ if (n.path === view) document.title = n.title + " · 余杭家庭版"; });

  if (lastView !== view){
    saveScroll(lastView);
    lastView = view;
  }
  renderSiteNav(view);
  syncGradePickers();

  var host = $("viewHost");
  if (!skipFade){
    host.classList.add("is-fading");
  }
  var focusTarget = null;
  if (view === "/") renderOverview(host);
  else if (view === "/graph") focusTarget = renderGraph(host, route.params);
  else if (view === "/projects") focusTarget = renderProjects(host, route.params);
  else if (view === "/library") renderLibrary(host);
  else if (view === "/guide") renderGuide(host);
  else { host.appendChild(el("p", null, "未知页面")); navigate("/", {}, {replace:true}); }

  if (!skipFade){
    requestAnimationFrame(function(){
      host.classList.remove("is-fading");
      restoreScroll(view);
      var h = host.querySelector("h2");
      if (h){
        try { h.focus({preventScroll:true}); } catch (err) { /* ignore */ }
      }
    });
  } else {
    restoreScroll(view);
  }

  if (route.projectId) openProject(route.projectId, false);
  else {
    drawerDidPush = false;
    closeDrawer(false);
  }
}

function initDrawerUi(){
  $("drawerClose").addEventListener("click", function(){ closeDrawer(true); });
  $("drawerBackdrop").addEventListener("click", function(){ closeDrawer(true); });
  $("drawerPrev").addEventListener("click", function(){ drawerNav(-1); });
  $("drawerNext").addEventListener("click", function(){ drawerNav(1); });
  $("drawerCopy").addEventListener("click", function(){
    var id = parseHash().projectId;
    var url = location.href.split("#")[0] + "#/project/" + id;
    function ok(){ $("drawerCopy").textContent = "已复制"; setTimeout(function(){ $("drawerCopy").textContent = "复制链接"; }, 1500); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(ok).catch(function(){
      window.prompt("复制链接", url);
    });
    else window.prompt("复制链接", url);
  });
  $("drawerPrint").addEventListener("click", function(){
    document.body.classList.add("print-drawer");
    window.print();
    document.body.classList.remove("print-drawer");
  });
  document.addEventListener("keydown", function(e){
    if ($("projectDrawer").hidden) return;
    if (e.key === "Escape"){ closeDrawer(true); return; }
    if (e.key !== "Tab") return;
    var nodes = drawerFocusables();
    if (nodes.length < 2) return;
    var first = nodes[0], last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first){
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last){
      e.preventDefault();
      first.focus();
    }
  });
  $("filterSheetClose").addEventListener("click", function(){
    $("filterSheet").hidden = true;
  });
  $("filterSheetApply").addEventListener("click", function(){
    $("filterSheet").hidden = true;
    navigate("/projects", window.__sheetFilterParams || parseHash().params, {replace:true});
  });
}

document.addEventListener("DOMContentLoaded", function(){
  try {
    if (!DATA) throw new Error("DATA not loaded");
    fillGradeSelect($("gradePickerTop"));
    initDrawerUi();
    if (!location.hash) location.hash = "#/";
    window.addEventListener("hashchange", function(){ renderCurrent(false); });
    renderCurrent(true);
  } catch (e) {
    window.__jsErrors.push("init: " + (e && e.message));
    var b = $("errBadge");
    if (b){ b.style.display = "block"; b.textContent = "初始化失败：" + (e && e.message); }
  }
});
