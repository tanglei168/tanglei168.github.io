import './vendor/d3.min.js';
import { formatYear, normalizeYear, snapshotFor, adjacentSnapshot, regionFor, safeSource } from './core.mjs';
import { regions, names, stories, eras } from './content.mjs';
const d3 = globalThis.d3;
const $ = id => document.getElementById(id);
const svg = d3.select('#world-map');
let W = $('map-stage').clientWidth, H = $('map-stage').clientHeight;
const projection = d3.geoMercator().scale(W/(2*Math.PI)).translate([W/2,H/2+W*0.07]);
const geoPath = d3.geoPath(projection);
const layer = svg.append('g');
layer.append('path').attr('class','sphere').attr('d',geoPath({type:'Sphere'}));
layer.append('path').attr('class','graticule').attr('d',geoPath(d3.geoGraticule10()));
const territories = layer.append('g');
const labels = layer.append('g');
const pins = layer.append('g');
const zoom = d3.zoom().scaleExtent([1,10]).extent([[0,0],[W,H]]).translateExtent([[-W,-H],[2*W,2*H]]).on('zoom',event => {
  layer.attr('transform',event.transform);
  renderLabels(event.transform);
  pins.selectAll('g').attr('transform',s=>'translate('+projection([s.lon,s.lat])+') scale('+1/event.transform.k+')');
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
function hasName(f) {return typeof f.properties.NAME === 'string' && !!f.properties.NAME.trim();}
function regionalFeatures(id) {
  const unique = new Map();
  for (const f of features.filter(f=>hasName(f) && f._region===id)) {
    const name=f.properties.NAME;
    if(!unique.has(name)) unique.set(name,{...f});
    else unique.get(name)._area += f._area;
  }
  return [...unique.values()].sort((a,b)=>b._area-a._area);
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
  $('clear-selection').hidden=false;
  const d=$('detail');d.replaceChildren();
  d.append(node('h2',currentRegion?'把这一片世界看近一点':'先看世界，再看彼此'));
  d.append(node('p',currentRegion?'这里列出本期地图中归入该地区的政体与文化区域。选择一个名称，观察它的位置。':'点击地图上的一块区域，了解它在这一时期的名称与关联。也可以从下方选择一个地区。'));
  if(currentRegion) {
    const list=node('div',undefined,'region-detail-list');
    regionalFeatures(currentRegion).forEach(f=>{
      const b=node('button',translated(f));b.onclick=()=>selectFeature(f);list.append(b);
    });
    d.append(list);
  }
  $('question').textContent=eras.find(e=>year>=e.from&&year<=e.to).question;
  highlight();
}
function highlight() {
  territories.selectAll('path').classed('selected',f=>!!selectedName && hasName(f) && f.properties.NAME===selectedName).classed('dim',f=>currentRegion&&f._region!==currentRegion);
  document.querySelectorAll('#regions button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.region===currentRegion)));
}
function sourceLink(url, text) {
  const href=safeSource(url);
  if(!href) return node('span','原始资料未提供链接');
  const a=node('a',text);a.href=href;a.target='_blank';a.rel='noopener';return a;
}
function selectFeature(f) {
  setDetail(true);
  if(currentRegion && currentRegion !== f._region) currentRegion = null;
  if(!hasName(f)) return;
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
  stop();currentRegion=id;resetDetail();setURL();setDetail(!!id);$('regions').hidden=true;$('region-toggle').setAttribute('aria-expanded','false');
  if(!id) svg.transition().duration(350).call(zoom.transform,d3.zoomIdentity);
  else {
    const r=regionMap.get(id),p=projection(r.center);
    svg.transition().duration(450).call(zoom.transform,d3.zoomIdentity.translate(W/2-r.zoom*p[0],H/2-r.zoom*p[1]).scale(r.zoom));
  }
}
function showStory(story) {
  setDetail(true);
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
  groups.attr('transform',s=>'translate('+projection([s.lon,s.lat])+') scale('+1/d3.zoomTransform(svg.node()).k+')').attr('aria-label',s=>s.name).on('click',(e,s)=>{e.stopPropagation();showStory(s);}).on('keydown',(e,s)=>{if(['Enter',' '].includes(e.key)){e.preventDefault();showStory(s);}});
  groups.select('title').text(s=>s.name);
}
function renderCards() {
  const box=$('region-cards');box.replaceChildren();
  regions.forEach(r=>{
    const list=regionalFeatures(r.id);
    const card=node('article',undefined,'region-card');card.style.setProperty('--region-color',r.color);
    const h=node('h3',r.name),focus=node('button','聚焦 ↗');focus.setAttribute('aria-label','聚焦'+r.name);focus.onclick=()=>focusRegion(r.id);h.append(focus);card.append(h);
    if(!list.length) card.append(node('small','本快照暂无记录；不代表没有历史。'));
    list.slice(0,4).forEach(f=>{const b=node('button',translated(f),'polity');b.title=f.properties.NAME;b.onclick=()=>{selectFeature(f);fitFeature(f);};card.append(b);});
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
  const paths=territories.selectAll('path').data(features,(_,i)=>i).join('path').attr('class','territory').attr('d',geoPath).attr('fill',f=>hasName(f)?polityColor(f.properties.SUBJECTO||f.properties.NAME):'#eeeee4').attr('role','button').attr('tabindex',-1).attr('aria-label',translated);
  paths.on('dblclick',(event,f)=>{event.preventDefault();event.stopPropagation();selectFeature(f);fitFeature(f);}).on('click',(event,f)=>{event.stopPropagation();selectFeature(f);}).on('pointermove',(event,f)=>{
    const tip=$('tooltip'),stage=$('map-stage').getBoundingClientRect();
    tip.textContent=translated(f);tip.hidden=false;
    tip.style.left=Math.min(stage.width-240,Math.max(8,event.clientX-stage.left+15))+'px';
    tip.style.top=Math.max(8,event.clientY-stage.top-40)+'px';
  }).on('pointerleave',()=>{$('tooltip').hidden=true;});
  paths.selectAll('title').data(f=>[f]).join('title').text(f=>translated(f)+' · '+formatYear(snapshot.year));
  renderLabels();
  renderCards();renderStories();
  const selected=selectedName && features.find(f=>hasName(f) && f.properties.NAME===selectedName);
  const wasOpen=!$('detail-panel').hidden;
  if(selected) selectFeature(selected); else resetDetail();
  setDetail(wasOpen || !!initialPolity && version===1);
  highlight();search();
}
async function loadYear(value,updateURL=true) {
  const request=++version;
  year=normalizeYear(value);
  snapshot=snapshotFor(year,manifest.snapshots);
  const requested=snapshot;
  renderRuler();
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
  const matches=[...new Map(features.filter(f=>hasName(f) && (translated(f)+' '+f.properties.NAME+' '+(f.properties.SUBJECTO||'')).toLowerCase().includes(q)).map(f=>[f.properties.NAME,f])).values()];
  results.hidden=false;
  if(!matches.length)results.append(node('p','本快照没有匹配记录。可切换年份，或试试英文名称。'));
  matches.slice(0,20).forEach(f=>{
    const b=node('button',translated(f));b.append(node('small',f.properties.NAME));
    b.onclick=()=>{selectFeature(f);results.hidden=true;$('search').value='';fitFeature(f);};
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
$('clear-selection').onclick=()=>setDetail(false);
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
$('share').onclick=async()=>{try{await navigator.clipboard.writeText(location.href);$('share').textContent='已复制链接';setTimeout(()=>$('share').textContent='分享',2000);}catch{$('share').textContent='请复制浏览器地址栏链接';}};
$('about-open').onclick=()=>{stop();$('about').showModal();};
$('about-close').onclick=()=>$('about').close();
$('about').addEventListener('click',e=>{if(e.target===$('about')){const b=$('about').getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)$('about').close();}});
document.addEventListener('keydown',e=>{
  if(e.target.id==='timeline-ruler'||['INPUT','BUTTON','TEXTAREA','SELECT'].includes(e.target.tagName)||$('about').open||!manifest)return;
  if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();stop();loadYear(adjacentSnapshot(year,e.key==='ArrowRight'?1:-1,manifest.snapshots));}
  if(e.key==='Escape'){$('search-results').hidden=true;setDetail(false);document.querySelector('.comparison').hidden=true;}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
window.addEventListener('pagehide',()=>{disposed=true;stop();});
window.addEventListener('pageshow',()=>{disposed=false;});
window.addEventListener('popstate',()=>{stop();const q=new URLSearchParams(location.search);currentRegion=regionMap.has(q.get('region'))?q.get('region'):null;selectedName=q.get('polity');loadYear(normalizeYear(q.get('year')),false);});

let labelsVisible=true, timeSpan=1000, rulerScale, rulerDrag=null;
function setDetail(open){
  $('detail-panel').hidden=!open;
  $('detail-toggle').textContent=open?'›':'详情 ‹';
  $('detail-toggle').setAttribute('aria-expanded',String(open));
  document.querySelector('.workspace').classList.toggle('detail-open',open);
  if(open) {
    document.querySelector('.comparison').hidden=true;
    if($('mode-compare').getAttribute('aria-pressed')==='true'){
      $('mode-compare').setAttribute('aria-pressed','false');$('mode-regions').setAttribute('aria-pressed','true');
    }
  }
}
function polityColor(name){let hash=0;for(const c of name) hash=(hash*31+c.charCodeAt(0))|0;return ['#f4dfba','#dbe9d1','#e5d8e8','#f1d8cf','#d4e4e8','#eeeacb','#e4dfce','#d7e0ed'][Math.abs(hash)%8];}
function fitFeature(f){
  const [[x0,y0],[x1,y1]]=geoPath.bounds(f), k=Math.max(1,Math.min(10,0.65/Math.max((x1-x0)/W,(y1-y0)/H)));
  svg.transition().duration(500).call(zoom.transform,d3.zoomIdentity.translate(W/2-k*(x0+x1)/2,H/2-k*(y0+y1)/2).scale(k));
}
function renderLabels(t=d3.zoomTransform(svg.node())){
  const occupied=[],seen=new Set();
  const fontSize=W<600?11:14;
  const candidates=[...features].sort((a,b)=>(b.properties.NAME===selectedName)-(a.properties.NAME===selectedName)||b._area-a._area);
  const visible=labelsVisible?candidates.filter(f=>{
    if(!hasName(f)||seen.has(f.properties.NAME)||f._area*t.k*t.k<0.0015)return false;
    const p=t.apply(projection(f._center));
    const width=Math.min(160,translated(f).length*fontSize+12);
    if(!p.every(Number.isFinite)||p[0]<0||p[0]>W||p[1]<0||p[1]>H)return false;
    if(occupied.some(q=>Math.abs(p[0]-q.x)<(width+q.width)/2&&Math.abs(p[1]-q.y)<25))return false;
    occupied.push({x:p[0],y:p[1],width});seen.add(f.properties.NAME);return true;
  }).slice(0,100):[];
  labels.selectAll('text').data(visible).join('text').attr('class','map-label').attr('x',f=>projection(f._center)[0]).attr('y',f=>projection(f._center)[1]).attr('font-size',fontSize/t.k).attr('stroke-width',3/t.k).text(f=>translated(f).length>18?translated(f).slice(0,16)+'…':translated(f));
}
function resizeMap(){
  const oldW=W,oldH=H,t=d3.zoomTransform(svg.node());
  W=$('map-stage').clientWidth;H=$('map-stage').clientHeight;
  if(!W||!H)return;
  const center=projection.invert(t.invert([oldW/2,oldH/2]));
  projection.scale(W/(2*Math.PI)).translate([W/2,H/2+W*0.07]);
  svg.attr('viewBox',`0 0 ${W} ${H}`);
  zoom.extent([[0,0],[W,H]]).translateExtent([[-W,-H],[2*W,2*H]]);
  layer.select('.sphere').attr('d',geoPath({type:'Sphere'}));layer.select('.graticule').attr('d',geoPath(d3.geoGraticule10()));
  territories.selectAll('path').attr('d',geoPath);
  const p=projection(center);
  svg.call(zoom.transform,t.k===1?d3.zoomIdentity:d3.zoomIdentity.translate(W/2-t.k*p[0],H/2-t.k*p[1]).scale(t.k));
  renderRuler();
}
function renderRuler(){
  const el=$('timeline-ruler'),width=el.clientWidth||W;
  const start=Math.max(-3000,Math.min(2010-timeSpan,year-timeSpan/2));
  rulerScale=d3.scaleLinear().domain([start,start+timeSpan]).range([24,width-24]);
  const r=d3.select(el).attr('viewBox',`0 0 ${width} 62`).attr('aria-valuenow',year).attr('aria-valuetext',formatYear(year));
  r.selectAll('*').remove();
  const ticks=rulerScale.ticks(Math.max(3,Math.floor(width/95)));
  r.append('line').attr('x1',24).attr('x2',width-24).attr('y1',16).attr('y2',16).attr('class','ruler-line');
  const g=r.selectAll('g').data(ticks).join('g').attr('transform',d=>`translate(${rulerScale(d)},0)`);
  g.append('line').attr('y1',7).attr('y2',25).attr('class','ruler-tick');
  g.append('text').attr('y',46).attr('text-anchor','middle').text(d=>d<0?'前'+Math.abs(d):d===0?'纪元':d);
  r.append('circle').attr('cx',rulerScale(year)).attr('cy',16).attr('r',9).attr('class','ruler-cursor');
}
function changeTimeSpan(factor){timeSpan=Math.max(50,Math.min(5010,timeSpan*factor));renderRuler();}
$('detail-toggle').onclick=()=>setDetail($('detail-panel').hidden);
$('labels-toggle').onclick=()=>{labelsVisible=!labelsVisible;$('labels-toggle').setAttribute('aria-pressed',String(labelsVisible));renderLabels();};
$('region-toggle').onclick=()=>{$('regions').hidden=!$('regions').hidden;$('region-toggle').setAttribute('aria-expanded',String(!$('regions').hidden));};
$('fullscreen').hidden=!document.fullscreenEnabled;
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{$('announcement').textContent='当前浏览器无法进入全屏';}};
function mode(name){
  ['regions','stories','compare'].forEach(m=>$('mode-'+m).setAttribute('aria-pressed',String(m===name)));
  pins.style('display',name==='stories'?null:'none');
  setDetail(name==='stories');
  document.querySelector('.comparison').hidden=name!=='compare';
}
pins.style('display','none');
['regions','stories','compare'].forEach(m=>$('mode-'+m).onclick=()=>mode(m));
$('compare-close').onclick=()=>mode('regions');
$('time-zoom-in').onclick=()=>changeTimeSpan(0.5);
$('time-zoom-out').onclick=()=>changeTimeSpan(2);
const ruler=$('timeline-ruler');
ruler.addEventListener('pointerdown',e=>{if(!manifest)return;stop();ruler.setPointerCapture(e.pointerId);rulerDrag={x:e.clientX,year,scale:rulerScale.copy(),width:ruler.clientWidth};});
ruler.addEventListener('pointermove',e=>{if(!rulerDrag)return;const value=normalizeYear(rulerDrag.year-(e.clientX-rulerDrag.x)*timeSpan/(rulerDrag.width-48));clearTimeout(debounce);debounce=setTimeout(()=>loadYear(value),70);});
ruler.addEventListener('pointerup',e=>{if(!rulerDrag)return;clearTimeout(debounce);const dx=e.clientX-rulerDrag.x;const value=Math.abs(dx)<4?rulerDrag.scale.invert(e.clientX-ruler.getBoundingClientRect().left):rulerDrag.year-dx*timeSpan/(rulerDrag.width-48);rulerDrag=null;loadYear(value);});
ruler.addEventListener('pointercancel',()=>{rulerDrag=null;clearTimeout(debounce);});
ruler.addEventListener('wheel',e=>{e.preventDefault();changeTimeSpan(e.deltaY>0?1.15:1/1.15);},{passive:false});
ruler.addEventListener('keydown',e=>{if(!manifest)return;let value;if(e.key==='ArrowRight')value=year+(e.shiftKey?10:1);if(e.key==='ArrowLeft')value=year-(e.shiftKey?10:1);if(e.key==='Home')value=-3000;if(e.key==='End')value=2010;if(value!==undefined){e.preventDefault();stop();loadYear(value);}});
svg.on('click',e=>{if(e.target===svg.node()||e.target.classList.contains('sphere'))setDetail(false);});
new ResizeObserver(resizeMap).observe($('map-stage'));
resizeMap();

try {
  const response=await fetch('./snapshots.json');if(!response.ok)throw new Error('Missing snapshot index');
  manifest=await response.json();
  currentRegion=initialRegion;selectedName=initialPolity;
  await loadYear(normalizeYear(params.get('year')));
  if(initialRegion){const r=regionMap.get(initialRegion),p=projection(r.center);svg.call(zoom.transform,d3.zoomIdentity.translate(W/2-r.zoom*p[0],H/2-r.zoom*p[1]).scale(r.zoom));}
}catch(error){$('loading').hidden=true;$('map-error').hidden=false;$('retry').onclick=()=>location.reload();console.error(error);}
