// Shared logic: Odoo "Análisis de ventas" rows -> daily team metrics.
// Used in the page (browser) and in node for seeding. Keep ES5-ish, no deps.
function MC_compute(rows){
  var PARR=/^(ASADO|VACIO|TAPA DE ASADO|ENTRA[ÑN]A|CENTRO DE ENTRA[ÑN]A|MATAMBRE|COSTILLAR|FALDA|COLITA DE CUADRIL|PICA[ÑN]A|VACIO\/ ?TAPA CERDO|PECHITO DE CERDO|COSTILLA DE CERDO|BONDIOLA|MATAMBRE DE CERDO|CHULETAS|BIFE DE CHORIZO|OJO DE BIFE|AMERICANO)/;
  function groups(p){
    var g={};
    if(PARR.test(p) && !/RELLEN|CASERA|CASERO|ARROLLADO/.test(p)) g.parrilla=1;
    if(/CHORIZO|MORCILLA|SALCHICHA PARRILLERA|LITORALE/.test(p) && !/SECO|BIFE DE CHORIZO/.test(p)) g.embutido=1;
    if(/CHINCHULIN|MOLLEJA|RI[ÑN]ON|TRIPA GORDA|CHORIZO DE SANGRE|HIGADO|CORAZON/.test(p)) g.achura=1;
    if(/CARBON|LE[ÑN]A/.test(p)) g.carbon=1;
    if(/CHORIZO SECO|SALAMIN CASERO|SALAME CASERO|JAMON CRUDO CASERO|BONDIOLA CASERA|PANCETA CASERA|LOMITO (VACUNO )?CASERO|PATE CASERO|QUESO DE CERDO CASERO/.test(p)) g.seco=1;
    if(/QUESO|JAMON COCIDO|PALETA COCIDA|MORTADELA|SALAME MILAN|CAGNOLI|FIAMBRE|ROQUEFORT|SARDO|REGGIANITO|PATEGRAS|FONTINA|MUZZARELLA|SALCHICHON|BOCATTI/.test(p) && !g.seco) g.fiambre=1;
    if(/^PAN (DON|EL|DE)|^PAN$/.test(p)) g.pan=1;
    if(/COCA|SPRITE|FANTA|SCHWEPPES|CERVEZA|VINO|FERNET|AGUA |JUGO|CORONA|PATAGONIA|STELLA|GIN|SIDRA|QUILMES|IPA|APERITIVO|VERMU/.test(p)) g.bebida=1;
    if(/^PICADA (MANOS|SUPER|CAMPERA|POPULAR|CARHUE|EPECUEN|GOURMET)/.test(p)) g.picada=1;
    if(/SORRENTINO|RAVIOL|CAPELLACCI|CAVATELLI|TALLARIN|[NÑ]OQUI|LASAGN|CANELON|FIDEO/.test(p)) g.pasta=1;
    if(/QUESO RALLADO|REGGIANITO|PARMESANO|CREMA |SALSA|TUCO|FILETTO/.test(p)) g.acomp_pasta=1;
    if(/POLLO|PECHUGA|PATA MUSLO|ALITA/.test(p) && !/MILANESA|MEDALLON|HAMBURG|RELLEN|ARROLLADO|SORRENTINO|RAVIOL|EMPANADA/.test(p)) g.pollo=1;
    if(/MILANESA|HAMBURGUES|MEDALLON|RELLEN|FAJITA|ARROLLADO/.test(p) && !/SOJA|G\. DEL SOL|CONDIMENTO|PAN /.test(p)) g.elaborado=1;
    if((g.seco||g.embutido||g.elaborado||g.picada||/CASERO|CASERA|RELLEN|ARROLLADO/.test(p)) && !/CAGNOLI|PALADINI|G\. DEL|EL TRIUNFO|LA ERMITA|LA FAMILIA|BOCATTI|LUVIANKA|LABRATO|SOJA/.test(p)) g.propio=1;
    return g;
  }
  var byOrder={};
  rows.forEach(function(r){
    var o=String(r.orden||''); if(o.indexOf('Manos de Carhue/')!==0) return;
    var c=String(r.cliente||'').toUpperCase(); if(/ABERASTURI|MUNICIPALIDAD|CABA[ÑN]A TRES MARIAS/.test(c)) return;
    var p=String(r.producto||'').toUpperCase().replace(/\s*-\s*BAJA POR KIT/,'').replace(/\s+/g,' ').trim();
    if(!p || /NO USAR/.test(p)) return;
    var t=+r.total||0; if(t<=0) return;
    var f=r.fecha; var day=f.slice(0,10);
    var k=o; if(!byOrder[k]) byOrder[k]={day:day,hour:+f.slice(11,13),t:0,prods:{},g:{}};
    var B=byOrder[k]; B.t+=t; B.prods[p]=1; var gg=groups(p); for(var x in gg) B.g[x]=1; if(gg.propio) B.vp=(B.vp||0)+t;
  });
  var RULES=MC_RULES; var days={};
  Object.keys(byOrder).forEach(function(k){var B=byOrder[k]; if(B.t<=0) return;
    var D=days[B.day]||(days[B.day]={fecha:B.day,tickets:0,venta:0,items:0,multi:0,prop:0,vprop:0,r:{}});
    if(B.vp>0){D.prop++;D.vprop+=B.vp;}
    var n=Object.keys(B.prods).length; D.tickets++; D.venta+=B.t; D.items+=n; if(n>1) D.multi++;
    RULES.forEach(function(R){ var trig=R.trig.some(function(x){return B.g[x]||x==='*';}); if(!trig) return;
      var hit=R.offer.some(function(x){return B.g[x];}); var e=D.r[R.id]||(D.r[R.id]=[0,0]); e[0]++; if(hit) e[1]++; });
  });
  return Object.keys(days).sort().map(function(k){var D=days[k]; D.venta=Math.round(D.venta); D.vprop=Math.round(D.vprop); return D;});
}
var MC_RULES=[
  {id:'c1',corto:'Chorizo o morcilla con la parrilla',valor:8400,area:'Carnicería',trig:['parrilla'],offer:['embutido'],titulo:'Parrilla → chorizo o morcilla',
   cuando:'El cliente pide asado, vacío, tapa de asado, matambre, entraña o un corte de cerdo para la parrilla.',
   frase:'"¿Le preparo unos chorizos o una morcilla para arrancar?"'},
  {id:'c2',corto:'Achuras con la parrilla',valor:9500,area:'Carnicería',trig:['parrilla'],offer:['achura'],titulo:'Parrilla → achuras',
   cuando:'Misma compra de parrilla, sobre todo viernes y sábado.',
   frase:'"Hoy tenemos mollejas y chinchulines muy lindos, ¿le pongo unos?"'},
  {id:'c3',corto:'Milanesas o medallones con el pollo',valor:12300,area:'Carnicería',trig:['pollo'],offer:['elaborado'],titulo:'Pollo → milanesas o medallones',
   cuando:'El cliente lleva pollo fresco, pechuga o pata muslo.',
   frase:'"¿Le agrego unas milanesas o medallones listos para otro día de la semana?"'},
  {id:'f1',corto:'Seco casero con el fiambre',valor:5200,area:'Fiambrería',trig:['fiambre'],offer:['seco'],titulo:'Fiambres o quesos → seco casero',
   cuando:'El cliente compra jamón, quesos u otros fiambres y no lleva ningún seco casero.',
   frase:'"¿Probó nuestro chorizo seco o el salamín casero? Es elaboración propia, ideal para la picada."'},
  {id:'f2',corto:'Picada con la parrilla',valor:7000,area:'Fiambrería',trig:['parrilla'],offer:['fiambre','seco','picada'],titulo:'Parrilla → algo para la picada',
   cuando:'El cliente lleva carne para la parrilla y no lleva fiambres, quesos ni secos.',
   frase:'"¿Le preparo algo para picar mientras se hace el asado? Un salamín y un queso."'},
  {id:'f3',corto:'Queso o salsa con las pastas',valor:4000,area:'Fiambrería',trig:['pasta'],offer:['acomp_pasta'],titulo:'Pastas → queso rallado o salsa',
   cuando:'El cliente lleva sorrentinos, ravioles o pastas frescas.',
   frase:'"¿Le agrego queso rallado o crema para las pastas?"'},
  {id:'k1',corto:'Carbón con la parrilla',valor:6300,area:'Caja',trig:['parrilla'],offer:['carbon'],titulo:'Parrilla → carbón o leña',
   cuando:'En el ticket hay carne para la parrilla y no hay carbón.',
   frase:'"¿Tiene carbón para el asado? Tenemos la bolsa de 4 kg acá."'},
  {id:'k3',corto:'Pan',valor:2000,area:'Caja',trig:['*'],offer:['pan'],titulo:'Todo ticket → pan',
   cuando:'Cualquier compra que no tenga pan.',
   frase:'"¿Le llevo pan? Llegó recién el de Don Francisco."'},
  {id:'k4',corto:'Bebida con la parrilla o la picada',valor:4500,area:'Caja',trig:['parrilla','fiambre','seco','picada'],offer:['bebida'],titulo:'Parrilla o picada → bebida',
   cuando:'El ticket tiene parrilla, fiambres o secos y no lleva bebida.',
   frase:'"¿Le sumo un vino o unas cervezas para acompañar?"'}
];
if(typeof module!=='undefined') module.exports={MC_compute:MC_compute,MC_RULES:MC_RULES};

