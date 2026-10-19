
var STATE=null, SES=null;
var VIEW={periodo:'hoy',wk:0,modo:(location.hash==='#encargado'?'encargado':'equipo')};
var DIAS=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
var DC=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
function $(s){return document.querySelector(s);}
// ---- estética por cliente ----
var MARCAS={'manos-carhue':{nombre:'Manos de Carhué',bajada:'Almacén de carnes y fiambres',logo:'/logos/manos-carhue.png',icono:'/logos/manos-carhue-64.png'}};
function cid(){return (STATE&&STATE.cliente&&STATE.cliente.id)||(SES&&SES.cliente)||'';}
function aplicarMarca(id){var M=MARCAS[id];var r=document.documentElement;if(M){r.setAttribute('data-marca',id);var fi=document.getElementById('favicon');if(fi)fi.href=M.icono;try{localStorage.setItem('marca',id);}catch(e){}}else r.removeAttribute('data-marca');}
function marca(){var M=MARCAS[cid()];return M?'<div class="marca"><img class="sello" src="'+M.logo+'" alt=""><div><div class="mn">'+esc(M.nombre)+'</div><div class="ms">'+esc(M.bajada)+'</div></div></div>':'';}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function nf(v,d){return (v==null||isNaN(v)||!isFinite(v))?'–':v.toLocaleString('es-AR',{minimumFractionDigits:d||0,maximumFractionDigits:d||0});}
function pad(n){return (n<10?'0':'')+n;}
function iso(dt){return dt.getFullYear()+'-'+pad(dt.getMonth()+1)+'-'+pad(dt.getDate());}
function D(f){return new Date(f+'T12:00:00');}
function addDays(f,n){var d=D(f);d.setDate(d.getDate()+n);return iso(d);}
function wd(f){return D(f).getDay();}
function fcorta(f){var p=f.split('-');return p[2]+'/'+p[1];}
function hoyReal(){return iso(new Date());}
function hoy(){var r=hoyReal(),i=STATE.metas.inicio;return (i&&r<i)?i:r;}
function previewBanner(){return hoyReal()<hoy()?'<div class="preview">Vista previa: así se va a ver el '+DIAS[wd(hoy())].toLowerCase()+' '+fcorta(hoy())+', cuando arranca la Semana 1.</div>':'';}
function metaDia(f){if(f<(STATE.metas.inicio||'')) return 0; var e=STATE.metas.especiales[f];return +(e!=null?e:STATE.metas.tkDia[wd(f)])||0;}
function nota(f){return (STATE.notas||{})[f]||'';}
function cerrado(f){return metaDia(f)===0;}
function diasPOS(){return STATE.dias.filter(function(d){return d.tickets>0;});}
function byDate(){var m={};diasPOS().forEach(function(d){m[d.fecha]=d;});return m;}
function estado(real,meta){if(real==null||!meta||isNaN(real)) return null;var r=real/meta;return r>=1?'good':(r>=0.95?'warn':'bad');}
var ST_TXT={good:'✓ En meta',warn:'● Cerca',bad:'▼ Debajo'};
function pill(s){return s?'<span class="st '+s+'">'+ST_TXT[s]+'</span>':'';}
var SECT=['Carnicería','Fiambrería','Caja'];
function sectNom(a){return a==='Caja'?'En caja':(a==='Fiambrería'?'En fiambrería':'En carnicería');}
var MESES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

// ---- periods ----
function semana(off){var t=hoy();var w=wd(t);var lun=addDays(t,-(w===0?6:w-1)+7*off);var ds=[];for(var i=0;i<7;i++)ds.push(addDays(lun,i));return ds;}
function INI(){return STATE.metas.inicio||'2026-09-28';}
function mesFechas(){var t=hoy();var y=+t.slice(0,4),m=+t.slice(5,7);var n=new Date(y,m,0).getDate();var ds=[];for(var i=1;i<=n;i++)ds.push(y+'-'+pad(m)+'-'+pad(i));return ds.filter(function(f){return f>=INI();});}
function periodoFechas(){
  if(VIEW.periodo==='semana') return semana(VIEW.wk);
  if(VIEW.periodo==='hoy'||VIEW.periodo==='plan') return semana(0);
  if(VIEW.periodo==='mes'||VIEW.periodo==='mix') return mesFechas();
  var ds=diasPOS(); return ds.length?[ds[ds.length-1].fecha]:[];
}
// aggregate over a list of dates: real only on days with data; meta for those same days
function agg(fechas){
  var M=byDate(), a={fechas:fechas,conDato:0,t:0,v:0,m:0,metaT:0,metaTotal:0,metaResto:0,resto:0,r:{},mTk:0,mMu:0,rm:{},wTk:0,wMu:0,wN:0,i:0,pr:0,vp:0,mIt:0,mCa:0,wIt:0,wCa:0}, t=hoy();
  fechas.forEach(function(f){var d=M[f], mt=metaDia(f); a.metaTotal+=mt; a.wTk+=mt*tkMeta(f); a.wMu+=mt*muMeta(f); a.wIt+=mt*itMeta(f); a.wCa+=mt*caMeta(f); a.wN+=mt;
    if(d){a.conDato++;a.t+=d.tickets;a.v+=d.venta;a.m+=d.multi;a.metaT+=mt;a.mTk+=d.tickets*tkMeta(f);a.mMu+=d.tickets*muMeta(f);a.mIt+=d.tickets*itMeta(f);a.mCa+=d.tickets*caMeta(f);a.i+=d.items;a.pr+=(d.prop||0);a.vp+=(d.vprop||0);for(var k in d.r){a.r[k]=a.r[k]||[0,0];a.r[k][0]+=d.r[k][0];a.r[k][1]+=d.r[k][1];a.rm[k]=(a.rm[k]||0)+d.r[k][0]*ruleMeta(k,f);}}
    else if(f>=t || f>ultimaFecha()){a.metaResto+=mt;a.resto++;}
  });
  a.ritmo=a.metaT?a.t/a.metaT:null;
  a.proy=a.t+(a.ritmo!=null?a.ritmo*a.metaResto:a.metaResto);
  a.falta=Math.max(a.metaTotal-a.t,0);
  a.tkMeta=a.t?a.mTk/a.t:(a.wN?a.wTk/a.wN:+STATE.metas.ticket); a.muMeta=a.t?a.mMu/a.t:(a.wN?a.wMu/a.wN:+STATE.metas.multi); a.itMeta=a.t?a.mIt/a.t:(a.wN?a.wIt/a.wN:2.6); a.caMeta=a.t?a.mCa/a.t:(a.wN?a.wCa/a.wN:40);
  a.rMeta={}; MC_RULES.forEach(function(R){var e=a.r[R.id]; a.rMeta[R.id]=e&&e[0]?a.rm[R.id]/e[0]:+STATE.metas.rules[R.id];});
  return a;
}
function ultimaFecha(){var ds=diasPOS();return ds.length?ds[ds.length-1].fecha:'';}

function kpiCard(label,val,meta,fmtV,fmtM,extra){
  var s=estado(val,meta), pct=meta&&val!=null?Math.min(val/meta,1.25):0;
  return '<div class="card kpi"><div class="row"><span class="l">'+label+'</span>'+pill(s)+'</div>'+
  '<div class="row"><span class="v">'+fmtV+'</span><span class="m">Meta '+fmtM+'</span></div>'+
  '<div class="bar" aria-hidden="true"><i class="fill-'+(s||'warn')+'" style="width:'+(pct/1.25*100).toFixed(1)+'%"></i><b style="left:80%"></b></div>'+
  '<div class="m">'+extra+'</div></div>';
}



function tkMeta(f){var v=STATE.metas.ticketDia&&STATE.metas.ticketDia[wd(f)];return +(v||STATE.metas.ticket);}
function muMeta(f){var v=STATE.metas.multiDia&&STATE.metas.multiDia[wd(f)];return +(v||STATE.metas.multi);}
function itMeta(f){var v=STATE.metas.itemsDia&&STATE.metas.itemsDia[wd(f)];return +(v||2.6);}
function caMeta(f){var v=STATE.metas.caseroDia&&STATE.metas.caseroDia[wd(f)];return +(v||40);}
function dec(v){return nf(v,1);}
var _PERF=null;
function perfil(){ if(_PERF) return _PERF; var ini=STATE.metas.inicio||'2026-09-28';
  var ds=diasPOS().filter(function(d){return d.fecha<ini;}).slice(-84), P={};
  ds.forEach(function(d){var w=wd(d.fecha),p=P[w]||(P[w]={n:0,t:0,v:0,m:0,rr:{}});p.n++;p.t+=d.tickets;p.v+=d.venta;p.m+=d.multi;for(var k in d.r){p.rr[k]=p.rr[k]||[0,0];p.rr[k][0]+=d.r[k][0];p.rr[k][1]+=d.r[k][1];}});
  var rec={}; ds.slice(-28).forEach(function(d){var w=wd(d.fecha),q=rec[w]||(rec[w]={n:0,t:0,v:0,m:0});q.n++;q.t+=d.tickets;q.v+=d.venta;q.m+=d.multi;q.i=(q.i||0)+d.items;q.pr=(q.pr||0)+(d.prop||0);});
  for(var w in P){var p=P[w],q=rec[w]||p;p.tk=q.t/q.n;p.ticket=q.t?q.v/q.t:0;p.multi=q.t?q.m/q.t*100:0;p.items=q.t?(q.i||0)/q.t:0;p.casero=q.t?(q.pr||0)/q.t*100:0;p.r={};MC_RULES.forEach(function(R){var e=p.rr[R.id]||[0,0];p.r[R.id]={T:e[0]/p.n,a:e[0]?e[1]/e[0]*100:0};});}
  _PERF=P; return P;}
function ruleMeta(id,f){var b=+STATE.metas.rules[id]; if(!f) return b; var p=perfil()[wd(f)]; var a=p&&p.r[id]?p.r[id].a:0; return Math.max(b,Math.round(a*1.15));}
function oportunidad(id,f){var p=perfil()[wd(f)]; if(!p) return 0; var R=ruleById(id), x=p.r[id]; return x.T*Math.max(ruleMeta(id,f)-x.a,0)/100*R.valor;}
function focoAuto(f){var ids=[];SECT.forEach(function(a){var best=null,bv=-1;MC_RULES.forEach(function(R){if(R.area!==a)return;var v=oportunidad(R.id,f);if(v>bv){bv=v;best=R.id;}});ids.push(best);});return ids;}
function focoDia(f){var p=planDe(lunesDe(f)); if(p&&p.dias&&p.dias[f]&&p.dias[f].length===SECT.length) return p.dias[f]; return focoAuto(f);}

function lunesDe(f){var w=wd(f);return addDays(f,-(w===0?6:w-1));}
function nSem(lun){var ini=STATE.metas.inicio||'2026-09-28';return Math.round((D(lun)-D(lunesDe(ini)))/864e5/7)+1;}
function semNom(lun){var n=nSem(lun);return n>=1?'Semana '+n:'Previa';}
function semLabel(lun){return semNom(lun)+' · '+fcorta(lun)+' al '+fcorta(addDays(lun,6));}
function tablaSemanas(){
  var t=hoy(), cur=lunesDe(t), Bd=byDate(), rows=[], ini=lunesDe(STATE.metas.inicio||'2026-09-28');
  var lun=ini;
  while(lun<=cur){var fs=[];for(var i=0;i<7;i++)fs.push(addDays(lun,i));var A=agg(fs);rows.push({lun:lun,A:A,cur:lun===cur});lun=addDays(lun,7);}
  rows=rows.slice(-10).reverse();
  return '<section class="card"><div class="colhead"><h2>Semana por semana</h2><span class="sub">de lunes a domingo</span></div><div class="tbl"><table class="wk"><thead><tr><th>Semana</th><th>Clientes</th><th>Meta</th><th>Cumplimiento</th><th>Ticket prom.</th><th>Prod. por cliente</th><th>Casero</th><th>2+ productos</th><th>Estado</th></tr></thead><tbody>'+
    rows.map(function(r){var A=r.A, meta=r.cur?A.metaT:A.metaTotal, s=A.conDato?estado(A.t,meta):null;
      return '<tr class="'+(r.cur?'curw':'')+'"><td><b>'+semNom(r.lun)+'</b> <span class="m">'+fcorta(r.lun)+'–'+fcorta(addDays(r.lun,6))+'</span>'+(r.cur?' <span class="area">en curso · '+A.conDato+' de 7 días</span>':'')+'</td>'+
      '<td>'+(A.conDato?nf(A.t):'–')+'</td><td>'+nf(meta)+(r.cur&&A.conDato<7?' <span class="m">de '+nf(A.metaTotal)+'</span>':'')+'</td><td>'+(A.conDato&&meta?nf(A.t/meta*100)+'%':'–')+'</td>'+
      '<td>'+(A.t?'$'+nf(A.v/A.t):'–')+'</td><td>'+(A.t?dec(A.i/A.t):'–')+'</td><td>'+(A.t?nf(A.pr/A.t*100)+'%':'–')+'</td><td>'+(A.t?nf(A.m/A.t*100)+'%':'–')+'</td><td>'+pill(s)+'</td></tr>';}).join('')+
    '</tbody></table></div><div class="m">En la semana en curso, la meta es la de los días ya cargados.</div></section>';
}

function tituloPeriodo(fs){
  if(VIEW.periodo==='plan'){var l0=lunesDe(hoy());return 'Plan desde la '+semNom(l0)+' ('+fcorta(l0)+') hasta el '+fcorta(addDays(l0,27));}
  if(VIEW.periodo==='hoy'){var tt=hoy(),l=lunesDe(tt);return DIAS[wd(tt)]+' '+fcorta(tt)+' · '+semNom(l)+', día '+(Math.round((D(tt)-D(l))/864e5)+1)+' de 7';}
  if(VIEW.periodo==='semana'){var r=semLabel(fs[0]);return VIEW.wk===0?r+' (en curso)':r;}
  if(VIEW.periodo==='mes'||VIEW.periodo==='mix'){return 'Mes de '+MESES[+fs[0].slice(5,7)-1]+(fs[0].slice(8)!=='01'?' (desde el '+fcorta(fs[0])+')':'');}
  return fs.length?DIAS[wd(fs[0])]+' '+fcorta(fs[0]):'Sin datos';
}


