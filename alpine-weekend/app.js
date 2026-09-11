'use strict';
const $=id=>document.getElementById(id);
const LOCATIONS=[[46.0679,11.1211],[46.5406,11.6177],[46.6696264,11.1615718],[46.0679,11.1211]];
const DATE='2026-09-12',START=420,DEPART=960,HIKE_KM=11.1;
const BUDGET={people:4,fuel:20,tolls:20,parking:30,detourFuel:10,spaParking:8,spa:19,limit:45};
const money=n=>'€'+n.toFixed(2);
function budgetTotals(){
  const shared=BUDGET.fuel+BUDGET.tolls+BUDGET.parking+(state.merano?BUDGET.detourFuel+BUDGET.spaParking:0);
  const tickets=state.merano?BUDGET.spa*BUDGET.people:0,total=shared+tickets,perPerson=total/BUDGET.people;
  return {shared,tickets,total,perPerson,remaining:BUDGET.limit-perPerson};
}
const MONT_SEUC=[46.557884,11.664667];
const state={time:START,playing:false,speed:1,merano:true,selected:1,view:'overview',phase:null,lastTick:0};
let map,car,walker,driveLayers=[],hikeLayers=[],stopMarkers=[],hikeProgress,routeData=[],directRoute,hikeData,weatherData=[],hikeTrack;
const hikePhotoMarkers=new Map();
const fmt=m=>`${String(Math.floor(m/60)).padStart(2,'0')}:${String(Math.floor(m%60)).padStart(2,'0')}`;
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const endTime=()=>state.merano?1260:1065;
const SITE_SOURCES={montseuc:'https://www.montseuc.it/en/contact-and-location.asp',montLoop:'https://www.valgardena.it/en/outdoor/base/outdoor/hike-to-the-sanon-hut-and-contrin/810054383/',approach:'https://www.seiser-alm.it/de/freizeit-aktiv/berge-wandern/seiser-alm-panoramatour/',returnWalk:'https://www.dolomitisuperski.com/en/outdoor~Spaziergang-auf-der-Seiser-Alm_51085199~',seiser:'https://www.seiseralm.it/it/le-localita-turistiche/localita-turistiche/alpe-di-siusi.html',puflatsch:'https://www.suedtirol.info/de/de/erlebnisse-und-events/plp-erlebnisse/erlebnisse-suedtirol/pdp-erlebnisse.smgpoi6af98cb6de2e22ce1ffbb5b17b729a38.puflatschumrundung.seiseralm',peer:'https://www.seiser-alm.it/de/freizeit-aktiv/berge-wandern/puflatschrundweg-und-hexenbaenke/',merano:'https://www.termemerano.it/en/',balneum:'https://balneum.bz.it/it/chiusura-per-manutenzione-balneum-sterzing-07-09-18-09-inclusi/',bolzano:'https://www.bolzano-bozen.it/it/strade-e-piazze-storiche/piazza-delle-erbe.html',trento:'https://www.visittrentino.info/en/trentino/tourist-areas/trento-monte-bondone-and-the-pine-plateau_md_16'};
const IMAGES={
trailIntro:{"file": "trail-pastures-2", "caption": "草甸尽头，是裸岩群峰", "sub": "高原景观 · 夏季资料图", "alt": "开阔绿色草甸与背后裸露岩壁的长石山、扁石山", "source": "https://www.seiser-alm.it/de/highlights/natur-landschaft/almen/", "credit": "PG, © Peer", "position": "50% 50%"},
trailApproach:{"file": "trail-panorama-trail-0", "caption": "从 Compatsch 走入高原", "sub": "Compatsch → Saltria 方向", "alt": "从Compatsch向Saltria方向延伸的道路、花草甸与远处山峰", "source": "https://www.seiser-alm.it/de/freizeit-aktiv/berge-wandern/seiser-alm-panoramatour/", "credit": "AT, © Peer", "position": "50% 50%"},
trailContrin:{"file": "trail-contrin-panorama", "caption": "Contrin · 一整片山野", "sub": "草甸、长石山与扁石山", "alt": "Contrin山屋官方全景中的广阔夏季草甸和灰白多洛米蒂岩峰", "source": "http://www.malgacontrin.it/", "credit": "Malga Contrin / Contrin Hütte 官方图片", "position": "0% 50%"},
trailContrinWide:{"file": "trail-contrin-schlern", "caption": "露台外的 Sciliar 岩壁", "sub": "Contrin 山屋观景", "alt": "Contrin露台木桌与背后裸露的Sciliar岩壁", "source": "http://www.malgacontrin.it/", "credit": "Malga Contrin / Contrin Hütte 官方图片", "position": "50% 50%"},
trailMont:{"file": "trail-panorama-trail-8", "caption": "Piz · 迎面而来的双峰", "sub": "Mont Sëuc / Piz 观景区域", "alt": "Piz观景区域眺望长石山、扁石山和绿色草甸", "source": "https://www.seiser-alm.it/de/freizeit-aktiv/berge-wandern/seiser-alm-panoramatour/", "credit": "Peer / seiser-alm.it（页面主图，未单独署名摄影师）", "position": "55% 50%"},
trailSchgaguler:{"file": "trail-schgaguler-summer-wide", "caption": "Schgaguler · 岩峰下的绿坡", "sub": "山屋与周围草甸", "alt": "Schgaguler山屋旁宽广草坡与后方裸露的长石山、扁石山", "source": "https://www.schgagulerschwaige.com/en/", "credit": "Schgaguler Schwaige / Dalpiaz（原文件署名）", "position": "65% 50%"},
trailSchgWide:{"file": "trail-schgaguler-summer-peaks", "caption": "在山脚，停一小会儿", "sub": "Schgaguler 山屋", "alt": "Schgaguler山屋和草甸背后的长石山、扁石山山群", "source": "https://www.schgagulerschwaige.com/en/", "credit": "Schgaguler Schwaige 官方图片", "position": "60% 50%"},
trailSanon:{"file": "trail-sanon-summer1", "caption": "Sanon · 铺开的绿色山谷", "sub": "草甸与双峰 · 晨光资料图", "alt": "Sanon山屋周围起伏绿色大草甸和晨光中的长石山、扁石山", "source": "https://www.sanon.it/summer_de.html", "credit": "Sanon Hütte / Malga Sanon 官方夏季图库", "position": "75% 50%"},
trailSanonMist:{"file": "trail-sanon-summer3", "caption": "薄雾、草坡与远山", "sub": "Sanon 草甸 · 晨间资料图", "alt": "Sanon山屋、草甸奶牛、晨雾与后方裸露岩峰", "source": "https://www.sanon.it/summer_de.html", "credit": "Sanon Hütte / Malga Sanon 官方夏季图库", "position": "60% 50%"},
trailReturn:{"file": "trail-pastures-1", "caption": "大草甸，延伸到 Sciliar", "sub": "高原周边景观资料图", "alt": "连绵绿色草甸、小木屋与背后高耸裸露的Sciliar岩壁", "source": "https://www.seiser-alm.it/de/highlights/natur-landschaft/almen/", "credit": "PG, © Peer", "position": "50% 50%"},
montseuc:{file:'mont-seuc',caption:'Mont Seuc 山顶全景',sub:'Ortisei 缆车上站 · 2,000 m',alt:'Mont Seuc餐厅露台望向长石山、扁石山和休斯高原草甸',source:SITE_SOURCES.montseuc,credit:'Restaurant Mont Sëuc（官方图片）'},
sanon:{file:'sanon',caption:'Sanon · 草甸山屋',sub:'回程的咖啡停靠点',alt:'Sanon山屋、露台与周围的夏季草甸',source:'https://www.seiseralm.it/en/enjoyment-experience/enjoyment/restaurants-bars/46e54f8ecef4472ea115f0253b109314-g-sanonhuette.html',credit:'Seiser Alm 旅游局 / Sanonhütte 场馆资料图'},
ritsch:{file:'ritsch',caption:'Ritsch 高原草甸',sub:'附近景观 · 傍晚资料图',alt:'Ritsch酒店周围的夏季草甸和晚光中的Sciliar山群',source:'https://www.ritschschwaige.com/de/lage-umgebung/panoramahotel',credit:'Hotel Ritsch / Fabian Dalpiaz'},
seiseralm:{file:'seiseralm',caption:'多洛米蒂的草甸与群峰',sub:'SEISER ALM',alt:'休斯高原草甸、木屋与多洛米蒂山峰',source:SITE_SOURCES.seiser,credit:'Seiser Alm / Sjoerd Bracke（文件署名）'},
engelrast:{file:'puflatsch-engelrast',caption:'Engelrast 观景点',sub:'环线上的开阔山景',alt:'Engelrast 绿色草甸与多洛米蒂全景',source:SITE_SOURCES.peer,credit:'AT, © Peer'},
goller:{file:'puflatsch-gollerspitz',caption:'Goller 十字架',sub:'俯瞰山谷的停靠点',alt:'Gollerspitz山顶十字架和山谷全景',source:SITE_SOURCES.peer,credit:'AT, © Peer'},
merano:{file:'merano-pool-evening',caption:'Merano · 把傍晚交给温泉',sub:'Terme Merano · 场馆傍晚资料图',alt:'Merano 温泉玻璃大厅、蓝绿色泳池与温暖的弧形灯光',source:'https://www.termemerano.it/en/pools-sauna/indoorpools/',credit:'Terme Merano / Oliver Jaist',position:'50% 60%'},
pool:{file:'merano-whirlpool',caption:'山路之后，暖水与气泡',sub:'2 小时泡池 · €19 / 人',alt:'Merano 温泉玻璃建筑旁的室外气泡按摩池',source:'https://www.termemerano.it/en/pools-sauna/indoorpools/',credit:'Terme Merano / KOTTERSTEGER',position:'50% 75%'},
bolzano:{file:'bolzano',caption:'香草广场的老城颜色',sub:'PIAZZA DELLE ERBE',alt:'博尔扎诺香草广场花市与彩色建筑，日间资料图片',source:SITE_SOURCES.bolzano,credit:'Bolzano 官方旅游局'},
trento:{file:'trento',caption:'从特伦托的清晨出发',sub:'TRENTO / PIAZZA DUOMO',alt:'Trento主教座堂广场、喷泉与市民塔',source:SITE_SOURCES.trento,credit:'Visit Trentino / Luca Rotondo'},
trentoExtra:{file:'trento-extra',caption:'博恩孔西利奥城堡',sub:'TRENTO · 城市资料图',alt:'Trento博恩孔西利奥城堡庭园与文艺复兴立面',source:'https://www.visittrento.it/en/points-of-interest/buonconsiglio-castle',credit:'APT Trento / VisitTrento'},
bolzanoExtra:{file:'bolzano-extra',caption:'拱廊街，慢慢逛',sub:'BOLZANO / BOZEN',alt:'博尔扎诺骑楼街的拱廊与灯光',source:'https://www.suedtirol.info/en/en/experiences-and-events/plp-experiences/experiences-south-tyrol/pdp-experience.smgpoice5e032b7ccea843146788a015211b06.portici-laubengasse.bolzano-centro-bozen-zentrum',credit:'Südtirol.info / Tourism Board Bolzano Bozen'}
};
const PLACES=[
{name:'Trento',eyebrow:'01 / THE EARLY START',subtitle:'07:00 出发，给上山留足余量',photos:['trento','trentoExtra'],description:'带上早餐、水和 P2 预约二维码。计划 08:20 到 Info point，09:00 前通过检查站。',action:'查看完整自驾路线',weather:'trento'},
{name:'Mont Seuc',eyebrow:'02 / MONT SËUC & SANON',subtitle:'Almgasthof Mont Seuc · Ortisei 缆车山顶站',photos:['trailIntro','trailSanon','trailContrin','trailMont','montseuc','trailSchgaguler','trailReturn','seiseralm'],description:'P2 / Compatsch → Contrin → Mont Seuc 山顶站 → Schgaguler → Sanon → Compatsch / P2。走东侧草甸，12:00 在山顶站午餐。',action:'放大地图 · 看 Mont Seuc 一圈',weather:'montseuc'},
{name:'Merano',eyebrow:'OPTIONAL / A WARM EVENING',subtitle:'Terme Merano · 17:30–19:30 泡池',photos:['merano','pool'],description:'16:00 从 P2 下山，约 17:15 停好车。17:30–19:30 温泉停留（含更衣），19:45 驾车回 Trento。',action:'加入 Merano 温泉',weather:'merano'},
{name:'Trento · 归途',eyebrow:'BACK HOME / A COMPLETE CIRCLE',subtitle:'回到 Trento，晚饭自行安排',photos:['trentoExtra','trento'],description:'温泉后直接回 Trento，预计 21:00 到家；关闭温泉选项则约 17:45 返回。所有餐饮均不计入预算。',action:'查看返程安排',weather:'trento'}
];

