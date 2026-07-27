const $ = (id) => document.getElementById(id);
const form = $('visitForm');
const DB_KEY = 'visitas_tecnicas_v1';
let currentId = null;
let photosData = [];
let deferredPrompt = null;

const today = new Date().toISOString().slice(0, 10);
$('date').value = today;

function generateNumber(){
  const d = new Date();
  return `VT-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${String(Date.now()).slice(-5)}`;
}
$('visitNumber').textContent = generateNumber();

function formatNumber(v){ return Number(v || 0).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1}); }
function minutesBetween(a,b){
  if(!a || !b) return 0;
  let [ah,am]=a.split(':').map(Number), [bh,bm]=b.split(':').map(Number);
  let m=(bh*60+bm)-(ah*60+am); if(m<0)m+=1440; return m;
}
function updateMetrics(){
  const start=parseFloat($('kmStart').value||0), end=parseFloat($('kmEnd').value||0);
  $('kmTotal').textContent=`${formatNumber(Math.max(0,end-start))} km`;
  const mins=minutesBetween($('arrivalTime').value,$('departureTime').value);
  $('serviceDuration').textContent=`${Math.floor(mins/60)}h ${String(mins%60).padStart(2,'0')}min`;
}
['kmStart','kmEnd','arrivalTime','departureTime'].forEach(id=>$(id).addEventListener('input',updateMetrics));

document.querySelectorAll('input[name="returnRequired"]').forEach(r=>r.addEventListener('change',()=>{
  $('returnDetails').classList.toggle('hidden', r.value !== 'Sim' || !r.checked);
}));

document.querySelectorAll('.tab').forEach(btn=>btn.addEventListener('click',()=>{
  document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  btn.classList.add('active'); $(btn.dataset.view).classList.add('active');
  if(btn.dataset.view==='historyView') renderHistory();
}));

function setupSignature(canvas){
  const ctx=canvas.getContext('2d'); ctx.lineWidth=3; ctx.lineCap='round'; ctx.strokeStyle='#111827';
  let drawing=false,last=null;
  const point=e=>{
    const r=canvas.getBoundingClientRect(), t=e.touches?.[0]||e;
    return {x:(t.clientX-r.left)*(canvas.width/r.width),y:(t.clientY-r.top)*(canvas.height/r.height)};
  };
  const start=e=>{drawing=true;last=point(e);e.preventDefault()};
  const move=e=>{if(!drawing)return;const p=point(e);ctx.beginPath();ctx.moveTo(last.x,last.y);ctx.lineTo(p.x,p.y);ctx.stroke();last=p;e.preventDefault()};
  const end=()=>{drawing=false;last=null};
  canvas.addEventListener('pointerdown',start);canvas.addEventListener('pointermove',move);
  window.addEventListener('pointerup',end);
  return {clear:()=>ctx.clearRect(0,0,canvas.width,canvas.height), load:(data)=>{if(!data)return;const img=new Image();img.onload=()=>{ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height)};img.src=data}};
}
const signatures={
  inspectorSignature:setupSignature($('inspectorSignature')),
  clientSignature:setupSignature($('clientSignature'))
};
document.querySelectorAll('[data-clear-signature]').forEach(b=>b.addEventListener('click',()=>signatures[b.dataset.clearSignature].clear()));

function compressImage(file){
  return new Promise((resolve,reject)=>{
    const img=new Image(), reader=new FileReader();
    reader.onload=()=>img.src=reader.result; reader.onerror=reject;
    img.onload=()=>{
      const max=1280, scale=Math.min(1,max/Math.max(img.width,img.height));
      const c=document.createElement('canvas');c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);
      c.getContext('2d').drawImage(img,0,0,c.width,c.height);
      resolve(c.toDataURL('image/jpeg',.78));
    };
    reader.readAsDataURL(file);
  });
}
$('photos').addEventListener('change',async e=>{
  for(const file of [...e.target.files].slice(0,15-photosData.length)) photosData.push(await compressImage(file));
  renderPhotos(); e.target.value='';
});
function renderPhotos(){
  $('photoPreview').innerHTML='';
  photosData.forEach((src,i)=>{
    const d=document.createElement('div');d.className='photo-item';
    d.innerHTML=`<img src="${src}" alt="Foto da visita"><button type="button" aria-label="Remover foto">×</button>`;
    d.querySelector('button').onclick=()=>{photosData.splice(i,1);renderPhotos()};
    $('photoPreview').appendChild(d);
  });
}

function addMaterial(data={}){
  const node=$('materialTemplate').content.firstElementChild.cloneNode(true);
  Object.entries(data).forEach(([k,v])=>{const el=node.querySelector(`[data-field="${k}"]`);if(el)el.value=v});
  node.querySelector('[data-remove-material]').onclick=()=>node.remove();
  $('materialsList').appendChild(node);
}
$('addMaterialBtn').onclick=()=>addMaterial();

function getMaterials(){
  return [...document.querySelectorAll('.material-row')].map(r=>({
    description:r.querySelector('[data-field="description"]').value.trim(),
    code:r.querySelector('[data-field="code"]').value.trim(),
    quantity:r.querySelector('[data-field="quantity"]').value
  })).filter(x=>x.description||x.code);
}