function esperado(f){var w=wd(f), xs=diasPOS().filter(function(d){return wd(d.fecha)===w;}).slice(-4), o={n:xs.length,r:{}};
  MC_RULES.forEach(function(R){var s=0;xs.forEach(function(d){s+=(d.r[R.id]||[0,0])[0];});o.r[R.id]=xs.length?s/xs.length:0;});return o;}
function sg(v,d,suf){if(v==null||isNaN(v))return '–';var s=v>0?'+':(v<0?'−':'');return s+nf(Math.abs(v),d)+(suf||'');}

function planDe(lun){STATE.plan=STATE.plan||{};return STATE.plan[lun]||null;}
function ranking(r,f){return MC_RULES.map(function(R){var e=r[R.id]||[0,0];return {id:R.id,ratio:e[0]>=5?(e[1]/e[0]*100)/ruleMeta(R.id,f):1};}).sort(function(a,b){return a.ratio-b.ratio;});}
function focoDelDia(t,d,ay){
  var o={ids:focoDia(t),txt:'Foco de hoy: lo que más suma un '+DIAS[wd(t)].toLowerCase(),ref:null};
  if(d){var w=ranking(d.r,ay).filter(function(x){return x.ratio<0.95&&o.ids.indexOf(x.id)<0;})[0]; if(w) o.ref=w.id;}
  return o;
}
function ruleById(id){return MC_RULES.filter(function(R){return R.id===id;})[0];}
function espDeSemana(lun){var o=[];for(var i=0;i<7;i++){var f=addDays(lun,i);if(STATE.metas.especiales[f]!=null)o.push(f);}return o;}

function huddle(){
  var t=hoy(), Bd=byDate(), M=STATE.metas, ay=addDays(t,-1), last=ultimaFecha(), ref=Bd[ay]?ay:(last&&last<t?last:null); if(ref&&ref<INI()) ref=null; var d=ref?Bd[ref]:null, arranque=ay<INI();
  var h='<section class="card huddle"><div class="hh"><h2>'+(arranque?'Hoy arranca la Semana 1':(ref===ay?'Cómo nos fue ayer':'Último día cargado'))+'</h2><span class="sub">'+(ref?DIAS[wd(ref)]+' '+fcorta(ref):'')+'</span></div>';
  if(arranque) h+='<p class="m">Desde hoy medimos cada día contra la meta. Mañana, a primera hora, acá se ve el resultado de hoy y el desvío en cada indicador.</p>';
  else if(ref!==ay) h+='<div class="stale">Todavía no se cargaron las ventas de ayer'+(ref?'. Se muestra el último día cargado.':'.')+'</div>';
  if(d){
    var rows=[], mt=metaDia(ref), tk=d.venta/d.tickets, mu=d.multi/d.tickets*100;
    rows.push(['Clientes',nf(mt),nf(d.tickets),sg(d.tickets-mt)+' ('+sg((d.tickets/mt-1)*100,0,'%')+')',estado(d.tickets,mt)]);
    var TM=tkMeta(ref),UM=muMeta(ref); rows.push(['Ticket promedio','$'+nf(TM),'$'+nf(tk),sg(tk-TM,0).replace(/^([+−])/,'$1$')+' ('+sg((tk/TM-1)*100,0,'%')+')',estado(tk,TM)]);
    var IT=itMeta(ref),CA=caMeta(ref),it=d.items/d.tickets,ca=(d.prop||0)/d.tickets*100;
    rows.push(['Productos por cliente',dec(IT),dec(it),sg(it-IT,1),estado(it,IT)]);
    rows.push(['Clientes con algo casero',nf(CA)+'%',nf(ca)+'% ('+(d.prop||0)+')',sg(ca-CA,0,' pts')+' · $'+nf((d.vprop||0)/1e3)+' mil en caseros',estado(ca,CA)]);
    rows.push(['Tickets con 2+ productos',nf(UM)+'%',nf(mu)+'%',sg(mu-UM,0,' pts')+' · '+nf(d.tickets-d.multi)+' con 1 solo producto',estado(mu,UM)]);
    MC_RULES.forEach(function(R){var e=d.r[R.id]||[0,0], meta=ruleMeta(R.id,ref), real=e[0]?e[1]/e[0]*100:null, esp=Math.ceil(e[0]*meta/100-1e-9), dv=e[1]-esp;
      rows.push([R.titulo+' <span class="area">'+R.area+'</span>',nf(meta)+'%',e[0]?nf(real)+'% ('+e[1]+' de '+e[0]+')':'sin casos',e[0]?(dv<0?(dv===-1?'faltó 1 venta':'faltaron '+(-dv)+' ventas'):(dv>0?sg(dv)+(dv===1?' venta':' ventas'):'justo en meta')):'–',e[0]?estado(real,meta):null]);});
    h+='<div class="tbl"><table><thead><tr><th>Indicador</th><th>Meta</th><th>Real</th><th>Desvío</th><th>Estado</th></tr></thead><tbody>'+
      rows.map(function(r){return '<tr><td class="ind">'+r[0]+'</td><td data-l="Meta">'+r[1]+'</td><td data-l="Real">'+r[2]+'</td><td data-l="Desvío" class="'+(r[4]==='good'?'':'dv')+'">'+r[3]+'</td><td class="es">'+pill(r[4])+'</td></tr>';}).join('')+'</tbody></table></div>';
  } else if(!arranque) h+='<p class="m">Sin datos cargados desde el inicio.</p>';
  h+='</section>';
  // today
  var W=agg(semana(0)), mh=metaDia(t), rec=mh+(W.resto?Math.ceil(Math.max(W.metaT-W.t,0)/W.resto):0), E=esperado(t);
  var FD=focoDelDia(t,d,ref), foco=FD.ids, focoTxt=FD.txt;
  h+='<section class="card hoy"><div class="hh"><h2>Lo que hay que lograr hoy</h2><span class="sub">'+DIAS[wd(t)]+' '+fcorta(t)+(nota(t)?' · '+esc(nota(t)):'')+'</span></div><div class="goals">'+
    '<div class="goal"><span class="l">Clientes</span><span class="gv">'+nf(Math.max(mh,rec))+'</span><span class="m">'+(rec>mh?'meta del día '+nf(mh)+', +'+nf(rec-mh)+' para recuperar la semana':'meta del día'+(M.especiales[t]!=null?' (fecha especial)':''))+'</span></div>'+
    '<div class="goal"><span class="l">Ticket promedio</span><span class="gv">$'+nf(tkMeta(t))+'</span><span class="m">'+(d?'ayer $'+nf(d.venta/d.tickets):'')+'</span></div>'+
    '<div class="goal"><span class="l">Productos por cliente</span><span class="gv">'+dec(itMeta(t))+'</span><span class="m">'+(d?'ayer '+dec(d.items/d.tickets):'')+'</span></div>'+
    '<div class="goal"><span class="l">Clientes con algo casero</span><span class="gv">'+nf(caMeta(t))+'%</span><span class="m">'+(d?'ayer '+nf((d.prop||0)/d.tickets*100)+'%':'')+'</span></div>'+
    '<div class="goal"><span class="l">Clientes con un solo producto</span><span class="gv">máx. '+nf(Math.floor(Math.max(mh,rec)*(1-muMeta(t)/100)))+'</span><span class="m">'+(d?'ayer '+nf(d.tickets-d.multi)+'. ':'')+'A cada uno, ofrecer algo más.</span></div>'+
  '</div><h3 class="fh">'+focoTxt+'</h3><div class="focos">'+
    foco.map(ruleById).map(function(R){var tr=Math.round(E.r[R.id]),obj=Math.ceil(tr*ruleMeta(R.id,t)/100);
      return '<article class="foco"><div class="head"><h3>'+esc(R.titulo)+'</h3><span class="area">'+R.area+'</span></div><div class="say">'+esc(R.frase)+'</div>'+
      '<div class="m">Un '+DIAS[wd(t)].toLowerCase()+' vienen unos <b>'+nf(tr)+'</b> clientes así. Objetivo: que <b>'+nf(obj)+'</b> se lo lleven ('+nf(ruleMeta(R.id,t))+'%). Suma ~$'+nf(Math.max(obj-Math.round(tr*perfil()[wd(t)].r[R.id].a/100),0)*R.valor)+' al día.</div></article>';}).join('')+
  '</div>'+(FD.ref?'<div class="refuerzo">Ayer también quedó flojo: <b>'+esc(ruleById(FD.ref).titulo)+'</b>. Reforzarlo hoy.</div>':'')+'<div class="otros"><span class="l">Resto de las reglas, objetivo de hoy</span><ul>'+
    MC_RULES.filter(function(R){return foco.indexOf(R.id)<0;}).map(function(R){var tr=Math.round(E.r[R.id]);return '<li><span>'+esc(R.titulo)+' <span class="area">'+R.area+'</span></span><b>'+nf(Math.ceil(tr*ruleMeta(R.id,t)/100))+' de ~'+nf(tr)+'</b></li>';}).join('')+
  '</ul></div></section>';
  return h;
}


function modoSwitch(){var sw=(SES&&SES.rol!=='equipo')?'<div class="modo" role="group" aria-label="Vista"><button type="button" data-m="equipo" aria-pressed="'+(VIEW.modo==='equipo')+'">Equipo</button><button type="button" data-m="encargado" aria-pressed="'+(VIEW.modo==='encargado')+'">Encargado</button></div>':'';
  return '<div class="userbar">'+sw+'<button type="button" class="salir" title="Cerrar sesión de '+esc(SES?SES.usuario:'')+'">Salir</button></div>';}

function semanaEquipo(l,grande,W){
  var p=planDe(l)||{foco:[],acciones:[]}, fs=semana(0), Bd=byDate(), t=hoy();
  var acc=(p.acciones||[]).filter(function(a){return a.eq&&a.a!=='Encargado';});
  var esp=espDeSemana(l);
  var h='<section class="eq-wk'+(grande?' big':'')+'"><h2 class="eq-h2">'+(grande?'Objetivos de la semana':'Esta semana')+' <span class="eq-sub">'+semNom(l)+' · '+fcorta(l)+' al '+fcorta(addDays(l,6))+'</span></h2>';
  h+='<div class="eq-wkgrid"><div class="eq-wkmeta"><span class="l">Meta de la semana</span><span class="eq-num2">'+nf(W.metaTotal)+'</span><span class="eq-u2">clientes</span>'+
     (W.conDato?'<div class="eq-semtxt">Llevamos <b>'+nf(W.t)+'</b>.</div>':'')+'</div>';
  h+='<div class="eq-wkfoco"><span class="l">Todos los días</span><p>Que cada cliente se lleve <b>2 productos o más</b>.</p></div></div>';
  h+='<div class="eq-days"><span class="l">Qué buscamos cada día</span><ul>'+fs.map(function(f){var fo=focoDia(f).map(ruleById),dd=Bd[f],s=dd?estado(dd.tickets,metaDia(f)):null;
    return '<li class="'+(f===t?'hoy':'')+'"><span class="dname">'+DC[wd(f)]+' '+fcorta(f)+(STATE.metas.especiales[f]!=null?' ★':'')+'</span><span class="dmeta">'+metaDia(f)+' clientes</span><span class="dfoco">'+esc(fo[0].corto)+' · '+esc(fo[1].corto)+'</span><span>'+(dd?pill(s):(f===t?'<span class="st warn">HOY</span>':''))+'</span></li>';}).join('')+'</ul></div>';
  if(acc.length||esp.length) h+='<div class="eq-acc"><span class="l">Qué vamos a hacer</span><ul>'+
     esp.map(function(f){return '<li><b>'+DIAS[wd(f)]+' '+fcorta(f)+'</b>: día especial, meta '+metaDia(f)+' clientes.</li>';}).join('')+
     acc.map(function(a){return '<li><span class="area">'+esc(a.a)+'</span> '+esc(a.t)+'</li>';}).join('')+'</ul></div>';
  h+='<div class="eq-dots">'+fs.map(function(f){var dd=Bd[f],s=dd?estado(dd.tickets,metaDia(f)):null;
     return '<div class="eq-dot '+(dd?(s==='good'?'good':(s==='warn'?'warn':'bad')):(f===t?'today':'next'))+'"><span class="eq-dc">'+(dd?(s==='good'?'✓':(s==='warn'?'●':'▼')):(f===t?'HOY':''))+'</span><span class="eq-dn">'+DC[wd(f)]+'</span></div>';}).join('')+'</div></section>';
  return h;
}


function objFechas(){var o=STATE.metas.objetivo||{periodo:'semana'};return o.periodo==='mes'?mesFechas():semana(0);}