function MC_parse(XLSX, data){
  var wb=XLSX.read(data,{type:'array'}); var ws=wb.Sheets[wb.SheetNames[0]];
  var A=XLSX.utils.sheet_to_json(ws,{header:1,raw:true});
  var h=A[0].map(function(x){return String(x||'').trim().toLowerCase();});
  function col(re){for(var i=0;i<h.length;i++) if(re.test(h[i])) return i; return -1;}
  var cF=col(/^fecha/),cO=col(/^orden|referencia/),cP=col(/producto/),cC=col(/cliente/),cT=col(/^total/);
  if([cF,cO,cP,cT].some(function(i){return i<0;})) throw new Error('No encuentro las columnas Fecha de la orden, Orden, Variante del producto y Total.');
  function pad(n){return (n<10?'0':'')+n;}
  function fdate(v){ if(typeof v==='number'){var d=XLSX.SSF.parse_date_code(v); return d.y+'-'+pad(d.m)+'-'+pad(d.d)+' '+pad(d.H)+':'+pad(d.M);} 
    var s=String(v); var m=s.match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/); if(m) return m[1]+'-'+m[2]+'-'+m[3]+' '+m[4]+':'+m[5];
    m=s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/); if(m) return m[3]+'-'+pad(+m[2])+'-'+pad(+m[1])+' '+pad(+m[4])+':'+m[5]; return null; }
  var out=[]; for(var i=1;i<A.length;i++){var r=A[i]; if(!r||r[cF]==null) continue; var f=fdate(r[cF]); if(!f) continue;
    out.push({fecha:f,orden:r[cO],producto:r[cP],cliente:cC>=0?r[cC]:'',total:typeof r[cT]==='number'?r[cT]:parseFloat(String(r[cT]).replace(/\./g,'').replace(',','.'))});}
  return out;
}
if(typeof module!=='undefined') module.exports={MC_parse:MC_parse};