function getData(){
  const fd=new FormData(form);
  return {
    id:currentId||crypto.randomUUID(), number:$('visitNumber').textContent, createdAt:new Date().toISOString(),
    date:fd.get('date'),serviceType:fd.get('serviceType'),inspectorName:fd.get('inspectorName'),
    team:fd.get('team'),clientName:fd.get('clientName'),contract:fd.get('contract'),
    address:fd.get('address'),phone:fd.get('phone'),environment:fd.get('environment'),
    origin:fd.get('origin'),destination:fd.get('destination'),originTime:fd.get('originTime'),
    arrivalTime:fd.get('arrivalTime'),departureTime:fd.get('departureTime'),returnTime:fd.get('returnTime'),
    kmStart:Number(fd.get('kmStart')||0),kmEnd:Number(fd.get('kmEnd')||0),
    kmTotal:Math.max(0,Number(fd.get('kmEnd')||0)-Number(fd.get('kmStart')||0)),
    serviceMinutes:minutesBetween(fd.get('arrivalTime'),fd.get('departureTime')),
    reasons:fd.getAll('reason'),resolvedItems:fd.get('resolvedItems'),materialPending:fd.get('materialPending'),
    otherPending:fd.get('otherPending'),notes:fd.get('notes'),
    returnRequired:fd.get('returnRequired'),priority:fd.get('priority'),
    suggestedDate:fd.get('suggestedDate'),returnReason:fd.get('returnReason'),
    materials:getMaterials(),photos:photosData,
    inspectorSignature:$('inspectorSignature').toDataURL(),
    clientSignature:$('clientSignature').toDataURL()
  };
}
function getSaved(){try{return JSON.parse(localStorage.getItem(DB_KEY)||'[]')}catch{return[]}}
function setSaved(v){localStorage.setItem(DB_KEY,JSON.stringify(v))}
form.addEventListener('submit',e=>{
  e.preventDefault();
  if(!form.reportValidity())return;
  const data=getData(), items=getSaved(), idx=items.findIndex(x=>x.id===data.id);
  if(idx>=0)items[idx]=data;else items.unshift(data);
  setSaved(items); currentId=data.id;
  alert('Visita salva com sucesso neste aparelho.');
});

$('clearBtn').onclick=()=>{
  if(!confirm('Limpar todos os campos deste formulário?'))return;
  form.reset();currentId=null;photosData=[];renderPhotos();$('materialsList').innerHTML='';
  signatures.inspectorSignature.clear();signatures.clientSignature.clear();
  $('date').value=today;$('visitNumber').textContent=generateNumber();$('returnDetails').classList.add('hidden');updateMetrics();
};
$('printCurrentBtn').onclick=()=>window.print();

function renderHistory(){
  const q=$('historySearch').value.toLowerCase().trim();
  const items=getSaved().filter(x=>[x.clientName,x.contract,x.inspectorName,x.address,x.number].join(' ').toLowerCase().includes(q));
  const list=$('historyList');list.innerHTML='';
  if(!items.length){list.innerHTML='<div class="history-empty">Nenhuma visita encontrada.</div>';return}
  items.forEach(x=>{
    const el=document.createElement('article');el.className='history-item';
    el.innerHTML=`<h3>${escapeHtml(x.clientName||'Sem cliente')} <span class="badge">${escapeHtml(x.number||'')}</span></h3>
      <div class="history-meta">${fmtDate(x.date)} · Contrato ${escapeHtml(x.contract||'-')}<br>${escapeHtml(x.serviceType||'')} · ${formatNumber(x.kmTotal)} km · Retorno: ${escapeHtml(x.returnRequired||'Não')}</div>
      <div class="history-actions"><button data-open>Editar / visualizar</button><button data-print>Imprimir</button><button data-delete>Excluir</button></div>`;
    el.querySelector('[data-open]').onclick=()=>loadVisit(x.id,false);
    el.querySelector('[data-print]').onclick=()=>loadVisit(x.id,true);
    el.querySelector('[data-delete]').onclick=()=>{if(confirm('Excluir este registro?')){setSaved(getSaved().filter(i=>i.id!==x.id));renderHistory()}};
    list.appendChild(el);
  });
}
$('historySearch').addEventListener('input',renderHistory);

function setValue(id,v){const el=$(id);if(el)el.value=v??''}
function loadVisit(id,printAfter=false){
  const x=getSaved().find(i=>i.id===id);if(!x)return;
  currentId=x.id;$('visitNumber').textContent=x.number;
  ['date','serviceType','inspectorName','team','clientName','contract','address','phone','environment','origin','destination','originTime','arrivalTime','departureTime','returnTime','kmStart','kmEnd','resolvedItems','materialPending','otherPending','notes','priority','suggestedDate','returnReason'].forEach(k=>setValue(k,x[k]));
  document.querySelectorAll('input[name="reason"]').forEach(c=>c.checked=(x.reasons||[]).includes(c.value));
  document.querySelectorAll('input[name="returnRequired"]').forEach(r=>r.checked=r.value===(x.returnRequired||'Não'));
  $('returnDetails').classList.toggle('hidden',x.returnRequired!=='Sim');
  $('agreement').checked=true;
  $('materialsList').innerHTML='';(x.materials||[]).forEach(addMaterial);
  photosData=x.photos||[];renderPhotos();
  signatures.inspectorSignature.load(x.inspectorSignature);signatures.clientSignature.load(x.clientSignature);
  updateMetrics();
  document.querySelector('[data-view="formView"]').click();
  window.scrollTo({top:0,behavior:'smooth'});
  if(printAfter)setTimeout(()=>window.print(),450);
}
function fmtDate(v){if(!v)return'-';const [y,m,d]=v.split('-');return `${d}/${m}/${y}`}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}

$('exportJsonBtn').onclick=()=>{
  const blob=new Blob([JSON.stringify(getSaved(),null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`backup-visitas-${today}.json`;a.click();URL.revokeObjectURL(a.href);
};

window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('installBtn').classList.remove('hidden')});
$('installBtn').onclick=async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$('installBtn').classList.add('hidden')};

if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('service-worker.js'));