var ICO={
 fuego:'<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2c1 3.2-.6 5-2 6.6C8.6 10.2 7 12 7 14.6 7 18 9.4 21 12.6 21S18 18.4 18 15c0-2.3-1.1-4-2.2-5.2.1 1.6-.5 2.9-1.6 3.4C15 9.3 14.3 5.2 12 2z"/></svg>',
 copa:'<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 3h10v2h3v3a4 4 0 0 1-4 4h-.3A5 5 0 0 1 13 14.9V18h3v3H8v-3h3v-3.1A5 5 0 0 1 8.3 12H8a4 4 0 0 1-4-4V5h3V3zm0 4H6v1a2 2 0 0 0 1 1.7V7zm10 0v2.7A2 2 0 0 0 18 8V7h-1z"/></svg>',
 medalla:'<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 2h4l1 3 1-3h4l-3.2 6.2A6 6 0 1 1 10.2 8.2L7 2zm5 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0 1.6 1 2 2.2.3-1.6 1.5.4 2.2-2-1-2 1 .4-2.2-1.6-1.5 2.2-.3 1-2z"/></svg>',
 estrella:'<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m12 2 3 6.3 6.9.9-5 4.8 1.3 6.8L12 17.6 5.8 20.8 7.1 14l-5-4.8 6.9-.9z"/></svg>'
};
function sectorScore(rr,metaFn){var o={};SECT.forEach(function(a){var s=0,n=0,met=0;MC_RULES.forEach(function(R){if(R.area!==a)return;var e=rr[R.id]||[0,0];if(e[0]<3)return;var ratio=(e[1]/e[0]*100)/metaFn(R.id);s+=Math.min(ratio,1.5);n++;if(ratio>=1)met++;});o[a]={pts:n?Math.round(s/n*100):0,met:met,n:n};});return o;}
function racha(){var t=hoy(),Bd=byDate(),f=addDays(t,-1),n=0,guard=0;while(f>=INI()&&guard++<400){if(cerrado(f)){f=addDays(f,-1);continue;}var d=Bd[f];if(!d||d.tickets<metaDia(f))break;n++;f=addDays(f,-1);}return n;}
function ranking3(sc){return SECT.map(function(a){return {a:a,pts:sc[a].pts,met:sc[a].met,n:sc[a].n};}).sort(function(x,y){return y.pts-x.pts;});}
function podio(sc,titulo,sub){var r=ranking3(sc);if(!r[0].n)return '';var lugares=['1°','2°','3°'];
  return '<section class="eq-podio"><div class="hh"><h2 class="eq-h2">'+titulo+'</h2><span class="sub">'+sub+'</span></div><div class="pod">'+
   r.map(function(x,i){return '<div class="pod-row p'+(i+1)+'"><span class="pod-pos">'+(i===0?'<span class="crown shine">'+ICO.copa+'</span>':lugares[i])+'</span><span class="pod-name">'+x.a+'</span>'+
     '<span class="pod-bar"><i class="anim-bar" data-w="'+Math.min(x.pts/1.5,100).toFixed(1)+'" style="width:'+Math.min(x.pts/1.5,100).toFixed(1)+'%"></i><b style="left:'+(100/1.5).toFixed(1)+'%"></b></span>'+
     '<span class="pod-pts"><b data-to="'+x.pts+'">'+x.pts+'</b> pts</span></div>';}).join('')+
   '</div><div class="m">100 puntos = todas las reglas del sector en meta. La rayita marca los 100.</div></section>';}
function niveles(A,meta){var hitos=[[0.5,'Bronce','bronce'],[0.75,'Plata','plata'],[1,'Oro','oro']];
  return '<div class="niveles">'+hitos.map(function(x){var obj=Math.round(meta*x[0]),ok=A.t>=obj;return '<div class="nivel '+x[2]+(ok?' ok':'')+'"><span class="nv-ic'+(ok?' shine':'')+'">'+ICO.medalla+'</span><span><b>'+x[1]+'</b><br><span class="m">'+(ok?'¡Logrado!':'faltan '+nf(obj-A.t))+'</span></span></div>';}).join('')+'</div>';}
function animar(){
  var rm=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches; if(rm) return;
  document.querySelectorAll('[data-to]').forEach(function(el){var to=+el.dataset.to,fmt=el.dataset.fmt||'int',t0=null,dur=900;
    function f(v){return fmt==='dec'?dec(v):(fmt==='money'?'$'+nf(v):(fmt==='pct'?nf(v)+'%':nf(v)));}
    function step(ts){if(!t0)t0=ts;var k=Math.min((ts-t0)/dur,1),e=1-Math.pow(1-k,3);el.textContent=f(to*e);if(k<1)requestAnimationFrame(step);else el.textContent=f(to);}
    el.textContent=f(0);requestAnimationFrame(step);});
  document.querySelectorAll('.anim-bar').forEach(function(b){var w=b.dataset.w;b.style.transition='none';b.style.width='0%';void b.offsetWidth;b.style.transition='width 1s cubic-bezier(.2,.8,.2,1)';requestAnimationFrame(function(){b.style.width=w+'%';});});
}
function confeti(){
  if(VIEW.confetiHecho) return; VIEW.confetiHecho=true;
  if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var c=document.createElement('canvas');c.className='confeti';document.body.appendChild(c);var x=c.getContext('2d'),W=c.width=innerWidth,H=c.height=innerHeight;
  var cols=[css('--brand'),css('--good'),css('--warn'),'#f2c14e','#3a86c8'],P=[];for(var i=0;i<140;i++)P.push({x:W/2+(Math.random()-.5)*W*.3,y:H*.25,vx:(Math.random()-.5)*12,vy:-Math.random()*12-4,s:4+Math.random()*6,r:Math.random()*6,c:cols[i%cols.length]});
  var t0=performance.now();(function fr(ts){var k=(ts-t0)/1800;x.clearRect(0,0,W,H);P.forEach(function(p){p.vy+=.35;p.x+=p.vx;p.y+=p.vy;p.r+=.1;x.save();x.translate(p.x,p.y);x.rotate(p.r);x.globalAlpha=Math.max(1-k,0);x.fillStyle=p.c;x.fillRect(-p.s/2,-p.s/4,p.s,p.s/2);x.restore();});if(k<1)requestAnimationFrame(fr);else c.remove();})(t0);
}

// ---- objetivo de ventas del mes (todas las ventas de Odoo) ----
function mesClave(){return hoy().slice(0,7);}
function mesNombre(){return MESES[+hoy().slice(5,7)-1];}
// Objetivo inicial por cliente, hasta que el encargado lo guarde desde el formulario.
function mesObjetivo(){var m=STATE.metas.mes||{};var v=+m[mesClave()];return v>0?v:0;}
function mesTodas(){var t=hoy(),y=+t.slice(0,4),m=+t.slice(5,7),n=new Date(y,m,0).getDate(),ds=[];for(var i=1;i<=n;i++)ds.push(y+'-'+pad(m)+'-'+pad(i));return ds;}
// peso de cada día dentro del mes: lo que se espera vender según las metas de ese día de la semana (0 = cerrado)
function pesoDia(f){var e=STATE.metas.especiales[f];return (+(e!=null?e:STATE.metas.tkDia[wd(f)])||0)*tkMeta(f);}
function mesCalc(){
  var obj=mesObjetivo(), hr=hoyReal(), all={}; STATE.dias.forEach(function(d){all[d.fecha]=d;});
  var c={obj:obj,acum:0,most:0,aber:0,sinTotal:0,pT:0,pC:0,acumC:0,diasRest:0,conDato:0,hasta:''};
  mesTodas().forEach(function(f){var d=all[f],p=pesoDia(f);c.pT+=p;
    if(d){var v=d.vt!=null?d.vt:d.venta; if(d.vt==null)c.sinTotal++; c.acum+=v;c.most+=d.venta;c.aber+=(d.va||0);c.conDato++;c.hasta=f;
      if(f<hr){c.pC+=p;c.acumC+=v;} else if(p>0) c.diasRest++;}
    else if(f>=hr&&p>0) c.diasRest++;
  });
  c.esperado=c.pT?obj*c.pC/c.pT:0;                    // dónde deberíamos estar con los días completos cargados
  c.ritmo=c.esperado?c.acumC/c.esperado:null;
  c.proy=c.ritmo!=null?c.acumC+c.ritmo*obj*(c.pT-c.pC)/c.pT:null;
  c.falta=Math.max(obj-c.acum,0); c.porDia=c.diasRest?c.falta/c.diasRest:0;
  c.pct=obj?c.acum/obj*100:0; c.marca=c.pT?c.pC/c.pT*100:0; c.otros=c.acum-c.most-c.aber;
  return c;
}
function mesEncargado(){
  var c=mesCalc(); if(!c.obj) return '';
  var s=c.conDato&&c.esperado?estado(c.acumC,c.esperado):null, sP=c.proy!=null?estado(c.proy,c.obj):null;
  return '<section class="card proy" id="mes-obj"><div class="proyhead"><div><div class="l">Objetivo de ventas de '+mesNombre()+' · todas las ventas de Odoo</div>'+
    '<div class="big"><span class="v">'+money(c.acum)+'</span><span class="m"> de '+money(c.obj)+' · '+nf(c.pct)+'%</span></div></div></div>'+
    '<div class="bar tall" aria-hidden="true"><i class="fill-'+(s||'warn')+'" style="width:'+Math.min(c.pct,100).toFixed(1)+'%"></i>'+(c.conDato?'<b style="left:'+Math.min(c.marca,100).toFixed(1)+'%" title="Dónde deberíamos estar"></b>':'')+'</div>'+
    '<div class="proygrid">'+
      '<div><span class="l">A la fecha, con días completos</span><strong>'+(c.pC?money(c.acumC)+' / '+money(c.esperado):'Sin días completos todavía')+'</strong>'+(s?pill(s):'')+'</div>'+
      '<div><span class="l">Si seguimos a este ritmo</span><strong>'+(c.proy!=null?'cerramos en '+money(c.proy):'–')+'</strong>'+(sP?pill(sP):'')+'</div>'+
      '<div><span class="l">Para llegar al objetivo</span><strong>'+(c.falta<=0?'Objetivo cumplido':(c.diasRest?money(c.porDia)+' por día en los '+c.diasRest+' días que quedan':'Faltaron '+money(c.falta)))+'</strong>'+
        (c.falta>0?'<span class="m">faltan '+money(c.falta)+'</span>':'')+'</div>'+
    '</div>'+
    '<div class="m">Mostrador '+money(c.most)+' · Organizaciones y pedidos '+money(c.otros)+' · Aberasturi '+money(c.aber)+(c.hasta?' · cargado hasta el '+fcorta(c.hasta):'')+'. La rayita marca dónde deberíamos estar con los días completos cargados, según lo que pesa cada día de la semana.</div>'+
    (c.sinTotal?'<div class="stale">Hay '+c.sinTotal+' día'+(c.sinTotal>1?'s':'')+' del mes cargado'+(c.sinTotal>1?'s':'')+' solo con el mostrador. Volvé a subir el Excel del mes para sumar organizaciones, pedidos y Aberasturi.</div>':'')+
    '</section>';
}
function mesEquipo(){
  // El equipo ve solo el porcentaje, con los días completos cargados (sin el día en curso), para comparar contra dónde deberíamos estar.
  var c=mesCalc(); if(!c.obj) return '';
  var s=c.pC?estado(c.acumC,c.esperado):null, real=c.acumC/c.obj*100, pct=Math.min(real,100), d1=Math.round(real)===Math.round(c.marca)?1:0;
  var msg=!c.pC?'Arrancamos el mes. Cada venta suma.':(s==='good'?'<b>Vamos bien.</b> Estamos al día con el objetivo del mes.':(s==='warn'?'<b>Estamos muy cerca</b> del ritmo que necesitamos: a esta altura tendríamos que ir en '+nf(c.marca,d1)+'%.':'<b>Venimos atrasados:</b> a esta altura tendríamos que ir en '+nf(c.marca,d1)+'%.'));
  return '<section class="eq-obj2" id="mes-eq"><h2 class="eq-h2">Objetivo de ventas de '+mesNombre()+'</h2>'+
    '<div class="eq-objrow"><span class="eq-num2">'+nf(real,d1)+'%</span><span class="eq-u2">del objetivo del mes</span>'+(s?pill(s):'')+'</div>'+
    '<div class="bar tall" aria-hidden="true"><i class="anim-bar fill-'+(s||'warn')+'" data-w="'+pct.toFixed(1)+'" style="width:'+pct.toFixed(1)+'%"></i>'+(c.pC?'<b style="left:'+Math.min(c.marca,100).toFixed(1)+'%"></b>':'')+'</div>'+
    '<div class="eq-objmsg">'+msg+(c.diasRest?' Quedan '+c.diasRest+' días del mes, hoy incluido.':'')+'</div>'+
    (c.pC?'<div class="m">La rayita negra marca dónde tendríamos que estar hoy.</div>':'')+'</section>';
}