// Photo chapters follow distance along the walking track, including the lunch pause.
const TRAIL_SCENES=[
  {key:'compatsch',title:'出发 · 高原大草甸',progress:0,photos:['trailIntro','trailApproach'],note:'从 Compatsch 走入起伏的草甸'},
  {key:'contrin',title:'Contrin · 草坡与群峰',progress:.3531189405,photos:['trailContrin','trailContrinWide'],note:'绿草坡后，是多洛米蒂的灰白岩壁'},
  {key:'montseuc',title:'Mont Seuc · 山顶全景',progress:.4720328243,photos:['trailMont','montseuc'],note:'12:00–13:00 · 山顶站午餐与观景'},
  {key:'schgaguler',title:'Schgaguler · 山脚草甸',progress:.5631795305,photos:['trailSchgaguler','trailSchgWide'],note:'转入下行草坡，朝 Sanon 方向走'},
  {key:'sanon',title:'Sanon · 草甸中的山屋',progress:.6874634882,photos:['trailSanon','trailSanonMist'],note:'开阔草甸、远处岩峰，与一杯咖啡'},
  {key:'return',title:'返程 · 再看一眼群峰',progress:.94,photos:['trailReturn','seiseralm'],note:'沿草甸步道返回 Compatsch / P2'}
];
function sceneProgress(scene){return hikeData?.waypoints?.find(p=>p.key===scene.key)?.progress??scene.progress;}
function activeTrailScene(f=hikeFraction()){
  for(let i=0;i<TRAIL_SCENES.length-1;i++)if(f<(sceneProgress(TRAIL_SCENES[i])+sceneProgress(TRAIL_SCENES[i+1]))/2)return TRAIL_SCENES[i];
  return TRAIL_SCENES.at(-1);
}
function timeAtTrailProgress(f){const lunch=hikeData?.properties?.lunchProgress??.4720328243;return f<=lunch?540+180*f/lunch:780+150*(f-lunch)/(1-lunch);}
function selectTrailScene(key){
  const scene=TRAIL_SCENES.find(s=>s.key===key);if(!scene)return;
  state.playing=false;state.time=timeAtTrailProgress(sceneProgress(scene));showPlace(1);render();
  if(state.view!=='hike')setMapView('hike');
}
function trailAnchor(scene){return hikeData?.waypoints?.find(p=>p.key===scene.key)?.coordinates||along(hikeTrack,sceneProgress(scene)).point;}

