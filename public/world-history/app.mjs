import './vendor/d3.min.js';
import { formatYear, normalizeYear, snapshotFor, adjacentSnapshot, regionFor, safeSource } from './core.mjs';
import { regions, names, stories, eras } from './content.mjs';
const d3 = globalThis.d3;
const $ = id => document.getElementById(id);
const svg = d3.select('#world-map');
const W = 1100, H = 590;
const projection = d3.geoNaturalEarth1().fitExtent([[18, 20], [W-18, H-20]], {type:'Sphere'});
const geoPath = d3.geoPath(projection);
const layer = svg.append('g');
layer.append('path').attr('class','sphere').attr('d',geoPath({type:'Sphere'}));
layer.append('path').attr('class','graticule').attr('d',geoPath(d3.geoGraticule10()));
const territories = layer.append('g');
const labels = layer.append('g');
const pins = layer.append('g');
const zoom = d3.zoom().scaleExtent([1,10]).extent([[0,0],[W,H]]).translateExtent([[-W,-H],[2*W,2*H]]).on('zoom',event => {
  layer.attr('transform',event.transform);
  labels.selectAll('text').attr('font-size',10/Math.sqrt(event.transform.k));
});
svg.call(zoom).on('dblclick.zoom',null);
const regionMap = new Map(regions.map(r=>[r.id,r]));
let manifest, year=1500, snapshot, features=[], currentRegion=null, selectedName=null;
let version=0, playing=false, timer=null, debounce=null, disposed=false;
const cache = new Map();
const params = new URLSearchParams(location.search);
const initialRegion = regionMap.has(params.get('region')) ? params.get('region') : null;
const initialPolity = params.get('polity');
function node(tag, text, className) {
  const n = document.createElement(tag);
  if (text !== undefined) n.textContent = text;
  if (className) n.className = className;
  return n;
}
function translated(f) {return names[f.properties.NAME?.trim()] || f.properties.NAME?.trim() || '未标注区域';}
function setURL() {
  const q=new URLSearchParams({year:String(year)});
  if(currentRegion) q.set('region',currentRegion);
  if(selectedName) q.set('polity',selectedName);
  history.replaceState(null,'',location.pathname+'?'+q);
}
function resetDetail() {
  selectedName=null;
  $('detail-kicker').textContent=currentRegion?regionMap.get(currentRegion).name:'同一个世界';
  $('clear-selection').hidden=!currentRegion;
  const d=$('detail');d.replaceChildren();
  d.append(node('h2',currentRegion?'把这一片世界看近一点':'先看世界，再看彼此'));
  d.append(node('p',currentRegion?'这里列出本期地图中归入该地区的政体与文化区域。选择一个名称，观察它的位置。':'点击地图上的一块区域，了解它在这一时期的名称与关联。也可以从下方选择一个地区。'));
  if(currentRegion) {
    const list=node('div',undefined,'region-detail-list');
    features.filter(f=>f._region===currentRegion).sort((a,b)=>b._area-a._area).forEach(f=>{
      const b=node('button',translated(f));b.onclick=()=>selectFeature(f);list.append(b);
    });
    d.append(list);
  }
  $('question').textContent=eras.find(e=>year>=e.from&&year<=e.to).question;
  highlight();
}
function highlight() {
  territories.selectAll('path').classed('selected',f=>f.properties.NAME===selectedName).classed('dim',f=>currentRegion&&f._region!==currentRegion);
  document.querySelectorAll('#regions button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.region===currentRegion)));
}
function sourceLink(url, text) {
  const href=safeSource(url);
  if(!href) return node('span','原始资料未提供链接');
  const a=node('a',text);a.href=href;a.target='_blank';a.rel='noopener';return a;
}
function selectFeature(f) {
  if(currentRegion && currentRegion !== f._region) currentRegion = null;
  selectedName=f.properties.NAME;
  const region=regionMap.get(f._region);
  $('detail-kicker').textContent=region.name;
  $('clear-selection').hidden=false;
  const detail=$('detail');detail.replaceChildren(node('h2',translated(f)));
  if(translated(f)!==f.properties.NAME) detail.append(node('p',f.properties.NAME,'native-name'));
  detail.append(node('span',formatYear(snapshot.year)+' · 地图记录','detail-tag'));
  const dl=node('dl');
  function entry(k,v){dl.append(node('dt',k),node('dd',v));}
  entry('地图中的类型',f.properties.type==='culture'?'文化区域':'政体 / 文化区域（上游记录）');
  const subject=f.properties.SUBJECTO;
  if(subject&&subject!==f.properties.NAME) entry('上游标注的关联或统属',names[subject]||subject);
  if(f.properties.PARTOF&&f.properties.PARTOF!==subject&&f.properties.PARTOF!==f.properties.NAME) entry('所属文化区域（上游标注）',names[f.properties.PARTOF]||f.properties.PARTOF);
  entry('地理分组',region.name);
  detail.append(dl);
  detail.append(node('p','这条记录来自历史地图快照。名称与边界是概括性表示，不代表该群体只有一种语言、文化或生活方式。'));
  const links=f.properties.weblnks||f.properties.WEBLINKS;
  if(links) detail.append(sourceLink(String(links).split(/[;\s]/)[0],'查阅原始条目 ↗'));
  else detail.append(sourceLink('https://github.com/aourednik/historical-basemaps/blob/'+manifest.commit+'/geojson/'+snapshot.filename,'查看该年份的数据来源 ↗'));
  highlight();setURL();
  $('announcement').textContent='已选择 '+translated(f);
}
function focusRegion(id) {
  stop();currentRegion=id;resetDetail();setURL();
  if(!id) svg.transition().duration(350).call(zoom.transform,d3.zoomIdentity);
  else {
    const r=regionMap.get(id),p=projection(r.center);
    svg.transition().duration(450).call(zoom.transform,d3.zoomIdentity.translate(W/2-r.zoom*p[0],H/2-r.zoom*p[1]).scale(r.zoom));
  }
}
function showStory(story) {
  selectedName=null;
  $('detail-kicker').textContent=story.region+' · 探索线索';
  $('clear-selection').hidden=false;
  const detail=$('detail');detail.replaceChildren(node('h2',story.name),node('span',formatYear(story.start)+' — '+formatYear(story.end),'detail-tag'),node('p',story.body),sourceLink(story.source,'阅读 UNESCO 原始资料 ↗'));
  $('question').textContent=story.question;
  highlight();setURL();
  const p=projection([story.lon,story.lat]),k=2.2;
  svg.transition().duration(450).call(zoom.transform,d3.zoomIdentity.translate(W/2-k*p[0],H/2-k*p[1]).scale(k));
}
function renderStories() {
  const active=stories.filter(s=>year>=s.start&&year<=s.end);
  const box=$('stories');box.replaceChildren();
  if(!active.length) box.append(node('p','本年份暂无专题线索。试试点击地图上的区域，或前往 1500 年比较不同文明。','story-empty'));
  active.forEach(s=>{
    const b=node('button',s.name,'story-button');b.append(node('small',s.region+' · 查看线索 →'));b.onclick=()=>showStory(s);box.append(b);
  });
  const groups=pins.selectAll('g').data(active,s=>s.id).join(enter=>{
    const g=enter.append('g').attr('class','story-pin').attr('tabindex',0).attr('role','button');
    g.append('circle').attr('r',7);g.append('text').attr('dy','0.35em').text('+');g.append('title');return g;
  });
  groups.attr('transform',s=>'translate('+projection([s.lon,s.lat])+')').attr('aria-label',s=>s.name).on('click',(e,s)=>{e.stopPropagation();showStory(s);}).on('keydown',(e,s)=>{if(['Enter',' '].includes(e.key)){e.preventDefault();showStory(s);}});
  groups.select('title').text(s=>s.name);
}
function renderCards() {
  const box=$('region-cards');box.replaceChildren();
  regions.forEach(r=>{
    const list=features.filter(f=>f._region===r.id).sort((a,b)=>b._area-a._area);
    const card=node('article',undefined,'region-card');card.style.setProperty('--region-color',r.color);
    const h=node('h3',r.name),focus=node('button','聚焦 ↗');focus.setAttribute('aria-label','聚焦'+r.name);focus.onclick=()=>focusRegion(r.id);h.append(focus);card.append(h);
    if(!list.length) card.append(node('small','本快照暂无记录；不代表没有历史。'));
    list.slice(0,4).forEach(f=>{const b=node('button',translated(f),'polity');b.title=f.properties.NAME;b.onclick=()=>{selectFeature(f);$('detail').scrollIntoView({block:'nearest',behavior:'smooth'});};card.append(b);});
    card.append(node('small',list.length+' 条地图记录 · '+formatYear(snapshot.year)));
    box.append(card);
  });
}
function normalizeGeometry(feature) {
  // D3 uses clockwise spherical exterior rings; RFC 7946 often uses the opposite.
  // Normalize each polygon independently, preserving holes and multi-polygons.
  const fix = coordinates => {
    const p={type:'Polygon',coordinates};
    return d3.geoArea(p)>2*Math.PI ? coordinates.map(r=>[...r].reverse()) : coordinates;
  };
  const g=feature.geometry;
  if(g.type==='Polygon') g.coordinates=fix(g.coordinates);
  else if(g.type==='MultiPolygon') g.coordinates=g.coordinates.map(fix);
  feature._area=d3.geoArea(feature);
  feature._center=d3.geoCentroid(feature);
  feature._region=regionFor(feature._center);
  return feature;
}
function draw(geo) {
  features=geo.features.filter(f=>f.geometry&&['Polygon','MultiPolygon'].includes(f.geometry.type)).map(normalizeGeometry).sort((a,b)=>b._area-a._area);
  const paths=territories.selectAll('path').data(features,(_,i)=>i).join('path').attr('class','territory').attr('d',geoPath).attr('fill',f=>regionMap.get(f._region).color).attr('role','button').attr('tabindex',-1).attr('aria-label',translated);
  paths.on('click',(event,f)=>{event.stopPropagation();selectFeature(f);}).on('pointermove',(event,f)=>{
    const tip=$('tooltip'),stage=$('map-stage').getBoundingClientRect();
    tip.textContent=translated(f);tip.hidden=false;
    tip.style.left=Math.min(stage.width-240,Math.max(8,event.clientX-stage.left+15))+'px';
    tip.style.top=Math.max(8,event.clientY-stage.top-40)+'px';
  }).on('pointerleave',()=>{$('tooltip').hidden=true;});
  paths.selectAll('title').data(f=>[f]).join('title').text(f=>translated(f)+' · '+formatYear(snapshot.year));
  // Keep only spatially separated large-region labels; all names remain searchable.
  const occupied=[];
  const labelFeatures=features.filter(f=>{
    if(f._area<0.006||f._area>6) return false;
    const p=projection(f._center);if(!p||p.some(v=>!Number.isFinite(v)))return false;
    if(occupied.some(q=>Math.abs(p[0]-q[0])<90&&Math.abs(p[1]-q[1])<23))return false;
    occupied.push(p);return true;
  }).slice(0,40);
  labels.selectAll('text').data(labelFeatures).join('text').attr('class','map-label').attr('x',f=>projection(f._center)[0]).attr('y',f=>projection(f._center)[1]).text(f=>{
    const s=translated(f);return s.length>14?s.slice(0,12)+'…':s;
  });
  renderCards();renderStories();
  const selected=features.find(f=>f.properties.NAME===selectedName);
  if(selected) selectFeature(selected); else resetDetail();
  highlight();search();
}
async function loadYear(value,updateURL=true) {
  const request=++version;
  year=normalizeYear(value);
  snapshot=snapshotFor(year,manifest.snapshots);
  const requested=snapshot;
  $('year-title').textContent=formatYear(year);$('year-input').value=year;$('timeline').value=year;
  $('timeline').setAttribute('aria-valuetext',formatYear(year));
  $('era-label').textContent=eras.find(e=>year>=e.from&&year<=e.to).name;
  $('china-link').href='/jiangshan-map/?view=china&year='+Math.max(-403,year);
  $('china-link').title=year< -403?'中国详图从公元前403年开始':'进入同年中国详图';
  $('snapshot-label').textContent='地图快照 · '+formatYear(snapshot.year);
  $('timeline-note').textContent=year===snapshot.year?'49 个离散历史快照 · 当前年份有地图记录 · 数据截至2010年':'所选 '+formatYear(year)+'；疆域显示 '+formatYear(snapshot.year)+' 快照，不插值推断边界。';
  $('previous').disabled=year<=manifest.snapshots[0].year;$('next').disabled=year>=manifest.snapshots.at(-1).year;
  const buttons=[...document.querySelectorAll('.era-buttons button')];
  const active=[...buttons].reverse().find(b=>Number(b.dataset.year)<=year);
  buttons.forEach(b=>b.classList.toggle('active',b===active));
  $('search-results').hidden=true;$('tooltip').hidden=true;$('map-error').hidden=true;$('loading').hidden=false;
  if(updateURL)setURL();
  try {
    if(!cache.has(requested.filename)) {
      const promise=fetch('./data/'+requested.filename).then(r=>{if(!r.ok)throw new Error('Map unavailable');return r.json();}).catch(e=>{cache.delete(requested.filename);throw e;});
      cache.set(requested.filename,promise);
    }
    const data=await cache.get(requested.filename);
    if(request!==version||disposed)return false;
    draw(data);$('loading').hidden=true;
    // Limit the browser cache to a few snapshots, rather than retaining the whole atlas.
    if(cache.size>5)cache.delete(cache.keys().next().value);
    return true;
  } catch(error) {
    if(request!==version)return false;
    $('loading').hidden=true;$('map-error').hidden=false;stop();
    console.error(error);
    return false;
  }
}
function search() {
  const q=$('search').value.trim().toLowerCase(),results=$('search-results');results.replaceChildren();
  if(!q){results.hidden=true;return;}
  const matches=features.filter(f=>(translated(f)+' '+f.properties.NAME+' '+(f.properties.SUBJECTO||'')).toLowerCase().includes(q));
  results.hidden=false;
  if(!matches.length)results.append(node('p','本快照没有匹配记录。可切换年份，或试试英文名称。'));
  matches.slice(0,20).forEach(f=>{
    const b=node('button',translated(f));b.append(node('small',f.properties.NAME));
    b.onclick=()=>{selectFeature(f);results.hidden=true;$('search').value='';const p=projection(f._center),k=2.5;svg.transition().duration(400).call(zoom.transform,d3.zoomIdentity.translate(W/2-k*p[0],H/2-k*p[1]).scale(k));};
    results.append(b);
  });
}
function stop(){playing=false;clearTimeout(timer);$('play').textContent='▶ 播放';$('play').setAttribute('aria-pressed','false');}
async function playStep(){
  if(!playing)return;
  if(year>=2010){stop();return;}
  const success=await loadYear(adjacentSnapshot(year,1,manifest.snapshots));
  if(playing&&success)timer=setTimeout(playStep,2300);
}
regions.forEach(r=>{const b=node('button',r.name);b.dataset.region=r.id;b.setAttribute('aria-pressed','false');const dot=node('i');dot.style.background=r.color;b.prepend(dot);b.onclick=()=>focusRegion(currentRegion===r.id?null:r.id);$('regions').append(b);});
$('search').addEventListener('input',search);
$('search').addEventListener('keydown',e=>{if(e.key==='Escape')$('search-results').hidden=true;});
$('reset').onclick=()=>focusRegion(null);
$('clear-selection').onclick=()=>{currentRegion=null;resetDetail();setURL();};
$('zoom-in').onclick=()=>svg.transition().duration(200).call(zoom.scaleBy,1.5);
$('zoom-out').onclick=()=>svg.transition().duration(200).call(zoom.scaleBy,1/1.5);
$('retry').onclick=()=>loadYear(year);
$('year-form').onsubmit=e=>{e.preventDefault();stop();loadYear($('year-input').value);};
$('timeline').addEventListener('input',()=>{stop();clearTimeout(debounce);const value=$('timeline').value;$('year-title').textContent=formatYear(normalizeYear(value));debounce=setTimeout(()=>loadYear(value),120);});
$('timeline').addEventListener('change',()=>{clearTimeout(debounce);loadYear($('timeline').value);});
$('previous').onclick=()=>{stop();loadYear(adjacentSnapshot(year,-1,manifest.snapshots));};
$('next').onclick=()=>{stop();loadYear(adjacentSnapshot(year,1,manifest.snapshots));};
document.querySelectorAll('[data-year]').forEach(b=>b.onclick=()=>{stop();loadYear(Number(b.dataset.year));});
$('play').onclick=()=>{if(playing){stop();return;}playing=true;$('play').textContent='Ⅱ 暂停';$('play').setAttribute('aria-pressed','true');playStep();};
$('share').onclick=async()=>{try{await navigator.clipboard.writeText(location.href);$('share').textContent='已复制链接';setTimeout(()=>$('share').textContent='复制当前视图链接',2000);}catch{$('share').textContent='请复制浏览器地址栏链接';}};
$('about-open').onclick=()=>{stop();$('about').showModal();};
$('about-close').onclick=()=>$('about').close();
$('about').addEventListener('click',e=>{if(e.target===$('about')){const b=$('about').getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)$('about').close();}});
document.addEventListener('keydown',e=>{
  if(['INPUT','BUTTON','TEXTAREA','SELECT'].includes(e.target.tagName)||$('about').open||!manifest)return;
  if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();stop();loadYear(adjacentSnapshot(year,e.key==='ArrowRight'?1:-1,manifest.snapshots));}
  if(e.key==='Escape'){$('search-results').hidden=true;focusRegion(null);}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
window.addEventListener('pagehide',()=>{disposed=true;stop();});
window.addEventListener('pageshow',()=>{disposed=false;});
window.addEventListener('popstate',()=>{stop();const q=new URLSearchParams(location.search);currentRegion=regionMap.has(q.get('region'))?q.get('region'):null;selectedName=q.get('polity');loadYear(normalizeYear(q.get('year')),false);});
try {
  const response=await fetch('./snapshots.json');if(!response.ok)throw new Error('Missing snapshot index');
  manifest=await response.json();
  currentRegion=initialRegion;selectedName=initialPolity;
  await loadYear(normalizeYear(params.get('year')));
  if(initialRegion){const r=regionMap.get(initialRegion),p=projection(r.center);svg.call(zoom.transform,d3.zoomIdentity.translate(W/2-r.zoom*p[0],H/2-r.zoom*p[1]).scale(r.zoom));}
}catch(error){$('loading').hidden=true;$('map-error').hidden=false;$('retry').onclick=()=>location.reload();console.error(error);}