// ---- mix y margen (solo encargado: los márgenes llegan del servidor y no se mandan al equipo) ----
function mixCfg(){return (STATE&&STATE.metas&&STATE.metas.mix)||null;}
function famNom(k){for(var i=0;i<MC_FAMS.length;i++) if(MC_FAMS[i][0]===k) return MC_FAMS[i][1]; return k;}
function mixObj(key){var M=mixCfg();return ((M.objetivos||{})[key||mesClave()])||M.base;}
function mixPic(key){var M=mixCfg();return ((M.picada||{})[key||mesClave()])||{precio:0,maxPct:100};}
function vacMargen(m,up,extra){return (1-(1-m/100)/(1+(up||0)/100))*100+(+extra||0);}
function margenMix(sh,mg,vacUp,vacExtra){var w=0,T=0;MC_FAMS.forEach(function(f){var k=f[0],x=+sh[k]||0,m=+mg[k]||0;if(k==='vac') m=vacMargen(m,vacUp,vacExtra);w+=x*m;T+=x;});return T?w/T:0;}
function mixCalc(){
  var all={}; STATE.dias.forEach(function(d){all[d.fecha]=d;});
  var c={fam:{},tot:0,dias:0,sin:0,kvac:0,kpic:0,vpic:0,ppic:{},sh:{}};
  mesTodas().forEach(function(f){var d=all[f]; if(!d||!d.tickets) return; if(!d.fam){c.sin++;return;} c.dias++;
    for(var k in d.fam){c.fam[k]=(c.fam[k]||0)+d.fam[k];c.tot+=d.fam[k];} c.kvac+=d.kvac||0;c.kpic+=d.kpic||0;c.vpic+=d.vpic||0;
    for(var p in (d.ppic||{})) c.ppic[p]=(c.ppic[p]||0)+d.ppic[p];});
  MC_FAMS.forEach(function(f){c.sh[f[0]]=c.tot?(c.fam[f[0]]||0)/c.tot*100:null;});
  return c;
}
function pctf(v,d){return v==null?'–':nf(v,d==null?1:d)+'%';}
function mixSection(){
  var M=mixCfg(); if(!M) return '';
  var c=mixCalc(), O=mixObj(), P=mixPic(), mes=mesNombre(), h='';
  var mBase=margenMix(M.base,M.margenes,0), mObj=margenMix(O,M.margenes,0), mReal=c.tot?margenMix(c.sh,M.margenes,0):null;
  // 1. mix real vs objetivo
  h+='<section class="card"><div class="colhead"><h2>Mix de '+mes+'</h2><span class="sub">parte de la venta del mostrador por familia · '+(c.dias?c.dias+' día'+(c.dias>1?'s':'')+' cargado'+(c.dias>1?'s':''):'sin días cargados')+'</span></div>'+
     '<div class="proygrid">'+
       '<div><span class="l">Margen con el mix del mes</span><strong>'+pctf(mReal)+'</strong>'+(mReal!=null?pill(estado(mReal,mObj)):'')+'</div>'+
       '<div><span class="l">Margen con el mix objetivo</span><strong>'+pctf(mObj)+'</strong><span class="m">junio a septiembre: '+pctf(mBase)+'</span></div>'+
       '<div><span class="l">Vacuno en la venta</span><strong>'+pctf(c.sh.vac)+'</strong><span class="m">objetivo: '+pctf(O.vac)+' o menos</span></div>'+
     '</div>'+
     (c.sin?'<div class="stale">Hay '+c.sin+' día'+(c.sin>1?'s':'')+' del mes cargado'+(c.sin>1?'s':'')+' antes de esta versión. Volvé a subir el Excel del mes para verlos en el mix.</div>':'')+
     '<div class="tbl"><table><thead><tr><th>Familia</th><th>Jun–sep</th><th>Objetivo</th><th>Real del mes</th><th>Diferencia</th><th>Estado</th><th>Margen de la familia</th></tr></thead><tbody>'+
     MC_FAMS.map(function(f){var k=f[0],r=c.sh[k],o=+O[k],dif=r==null?null:r-o,s=null;
       if(r!=null){ if(k==='vac') s=r<=o?'good':(r<=o+2?'warn':'bad'); else s=r>=o?'good':(r>=o*0.9?'warn':'bad'); }
       return '<tr><td>'+esc(f[1])+'</td><td>'+pctf(+M.base[k])+'</td><td><b>'+pctf(o)+'</b></td><td>'+pctf(r)+'</td><td>'+(dif==null?'–':sg(dif,1,' pts'))+'</td><td>'+pill(s)+'</td><td>'+pctf(+M.margenes[k])+'</td></tr>';}).join('')+
     '</tbody></table></div>'+
     '<div class="m">Vacuno deja '+pctf(+M.margenes.vac)+' y cerdo, pollo y achuras entre '+pctf(Math.min(+M.margenes.pol,+M.margenes.cer))+' y '+pctf(+M.margenes.ach)+': cada punto de venta que pasa de vacuno a esas familias sube el margen. El margen de cada familia sale de comparar compras contra ventas de junio a septiembre.</div></section>';
  // 2. picada común
  var pp=Object.keys(c.ppic).map(function(k){return [+k,c.ppic[k]];}).sort(function(a,b){return b[1]-a[1];});
  var pctPic=c.kvac?c.kpic/c.kvac*100:null, prPic=c.kpic?c.vpic/c.kpic:null, bajo=pp.filter(function(x){return x[0]<P.precio;}).reduce(function(a,x){return a+x[1];},0);
  h+='<section class="card"><div class="colhead"><h2>Picada común</h2><span class="sub">se hace con retazo: cuanto menos retazo, más carne se vende como corte</span></div>'+
     '<div class="proygrid">'+
       '<div><span class="l">Kilos de picada sobre el vacuno</span><strong>'+pctf(pctPic)+'</strong>'+(pctPic!=null?pill(pctPic<=P.maxPct?'good':(pctPic<=P.maxPct+3?'warn':'bad')):'')+'<span class="m">objetivo: '+pctf(+P.maxPct,0)+' o menos · '+nf(c.kpic)+' kg de '+nf(c.kvac)+' kg</span></div>'+
       '<div><span class="l">Precio promedio por kilo (con IVA)</span><strong>'+(prPic?'$'+nf(prPic):'–')+'</strong>'+(prPic?pill(estado(prPic,+P.precio)):'')+'<span class="m">objetivo: $'+nf(+P.precio)+'</span></div>'+
       '<div><span class="l">Kilos cobrados por debajo del objetivo</span><strong>'+(c.kpic?nf(bajo)+' kg':'–')+'</strong><span class="m">'+(c.kpic?pctf(bajo/c.kpic*100,0)+' de la picada':'')+'</span></div>'+
     '</div>'+
     (pp.length?'<div class="m">Kilos por precio: '+pp.slice(0,6).map(function(x){return '<b>$'+nf(x[0])+'</b> '+nf(x[1])+' kg';}).join(' · ')+'</div>':'')+
     '<div class="m">Para bajar el retazo: pesar lo que va a la picadora y anotar de qué pieza sale; ofrecer los cortes que no salen como promoción del día antes de molerlos.</div></section>';
  // 3. simulador
  var S=VIEW.sim; if(!S||S.mes!==mesClave()){S=VIEW.sim={mes:mesClave(),src:'obj-'+mesClave(),sh:Object.assign({},O),ventas:Math.round((mesObjetivo()||157e6)/(+M.factorOdoo||1.165)/1e6),fijos:Math.round(+M.fijos/1e6),vacUp:+((M.precioVac||{})[mesClave()]||0),vacExtra:+((M.mejoraVac||{})[mesClave()]||0)};}
  var sh=S.sh, other=MC_FAMS.slice(1).reduce(function(a,f){return a+(+sh[f[0]]||0);},0); sh.vac=Math.max(0,100-other);
  var mg=margenMix(sh,M.margenes,S.vacUp,S.vacExtra), ub=S.ventas*mg/100, res=ub-S.fijos, eq=mg>0?S.fijos/(mg/100):NaN, k=+M.factorOdoo||1.165;
  var vacM=vacMargen(+M.margenes.vac,S.vacUp,S.vacExtra);
  var srcs=[['base','Jun–sep',M.base]].concat(c.tot?[['real','Real del mes',c.sh]]:[]).concat(Object.keys(M.objetivos||{}).sort().map(function(key){return ['obj-'+key,'Objetivo de '+MESES[+key.slice(5,7)-1],M.objetivos[key]];}));
  h+='<section class="card" id="sim"><div class="colhead"><h2>Escenarios de mix</h2><span class="sub">probá combinaciones de mix, precio del vacuno y ventas · no se guarda</span></div>'+
     '<div class="pills" role="group" aria-label="Partir de">'+srcs.map(function(x){return '<button type="button" class="simsrc" data-s="'+x[0]+'" aria-pressed="'+(S.src===x[0])+'">'+esc(x[1])+'</button>';}).join('')+'</div>'+
     '<div class="fields"><label for="sim-v">Ventas netas del mes (millones, sin IVA)<input id="sim-v" type="number" min="0" step="1" value="'+S.ventas+'"></label>'+
       '<label for="sim-f">Gastos fijos (millones)<input id="sim-f" type="number" min="0" step="1" value="'+S.fijos+'"></label>'+
       '<label for="sim-p">Aumento de precio del vacuno (%)<input id="sim-p" type="number" min="-20" max="50" step="1" value="'+S.vacUp+'"></label>'+
       '<label for="sim-x">Mejora del vacuno por menos retazo y control de kilos (puntos de margen)<input id="sim-x" type="number" min="0" max="30" step="0.5" value="'+S.vacExtra+'"></label></div>'+
     '<div class="proygrid">'+
       '<div><span class="l">Margen bruto</span><strong>'+pctf(mg)+'</strong><span class="m">vacuno: '+pctf(vacM)+'</span></div>'+
       '<div><span class="l">Utilidad bruta</span><strong>'+money(ub*1e6)+'</strong><span class="m">en Odoo se vende '+money(S.ventas*k*1e6)+'</span></div>'+
       '<div><span class="l">Resultado después de fijos</span><strong>'+(res>=0?'+':'')+money(res*1e6)+'</strong>'+pill(res>=0?'good':(res>=-3?'warn':'bad'))+'</div>'+
       '<div><span class="l">Ventas para equilibrio</span><strong>'+(isFinite(eq)?money(eq*1e6):'–')+'</strong><span class="m">netas · '+(isFinite(eq)?money(eq*k*1e6)+' en Odoo':'')+'</span></div>'+
     '</div>'+
     '<div class="tbl"><table class="pt"><thead><tr><th>Familia</th><th>Participación</th><th>Margen</th><th>Aporte</th></tr></thead><tbody>'+
     MC_FAMS.map(function(f,i){var kk=f[0],m=kk==='vac'?vacM:+M.margenes[kk];return '<tr><td>'+esc(f[1])+'</td><td>'+(i===0?'<b>'+nf(sh.vac,1)+'%</b> <span class="m">se ajusta solo</span>':'<input type="number" class="simsh" data-k="'+kk+'" id="simsh-'+kk+'" min="0" max="100" step="0.1" value="'+(Math.round((+sh[kk]||0)*10)/10)+'" aria-label="Participación '+esc(f[1])+'">%')+'</td><td>'+pctf(m)+'</td><td>'+nf(sh[kk]*m/100,2)+' pts</td></tr>';}).join('')+
     '</tbody></table></div><div class="m">Cada familia que sube le saca participación al vacuno. Margen bruto = suma de participación × margen de cada familia. Ventas para equilibrio = gastos fijos ÷ margen. La prueba de desposte muestra que el vacuno puede dejar alrededor de 25% si baja el retazo y no se pierden kilos: cada punto de mejora del vacuno suma cerca de medio punto al margen total.</div></section>';
  return h;
}
function bindMix(){
  if(VIEW.periodo!=='mix'||!mixCfg()) return; var M=mixCfg(), c=null;
  document.querySelectorAll('.simsrc').forEach(function(b){b.onclick=function(){var s=b.dataset.s,src=s==='base'?M.base:(s==='real'?(c=c||mixCalc()).sh:M.objetivos[s.slice(4)]);VIEW.sim.src=s;VIEW.sim.sh=Object.assign({},src);if(s==='base'){VIEW.sim.vacUp=0;VIEW.sim.vacExtra=0;}else if(s.indexOf('obj-')===0){var kk=s.slice(4);VIEW.sim.vacUp=+((M.precioVac||{})[kk]||0);VIEW.sim.vacExtra=+((M.mejoraVac||{})[kk]||0);}VIEW.adminOpen=$('#adm').open;render();};});
  document.querySelectorAll('.simsh').forEach(function(i){i.onchange=function(){VIEW.sim.sh[i.dataset.k]=Math.max(0,+i.value||0);VIEW.sim.src=null;VIEW.adminOpen=$('#adm').open;render();};});
  [['#sim-v','ventas'],['#sim-f','fijos'],['#sim-p','vacUp'],['#sim-x','vacExtra']].forEach(function(x){var el=$(x[0]);if(el) el.onchange=function(){VIEW.sim[x[1]]=+el.value||0;VIEW.adminOpen=$('#adm').open;render();};});
}
function mixAdmin(){
  var M=mixCfg(); if(!M) return ''; var key=mesClave(), O=mixObj(key), P=mixPic(key);
  return '<div class="note"><b>4. Mix de '+mesNombre()+' y márgenes</b><span>Objetivo de participación de cada familia en la venta del mostrador (vacuno se calcula solo), metas de la picada común y margen de cada familia. Solo lo ve el encargado.</span></div>'+
    '<div class="fields">'+MC_FAMS.slice(1).map(function(f){return '<label for="mo-'+f[0]+'">Objetivo '+esc(f[1])+' (%)<input id="mo-'+f[0]+'" type="number" min="0" max="100" step="0.1" value="'+esc(+O[f[0]])+'"></label>';}).join('')+
    '<label for="mp-precio">Precio objetivo de la picada común ($/kg con IVA)<input id="mp-precio" type="number" min="0" step="100" value="'+esc(+P.precio||'')+'"></label>'+
    '<label for="mp-max">Picada común: máximo de kilos sobre el vacuno (%)<input id="mp-max" type="number" min="0" max="100" step="1" value="'+esc(+P.maxPct||'')+'"></label>'+
    '<label for="mp-vac">Aumento de precio del vacuno previsto (%)<input id="mp-vac" type="number" min="-20" max="50" step="1" value="'+esc(+((M.precioVac||{})[key]||0))+'"></label>'+
    '<label for="mp-x">Mejora prevista del vacuno por retazo y control de kilos (puntos)<input id="mp-x" type="number" min="0" max="30" step="0.5" value="'+esc(+((M.mejoraVac||{})[key]||0))+'"></label>'+
    '<label for="mp-fijos">Gastos fijos por mes (millones)<input id="mp-fijos" type="number" min="0" step="1" value="'+esc(Math.round(+M.fijos/1e6))+'"></label></div>'+
    '<div class="fields">'+MC_FAMS.map(function(f){return '<label for="mg-'+f[0]+'">Margen '+esc(f[1])+' (%)<input id="mg-'+f[0]+'" type="number" min="-50" max="100" step="0.1" value="'+esc(+M.margenes[f[0]])+'"></label>';}).join('')+'</div>';
}
function readMix(){
  var M=mixCfg(); if(!M||!$('#mp-precio')) return; var key=mesClave();
  var o={}, other=0; MC_FAMS.slice(1).forEach(function(f){var v=+$('#mo-'+f[0]).value;o[f[0]]=v>=0?v:0;other+=o[f[0]];}); o.vac=Math.max(0,Math.round((100-other)*10)/10);
  M.objetivos=M.objetivos||{}; M.objetivos[key]=o;
  M.picada=M.picada||{}; M.picada[key]={precio:+$('#mp-precio').value||0,maxPct:+$('#mp-max').value||0};
  M.precioVac=M.precioVac||{}; M.precioVac[key]=+$('#mp-vac').value||0;
  M.mejoraVac=M.mejoraVac||{}; M.mejoraVac[key]=+$('#mp-x').value||0;
  var fj=+$('#mp-fijos').value; if(fj>0) M.fijos=Math.round(fj*1e6);
  MC_FAMS.forEach(function(f){var v=parseFloat($('#mg-'+f[0]).value); if(isFinite(v)) M.margenes[f[0]]=v;});
  VIEW.sim=null;
}