function track(points){const lengths=[0];for(let i=1;i<points.length;i++){const [a,b]=points[i-1],[c,d]=points[i],r=Math.PI/180;const h=Math.sin((c-a)*r/2)**2+Math.cos(a*r)*Math.cos(c*r)*Math.sin((d-b)*r/2)**2;lengths.push(lengths[i-1]+6371000*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h)));}return {points,lengths,total:lengths.at(-1)};}
function along(t,f){if(!t?.points?.length)return {point:LOCATIONS[1],index:0};if(t.points.length===1)return {point:t.points[0],index:0};const target=t.total*clamp(f);let lo=1,hi=t.lengths.length-1;while(lo<hi){const mid=(lo+hi)>>1;if(t.lengths[mid]<target)lo=mid+1;else hi=mid;}const q=(target-t.lengths[lo-1])/(t.lengths[lo]-t.lengths[lo-1]||1),a=t.points[lo-1],b=t.points[lo];return {point:[a[0]+(b[0]-a[0])*q,a[1]+(b[1]-a[1])*q],index:lo};}
function routes(){return state.merano?[{data:routeData[0],start:420,end:525,color:'#3c6542'},{data:routeData[1],start:960,end:1035,color:'#b88a55'},{data:routeData[2],start:1185,end:1260,color:'#6f9094'}]:[{data:routeData[0],start:420,end:525,color:'#3c6542'},{data:directRoute,start:960,end:1065,color:'#6f9094'}];}
function hikeFraction(){const f=hikeData?.properties?.lunchProgress??.4720328243,t=state.time;if(t<720)return f*clamp((t-540)/180);if(t<780)return f;return f+(1-f)*clamp((t-780)/150);}
function getStage(){const t=state.time;
if(t<525)return {id:0,phase:'drive-up',activity:t<500?'向休斯高原出发':'通过 Info point，驶向 P2',description:t<500?'07:00 上路 · 08:20 计划通过检查点':'09:00 前通过检查站 · P2 需提前预约'};
if(t<540)return {id:1,phase:'plateau',activity:'抵达 P2 · 准备徒步',description:'09:00 出发，走向 Mont Seuc 这一侧'};
if(t<720)return {id:1,phase:'plateau',activity:'经 Contrin，走向 Mont Seuc',description:`已走 ${(HIKE_KM*hikeFraction()).toFixed(1)} / ${HIKE_KM} km · 12:00 山顶站午餐`};
if(t<780)return {id:1,phase:'plateau',activity:'Mont Seuc · 山顶站午餐',description:'12:00–13:00 · 露台与长石山全景 · 餐饮另付'};
if(t<930)return {id:1,phase:'plateau',activity:'经 Sanon 草甸，回到 P2',description:`已走 ${(HIKE_KM*hikeFraction()).toFixed(1)} / ${HIKE_KM} km · 约 15:30 回到起点`};
if(t<945)return {id:1,phase:'plateau',activity:'回到 Compatsch · 短暂休息',description:'11.1 km 圈线已完成 · 15:45 回车位'};
if(t<960)return {id:1,phase:'plateau',activity:'回到 P2 · 提前下山',description:'16:00 离开休斯高原'};
if(state.merano&&t<1035)return {id:2,phase:'drive-merano',activity:'16:00 下山 · 前往 Merano',description:'约 17:15 到温泉车库 · 17:30 入场'};
if(state.merano&&t<1050)return {id:2,phase:'spa-arrival',activity:'抵达 Merano · 停车与入场',description:'携带泳衣、拖鞋、浴巾 · 停车票到收银台验证'};
if(state.merano&&t<1170)return {id:2,phase:'spa',activity:'Merano · 暖水与气泡',description:'17:30–19:30 · 2 小时含更衣 · 泡池票 €19 / 人'};
if(state.merano&&t<1185)return {id:2,phase:'spa-exit',activity:'离开温泉 · 走回车库',description:'19:30 前完成温泉离场 · 19:45 开车回家'};
if(t<endTime())return {id:3,phase:'drive-home',activity:'回 Trento 的路上',description:state.merano?'19:45 从 Merano 出发 · 约 21:00 返回':'16:00 从 P2 下山 · 约 17:45 返回'};
return {id:3,phase:'home',activity:'回到 Trento · 行程完成',description:'晚饭自行安排 · 餐饮不计入本页预算'};}
function setupMap(){if(!window.L){$('map').innerHTML='<p class="map-error">地图暂时无法加载，图片、天气与行程仍可查看。</p>';return;}map=L.map('map',{zoomControl:false,scrollWheelZoom:false,zoomSnap:.25,attributionControl:true}).setView([46.52,11.4],9);L.control.zoom({position:'topright'}).addTo(map);L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);car=L.marker(LOCATIONS[0],{icon:L.divIcon({className:'',html:'<div class="car">🚙</div>',iconSize:[37,37],iconAnchor:[18,42]}),interactive:false,keyboard:false,zIndexOffset:1000}).addTo(map);walker=L.marker(hikeTrack?.points?.[0]||LOCATIONS[1],{icon:L.divIcon({className:'',html:'<div class="walker">🚶</div>',iconSize:[37,37],iconAnchor:[18,42]}),interactive:false,keyboard:false,zIndexOffset:1200});drawRoads();drawHike();map.on('movestart zoomstart',()=>document.querySelector('.map-panel').classList.add('map-moving'));map.on('moveend zoomend',()=>{clearTimeout(photoLayoutTimer);photoLayoutTimer=setTimeout(()=>{document.querySelector('.map-panel').classList.remove('map-moving');schedulePhotoLayout();},80);});setMapView('overview',false);}
function drawRoads(){if(!map)return;driveLayers.forEach(l=>map.removeLayer(l));stopMarkers.forEach(l=>map.removeLayer(l));driveLayers=[];stopMarkers=[];routes().forEach(({data,color})=>{if(!data)return;driveLayers.push(L.polyline(data.points,{color:'white',weight:8,opacity:.95}).addTo(map));driveLayers.push(L.polyline(data.points,{color,weight:4,opacity:.95}).addTo(map));});const names=[['Trento','07:00 出发 / '+fmt(endTime())+' 返回'],['Seiser Alm · P2','08:45 抵达 / 16:00 下山'],['Merano · Terme','17:30–19:30 泡池']];LOCATIONS.forEach((point,i)=>{if(i===3||(i===2&&!state.merano))return;const marker=L.marker(point,{icon:L.divIcon({className:'',html:`<div class="map-stop map-stop-${i} ${i===2?'optional selected':''}"><span class="map-pin">${i===2?'+':i===3?(state.merano?'04':'03'):'0'+(i+1)}</span><span class="map-stop-label">${names[i][0]}<small>${names[i][1]}</small></span></div>`,iconSize:[150,40],iconAnchor:[12,18]}),zIndexOffset:100}).on('click',()=>selectPlace(i)).addTo(map);stopMarkers.push(marker);});if(state.view==='hike')setRoadVisibility(false);}
function drawHike(){if(!map||!hikeTrack)return;hikeLayers.forEach(l=>map.removeLayer(l));hikeLayers=[];hikePhotoMarkers.clear();hikeLayers.push(L.polyline(hikeTrack.points,{color:'white',weight:8,opacity:.9}));hikeLayers.push(L.polyline(hikeTrack.points,{color:'#96ab7d',weight:5,dashArray:'7 7',opacity:1}));hikeProgress=L.polyline([],{color:'#416b36',weight:5,opacity:1});hikeLayers.push(hikeProgress);const start=hikeTrack.points[0];const startMarker=L.circleMarker(start,{radius:6,color:'#fff',weight:3,fillColor:'#466f38',fillOpacity:1}).bindTooltip('P2 附近 · 起终点',{permanent:true,interactive:true,direction:'right',className:'hike-label photo-checkpoint',offset:[7,0]}).on('click',()=>selectTrailScene('compatsch'));startMarker.getTooltip().on('click',()=>selectTrailScene('compatsch'));hikePhotoMarkers.set('compatsch',startMarker);hikeLayers.push(startMarker);hikeLayers.push(L.circleMarker(LOCATIONS[1],{radius:5,color:'#fff',weight:2,fillColor:'#647a91',fillOpacity:1}).bindTooltip('P2 停车场',{permanent:true,direction:'top',className:'hike-label',offset:[0,-8]}));if(hikeData?.waypoints)hikeData.waypoints.forEach((p,i)=>{const ll=p.coordinates||p.point||p.latlng;if(ll){const marker=L.circleMarker(ll,{radius:p.key==='montseuc'?7:5,color:'#fff',weight:2,fillColor:p.key==='montseuc'?'#b78345':'#709157',fillOpacity:1}).bindTooltip(p.name,{permanent:true,interactive:true,direction:p.direction||'right',className:'hike-label photo-checkpoint'+(p.key==='montseuc'?' destination-label':''),offset:p.direction==='top'?[0,-8]:[6,0]}).on('click',()=>selectTrailScene(p.key));marker.getTooltip().on('click',()=>selectTrailScene(p.key));hikePhotoMarkers.set(p.key,marker);hikeLayers.push(marker);}});const returnMarker=L.circleMarker(trailAnchor(TRAIL_SCENES.at(-1)),{radius:5,color:'#fff',weight:2,fillColor:'#709157',fillOpacity:1}).bindTooltip('返程草甸',{permanent:true,interactive:true,direction:'bottom',className:'hike-label photo-checkpoint',offset:[0,8]}).on('click',()=>selectTrailScene('return'));returnMarker.getTooltip().on('click',()=>selectTrailScene('return'));hikePhotoMarkers.set('return',returnMarker);hikeLayers.push(returnMarker);}
function setRoadVisibility(visible){[...driveLayers,...stopMarkers].forEach(l=>{if(visible){if(!map.hasLayer(l))l.addTo(map);}else if(map.hasLayer(l))map.removeLayer(l);});}
function setMapView(view,animate=true){state.view=view;$('overview-button').classList.toggle('selected',view==='overview');$('hike-button').classList.toggle('selected',view==='hike');$('hike-map-card').hidden=view!=='hike';$('trail-scenes').hidden=state.selected!==1;$('map-caption').hidden=view==='hike';$('map-legend').hidden=view==='hike';if(!map)return;const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches,compact=map.getSize().x<800,tall=map.getSize().y>750;document.querySelector('.map-panel').classList.toggle('map-compact',map.getSize().x<540);if(view==='hike'&&hikeTrack){setRoadVisibility(false);hikeLayers.forEach(l=>{if(!map.hasLayer(l))l.addTo(map);});if(map.hasLayer(car))map.removeLayer(car);if(!map.hasLayer(walker))walker.addTo(map);const pts=[...hikeTrack.points,LOCATIONS[1]];map.fitBounds(L.latLngBounds(pts),{paddingTopLeft:compact?[40,275]:[180,225],paddingBottomRight:compact?[70,tall?350:160]:[190,175],maxZoom:15.5,animate:animate&&!reduced,duration:.8});}else{hikeLayers.forEach(l=>{if(map.hasLayer(l))map.removeLayer(l);});if(map.hasLayer(walker))map.removeLayer(walker);if(!map.hasLayer(car))car.addTo(map);setRoadVisibility(true);const pts=state.merano?LOCATIONS:LOCATIONS.filter((_,i)=>i!==2);map.fitBounds(L.latLngBounds(pts),{paddingTopLeft:compact?[38,205]:[170,170],paddingBottomRight:compact?[80,tall?320:155]:[180,175],animate:animate&&!reduced,duration:.8});}updateMarkers();schedulePhotoLayout();}
function updateMarkers(){if(!map)return;const t=state.time;let point=LOCATIONS[0];
for(const leg of routes()){if(!leg.data||t<leg.start)continue;point=t>=leg.end?leg.data.points.at(-1):along(leg.data.track,(t-leg.start)/(leg.end-leg.start)).point;}
car.setLatLng(point);if(hikeTrack){const f=hikeFraction(),step=along(hikeTrack,f);walker.setLatLng(step.point);if(hikeProgress)hikeProgress.setLatLngs(f===0?[]:[...hikeTrack.points.slice(0,step.index),step.point]);}}
function walkingDistance(){const t=state.time,loop=HIKE_KM*hikeFraction();const parking=.1*clamp((t-525)/15)+.1*clamp((t-945)/15);const spa=state.merano?.2*clamp((t-1035)/15)+.2*clamp((t-1170)/15):0;return loop+parking+spa;}
function costAtTime(){
const legs=routes(),duration=legs.reduce((sum,r)=>sum+r.end-r.start,0),completed=legs.reduce((sum,r)=>sum+clamp(state.time-r.start,0,r.end-r.start),0);
const transport=(BUDGET.fuel+BUDGET.tolls+(state.merano?BUDGET.detourFuel:0))*(duration?completed/duration:0);
const parking=(state.time>=525?BUDGET.parking:0)+(state.merano&&state.time>=1035?BUDGET.spaParking:0);
return (transport+parking)/BUDGET.people+(state.merano&&state.time>=1050?BUDGET.spa:0);}
function render(){const stage=getStage();if(state.selected===1&&$('gallery').dataset.scene!==activeTrailScene().key)showPlace(1);if(stage.phase!==state.phase){const previous=state.phase;state.phase=stage.phase;if(previous!==null){setMapView(stage.phase==='plateau'?'hike':'overview');if(state.playing)showPlace(stage.id);}}updateMarkers();$('clock').textContent=fmt(state.time);$('current-activity').textContent=stage.activity;$('current-description').textContent=stage.description;$('time-slider').value=state.time;$('time-slider').setAttribute('aria-valuetext',fmt(state.time)+'，'+stage.activity);const percent=(state.time-420)/(endTime()-420)*100;$('time-slider').style.background=`linear-gradient(to right,#496b40 ${percent}%,#e8efdf ${percent}%)`;$('elapsed').textContent=`${Math.floor((state.time-420)/60)}h ${String(Math.floor((state.time-420)%60)).padStart(2,'0')}m`;$('cost').textContent=money(costAtTime());$('walking').innerHTML=walkingDistance().toFixed(1)+' <em>km</em>';$('progress-label').textContent=state.time===420?'准备出发':state.time===endTime()?'今天的行程完成':Math.round(percent)+'% · 行程预演';$('play').textContent=state.playing?'Ⅱ':'▶';$('play').setAttribute('aria-label',state.playing?'暂停行程':'播放行程');document.querySelectorAll('.stop').forEach(b=>{const active=+b.dataset.stop===stage.id;b.classList.toggle('active',active);b.setAttribute('aria-current',active?'step':'false');});}
function setTime(t,syncGallery=false){state.time=clamp(t,420,endTime());if(syncGallery)showPlace(getStage().id);render();}
function selectPlace(i){state.playing=false;showPlace(i);if(i===2&&!state.merano){setMapView('overview');render();return;}setTime([420,540,1050,endTime()][i]);setMapView(i===1?'hike':'overview');}
function showPlace(i){
  state.selected=i;const p=PLACES[i],scene=i===1?activeTrailScene():null,photos=scene?scene.photos:p.photos;
  $('gallery-title').textContent=p.name;$('gallery-eyebrow').textContent=p.eyebrow;
  $('gallery-subtitle').textContent=scene?scene.title:p.subtitle;$('gallery-description').textContent=scene?scene.note:p.description;
  $('gallery-action').innerHTML=(i===1?'整圈照片 · 随步行位置切换':i===2?(state.merano?'已加入 · 查看温泉安排':'加入 Merano 温泉'):p.action)+' <span>↗</span>';
  $('photo-count').textContent=photos.length;$('trail-scenes').hidden=!scene;
  const galleryKey=i+':'+(scene?.key||'city');
  if($('gallery').dataset.place!==galleryKey){
    $('gallery').dataset.place=galleryKey;$('gallery').dataset.scene=scene?.key||'';
    $('gallery').setAttribute('aria-label',scene?scene.title+' · 沿途照片':'地图上的景点照片');
    $('gallery').innerHTML=photos.map((key,n)=>{const im=IMAGES[key];return `<div class="map-photo" data-key="${key}" style="--tilt:${[-1.5,1.3][n]}deg;--delay:${n*110}ms"><button class="gallery-photo" data-photo="${key}" aria-label="查看大图：${im.caption}"><img src="./assets/${im.file}.jpg" alt="${im.alt}" style="object-position:${im.position||'50% 50%'}"><span class="photo-number">${scene?'ON THE TRAIL / 0'+(TRAIL_SCENES.indexOf(scene)+1):'HIGHLIGHT / 0'+(n+1)}</span><span class="photo-caption">${im.caption}<small>${im.sub}</small></span></button></div>`;}).join('');
    if(scene){
      $('trail-scene-status').textContent=scene.title;
      document.querySelectorAll('[data-trail-scene]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.trailScene===scene.key)));
      for(const [key,marker] of hikePhotoMarkers){const active=key===scene.key;marker.setRadius(active?8:key==='montseuc'?7:5);marker.setStyle({fillColor:active?'#bc894d':key==='montseuc'?'#b78345':'#709157'});}
      const next=TRAIL_SCENES[TRAIL_SCENES.indexOf(scene)+1];if(next)next.photos.forEach(key=>{const img=new Image();img.src='./assets/'+IMAGES[key].file+'.jpg';});
    }
  }
  updateWeather();schedulePhotoLayout();
}
function updatePlan(){const end=endTime(),totals=budgetTotals();
$('merano-toggle').checked=state.merano;$('merano-badge').textContent=state.merano?'已加入':'未加入';$('merano-time').textContent='17:30–19:30 · '+(state.merano?'已加入':'可选');$('merano-thumb').src='./assets/merano-pool-evening.jpg';$('merano-thumb').alt='Merano 温泉玻璃大厅与夜色中的泳池';
$('home-stop-time').textContent=fmt(end)+' 左右返回';$('home-number').textContent=state.merano?'04':'03';
const km=routes().reduce((n,r)=>n+(r.data?.distanceKm||0),0);$('drive-total').textContent=km?'约 '+Math.round(km)+' km 自驾往返':'正在读取道路里程';
$('plan-summary').textContent=state.merano?'高原 → Merano 温泉 → Trento':'高原 → Trento · 不泡温泉';$('time-slider').max=end;
$('total-time').textContent='/ 约 '+Math.floor((end-420)/60)+'h'+((end-420)%60?String((end-420)%60)+'m':'');
$('budget-total').textContent='/ 计划 '+money(totals.perPerson)+' / 人';$('budget-party').textContent=BUDGET.people+' 人同车 · 不含餐饮';$('walking-total').textContent=state.merano?'/ 全程约 11.7 km':'/ 全程约 11.3 km';
$('deadline-tick').style.left=(540-420)/(end-420)*100+'%';
const marks=state.merano?[[420,'07:00'],[540,'09:00'],[720,'12:00'],[960,'16:00 下山'],[1050,'17:30 泡池'],[1260,'21:00']]:[[420,'07:00'],[540,'09:00'],[720,'12:00'],[960,'16:00 下山'],[1065,'17:45']];
$('time-labels').innerHTML=marks.map(([time,label])=>`<button data-time="${time}" class="${time===540?'deadline-time':''}" style="left:${(time-420)/(end-420)*100}%">${label}</button>`).join('');if(state.time>end)state.time=end;state.phase=null;drawRoads();setMapView(state.view,false);showPlace(state.selected);render();}
function toggleMerano(){state.merano=$('merano-toggle').checked;state.playing=false;updatePlan();}
function weatherRows(data){let rows=data.rows.filter(r=>r.time.startsWith(DATE));if(data.location==='montseuc')rows=rows.filter(r=>[9,12,15,16].includes(+r.time.slice(11,13)));if(data.location==='trento')rows=rows.filter(r=>state.selected===0?+r.time.slice(11,13)===7:state.merano?+r.time.slice(11,13)>=20:[17,18].includes(+r.time.slice(11,13)));return rows;}
function weatherLabel(code){return code>=95?['⛈','雷雨']:code>=71&&code<=77?['❄','降雪']:code>=51?['🌧','有降水']:code>=45?['🌫','雾']:code===3?['☁','多云']:code===2?['⛅','晴间多云']:['☀','晴到少云'];}
function forecastStamp(data){return data.retrieved_at?new Date(data.retrieved_at).toLocaleString('zh-CN',{timeZone:'Europe/Rome',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}):'9/11 预报快照';}
function updateWeather(){const key=PLACES[state.selected].weather,data=weatherData.find(d=>d.location===key);if(!data?.rows?.length){$('weather-temp').textContent='天气暂未加载';$('weather-description').textContent='本周六 9 月 12 日';$('weather-hours').innerHTML='';return;}
const rows=weatherRows(data);if(!rows.length)return;const temps=rows.map(r=>r.temperature_2m),min=Math.min(...temps),max=Math.max(...temps),rain=Math.max(...rows.map(r=>r.precipitation_probability)),label=weatherLabel(Math.max(...rows.map(r=>r.weather_code)));
$('weather-temp').textContent=rows.length===1?min.toFixed(1)+'°C':`${Math.round(min)}–${Math.round(max)}°C`;$('weather-icon').textContent=label[0];$('weather-description').textContent=`9/12 · ${label[1]} · 降水 ${rain}%`;
$('weather-hours').style.gridTemplateColumns=`repeat(${rows.length},1fr)`;$('weather-hours').innerHTML=rows.map(r=>`<div class="weather-hour"><time>${r.time.slice(11)}</time><strong>${r.temperature_2m.toFixed(1)}°</strong><small>${r.wind_speed_10m.toFixed(1)} km/h 风</small></div>`).join('');$('weather-source').textContent='Open-Meteo · '+(key==='montseuc'?'2,000m · ':'')+forecastStamp(data);$('weather-hours').dataset.date=DATE;}
function openDialog(html){state.playing=false;render();$('dialog-content').innerHTML=html;if(!$('detail-dialog').open)$('detail-dialog').showModal();}
function openImage(key){const im=IMAGES[key];openDialog(`<img class="dialog-image full" src="./assets/${im.file}.jpg" alt="${im.alt}"><div class="dialog-body"><h2>${im.caption}</h2><p>${im.sub}</p><small>资料图片，不代表本周六天气、季节或开放状态。${im.credit}</small><p><a href="${im.source}" target="_blank" rel="noopener noreferrer">图片来源 ↗</a></p></div>`);}
function openPlace(){const p=PLACES[state.selected];const bodies=[`<p>07:00 从 Trento 出发，08:20 目标通过 St. Valentin 检查站，08:45 计划抵达 P2。道路模型约 91 km / 76 分钟，额外预留交通与上山缓冲。</p><p>请事先预约 P2，保存二维码并核对车牌。09:00 前过检查站的限制不因停车预约而豁免。</p>`,`<p>这次走 <strong>Almgasthof Mont Seuc / Bergstation Seiser Alm</strong> 这一侧，从 P2 附近出发，经 Contrin 到 Ortisei 缆车山顶站，再由 Schgaguler、Sanon 草甸返回 Compatsch / P2。</p><p>整条 P2 往返圈线约 <strong>11.1 km</strong>，包含从停车区走到 Mont Seuc 的路程。山顶站附近的官方 Sanon–Contrin 小圈为 6.3 km；本页组合了 P2 衔接路段，因此里程不同。</p><ul><li>09:00–12:00：P2 → Contrin → Mont Seuc，含沿途拍照。</li><li>12:00–13:00：Mont Seuc 山顶站午餐与观景。</li><li>13:00–15:30：Schgaguler → Sanon → Compatsch / P2，含途中休息。</li><li>15:30 后：Compatsch 自由休息；15:45 回车位，16:00 下山。</li></ul><p>步行和拍照共预留约 5.5 小时，另留 1 小时午餐。全程按步行规划，不需要乘坐 Ortisei 或 Sonne 缆车；午餐可在山顶站休息时自行安排，餐厅尚未预约；午餐消费未计入本次交通、停车与温泉预算。</p><p>地图由已发布的夏季 GPX 分段组合，属于本次行程的规划轨迹；并非一条未经修改的官方环线，也不是实时导航。P2 车位到步道的短连接另估约 0.2 km 往返，请按现场路标通行。</p><div class="highlight-links"><a href="${SITE_SOURCES.montseuc}" target="_blank" rel="noopener noreferrer">Mont Seuc 山顶站餐厅 ↗</a><a href="${SITE_SOURCES.montLoop}" target="_blank" rel="noopener noreferrer">官方 Mont Seuc / Sanon 夏季步道 ↗</a><a href="${SITE_SOURCES.approach}" target="_blank" rel="noopener noreferrer">Compatsch → Piz 进山路段 ↗</a><a href="${SITE_SOURCES.returnWalk}" target="_blank" rel="noopener noreferrer">Sanon → Compatsch 返回路段 ↗</a><a href="./assets/mont-seuc-p2.gpx" download>下载本次规划 GPX ↓</a></div>`,`<p>16:00 从 P2 下山，约 17:15 到 Terme Merano 地下车库，17:30 入场。<strong>17:30–19:30 为 2 小时完整停留，含更衣与离场</strong>，19:45 从车库出发回 Trento。</p><p>9 月 12 日适用夏季成人泡池票 <strong>€19/人</strong>；本方案不含独立桑拿区、按摩或租赁浴巾。带好泳衣、拖鞋和浴巾。票价核对于 2026-09-11，建议提前购票，尚未核实当日余票。</p><p>室内池 09:00–21:00，最晚 19:00 入场、20:40 清场；夏季室外池 09:00–20:00、19:40 清场。2 小时票超时按官方规则加收费用。</p><p>P2 → Merano 道路模型约 67.7 km / 68 分钟，安排 75 分钟；返程 Merano → Trento 约 83.9 km / 62 分钟，安排 75 分钟。车程不含实时堵车。全程约 243 km，比直接往返多约 61 km。</p><p>2 小时票含温泉车库 1 小时停车优惠，请到主收银台验证停车票。另预留 €8/车停车费和 €10/车绕行油费，均为估算缓冲，按实际结算。</p><div class="highlight-links"><a href="https://www.termemerano.it/en/prices-and-information/prices/" target="_blank" rel="noopener noreferrer">官方票价与购票 ↗</a><a href="https://www.termemerano.it/en/prices-and-information/opening-hours/" target="_blank" rel="noopener noreferrer">开放时间 ↗</a><a href="https://www.termemerano.it/en/prices-and-information/parking/" target="_blank" rel="noopener noreferrer">温泉停车优惠 ↗</a></div>`,`<p>${state.merano?'19:30 完成温泉离场，19:45 从 Merano 车库出发，预计 21:00 返回 Trento。':'16:00 从 P2 下山，约 17:45 返回 Trento。道路模型约 90.9 km / 77 分钟，安排 105 分钟。'}</p><p>本页路线包含返回 Trento。晚饭自行安排，不再设置 Bolzano 餐厅停靠；早餐、午餐、晚餐、咖啡和饮料均不计入预算。</p><p>步行总量包括 11.1 km 草甸圈线、P2 车位衔接约 0.2 km${state.merano?'及温泉车库往返约 0.4 km':''}。车库步行距离为预估，不包含额外逛街。</p>`];openDialog(`<div class="dialog-body"><div class="eyebrow">${p.eyebrow}</div><h2>${p.name}</h2><div class="mini-gallery">${p.photos.slice(0,2).map(k=>`<img src="./assets/${IMAGES[k].file}.jpg" alt="${IMAGES[k].alt}">`).join('')}</div>${bodies[state.selected]}</div>`);}
function openWeather(){const data=weatherData.find(d=>d.location===PLACES[state.selected].weather);if(!data)return openDialog('<div class="dialog-body"><h2>天气暂未加载</h2><p>请刷新后重试。</p></div>');const rows=weatherRows(data);openDialog(`<div class="dialog-body"><div class="eyebrow">SATURDAY / 12 SEPTEMBER 2026</div><h2>${PLACES[state.selected].name} · 周六天气</h2><p>2026-09-12 · Europe/Rome。${data.location==='montseuc'?'Mont Seuc 山顶站模型点按 2,000 m 海拔计算。':''}</p><table><thead><tr><th>时间</th><th>气温</th><th>降水概率</th><th>风 / 阵风 km/h</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${r.time.slice(11)}</td><td>${r.temperature_2m.toFixed(1)}°C</td><td>${r.precipitation_probability}%</td><td>${r.wind_speed_10m.toFixed(1)} / ${r.wind_gusts_10m.toFixed(1)}</td></tr>`).join('')}</tbody></table><p>查询时间：${forecastStamp(data)} CEST。本页显示预报快照，不是实测或实时更新。</p><div class="highlight-links"><a href="${data.source_url}" target="_blank" rel="noopener noreferrer">Open-Meteo 数据来源 ↗</a><a href="https://www.provinz.bz.it/weather/mobile/bergwetter.asp" target="_blank" rel="noopener noreferrer">官方山区天气 ↗</a></div></div>`);}
function openBudget(){const totals=budgetTotals();const row=(label,total)=>`<tr><td>${label}</td><td>${money(total)}</td><td>${money(total/BUDGET.people)}</td></tr>`;
openDialog(`<div class="dialog-body"><div class="eyebrow">FOUR FRIENDS / MEALS NOT INCLUDED</div><h2>${money(totals.perPerson)} / 人</h2><p>4 人同乘 1 辆车，按 4 张成人票计算。${state.merano?'已加入 Merano 2 小时泡池。':'未加入温泉，直接往返 Trento。'}<strong>所有餐饮均排除。</strong></p><div class="budget-headroom"><strong>所列项目上限 €45.00 / 人</strong><span>预计余量 ${money(totals.remaining)} / 人</span></div><table class="budget-table"><thead><tr><th>项目</th><th>整车 / 全组</th><th>每人分摊</th></tr></thead><tbody>${row('基础油费 · 沿用给定金额',BUDGET.fuel)}${row('高速费 · 沿用给定金额',BUDGET.tolls)}${row('P2 停车费',BUDGET.parking)}${state.merano?row('Merano 绕行油费 · 预留',BUDGET.detourFuel)+row('温泉车库停车 · 预留',BUDGET.spaParking):''}<tr class="budget-subtotal"><td>交通与停车小计</td><td>${money(totals.shared)}</td><td>${money(totals.shared/BUDGET.people)}</td></tr>${state.merano?row('Merano 泡池 · €19 × 4',totals.tickets):''}<tr><th>合计 · 4 人</th><th>${money(totals.total)}</th><th>${money(totals.perPerson)}</th></tr></tbody></table><p class="budget-formula">${state.merano?'(€20 + €20 + €30 + €10 + €8) ÷ 4 + €19':'(€20 + €20 + €30) ÷ 4'} = <strong>${money(totals.perPerson)} / 人</strong></p><p>早餐、午餐、晚餐、咖啡与饮料不计入。无缆车票；温泉桑拿区、按摩、浴巾租赁及超时费未计入。</p>${state.merano?'<p>Merano 绕行比直接回 Trento 多约 61 km，额外油费预留 €10/车。温泉停车另预留 €8/车，并非核实后的固定报价；2 小时票享 1 小时车库停车优惠，需到主收银台验证。以上预留均按实际结算。</p><div class="highlight-links"><a href="https://www.termemerano.it/en/prices-and-information/prices/" target="_blank" rel="noopener noreferrer">9/12 夏季泡池票价 ↗</a><a href="https://www.termemerano.it/en/prices-and-information/parking/" target="_blank" rel="noopener noreferrer">车库停车优惠 ↗</a></div>':''}<small>基础油费 €20、高速费 €20 为您提供的整车预算；本页将其作为直接往返预算沿用。€45 为不含餐饮的目标，实际费用以油耗、通行与停车结算为准。状态栏累计的是计划费用。</small></div>`);}
function openDeadline(){openDialog(`<div class="dialog-body"><div class="eyebrow">THE ONLY HARD DEADLINE</div><h2>09:00 前，通过 Info point</h2><p class="warning"><strong>09:00 不是到 P2 的时间，而是通过上山检查站的硬截止。</strong>即使已预约停车，也必须提前通过 St. Valentin 检查站。</p><ul><li><strong>08:20 计划目标：</strong>通过检查站，预留约 40 分钟缓冲；这是规划时间，非车程保证。</li><li><strong>09:00–17:00：</strong>限制私家车上山。下山全天允许，因此 16:00 从 P2 出发可行。</li><li><strong>P2 Compatsch：</strong>自 2026-06-29 起须网上预约，小汽车 €30/天；到访日前 6 天开始放票，数量有限。</li><li><strong>09:30 前：</strong>进入 P2 停车场。这个时间不能替代 09:00 检查站截止。</li><li>预约需核对车牌，并保存进出场二维码；尚未核实具体日期余位，也没有替你完成预约。</li></ul><div class="highlight-links"><a href="https://www.seiseralm.it/en/info-service/mobility/access-to-seiser-alm/seiser-alm-parking-reservation.html" target="_blank" rel="noopener noreferrer">预约 P2 停车位 ↗</a><a href="https://www.seiseralm.it/en/info-service/mobility/access-to-seiser-alm.html" target="_blank" rel="noopener noreferrer">官方通行规则 ↗</a></div><p><a href="https://www.seiseralm.it/en/info-service/current-information/information-a-z/9AA771C79C64046677206620236F645F-p-parking-p2-compatsch.html" target="_blank" rel="noopener noreferrer">P2 官方价格、预约与入场说明 ↗</a></p><small>核对日期：2026-09-11。季节、政策与余位以官方最新信息为准。</small></div>`);}
$('play').addEventListener('click',()=>{if(state.time>=endTime()){state.time=420;showPlace(0);state.phase=null;setMapView('overview');}state.playing=!state.playing;if(state.playing)showPlace(getStage().id);state.lastTick=0;render();});
$('speed').addEventListener('click',()=>{state.speed=state.speed===1?2:state.speed===2?4:1;$('speed').textContent=state.speed+'×';});
$('replay').addEventListener('click',()=>{state.playing=false;state.phase=null;setTime(420);showPlace(0);setMapView('overview');});
$('time-slider').addEventListener('input',e=>{state.playing=false;setTime(+e.target.value,true);});
$('time-labels').addEventListener('click',e=>{const b=e.target.closest('[data-time]');if(b){state.playing=false;setTime(+b.dataset.time,true);}});
document.querySelectorAll('[data-stop]').forEach(b=>b.addEventListener('click',()=>selectPlace(+b.dataset.stop)));
function focusHike(){selectPlace(1);if(window.innerWidth<=1000)document.querySelector('.map-panel').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});}
['hike-button','hike-jump'].forEach(id=>$(id).addEventListener('click',focusHike));
$('overview-button').addEventListener('click',()=>setMapView('overview'));
$('reset-map').addEventListener('click',()=>setMapView(state.view));
$('merano-toggle').addEventListener('change',toggleMerano);
$('gallery-action').addEventListener('click',()=>{if(state.selected===1)openAlbum();else if(state.selected===2){if(!state.merano){$('merano-toggle').checked=true;toggleMerano();selectPlace(2);}else openPlace();}else if(state.selected===0)setMapView('overview');else openPlace();});
$('photos-toggle').addEventListener('click',()=>{photosVisible=!photosVisible;schedulePhotoLayout();});
$('photo-overflow').addEventListener('click',openAlbum);
$('trail-scenes').addEventListener('click',e=>{const b=e.target.closest('[data-trail-scene]');if(b)selectTrailScene(b.dataset.trailScene);});
$('dialog-content').addEventListener('click',e=>{const b=e.target.closest('[data-album-photo]');if(b)openImage(b.dataset.albumPhoto);});
$('gallery').addEventListener('click',e=>{const b=e.target.closest('[data-photo]');if(b)openImage(b.dataset.photo);});
$('place-details').addEventListener('click',openPlace);$('weather-details').addEventListener('click',openWeather);$('budget-open').addEventListener('click',openBudget);$('deadline-details').addEventListener('click',openDeadline);
document.querySelector('.dialog-close').addEventListener('click',()=>$('detail-dialog').close());$('detail-dialog').addEventListener('click',e=>{if(e.target===e.currentTarget){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
let photosVisible=true,photoLayoutFrame=0,photoLayoutTimer=0;
function schedulePhotoLayout(){cancelAnimationFrame(photoLayoutFrame);photoLayoutFrame=requestAnimationFrame(layoutMapPhotos);}
function photoAnchor(key){if(state.view==='hike'&&state.selected===1)return trailAnchor(activeTrailScene());return LOCATIONS[state.selected];}
function rectOverlaps(a,b,p=0){return a.x<b.x+b.w+p&&a.x+a.w>b.x-p&&a.y<b.y+b.h+p&&a.y+a.h>b.y-p;}
function segmentHitsRect(a,b,r){
  const dx=b.x-a.x,dy=b.y-a.y;let lo=0,hi=1;
  for(const [p,q] of [[-dx,a.x-r.x],[dx,r.x+r.w-a.x],[-dy,a.y-r.y],[dy,r.y+r.h-a.y]]){
    if(p===0){if(q<0)return false;}else{const t=q/p;if(p<0)lo=Math.max(lo,t);else hi=Math.min(hi,t);if(lo>hi)return false;}
  }
  return true;
}
function layoutMapPhotos(){
  const panel=document.querySelector('.map-panel'),gallery=$('gallery'),width=panel.clientWidth,height=panel.clientHeight;
  if(panel.classList.contains('map-moving'))return;
  const compact=width<800;panel.classList.toggle('map-compact',width<540);panel.classList.toggle('map-small-cards',compact);
  gallery.hidden=!photosVisible;$('photo-connectors').hidden=!photosVisible;
  $('photos-toggle').setAttribute('aria-pressed',String(photosVisible));
  if(!photosVisible){$('photo-overflow').hidden=true;return;}
  const base=panel.getBoundingClientRect(),obstacles=[];
  for(const el of panel.querySelectorAll('.map-toolbar,.map-context,.map-weather,.player,.map-legend,.leaflet-control,.map-pin,.map-stop-label,.hike-label,.car,.walker')){
    if(!el.getClientRects().length)continue;const r=el.getBoundingClientRect();
    if(r.width&&r.height)obstacles.push({x:r.left-base.left,y:r.top-base.top,w:r.width,h:r.height});
  }
  const tracks=state.view==='hike'&&hikeTrack?[hikeTrack.points]:routes().filter(r=>r.data).map(r=>r.data.points);
  const segments=[];
  if(map)for(const points of tracks){const projected=points.map(p=>map.latLngToContainerPoint(p));for(let i=1;i<projected.length;i++){const a=projected[i-1],b=projected[i];if(Math.max(a.x,b.x)>=0&&Math.min(a.x,b.x)<=width&&Math.max(a.y,b.y)>=0&&Math.min(a.y,b.y)<=height)segments.push([a,b]);}}
  const cards=[...gallery.children],placed=[],links=[];let missing=0;
  cards.forEach((card,i)=>{
    const key=card.dataset.key,anchor=map?map.latLngToContainerPoint(photoAnchor(key)):{x:width/2,y:height/2};
    const preferredX=i%2===0?16:width-16,preferredY=i===2?height*.61:height*.35;
    let best=null;
    for(const scale of [1,.86,.72,.6]){
      const w=Math.round((compact?170:i===0?290:270)*scale),h=Math.round((compact?123:i===0?193:182)*scale);
      const xs=new Set([16,width-w-16]),ys=new Set([compact?215:195,height-h-153]);
      for(let x=16;x<=width-w-16;x+=24)xs.add(x);
      for(let y=compact?185:75;y<=height-h-149;y+=22)ys.add(y);
      const oldX=parseFloat(card.style.left),oldY=parseFloat(card.style.top);
      if(Number.isFinite(oldX)&&oldX>=16&&oldX+w<=width-16){xs.add(oldX);ys.add(oldY);}
      for(const y of ys)for(const x of xs){
        if(y<70||y+h>height-145)continue;
        const r={x,y,w,h},safe={x:x-28,y:y-12,w:w+56,h:h+62};
        if(obstacles.some(o=>rectOverlaps(r,o,10))||placed.some(o=>rectOverlaps(r,o,18)))continue;
        if(segments.some(([a,b])=>segmentHitsRect(a,b,safe)))continue;
        const edge=Math.min(x,width-x-w),distance=Math.hypot(x+w/2-anchor.x,y+h/2-anchor.y);
        const stable=Number.isFinite(oldX)?Math.hypot(x-oldX,y-oldY)*.18:0;
        const score=edge*.65+Math.abs(x+(i%2?w:0)-preferredX)*.12+Math.abs(y-preferredY)*.18+distance*.13+stable;
        if(!best||score<best.score)best={...r,score};
      }
      if(best)break;
    }
    card.hidden=!best;
    if(!best){missing++;return;}
    placed.push(best);card.classList.toggle('small-photo',best.w<145);card.style.setProperty('--card-width',best.w+'px');card.style.setProperty('--card-height',best.h+'px');card.style.left=best.x+'px';card.style.top=best.y+'px';
    card.style.setProperty('--from-x',clamp(anchor.x-best.x-best.w/2,-350,350)+'px');card.style.setProperty('--from-y',clamp(anchor.y-best.y-best.h/2,-300,300)+'px');
    const newCard=!card.classList.contains('placed');card.classList.add('placed');
    if(newCard){card.classList.add('entering');card.addEventListener('animationend',()=>card.classList.remove('entering'),{once:true});}
    if(anchor.x>8&&anchor.x<width-8&&anchor.y>65&&anchor.y<height-145){
      const x=clamp(anchor.x,best.x+12,best.x+best.w-12),y=clamp(anchor.y,best.y+12,best.y+best.h-12);
      links.push(`<path class="photo-connector" d="M ${anchor.x} ${anchor.y} Q ${(anchor.x+x)/2} ${y} ${x} ${y}"/><circle class="photo-origin" cx="${anchor.x}" cy="${anchor.y}" r="4"/>`);
    }
  });
  $('photo-connectors').innerHTML=links.join('');$('photo-overflow').hidden=missing===0;
  $('photo-overflow').textContent='相册 · '+cards.length+' ↗';$('photo-overflow').title='地图上还未展开 '+missing+' 张，查看全部照片';
}
function albumPhoto(key){const im=IMAGES[key];return `<button data-album-photo="${key}"><img src="./assets/${im.file}.jpg" alt="${im.alt}" loading="lazy"><span>${im.caption}<small>${im.sub}</small></span></button>`;}
function openAlbum(){
  const p=PLACES[state.selected];
  const photos=state.selected===1?TRAIL_SCENES.map((scene,i)=>`<section class="trail-album-section"><h3><span>0${i+1}</span> ${scene.title}<small>约 ${(sceneProgress(scene)*HIKE_KM).toFixed(1)} km 处</small></h3><p>${scene.note}</p><div class="album-grid">${scene.photos.map(albumPhoto).join('')}</div></section>`).join(''):`<div class="album-grid">${p.photos.map(albumPhoto).join('')}</div>`;
  openDialog(`<div class="dialog-body"><div class="eyebrow">${p.eyebrow}</div><h2>${state.selected===1?'走一段，换一幅风景':p.name+' · 景点照片'}</h2>${state.selected===1?'<p>六段沿途风景，随地图上的步行位置自动切换。照片为沿途地点或周边高原景观资料，点击可看大图与具体来源。</p>':''}${photos}</div>`);
}

function frame(ts){if(state.lastTick&&state.playing){setTime(state.time+Math.min(100,ts-state.lastTick)*.006*state.speed);if(state.time>=endTime()){state.playing=false;render();}}state.lastTick=ts;requestAnimationFrame(frame);}
let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(map){map.invalidateSize();setMapView(state.view,false);}},180);});
async function init(){$('trail-scenes').innerHTML='<span>沿途照片</span>'+TRAIL_SCENES.map((s,i)=>`<button data-trail-scene="${s.key}" aria-label="预览${s.title}" title="${s.title}" aria-pressed="false">${i+1}</button>`).join('');showPlace(1);const names=['routes.json','direct-route.json','hike.json','weather.json'];const results=await Promise.allSettled(names.map(n=>fetch('./assets/'+n+'?v=merano-wellness-2').then(r=>{if(!r.ok)throw Error(n);return r.json();})));routeData=results[0].status==='fulfilled'?results[0].value:[];directRoute=results[1].status==='fulfilled'?results[1].value:undefined;hikeData=results[2].status==='fulfilled'?results[2].value:undefined;weatherData=results[3].status==='fulfilled'?results[3].value:[];for(const r of [...routeData,directRoute].filter(Boolean))r.track=track(r.points);if(hikeData?.points)hikeTrack=track(hikeData.points);if(!hikeTrack){$('hike-route-note').textContent='规划轨迹暂未载入，请刷新重试';$('hike-button').disabled=true;$('hike-jump').disabled=true;}setupMap();updatePlan();render();schedulePhotoLayout();requestAnimationFrame(frame);}
init();
