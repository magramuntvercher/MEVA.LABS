import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
process.chdir(root);
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const entries=dir=>fs.readdirSync(dir).filter(f=>f.endsWith('.json')).map(f=>read(`${dir}/${f}`)).sort((a,b)=>a.order-b.order||a.slug.localeCompare(b.slug));
const products=entries('content/products'), fabrics=entries('content/fabrics');
const general=read('content/settings/general.json'), home=read('content/settings/home.json'), events=read('content/settings/events.json');
export const categories={'Accesorios':'accesorios','Organización':'organizacion','Infantil':'infantil','Packs':'packs','Cuadros bordados':'cuadros','Navidad':'navidad','Eventos':'eventos'};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>Number(n).toLocaleString('es-ES',{maximumFractionDigits:2})+' €';
const price=p=>p.price==null?(p.priceLabel||'Consultar'):money(p.price);
const wa=text=>`https://wa.me/${general.whatsapp}?text=${encodeURIComponent(text)}`;
function image(src,alt){return `<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy">`;}
function gallery(p){
 const photos=p.photos||[];
 if(!photos.length)return `<div class="catalog-gallery empty" data-product-gallery aria-label="Fotos de ${esc(p.name)}"></div>`;
 return `<div class="catalog-gallery carousel" data-carousel aria-label="${esc(p.name)}">${photos.map((f,i)=>`<div class="slide${i?'':' active'}">${image(f.image,f.alt||p.name)}</div>`).join('')}${photos.length>1?'<button class="arrow prev" type="button" aria-label="Anterior">‹</button><button class="arrow next" type="button" aria-label="Siguiente">›</button>':''}<div class="dots">${photos.map((_,i)=>`<span class="dot${i?'':' active'}"></span>`).join('')}</div></div>`;
}
function card(p){return `<article class="catalog-card" id="${esc(p.slug)}">${gallery(p)}<div class="catalog-body"><h2>${esc(p.name)}</h2>${p.description?`<p>${esc(p.description)}</p>`:''}<div class="catalog-actions"><span class="catalog-pill">Precio <b>${esc(price(p))}</b></span>${p.embroideredPrice==null?'':`<span class="catalog-pill">Con bordado <b>${esc(money(p.embroideredPrice))}</b></span>`}${p.chooseFabric?`<a class="catalog-pill fabric" href="${esc(wa('Hola MEVA 👋 Quiero elegir la tela para '+p.name))}" target="_blank" rel="noopener">Elige tu tela</a>`:''}</div></div></article>`;}
// Explicit homepage selections preserve the existing presentation. Flags control visibility;
// newly flagged products not selected explicitly are appended in product order.
function selections(kind,flag){
 const explicit=home[kind]||[], ids=new Set(explicit.map(x=>x.product));
 return [...explicit,...products.filter(p=>p[flag]&&!ids.has(p.slug)).map(p=>({product:p.slug}))].map(e=>({e,p:products.find(p=>p.slug===e.product)})).filter(({p})=>p&&p.available&&p[flag]);
}
function homeCards(kind,flag){return selections(kind,flag).map(({e,p})=>{
 const chosen=kind==='featured', type=chosen?'chosen':'season';
 const photo=Object.hasOwn(e,'photo')?e.photo:p.photos?.[0]?.image;
 return `<article class="${type}-card"><div class="${chosen?'chosen-photo':'season-img'}">${photo?image(photo,p.name):''}</div><div class="${type}-meta"><b>${esc(e.label||p.name)}</b><span>${esc(chosen?(e.priceLabel||price(p)):(e.subtitle||p.description))}</span></div></article>`;
}).join('');}
// Fail publication on invalid content rather than silently omitting entries.
const ids=new Set();
for(const p of products){
 if(!p.name||!categories[p.category]||!/^[-a-z0-9]+$/.test(p.slug)||ids.has(p.slug))throw Error(`Invalid or duplicate product: ${p.slug}`);
 ids.add(p.slug);
 for(const k of ['price','embroideredPrice'])if(p[k]!=null&&(!Number.isFinite(p[k])||p[k]<0))throw Error(`Invalid ${k}: ${p.slug}`);
}
if(!/^https:\/\//.test(general.instagram))throw Error('Instagram requiere una URL https');
if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(general.email))throw Error('Email inválido');
if(!/^\d{7,15}$/.test(general.whatsapp))throw Error('WhatsApp must contain international digits only');
for(const k of ['shipping','freeShipping'])if(!Number.isFinite(general[k])||general[k]<0)throw Error(`Invalid ${k}`);
events.products=Object.fromEntries(products.filter(p=>p.available&&p.category==='Eventos').map(p=>{
 if(!p.tiers?.length||!p.personalization?.length)throw Error('Eventos requiere tarifas y personalización: '+p.slug);
 for(const t of p.tiers)if(!Number.isInteger(t.min)||!Number.isInteger(t.max)||t.min>t.max||!Number.isFinite(t.price)||t.price<0)throw Error('Tarifa inválida: '+p.slug);
 for(const v of p.personalization)if(!Number.isFinite(v.extra)||v.extra<0)throw Error('Suplemento inválido: '+p.slug);
 return [p.eventKey||p.slug,{name:p.name,description:p.description,tiers:p.tiers,personalization:p.personalization,photos:p.photos}];
}));
const out='dist';fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});
fs.cpSync('assets',`${out}/assets`,{recursive:true});fs.cpSync('admin',`${out}/admin`,{recursive:true});
const serial=x=>JSON.stringify(x).replace(/</g,'\\u003c');
fs.writeFileSync(`${out}/assets/productos-config.js`,`// Generated from content/. Do not edit.\nwindow.MEVA_PRODUCTOS=${serial(products.filter(p=>p.available&&p.category!=='Cuadros bordados').map(p=>({categoria:p.category,nombre:p.name,permiteTejido:p.chooseFabric})))};\nwindow.MEVA_TELAS=${serial(fabrics.filter(f=>f.available).map(f=>({id:f.slug,nombre:f.name})))};\n`);
fs.writeFileSync(`${out}/assets/general-config.js`,`window.MEVA_GENERAL=${serial(general)};\n`);
fs.writeFileSync(`${out}/assets/eventos-config.js`,`window.MEVA_EVENTOS_CONFIG=${serial(events)};\n`);
for(const file of fs.readdirSync('templates').filter(f=>f.endsWith('.html'))){
 const category=Object.keys(categories).find(c=>categories[c]+'.html'===file);
 let html=fs.readFileSync(`templates/${file}`,'utf8')
 .replace('{{CATALOG}}',products.filter(p=>p.available&&p.category===category).map(card).join(''))
 .replace('{{CUADROS}}',products.filter(p=>p.available&&p.category==='Cuadros bordados').map(p=>`<article class="cuadro-real" id="${esc(p.slug)}">${(p.photos||[]).map(f=>image(f.image,f.alt||p.name)).join('')}${p.description?`<p>${esc(p.description)}</p>`:''}</article>`).join(''))
 .replace('{{FEATURED}}',homeCards('featured','featured')).replace('{{SEASONAL}}',homeCards('seasonal','seasonal'))
 .replace('{{SEASON_TITLE}}',esc(home.seasonTitle)).replace('{{SEASON_NOTE}}',esc(home.seasonNote));
 html=html.replace('{{SHIPPING_BANNER}}',`Envíos ${esc(money(general.shipping))}. Gratis pedidos de más de ${esc(money(general.freeShipping))}`)
 .replaceAll('{{WHATSAPP}}',general.whatsapp)
 .replaceAll('{{INSTAGRAM_URL}}',esc(general.instagram))
 .replaceAll('{{INSTAGRAM_HANDLE}}',esc(general.instagramHandle)).replaceAll('{{EMAIL}}',esc(general.email));
 // Event showcase and tariff table use exactly the same rates as the calculator.
 if(file==='eventos.html'){
  const ps=Object.values(events.products);
  const bounds=[...new Set(ps.flatMap(p=>p.tiers.flatMap(t=>[t.min,t.max+1])))].sort((a,b)=>a-b);
  const ranges=bounds.slice(0,-1).map((min,i)=>({min,max:bounds[i+1]-1}));
  html=html.replace('{{EVENT_SHOWCASE}}',`<div class="event-showcase">${ps.length?'':'<p>No hay productos de eventos disponibles.</p>'}${ps.map(p=>`<article>${p.photos?.length?`<span class="mini-photo">${image(p.photos[0].image,p.photos[0].alt||p.name)}</span>`:'<span class="mini-photo">Fotos próximamente</span>'}<h2>${esc(p.name)}</h2><p>Desde ${money(Math.min(...p.tiers.map(t=>t.price)))}/ud.</p></article>`).join('')}</div>`);
  html=html.replace('{{EVENT_RATES}}',`<thead><tr><th>Cantidad</th>${ps.map(p=>`<th>${esc(p.name)}</th>`).join('')}</tr></thead><tbody>${ranges.map(t=>`<tr><td>${t.min}–${t.max}</td>${ps.map(p=>{const tier=p.tiers.find(r=>r.min<=t.min&&r.max>=t.max);return `<td>${tier?money(tier.price):'—'}</td>`}).join('')}</tr>`).join('')}</tbody>`);
 }
 html=html.replaceAll('superiores a 100 unidades',`superiores a ${events.maxAutoQuantity} unidades`).replaceAll('Pedido mínimo de 10 unidades',`Pedido mínimo de ${events.minQuantity} unidades`);
 html=html.replace('</head>','<script src="assets/general-config.js"></script></head>');
 fs.writeFileSync(`${out}/${file}`,html);
}
console.log(`Built ${products.length} products, ${fabrics.length} fabrics, 9 pages → dist/`);