function objetivoEquipo(){
  var o=STATE.metas.objetivo||{periodo:'semana'}, fs=objFechas(), A=agg(fs), meta=+o.clientes>0?+o.clientes:A.metaTotal, t=hoy();
  var escala=A.metaTotal?meta/A.metaTotal:1, aFecha=Math.round(A.metaT*escala), falta=Math.max(aFecha-A.t,0), pct=meta?Math.min(A.t/meta*100,100):0, marca=meta?Math.min(aFecha/meta*100,100):0;
  var diasQ=fs.filter(function(f){return f>=t&&!cerrado(f);}).length, s=A.conDato?estado(A.t,aFecha):null;
  var tit=o.texto&&o.texto.trim()?o.texto.trim():('Objetivo '+(o.periodo==='mes'?'del mes':'de la semana'));
  var msg=!A.conDato?'Arrancamos. Cada día que cumplimos la meta nos acerca al objetivo.':(A.t>=aFecha?'<b>Vamos bien.</b> Estamos al día con el objetivo.':'<b>Venimos atrasados:</b> nos faltan '+nf(falta)+' clientes para estar al día.');
  return '<section class="eq-obj2"><h2 class="eq-h2">'+esc(tit)+'</h2>'+
    '<div class="eq-objrow"><span class="eq-num2" data-to="'+A.t+'">'+nf(A.t)+'</span><span class="eq-u2">de '+nf(meta)+' clientes</span>'+(s?pill(s):'')+'</div>'+
    '<div class="bar tall" aria-hidden="true"><i class="anim-bar fill-'+(s||'warn')+'" data-w="'+pct.toFixed(1)+'" style="width:'+pct.toFixed(1)+'%"></i>'+(A.conDato?'<b style="left:'+marca.toFixed(1)+'%"></b>':'')+'</div>'+
    niveles(A,meta)+
    '<div class="eq-objmsg">'+msg+(diasQ?' Quedan '+diasQ+' días'+(o.periodo==='mes'?' del mes':' de la semana')+', hoy incluido.':'')+'</div>'+
    (A.conDato?'<div class="m">La rayita negra marca dónde tendríamos que estar hoy.</div>':'')+'</section>';
}

function renderEquipo(){
  var t=hoy(), Bd=byDate(), M=STATE.metas, ay=addDays(t,-1), d=(ay>=INI()&&Bd[ay])?Bd[ay]:null, arranque=ay<INI(), l=lunesDe(t);
  var W=agg(semana(0)), mh=metaDia(t), rec=mh+(W.resto?Math.ceil(Math.max(W.metaT-W.t,0)/W.resto):0), E=esperado(t);
  var h=marca()+'<header class="top"><div><div class="eyebrow">'+(MARCAS[cid()]?'Arranque del día':'Manos de Carhué')+'</div><h1 class="eqh">'+DIAS[wd(t)]+' '+fcorta(t)+'</h1><div class="sub">'+semNom(l)+' · día '+(Math.round((D(t)-D(l))/864e5)+1)+' de 7</div>'+previewBanner()+'</div>'+modoSwitch()+'</header>';
  var rc=racha(), medY=d?[[d.tickets,metaDia(ay)],[d.items/d.tickets,itMeta(ay)],[d.venta/d.tickets,tkMeta(ay)],[(d.prop||0)/d.tickets*100,caMeta(ay)]].filter(function(x){return x[0]>=x[1];}).length:null;
  h+='<div class="chips">'+'<span class="chip fuego'+(rc>0?' on':'')+'">'+ICO.fuego+'<span>Racha: <b>'+rc+'</b> '+(rc===1?'día en meta':'días seguidos en meta')+'</span></span>'+
     (medY!=null?'<span class="chip medal'+(medY>0?' on':'')+'">'+ICO.estrella+'<span>Ayer: <b>'+medY+' de 4</b> medallas</span></span>':'')+'</div>';
  // ayer
  h+='<section class="eq-ayer">';
  if(arranque){h+='<div class="eq-big neutral">Hoy arrancamos. Cada mañana vamos a ver acá cómo nos fue el día anterior.</div>';}
  else if(!d){h+='<div class="eq-big neutral">Todavía no están los números de ayer.</div>';}
  else{var mt=metaDia(ay), ok=d.tickets>=mt;
    h+='<div class="eq-big '+(ok?'good':'bad')+'"><span class="eq-ic">'+(ok?'<span class="shine">'+ICO.copa+'</span>':'▼')+'</span><span>'+(ok?'¡Ayer cumplimos!':'Ayer no llegamos:')+' <b data-to="'+d.tickets+'">'+d.tickets+'</b> clientes de '+mt+(ok?'':'. Hoy lo damos vuelta.')+'</span></div>'; if(ok) VIEW.festejar=true;
    var tiles=[['Clientes',d.tickets,mt,nf(d.tickets),nf(mt),'int'],['Productos por cliente',d.items/d.tickets,itMeta(ay),dec(d.items/d.tickets),dec(itMeta(ay)),'dec'],['Ticket promedio',d.venta/d.tickets,tkMeta(ay),'$'+nf(d.venta/d.tickets),'$'+nf(tkMeta(ay)),'money'],['Clientes con algo casero',(d.prop||0)/d.tickets*100,caMeta(ay),nf((d.prop||0)/d.tickets*100)+'%',nf(caMeta(ay))+'%','pct']];
    h+='<div class="eq-tiles">'+tiles.map(function(x){var s=estado(x[1],x[2]);return '<div class="eq-tile '+(s==='good'?'good':(s==='warn'?'warn':'bad'))+'"><span class="l">'+x[0]+'</span><span class="tv" data-to="'+x[1]+'" data-fmt="'+x[5]+'">'+x[3]+'</span><span class="tm">meta '+x[4]+' '+(s==='good'?'✓':(s==='warn'?'●':'▼'))+'</span></div>';}).join('')+'</div>';}
  h+='</section>';
  if(d) h+=podio(sectorScore(d.r,function(id){return ruleMeta(id,ay);}),'Quién ganó ayer','puntos por sector en venta cruzada');
  // hoy
  var FD=focoDelDia(t,d,ay), foco=FD.ids.map(ruleById);
  if(nota(t)) h+='<div class="eq-nota"><b>Hoy:</b> '+esc(nota(t))+'</div>';
  h+='<section class="eq-hoy"><div class="eq-meta"><span class="l">Meta de hoy</span><span class="eq-num" data-to="'+Math.max(mh,rec)+'">'+Math.max(mh,rec)+'</span><span class="eq-u">clientes</span></div>'+
     '<div class="eq-goals"><div><span class="l">Productos por cliente</span><b>'+dec(itMeta(t))+'</b></div><div><span class="l">Ticket promedio</span><b>$'+nf(tkMeta(t))+'</b></div><div><span class="l">Clientes con algo casero</span><b>'+nf(caMeta(t))+' de cada 100</b></div></div>'+
     '<div class="eq-regla">Que cada cliente se lleve <b>un producto más</b>, y si puede, <b>algo de elaboración propia</b>.</div></section>';
  h+='<section><h2 class="eq-h2">Desafíos de hoy</h2><div class="eq-focos">'+foco.map(function(R){var tr=Math.round(E.r[R.id]),obj=Math.ceil(tr*ruleMeta(R.id,t)/100);
     return '<article class="eq-foco"><span class="area">'+R.area+'</span><h3>'+esc(R.titulo)+'</h3><div class="eq-say">'+esc(R.frase)+'</div><div class="eq-obj">Desafío: <b data-to="'+obj+'">'+obj+'</b> ventas hoy</div></article>';}).join('')+'</div>'+(FD.ref?'<div class="eq-ref">Ayer también quedó flojo: <b>'+esc(ruleById(FD.ref).titulo)+'</b>. ¡Reforzarlo!</div>':'')+'</section>';
  h+=objetivoEquipo();
  h+=mesEquipo();
  var WA=agg(semana(0)); if(WA.conDato) h+=podio(sectorScore(WA.r,function(id){return WA.rMeta[id];}),'Copa de la semana',semNom(l)+' · acumulado');
  // siempre
  h+='<section class="eq-siempre"><h2 class="eq-h2">Siempre ofrecer</h2><div class="eq-cols">'+SECT.map(function(a){return '<div><h3>'+sectNom(a)+'</h3><ul>'+
     MC_RULES.filter(function(R){return R.area===a;}).map(function(R){return '<li>'+esc(R.titulo)+'</li>';}).join('')+'</ul></div>';}).join('')+'</div></section>';
  h+='<footer class="note"><span>✓ cumplimos la meta · ● estuvimos cerca · ▼ no llegamos · Medallas: clientes, productos, ticket y casero en meta.</span></footer>';
  document.getElementById('app').innerHTML=h; bindModo(); animar(); if(VIEW.festejar){VIEW.festejar=false;confeti();}
}
function bindModo(){var sb=document.querySelector('.salir'); if(sb) sb.onclick=salir; document.querySelectorAll('.modo button').forEach(function(b){b.onclick=function(){VIEW.modo=b.dataset.m;try{history.replaceState(null,'',VIEW.modo==='encargado'?'#encargado':'#equipo');}catch(e){}render();};});}


var AREAS=['Todos','Carnicería','Caja','Encargado'];
function money(v){return (v<0?'−':'')+'$'+nf(Math.abs(v)/1e6,1)+' M';}
function diaCalc(f){var p=perfil()[wd(f)]||{tk:0,ticket:0}, mc=metaDia(f), mt=tkMeta(f), fo=focoDia(f);
  if(!mc) p={tk:0,ticket:0,r:(perfil()[wd(f)]||{}).r}; var base=p.tk*p.ticket, meta=mc*mt;
  return {f:f,p:p,mc:mc,mt:mt,base:base,meta:meta,extra:meta-base,cli:(mc-p.tk)*p.ticket,tic:mc*(mt-p.ticket),fo:fo,cross:fo.reduce(function(s,id){return s+oportunidad(id,f);},0)};}
function perfilTabla(){
  var P=perfil(), rows=[1,2,3,4,5,6,0].map(function(w){var p=P[w]; if(!p) return ''; var f=semana(0)[(w+6)%7], fo=focoAuto(f);
    return '<tr><td><b>'+DIAS[w]+'</b></td><td>'+nf(p.tk)+' → <b>'+nf(+STATE.metas.tkDia[w])+'</b></td><td>$'+nf(p.ticket)+' → <b>$'+nf(tkMeta(f))+'</b></td><td>'+dec(p.items)+' → <b>'+dec(itMeta(f))+'</b></td><td>'+nf(p.casero)+'% → <b>'+nf(caMeta(f))+'%</b></td>'+
      '<td>'+nf(p.r.c1.T)+'</td><td>'+nf(p.r.c3.T)+'</td><td class="wrap">'+fo.map(function(id){return esc(ruleById(id).corto);}).join('<br>')+'</td><td>$'+nf(fo.reduce(function(s,id){return s+oportunidad(id,f);},0))+'</td></tr>';}).join('');
  return '<section class="card"><div class="colhead"><h2>Cómo es cada día de la semana</h2><span class="sub">últimas 4 semanas antes del arranque → meta (la venta cruzada usa 12 semanas)</span></div>'+
   '<div class="tbl"><table class="pt"><thead><tr><th>Día</th><th>Clientes</th><th>Ticket prom.</th><th>Prod. por cliente</th><th>Casero</th><th>Clientes con parrilla</th><th>Clientes con pollo</th><th>Foco sugerido</th><th>Suma el foco por día</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
   '<div class="m">El foco sugerido de cada día es, para cada sector (carnicería, fiambrería y caja), la regla que más ventas puede sumar ese día: cuántos clientes llegan con el producto disparador, cuánto falta para la meta y cuánto vale lo que se ofrece.</div></section>';
}

function proximos7(){
  var t=hoy(), fs=[]; for(var i=0;i<7;i++) fs.push(addDays(t,i));
  var h='<section class="card p7"><div class="colhead"><h2>Próximos 7 días</h2><span class="sub">qué vamos a buscar cada día · se puede cambiar la meta de clientes, el foco y la nota</span></div><div class="tbl"><table class="pd p7t"><thead><tr><th>Día</th><th>Nota</th><th>Clientes</th><th>Prod./cliente</th><th>Ticket</th><th>Casero</th>'+SECT.map(function(a){return '<th>Foco '+a.toLowerCase()+'</th>';}).join('')+'<th>A sumar</th></tr></thead><tbody>'+
  fs.map(function(f){var x=diaCalc(f), auto=focoAuto(f), cl=cerrado(f), lun=lunesDe(f);
    function sel(k,area){return '<select class="pdf" data-l="'+lun+'" data-f="'+f+'" data-k="'+k+'" aria-label="Foco '+area+' '+fcorta(f)+'"'+(cl?' disabled':'')+'>'+MC_RULES.filter(function(R){return R.area===area;}).map(function(R){return '<option value="'+R.id+'"'+(x.fo[k]===R.id?' selected':'')+'>'+esc(R.corto)+(auto[k]===R.id?' ★':'')+'</option>';}).join('')+'</select>';}
    return '<tr class="'+(f===t?'curw':'')+(cl?' closed':'')+'"><td><b>'+DC[wd(f)]+' '+fcorta(f)+'</b>'+(f===t?' <span class="area">hoy</span>':'')+'</td>'+
      '<td><input type="text" class="p7n" data-f="'+f+'" value="'+esc(nota(f))+'" placeholder="—" aria-label="Nota '+fcorta(f)+'"></td>'+
      '<td><input type="number" class="p7c" data-f="'+f+'" min="0" value="'+metaDia(f)+'" aria-label="Meta clientes '+fcorta(f)+'"'+(f<(STATE.metas.inicio||'')?' disabled':'')+'>'+(STATE.metas.especiales[f]!=null?' <span class="m">★</span>':'')+'</td>'+
      '<td>'+(cl?'–':dec(itMeta(f)))+'</td><td>'+(cl?'–':'$'+nf(tkMeta(f)))+'</td><td>'+(cl?'–':nf(caMeta(f))+'%')+'</td>'+
      SECT.map(function(a,ix){return '<td>'+(cl?'<span class="m">cerrado</span>':sel(ix,a))+'</td>';}).join('')+
      '<td>'+(cl?'–':'+$'+nf(x.extra/1e3)+' mil')+'</td></tr>';}).join('')+
  '</tbody></table></div><div class="m">Clientes en 0 = día cerrado o que no se mide. ★ en clientes = meta especial para esa fecha; ★ en el foco = sugerido por los datos de ese día de la semana. Productos, ticket y casero se ajustan por día de la semana en "Cargar ventas del día y metas".</div>'+
  '<div class="plan-save">'+(VIEW.dirty?'<span class="stale">Hay cambios sin guardar.</span>':'')+'<button class="btn" id="b-save3" type="button">Guardar</button><span class="msg" id="m-save3"></span></div></section>';
  return h;
}
function bind7(){
  document.querySelectorAll('.p7c').forEach(function(i){i.onchange=function(){var f=i.dataset.f,v=Math.max(0,Math.round(+i.value||0));var def=+STATE.metas.tkDia[wd(f)];if(v===def)delete STATE.metas.especiales[f];else STATE.metas.especiales[f]=v;VIEW.dirty=true;render();};});
  document.querySelectorAll('.p7n').forEach(function(i){i.onchange=function(){STATE.notas=STATE.notas||{};var v=i.value.trim();if(v)STATE.notas[i.dataset.f]=v;else delete STATE.notas[i.dataset.f];VIEW.dirty=true;render();};});
  var b=document.getElementById('b-save3'); if(b) b.onclick=function(){onSave('b-save3','m-save3');};
}

