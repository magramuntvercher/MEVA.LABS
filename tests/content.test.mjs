import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const products=fs.readdirSync('content/products').map(f=>read('content/products/'+f));
execFileSync(process.execPath,['scripts/build.mjs']);
test('migration retains every original photograph byte for byte',()=>{
 const hashes=read('tests/fixtures/original-photos.json'), files=Object.keys(hashes);
 for(const file of files)assert.equal(createHash('sha256').update(fs.readFileSync(file)).digest('hex'),hashes[file]);
 const photos=new Set(products.flatMap(p=>p.photos.map(x=>x.image)));
 for(const file of files.filter(f=>f.startsWith('assets/products/')))assert(photos.has(file),`Unmigrated photo: ${file}`);
});
test('all original event rates and supplements are preserved',()=>{
 const original=read('tests/fixtures/original-events.json');
 const generated={window:{}};vm.runInNewContext(fs.readFileSync('dist/assets/eventos-config.js','utf8'),generated);
 const actual=JSON.parse(JSON.stringify(generated.window.MEVA_EVENTOS_CONFIG));
 for(const p of Object.values(actual.products))delete p.photos;
 assert.deepEqual(actual,original);
});
test('all pages and local links resolve except three pre-existing missing images',()=>{
 const known=new Set(['assets/instagram-feed.png','assets/pack-bebe.jpg','assets/pack-lanyard-scrunchie.jpg']);const missing=new Set();
 for(const file of fs.readdirSync('dist').filter(f=>f.endsWith('.html'))){
  const html=fs.readFileSync('dist/'+file,'utf8');assert(!html.includes('{{'));assert(html.includes('assets/general-config.js'));
  for(const [,url] of html.matchAll(/(?:href|src)="([^"]+)"/g)){
   if(/^(https?:|mailto:|#)/.test(url))continue;
   const local=decodeURIComponent(url.split(/[?#]/)[0]).replace(/^\//,'');
   if(!fs.existsSync('dist/'+local)){missing.add(local);assert(known.has(local),`${file}: ${local}`)}
  }
 }
 assert.deepEqual(missing,known);
});
test('CMS targets main and original uploads without transformations',()=>{
 const config=read('admin/config.yml');assert.equal(config.backend.name,'github');assert.equal(config.backend.branch,'main');assert.equal(config.media_folder,'assets/uploads');
 for(const c of config.collections)for(const f of c.files||[])assert(fs.existsSync(f.file));
 assert.equal(config.collections.find(c=>c.name==='products').fields.find(f=>f.name==='photos').widget,'list');
});
test('CMS edits propagate to category, homepage, design, settings and events; deletion and escaping work',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'meva-content-'));
 try{
  for(const dir of ['scripts','templates','assets','admin','content'])fs.cpSync(dir,path.join(tmp,dir),{recursive:true});
  const write=(p,x)=>fs.writeFileSync(path.join(tmp,p),JSON.stringify(x));
  const p=read('content/products/llavero.json');p.price=12.34;p.name='<Llavero>';write('content/products/llavero.json',p);
  const f=read('content/fabrics/tartan-rojo.json');f.available=false;write('content/fabrics/tartan-rojo.json',f);
  const general=read('content/settings/general.json');general.whatsapp='34999999999';general.shipping=7;write('content/settings/general.json',general);
  fs.unlinkSync(path.join(tmp,'content/products/lanyard.json'));
  const add={...p,slug:'producto-de-prueba',name:'Producto de prueba',category:'Infantil',featured:true,seasonal:true};write('content/products/producto-de-prueba.json',add);
  const event=read('content/products/llavero-tela.json');event.tiers[0].price=4.25;write('content/products/llavero-tela.json',event);
  execFileSync(process.execPath,['scripts/build.mjs'],{cwd:tmp});
  const html=fs.readFileSync(path.join(tmp,'dist/accesorios.html'),'utf8');assert(html.includes('12,34 €'));assert(html.includes('&lt;Llavero&gt;'));assert(!html.includes('id="lanyard"'));assert(html.includes('wa.me/34999999999'));assert(html.includes('Envíos 7 €'));
  assert(fs.readFileSync(path.join(tmp,'dist/infantil.html'),'utf8').includes('Producto de prueba'));
  assert(fs.readFileSync(path.join(tmp,'dist/index.html'),'utf8').includes('Producto de prueba'));
  const eventCtx={window:{}};vm.runInNewContext(fs.readFileSync(path.join(tmp,'dist/assets/eventos-config.js'),'utf8'),eventCtx);assert.equal(eventCtx.window.MEVA_EVENTOS_CONFIG.products.llavero_tela.tiers[0].price,4.25);
  const ctx={window:{}};vm.runInNewContext(fs.readFileSync(path.join(tmp,'dist/assets/productos-config.js'),'utf8'),ctx);
  assert(!ctx.window.MEVA_TELAS.some(f=>f.id==='tartan-rojo'));assert(!ctx.window.MEVA_PRODUCTOS.some(p=>p.nombre==='Lanyard'));assert(ctx.window.MEVA_PRODUCTOS.some(p=>p.nombre==='Producto de prueba'));
 }finally{fs.rmSync(tmp,{recursive:true,force:true})}
});