function planSection(){
  var cur=lunesDe(hoy()), Bd=byDate(), weeks=[], tot={base:0,meta:0,extra:0,cli:0,tic:0,cross:0,mc:0,bc:0};
  for(var k=0;k<4;k++){var lun=addDays(cur,7*k), ds=[];for(var i=0;i<7;i++)ds.push(diaCalc(addDays(lun,i)));
    var S={lun:lun,ds:ds,base:0,meta:0,extra:0,cli:0,tic:0,cross:0,mc:0,bc:0};ds.forEach(function(x){S.base+=x.base;S.meta+=x.meta;S.extra+=x.extra;S.cli+=x.cli;S.tic+=x.tic;S.cross+=x.cross;S.mc+=x.mc;S.bc+=x.p.tk;});
    for(var q in tot) tot[q]+=S[q]; weeks.push(S);}
  var h=perfilTabla();
  h+='<section class="card"><div class="colhead"><h2>Qué tiene que pasar en las próximas 4 semanas</h2><span class="sub">venta de mostrador a precios de septiembre</span></div>'+
    '<div class="tbl"><table class="pt"><thead><tr><th>Semana</th><th>Si seguimos igual</th><th>Meta</th><th>A sumar</th><th>Por más clientes</th><th>Por mejor ticket</th><th>Del foco diario</th></tr></thead><tbody>'+
    weeks.map(function(S){var esp=espDeSemana(S.lun);return '<tr><td><b>'+semNom(S.lun)+'</b> <span class="m">'+fcorta(S.lun)+'–'+fcorta(addDays(S.lun,6))+'</span>'+(esp.length?' <span class="area">★ '+esp.map(fcorta).join(', ')+'</span>':'')+'</td><td>'+money(S.base)+'<br><span class="m">'+nf(S.bc)+' clientes</span></td><td><b>'+money(S.meta)+'</b><br><span class="m">'+nf(S.mc)+' clientes</span></td><td class="up"><b>+'+money(S.extra).replace('$','$')+'</b></td><td>'+money(S.cli)+'</td><td>'+money(S.tic)+'</td><td>'+money(S.cross)+'</td></tr>';}).join('')+
    '<tr class="tot"><td><b>4 semanas</b></td><td>'+money(tot.base)+'</td><td><b>'+money(tot.meta)+'</b></td><td class="up"><b>+'+money(tot.extra)+'</b></td><td>'+money(tot.cli)+'</td><td>'+money(tot.tic)+'</td><td>'+money(tot.cross)+'</td></tr></tbody></table></div>'+
    '<div class="m">"Si seguimos igual" usa el promedio de cada día de la semana. "Por mejor ticket" incluye la venta cruzada: "del foco diario" es la parte que aportan las reglas de foco de cada día si llegan a su meta.</div></section>';
  h+='<section class="plan"><div class="colhead"><h2>Plan semana por semana</h2><span class="sub">Se corre solo: siempre la semana en curso y las 3 siguientes. Las acciones son para el encargado: el equipo ve solo la meta y el foco de cada día.</span></div>';
  weeks.forEach(function(S,k){var lun=S.lun, p=planDe(lun)||{acciones:[]}, A=agg(S.ds.map(function(x){return x.f;}));
    h+='<article class="card pw'+(k===0?' pwcur':'')+'"><div class="head"><h3>'+semNom(lun)+' <span class="m">· lunes '+fcorta(lun)+' al domingo '+fcorta(addDays(lun,6))+'</span></h3>'+(k===0?'<span class="area">en curso</span>':'')+'</div>'+
      '<div class="pwsum"><div><span class="l">Meta clientes</span><b>'+nf(S.mc)+'</b>'+(k===0&&A.conDato?'<span class="m">llevamos '+nf(A.t)+' de '+nf(A.metaT)+'</span>':'<span class="m">si seguimos igual: '+nf(S.bc)+'</span>')+'</div>'+
      '<div><span class="l">Venta meta</span><b>'+money(S.meta)+'</b><span class="m">si seguimos igual: '+money(S.base)+'</span></div><div><span class="l">A sumar</span><b class="up">+'+money(S.extra)+'</b><span class="m">'+money(S.cli)+' por clientes · '+money(S.tic)+' por ticket</span></div></div>'+
      '<div class="pwbody"><div><div class="tbl"><table class="pd"><thead><tr><th>Día</th><th>Clientes</th><th>A sumar</th><th>Foco carnicería</th><th>Foco fiambrería</th><th>Foco caja</th></tr></thead><tbody>'+
      S.ds.map(function(x){var d=Bd[x.f], auto=focoAuto(x.f);
        function sel(k2,area){return '<select class="pdf" data-l="'+lun+'" data-f="'+x.f+'" data-k="'+k2+'" aria-label="Foco '+area+' '+fcorta(x.f)+'">'+MC_RULES.filter(function(R){return R.area===area;}).map(function(R){return '<option value="'+R.id+'"'+(x.fo[k2]===R.id?' selected':'')+'>'+esc(R.corto)+(auto[k2]===R.id?' ★':'')+'</option>';}).join('')+'</select>';}
        return '<tr class="'+(x.f===hoy()?'curw':'')+'"><td><b>'+DC[wd(x.f)]+' '+fcorta(x.f)+'</b>'+(nota(x.f)?' <span class="area">'+esc(nota(x.f))+'</span>':(STATE.metas.especiales[x.f]!=null?' <span class="area">especial</span>':''))+'</td><td>'+(d?'<b>'+d.tickets+'</b> de '+x.mc+' '+pill(estado(d.tickets,x.mc)):nf(x.p.tk)+' → <b>'+x.mc+'</b>')+'</td><td>+$'+nf(x.extra/1e3)+' mil</td>'+SECT.map(function(a,ix){return '<td>'+sel(ix,a)+'</td>';}).join('')+'</tr>';}).join('')+
      '</tbody></table></div><div class="m">★ foco sugerido por los datos de ese día de la semana. Se puede cambiar.</div></div>'+
      '<div class="pwacc"><span class="l">Acciones de la semana</span><ul>'+((p.acciones||[]).length?p.acciones.map(function(a,ix){return '<li><span><span class="area">'+esc(a.a)+'</span> '+esc(a.t)+''+'</span><button type="button" class="px" data-l="'+lun+'" data-i="'+ix+'" aria-label="Quitar acción">✕</button></li>';}).join(''):'<li class="m">Sin acciones todavía.</li>')+'</ul>'+
      '<div class="padd"><input type="text" id="pa-'+lun+'" placeholder="Nueva acción" aria-label="Nueva acción '+semNom(lun)+'"><select id="ps-'+lun+'" aria-label="Quién">'+AREAS.map(function(a){return '<option>'+a+'</option>';}).join('')+'</select>'+
      '<button type="button" class="nb pad" data-l="'+lun+'">Agregar</button></div></div></div></article>';});
  h+='<div class="plan-save">'+(VIEW.dirty?'<span class="stale">Hay cambios sin guardar.</span>':'')+'<button class="btn" id="b-save2" type="button">Guardar</button><span class="msg" id="m-save2"></span></div></section>';
  return h;
}
function bindPlan(){
  function P(l){STATE.plan=STATE.plan||{};return STATE.plan[l]||(STATE.plan[l]={foco:[],acciones:[]});}
  document.querySelectorAll('.pf').forEach(function(c){c.onchange=function(){var p=P(c.dataset.l),id=c.dataset.r;p.foco=(p.foco||[]).filter(function(x){return x!==id;});if(c.checked){p.foco.push(id);if(p.foco.length>2)p.foco.shift();}VIEW.dirty=true;render();};});
  document.querySelectorAll('.pdf').forEach(function(s){s.onchange=function(){var p=P(s.dataset.l),f=s.dataset.f;p.dias=p.dias||{};var c=focoDia(f).slice();c[+s.dataset.k]=s.value;var au=focoAuto(f);if(c.join()===au.join())delete p.dias[f];else p.dias[f]=c;VIEW.dirty=true;render();};});
  document.querySelectorAll('.px').forEach(function(b){b.onclick=function(){P(b.dataset.l).acciones.splice(+b.dataset.i,1);VIEW.dirty=true;render();};});
  document.querySelectorAll('.pad').forEach(function(b){b.onclick=function(){var l=b.dataset.l,tx=document.getElementById('pa-'+l).value.trim();if(!tx)return;
    var p=P(l);p.acciones=p.acciones||[];p.acciones.push({t:tx,a:document.getElementById('ps-'+l).value,eq:false});VIEW.dirty=true;render();};});
  var b2=document.getElementById('b-save2'); if(b2) b2.onclick=function(){onSave('b-save2','m-save2');};
}

function render(){
  if(VIEW.modo==='equipo'){renderEquipo();return;}
  var fs=periodoFechas(), A=agg(fs), M=STATE.metas, last=ultimaFecha(), t=hoy();
  var tick=A.t?A.v/A.t:null, multi=A.t?A.m/A.t*100:null;
  var h='';
  // freshness
  var ayer=addDays(t,-1), falta1=last?addDays(last,1):null; while(falta1&&falta1<=ayer&&cerrado(falta1)) falta1=addDays(falta1,1); var atras=falta1&&falta1<=ayer;
  h+=marca()+'<header class="top"><div><div class="eyebrow">'+(MARCAS[cid()]?'Tablero del equipo':'Manos de Carhué · Tablero del equipo')+'</div><h1>'+(VIEW.periodo==='hoy'?'Arranque del día':(VIEW.periodo==='plan'?'Plan de acción':(VIEW.periodo==='mix'?'Mix y margen':'¿Cómo venimos?')))+'</h1><div class="sub">Vista del encargado</div>'+previewBanner()+''+
     '<div class="sub">'+esc(tituloPeriodo(fs))+' · Datos de Odoo hasta el '+(last?DIAS[wd(last)].toLowerCase()+' '+fcorta(last):'–')+'</div>'+
     (atras?'<div class="stale">Faltan cargar las ventas desde el '+fcorta(falta1)+'.</div>':'')+'</div>'+
     '<div class="hdr-r">'+modoSwitch()+'<div class="pills" role="group" aria-label="Período">'+[['hoy','Hoy'],['semana','Semana'],['mes','Mes'],['plan','Plan 4 semanas']].concat(mixCfg()?[['mix','Mix']]:[]).map(function(p){return '<button type="button" data-p="'+p[0]+'" aria-pressed="'+(VIEW.periodo===p[0])+'">'+p[1]+'</button>';}).join('')+'</div></div></header>';

  if(VIEW.periodo==='mix'){ h+=mixSection(); } else {
  if(VIEW.periodo==='hoy'||VIEW.periodo==='mes') h+=mesEncargado();
  if(VIEW.periodo==='hoy') h+=huddle()+proximos7();
  if(VIEW.periodo!=='plan'){
    // projection block
    var diasRest=A.resto, porDia=diasRest?A.falta/diasRest:0, metaRestoProm=diasRest?A.metaResto/diasRest:0;
    var sP=estado(A.proy,A.metaTotal);
    h+='<section class="card proy"><div class="proyhead"><div><div class="l">Clientes '+(VIEW.periodo!=='mes'?'· '+esc(semLabel(fs[0])):'del mes')+'</div>'+
       '<div class="big"><span class="v">'+nf(A.t)+'</span><span class="m"> de '+nf(A.metaTotal)+' de meta</span></div></div>'+
       (VIEW.periodo==='semana'?'<div class="nav"><button type="button" class="nb" data-w="-1" aria-label="Semana anterior"'+(fs[0]<=lunesDe(INI())?' disabled':'')+'>‹</button><button type="button" class="nb" data-w="0"'+(VIEW.wk===0?' disabled':'')+'>Hoy</button><button type="button" class="nb" data-w="1" aria-label="Semana siguiente">›</button></div>':'')+'</div>'+
       '<div class="bar tall" aria-hidden="true"><i class="fill-'+(estado(A.t,A.metaT)||'warn')+'" style="width:'+Math.min(A.t/A.metaTotal*100,100).toFixed(1)+'%"></i>'+
       (A.metaTotal?'<b style="left:'+Math.min(A.metaT/A.metaTotal*100,100).toFixed(1)+'%" title="Meta a la fecha"></b>':'')+'</div>'+
       '<div class="proygrid">'+
         '<div><span class="l">A la fecha</span><strong>'+(A.conDato?nf(A.t)+' / '+nf(A.metaT):'Sin datos todavía')+'</strong>'+(A.conDato?pill(estado(A.t,A.metaT)):'')+'</div>'+
         '<div><span class="l">Si seguimos a este ritmo</span><strong>'+(A.conDato?'cerramos en '+nf(A.proy):'–')+'</strong>'+(A.conDato&&diasRest?pill(sP):'')+'</div>'+
         '<div><span class="l">Para llegar a la meta</span><strong>'+(A.falta<=0?'Meta cumplida':(diasRest?nf(porDia)+' por día en los '+diasRest+' días que quedan':'Faltaron '+nf(A.falta)))+'</strong>'+
           (A.falta>0&&diasRest?'<span class="m">la meta de esos días es '+nf(metaRestoProm)+' por día</span>':'')+'</div>'+
       '</div>';
    if(VIEW.periodo!=='mes'){
      var Bd=byDate();
      h+='<div class="strip" role="list">'+fs.map(function(f){var d=Bd[f],mt=metaDia(f),s=d?estado(d.tickets,mt):null,cls=d?'done '+s:(cerrado(f)?'next':(f===t?'today':(f<t?'miss':'next')));
        var esp=STATE.metas.especiales[f]!=null;
        return '<div class="day '+cls+'" role="listitem"><div class="dn">'+DC[wd(f)]+' <span>'+fcorta(f)+'</span></div>'+
          '<div class="dv">'+(d?nf(d.tickets):(cerrado(f)?'Cerrado':(f===t?'Hoy':(f<t?'Sin cargar':'—'))))+'</div>'+
          '<div class="dm">meta '+nf(mt)+(esp?' ★':'')+'</div>'+
          (d?'<div class="dt">ticket $'+nf(d.venta/d.tickets)+'</div>'+pill(s):'<div class="dt">&nbsp;</div>')+'</div>';}).join('')+'</div>'+
        (fs.some(function(f){return STATE.metas.especiales[f]!=null;})?'<div class="m">★ Meta especial por fecha (feriado o evento).</div>':'');
    }
    h+='</section>';
  }

  if(VIEW.periodo!=='hoy'&&VIEW.periodo!=='plan'){
  h+='<section class="kpis">'+
    kpiCard('Ticket promedio',tick,A.tkMeta,'$'+nf(tick),'$'+nf(A.tkMeta),A.conDato?'Lo que gasta cada cliente en promedio.':'Se completa cuando haya ventas cargadas.')+
    kpiCard('Productos por cliente',A.t?A.i/A.t:null,A.itMeta,A.t?dec(A.i/A.t):'–',dec(A.itMeta),A.conDato?'Cantidad de productos distintos por ticket.':'Se completa cuando haya ventas cargadas.')+
    kpiCard('Clientes con algo casero',A.t?A.pr/A.t*100:null,A.caMeta,A.t?nf(A.pr/A.t*100)+'%':'–',nf(A.caMeta)+'%',A.conDato?'$'+nf(A.vp/1e6,1)+' M en productos de elaboración propia.':'Se completa cuando haya ventas cargadas.')+
    kpiCard('Tickets con 2 o más productos',multi,A.muMeta,nf(multi)+'%',nf(A.muMeta)+'%',A.conDato?nf(A.t-A.m)+' clientes se llevaron un solo producto. Cada uno es una oportunidad.':'Se completa cuando haya ventas cargadas.')+
  '</section>';

  SECT.forEach(function(area,ix){ if(ix===0) h+='<section class="cols">';
    h+='<div class="col"><div class="colhead"><h2>'+sectNom(area)+'</h2><span class="sub">qué ofrecer y cómo venimos</span></div>';
    MC_RULES.filter(function(R){return R.area===area;}).forEach(function(R){
      var e=A.r[R.id]||[0,0], real=e[0]?e[1]/e[0]*100:null, meta=A.rMeta[R.id], s=estado(real,meta), pct=meta&&real!=null?Math.min(real/meta,1.25):0;
      var faltan=real!=null&&meta?Math.max(Math.ceil(e[0]*meta/100-e[1]),0):null;
      h+='<article class="card rule"><div class="head"><h3>'+esc(R.titulo)+'</h3>'+pill(s)+'</div>'+
        '<div class="when">'+esc(R.cuando)+'</div><div class="say">'+esc(R.frase)+'</div>'+
        '<div class="bar" aria-hidden="true"><i class="fill-'+(s||'warn')+'" style="width:'+(pct/1.25*100).toFixed(1)+'%"></i><b style="left:80%"></b></div>'+
        '<div class="nums"><span><strong>'+nf(real)+'%</strong> lo llevaron · '+nf(e[1])+' de '+nf(e[0])+'</span><span>Meta '+nf(meta)+'%</span></div>'+
        (faltan?'<div class="m">Faltaron '+faltan+' ventas para llegar a la meta.</div>':'')+'</article>';
    });
    h+='</div>'; if(ix===SECT.length-1) h+='</section>';
  });
  }

  if(VIEW.periodo==='plan') h+=planSection(); else {
  h+=tablaSemanas();
  h+='<section class="card"><div class="colhead"><h2>Clientes por día contra la meta</h2><span class="sub">desde la Semana 1, de lunes a domingo (hasta 4 semanas)</span></div>'+
     '<div class="chart" id="ch"><svg id="svg" viewBox="0 0 1000 270" role="img" aria-label="Tickets por día de las últimas cuatro semanas contra la meta"></svg></div>'+
     '<div class="legend"><span><i class="sw fill-good"></i>En meta</span><span><i class="sw fill-warn"></i>Hasta 5% debajo</span><span><i class="sw fill-bad"></i>Más de 5% debajo</span><span><i class="sw" style="background:var(--meta);height:3px"></i>Meta del día</span></div></section>';
  }

  } // fin de las vistas que no son Mix

  // admin
  var espTxt=Object.keys(M.especiales).sort().map(function(k){return k.split('-').reverse().join('/')+' = '+M.especiales[k];}).join('\n');
  h+='<details class="admin" id="adm"'+(VIEW.adminOpen?' open':'')+'><summary>Cargar ventas del día y metas (Joaquín)</summary><div class="grid">'+
    '<div class="note"><b>1. Todos los días: cargar las ventas de ayer</b><span>En Odoo: Punto de Venta → Reportes → Análisis de ventas → vista de lista, filtrar la fecha de ayer y exportar a Excel con Fecha de la orden, Orden, Variante del producto, Cliente y Total. También se puede subir una semana entera: los días repetidos se reemplazan.</span></div>'+
    '<input type="file" id="f-xlsx" accept=".xlsx,.xls" aria-label="Archivo de ventas de Odoo"><div class="msg" id="m-xlsx"></div>'+
    '<div class="note"><b>2. Metas por día de la semana</b><span>Clientes, ticket promedio y % de tickets con 2+ productos para cada día. En las reglas se carga un mínimo: cada día se usa el mayor entre ese mínimo y lo que ya se logra ese día más 15%.</span></div>'+
    '<div class="fields">'+[1,2,3,4,5,6,0].map(function(i){return '<label for="tk'+i+'">Clientes '+DIAS[i]+'<input id="tk'+i+'" type="number" min="0" value="'+esc(M.tkDia[i])+'"></label>';}).join('')+
    [1,2,3,4,5,6,0].map(function(i){return '<label for="tt'+i+'">Ticket '+DIAS[i]+' ($)<input id="tt'+i+'" type="number" min="0" step="100" value="'+esc(tkMeta(semana(0)[(i+6)%7]))+'"></label>';}).join('')+
    [1,2,3,4,5,6,0].map(function(i){return '<label for="it'+i+'">Productos por cliente '+DIAS[i]+'<input id="it'+i+'" type="number" min="0" step="0.1" value="'+esc(itMeta(semana(0)[(i+6)%7]))+'"></label>';}).join('')+
    [1,2,3,4,5,6,0].map(function(i){return '<label for="ca'+i+'">Clientes con casero '+DIAS[i]+' (%)<input id="ca'+i+'" type="number" min="0" max="100" value="'+esc(caMeta(semana(0)[(i+6)%7]))+'"></label>';}).join('')+
    [1,2,3,4,5,6,0].map(function(i){return '<label for="mu'+i+'">2+ productos '+DIAS[i]+' (%)<input id="mu'+i+'" type="number" min="0" max="100" value="'+esc(muMeta(semana(0)[(i+6)%7]))+'"></label>';}).join('')+
    MC_RULES.map(function(R){return '<label for="r-'+R.id+'">'+esc(R.titulo)+' (% mínimo)<input id="r-'+R.id+'" type="number" min="0" max="100" value="'+esc(M.rules[R.id])+'"></label>';}).join('')+
    '</div><div class="note"><b>3. Objetivo que ve el equipo</b><span>Lo define el encargado a partir de lo que baja el directorio. Si se deja vacío, se usa la suma de las metas diarias.</span></div>'+
    '<div class="fields"><label for="ob-per">Período<select id="ob-per"><option value="semana"'+((M.objetivo||{}).periodo!=='mes'?' selected':'')+'>Semana</option><option value="mes"'+((M.objetivo||{}).periodo==='mes'?' selected':'')+'>Mes</option></select></label>'+
    '<label for="ob-cli">Clientes del período<input id="ob-cli" type="number" min="0" placeholder="'+nf(agg(objFechas()).metaTotal)+'" value="'+esc((M.objetivo||{}).clientes||'')+'"></label>'+
    '<label for="ob-txt" class="wide">Título que ve el equipo<input id="ob-txt" type="text" placeholder="Objetivo de la semana" value="'+esc((M.objetivo||{}).texto||'')+'"></label>'+
    '<label for="ob-mes" class="wide">Objetivo de ventas de '+mesNombre()+', en millones de $ (todas las ventas de Odoo)<input id="ob-mes" type="number" min="0" step="0.1" placeholder="sin objetivo" value="'+(mesObjetivo()?esc(mesObjetivo()/1e6):'')+'"></label></div>'+
    mixAdmin()+
    '<label class="fields1" for="mt-esp">Metas especiales por fecha (una por línea, dd/mm/aaaa = clientes)<textarea id="mt-esp" rows="3">'+esc(espTxt)+'</textarea></label>'+
    '<div><button class="btn" id="b-save" type="button">Guardar para el equipo</button></div><div class="msg" id="m-save"></div>'+
    usuariosAdmin()+'</div></details>';
  h+='<footer class="note"><span>Clientes, ticket y venta cruzada cuentan solo las ventas del punto de venta: no incluyen pedidos de la Municipalidad, Cabaña Tres Marías ni consumos internos.</span>'+
     '<span>El objetivo de ventas del mes cuenta todo lo que trae el reporte de Odoo: mostrador, pedidos, organizaciones y Aberasturi.</span>'+
     '<span>"Si seguimos a este ritmo" aplica el cumplimiento de los días cargados a la meta de los días que faltan.</span>'+
     '<span>Cada regla se mide sobre el ticket completo: de los clientes que compraron el producto disparador, cuántos se llevaron también lo ofrecido.</span>'+
     '<span>Verde: meta cumplida. Amarillo: hasta 5% debajo. Rojo: más de 5% debajo.</span></footer>';
  document.getElementById('app').innerHTML=h;
  bindModo();
  document.querySelectorAll('.pills button').forEach(function(b){b.onclick=function(){VIEW.periodo=b.dataset.p;VIEW.adminOpen=$('#adm').open;render();};});
  document.querySelectorAll('.nb').forEach(function(b){b.onclick=function(){var w=+b.dataset.w;VIEW.wk=w===0?0:VIEW.wk+w;VIEW.adminOpen=$('#adm').open;render();};});
  $('#f-xlsx').onchange=onFile; $('#b-save').onclick=function(){onSave('b-save','m-save');}; bindPlan(); bind7(); bindMix(); bindUsuarios();
  $('#adm').ontoggle=function(){VIEW.adminOpen=this.open;};
  if(VIEW.msgX){$('#m-xlsx').className='msg '+(VIEW.msgX[0]||'');$('#m-xlsx').textContent=VIEW.msgX[1];}
  drawChart();
}

function css(n){return getComputedStyle(document.documentElement).getPropertyValue(n).trim();}
function drawChart(){
  var svg=document.getElementById('svg'); if(!svg) return; svg.innerHTML=''; var ot=document.querySelector('#ch .tip'); if(ot) ot.remove();
  var NS='http://www.w3.org/2000/svg', Bd=byDate(), cur=lunesDe(hoy()), ini=lunesDe(INI()), nw=Math.max(1,Math.min(4,nSem(cur))), st=addDays(cur,-7*(nw-1)); if(st<ini){st=ini;nw=Math.max(1,nSem(cur));} var fs=[]; for(var i=0;i<7*nw;i++) fs.push(addDays(st,i));
  function el(t,a){var e=document.createElementNS(NS,t);for(var k in a)e.setAttribute(k,a[k]);svg.appendChild(e);return e;}
  var W=1000,H=270,L=36,R=6,T=26,B=36,max=0; fs.forEach(function(f){var d=Bd[f];max=Math.max(max,d?d.tickets:0,metaDia(f));}); max=Math.ceil(max/50)*50||50;
  var y=function(v){return T+(H-T-B)*(1-v/max);}, bw=(W-L-R)/(7*nw);
  for(var g=0;g<=max;g+=50){el('line',{x1:L,x2:W-R,y1:y(g),y2:y(g),stroke:css('--track'),'stroke-width':1});var t=el('text',{x:L-6,y:y(g)+4,'text-anchor':'end','font-size':12,fill:css('--ink2')});t.textContent=g;}
  for(var k=0;k<nw;k++){var x0=L+k*7*bw; if(k>0) el('line',{x1:x0,x2:x0,y1:6,y2:H-B+4,stroke:css('--line'),'stroke-width':1.5,'stroke-dasharray':'4 4'});
    var lb=el('text',{x:x0+7*bw/2,y:16,'text-anchor':'middle','font-size':13,'font-weight':700,fill:k===nw-1?css('--brand'):css('--ink2')});lb.textContent=semNom(fs[k*7])+' · '+fcorta(fs[k*7])+'–'+fcorta(fs[k*7+6])+(k===nw-1?' (en curso)':'');}
  var ch=document.getElementById('ch'), tip=document.createElement('div'); tip.className='tip'; tip.hidden=true; ch.appendChild(tip);
  fs.forEach(function(f,i){var d=Bd[f], mt=metaDia(f), x=L+i*bw+bw*.16, w=bw*.68;
    if(d){var s=estado(d.tickets,mt)||'warn', h=y(0)-y(d.tickets), r=Math.min(4,w/2,h);
      el('path',{d:'M'+x+','+y(0)+' v'+(-(h-r))+' q0,'+(-r)+' '+r+','+(-r)+' h'+(w-2*r)+' q'+r+',0 '+r+','+r+' v'+(h-r)+' z',fill:css('--'+s)});}
    el('line',{x1:x-2,x2:x+w+2,y1:y(mt),y2:y(mt),stroke:css('--meta'),'stroke-width':2.5,'stroke-linecap':'round','stroke-opacity':d?1:.45});
    var l=el('text',{x:x+w/2,y:H-18,'text-anchor':'middle','font-size':11,fill:f===hoy()?css('--brand'):css('--muted'),'font-weight':f===hoy()?700:400});l.textContent=DC[wd(f)].charAt(0);
    if(wd(f)===1){var t2=el('text',{x:x+w/2,y:H-4,'text-anchor':'middle','font-size':11,fill:css('--ink2')});t2.textContent=fcorta(f);}
    var hit=el('rect',{x:L+i*bw,y:T,width:bw,height:H-T-B,fill:'transparent'});
    hit.addEventListener('pointermove',function(ev){var rc=ch.getBoundingClientRect();tip.innerHTML='<b>'+DIAS[wd(f)]+' '+fcorta(f)+'</b><br>'+(d?d.tickets+' clientes · meta '+mt+'<br>Ticket $'+nf(d.venta/d.tickets):'meta '+mt+(f>=hoy()?'':' · sin cargar'));tip.hidden=false;
      var px=ev.clientX-rc.left+12; if(px+tip.offsetWidth>rc.width) px=ev.clientX-rc.left-tip.offsetWidth-12; tip.style.left=px+'px'; tip.style.top=Math.max(0,ev.clientY-rc.top-50)+'px';});
    hit.addEventListener('pointerleave',function(){tip.hidden=true;});
  });
}

function onFile(ev){
  var f=ev.target.files[0]; if(!f) return; VIEW.adminOpen=true;
  if(typeof XLSX==='undefined'){VIEW.msgX=['err','No se pudo cargar el lector de Excel. Revisá la conexión y recargá la página.'];render();return;}
  var rd=new FileReader(); rd.onload=function(){
    try{ var rows=MC_parse(XLSX,new Uint8Array(rd.result)); var nd=MC_compute(rows); if(!nd.length) throw new Error('El archivo no tiene ventas.');
      var map={}; STATE.dias.forEach(function(d){map[d.fecha]=d;}); var nuevos=0; nd.forEach(function(d){if(!map[d.fecha]) nuevos++; map[d.fecha]=d;});
      STATE.dias=Object.keys(map).sort().map(function(k){return map[k];}).slice(-400);_PERF=null; VIEW.nuevos=(VIEW.nuevos||[]).filter(function(x){return !nd.some(function(y){return y.fecha===x.fecha;});}).concat(nd); VIEW.dirty=true;
      VIEW.msgX=['ok','Se leyeron '+nd.length+' día'+(nd.length>1?'s':'')+' ('+fcorta(nd[0].fecha)+(nd.length>1?' al '+fcorta(nd[nd.length-1].fecha):'')+'), '+nuevos+' nuevo'+(nuevos===1?'':'s')+'. Ya se ve arriba. Tocá "Guardar" para que lo vea el equipo.'];
    }catch(e){VIEW.msgX=['err',e.message||'No se pudo leer el archivo.'];}
    render();
  }; rd.readAsArrayBuffer(f);
}

// ---- usuarios y contraseñas (encargado) ----
function usuariosAdmin(){
  var L=VIEW.usuarios, ops=(L||[]).filter(function(u){return u.rol==='equipo'||u.usuario===SES.usuario||SES.rol==='admin';});
  var lista=L?(L.length?L.map(function(u){return '<span><b>'+esc(u.usuario)+'</b> · '+esc(u.rol)+(u.ultimo_ingreso?' · último ingreso '+fcorta(String(u.ultimo_ingreso).slice(0,10)):' · nunca ingresó')+'</span>';}).join(''):'<span>No hay usuarios.</span>'):'<span>Cargando usuarios…</span>';
  return '<div class="note"><b>5. Usuarios y contraseñas</b><span>Cambiá la contraseña del usuario del equipo o la tuya. Para un usuario nuevo del equipo, elegí "Usuario nuevo" y escribí el nombre.</span>'+lista+'</div>'+
    '<div class="fields"><label for="us-sel">Usuario<select id="us-sel">'+ops.map(function(u){return '<option value="'+esc(u.usuario)+'">'+esc(u.usuario)+'</option>';}).join('')+'<option value="">Usuario nuevo del equipo…</option></select></label>'+
    '<label for="us-nuevo">Nombre del usuario nuevo<input id="us-nuevo" type="text" autocapitalize="none" spellcheck="false" placeholder="ej. equipo.local"></label>'+
    '<label for="us-clave">Contraseña nueva (8 o más caracteres)<input id="us-clave" type="text" autocomplete="new-password" spellcheck="false"></label>'+
    '<div><button class="btn sec" id="us-gen" type="button">Generar una</button></div></div>'+
    '<div><button class="btn" id="us-save" type="button">Guardar contraseña</button></div><div class="msg" id="us-m" role="status"></div>';
}
function cargarUsuarios(){
  if(!SES||SES.rol==='equipo') return;
  api('/api/usuarios').then(function(j){VIEW.usuarios=j.usuarios||[];var a=$('#adm');VIEW.adminOpen=a?a.open:VIEW.adminOpen;render();}).catch(function(){VIEW.usuarios=[];});
}
function bindUsuarios(){
  var b=$('#us-save'); if(!b) return;
  if(!VIEW.usuarios&&!VIEW._usCargando){VIEW._usCargando=true;cargarUsuarios();}
  $('#us-gen').onclick=function(){var a='abcdefghjkmnpqrstuvwxyz23456789',c=new Uint32Array(8),s='';crypto.getRandomValues(c);for(var i=0;i<8;i++){s+=a[c[i]%a.length];if(i===3)s+='-';}$('#us-clave').value='Carhue-'+s;};
  b.onclick=function(){
    var u=$('#us-sel').value||$('#us-nuevo').value.trim().toLowerCase(), c=$('#us-clave').value, m=$('#us-m');
    if(!u){m.className='msg err';m.textContent='Elegí un usuario o escribí el nombre del nuevo.';return;}
    if(c.length<8){m.className='msg err';m.textContent='La contraseña tiene que tener al menos 8 caracteres.';return;}
    b.disabled=true; m.className='msg'; m.textContent='Guardando…';
    api('/api/usuarios',{method:'POST',body:{usuario:u,clave:c}}).then(function(j){
      b.disabled=false; m.className='msg ok'; m.textContent=(j.creado?'Usuario '+j.usuario+' creado':'Contraseña de '+j.usuario+' cambiada')+'. Anotala ahora: no se vuelve a mostrar.';
      if(j.creado){VIEW.usuarios=null;VIEW._usCargando=false;}
    }).catch(function(e){b.disabled=false;if(e.status===401) return pantallaLogin('Tu sesión venció. Volvé a ingresar.');m.className='msg err';m.textContent=e.message||'No se pudo guardar.';});
  };
}
function readMetas(){
  var M=STATE.metas; [0,1,2,3,4,5,6].forEach(function(i){var v=+$('#tk'+i).value;if(v>0)M.tkDia[i]=v;});
  M.itemsDia=M.itemsDia||{}; M.caseroDia=M.caseroDia||{}; [0,1,2,3,4,5,6].forEach(function(i){var a=+$('#it'+i).value;if(a>0)M.itemsDia[i]=a;var b=+$('#ca'+i).value;if(b>0&&b<=100)M.caseroDia[i]=b;});
  M.ticketDia=M.ticketDia||{}; M.multiDia=M.multiDia||{}; [0,1,2,3,4,5,6].forEach(function(i){var a=+$('#tt'+i).value;if(a>0)M.ticketDia[i]=a;var b=+$('#mu'+i).value;if(b>0&&b<=100)M.multiDia[i]=b;});
  MC_RULES.forEach(function(R){var v=+$('#r-'+R.id).value; if(v>0&&v<=100) M.rules[R.id]=v;});
  M.objetivo={periodo:$('#ob-per').value,clientes:(+$('#ob-cli').value>0?+$('#ob-cli').value:null),texto:$('#ob-txt').value.trim()};
  M.mes=M.mes||{}; var vm=+$('#ob-mes').value; if(vm>0) M.mes[mesClave()]=Math.round(vm*1e6); else delete M.mes[mesClave()];
  readMix();
  var esp={}; $('#mt-esp').value.split('\n').forEach(function(l){var m2=l.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s*=\s*(\d+)/); if(m2) esp[m2[3]+'-'+pad(+m2[2])+'-'+pad(+m2[1])]=+m2[4];}); M.especiales=esp;
}
// ---- servidor ----
function api(path,opts){opts=opts||{};return fetch(path,{method:opts.method||'GET',headers:opts.body?{'Content-Type':'application/json'}:{},body:opts.body?JSON.stringify(opts.body):undefined,credentials:'same-origin'})
  .then(function(r){return r.json().catch(function(){return {};}).then(function(j){if(!r.ok){var e=new Error(j.error||('Error '+r.status));e.status=r.status;throw e;}return j;});});}
function onSave(bid,mid){
  readMetas(); if(bid==='b-save') VIEW.adminOpen=true; render();
  var msg=document.getElementById(mid), btn=document.getElementById(bid); btn.disabled=true; msg.className='msg'; msg.textContent='Guardando…';
  var p=Promise.resolve();
  if(VIEW.nuevos&&VIEW.nuevos.length){var nd=VIEW.nuevos.slice(); p=p.then(function(){return api('/api/dias',{method:'POST',body:{dias:nd}});}).then(function(){VIEW.nuevos=[];});}
  p.then(function(){return api('/api/guardar',{method:'POST',body:{metas:STATE.metas,notas:STATE.notas||{},plan:STATE.plan||{}}});})
   .then(function(){VIEW.dirty=false;VIEW.msgX=null;render();var m2=document.getElementById(mid);if(m2){m2.className='msg ok';m2.textContent='Guardado. El equipo ya ve los datos nuevos.';}})
   .catch(function(e){if(e.status===401){return pantallaLogin('Tu sesión venció. Volvé a ingresar y guardá de nuevo.');}msg.className='msg err';msg.textContent=e.message||'No se pudo guardar. Probá de nuevo.';btn.disabled=false;});
}
function cargarEstado(){return api('/api/estado').then(function(j){
  STATE={metas:j.metas||{tkDia:{},rules:{},especiales:{}},notas:j.notas||{},plan:j.plan||{},dias:j.dias||[],cliente:j.cliente};
  STATE.metas.especiales=STATE.metas.especiales||{}; STATE.metas.rules=STATE.metas.rules||{}; _PERF=null;
  SES={usuario:j.usuario,rol:j.rol,cliente:j.cliente};
  aplicarMarca(cid());
  if(SES.rol==='equipo') VIEW.modo='equipo';
});}
function pantallaLogin(msg){
  STATE=null; SES=null; document.title='Ingresar · Tablero';
  var mk=null;try{mk=localStorage.getItem('marca');}catch(e){} if(mk&&MARCAS[mk]) aplicarMarca(mk); var LM=mk&&MARCAS[mk];
  document.getElementById('app').innerHTML='<main class="login"><div class="login-card">'+(LM?'<div class="login-marca"><img src="'+LM.logo+'" alt=""><b>'+esc(LM.nombre)+'</b></div>':'')+'<div class="eyebrow">Tablero de gestión</div><h1>Ingresar</h1>'+
   '<form id="f-login" novalidate><label for="lg-u">Usuario<input id="lg-u" name="usuario" autocomplete="username" autocapitalize="none" spellcheck="false" required></label>'+
   '<label for="lg-p">Contraseña<input id="lg-p" name="clave" type="password" autocomplete="current-password" required></label>'+
   '<button class="btn" type="submit" id="lg-b">Entrar</button><div class="msg'+(msg?' err':'')+'" id="lg-m" role="alert">'+esc(msg||'')+'</div></form>'+
   '<p class="m">El equipo usa el usuario del local. El encargado entra con su usuario personal.</p></div></main>';
  var f=document.getElementById('f-login'); document.getElementById('lg-u').focus();
  f.onsubmit=function(ev){ev.preventDefault();var b=document.getElementById('lg-b'),mm=document.getElementById('lg-m');b.disabled=true;mm.className='msg';mm.textContent='Entrando…';
    api('/api/login',{method:'POST',body:{usuario:document.getElementById('lg-u').value,clave:document.getElementById('lg-p').value}})
     .then(function(){return cargarEstado();}).then(function(){VIEW.modo=(SES.rol==='equipo'?'equipo':(location.hash==='#equipo'?'equipo':'encargado'));arrancar();})
     .catch(function(e){b.disabled=false;mm.className='msg err';mm.textContent=e.message||'No se pudo ingresar.';});};
}
function salir(){api('/api/logout',{method:'POST'}).catch(function(){}).then(function(){pantallaLogin('');});}
var _refresh=null;
function arrancar(){
  document.title=(STATE.cliente&&STATE.cliente.nombre?STATE.cliente.nombre+' · ':'')+'Tablero';
  render();
  if(_refresh) clearInterval(_refresh);
  _refresh=setInterval(function(){ if(VIEW.dirty||VIEW.adminOpen||document.hidden) return; var y=scrollY; cargarEstado().then(function(){VIEW.confetiHecho=true;render();scrollTo(0,y);}).catch(function(){}); }, 5*60*1000);
}
function boot(){cargarEstado().then(function(){if(SES.rol!=='equipo') VIEW.modo=(location.hash==='#equipo'?'equipo':'encargado');}).then(arrancar).catch(function(e){pantallaLogin(e.status===401?'':(e.message||''));});}

boot();
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',drawChart);
new MutationObserver(drawChart).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
