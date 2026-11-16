import test from 'node:test';
import assert from 'node:assert/strict';
import {createInstagramHandler, normalizePosts} from '../netlify/functions/instagram.mjs';
const request=()=>new Request('https://meva.example/.netlify/functions/instagram');
const env={INSTAGRAM_ACCESS_TOKEN:'test-only-secret',INSTAGRAM_USER_ID:'123456'};
// Synthetic API fixtures are used only in tests; the production feed contains no sample posts.
const media=(n,type='IMAGE')=>({id:String(n),username:'meva.labs',media_type:type,media_url:`https://test.cdninstagram.com/${n}.jpg`,thumbnail_url:`https://test.cdninstagram.com/${n}-preview.jpg`,permalink:`https://www.instagram.com/p/TEST${n}/`,caption:`Test fixture ${n}`,timestamp:`2026-11-${String(n).padStart(2,'0')}T10:00:00+0000`});
function apiFetch(calls,{wrongAccount=false,fail=false}={}){
 return async(url,options)=>{
  calls.push({url:String(url),options});
  assert.equal(options.headers.Authorization,'Bearer test-only-secret');
  assert(!String(url).includes('test-only-secret'));
  if(fail)return new Response('{"error":{"message":"test-only-secret"}}',{status:401});
  return Response.json(String(url).includes('/media?')?{data:[media(1),media(2,'VIDEO'),media(3,'CAROUSEL_ALBUM'),...Array.from({length:5},(_,i)=>media(i+4))]}:{username:wrongAccount?'another.account':'meva.labs'});
 };
}
test('unconfigured function fails gracefully and never calls Meta',async()=>{
 const handler=createInstagramHandler({env:{},fetchImpl:()=>{throw Error('Unexpected request')}});
 const res=await handler(request());assert.equal(res.status,503);assert.deepEqual((await res.json()).posts,[]);
 assert.equal((await handler(new Request(request(),{method:'POST'}))).status,405);
});
test('only six newest real API entries are returned, with safe links and video previews',()=>{
 const rows=[...Array.from({length:8},(_,i)=>media(i+1)),media(9,'VIDEO')];
 const normalized=normalizePosts(rows);assert.equal(normalized.length,6);assert.equal(normalized[0].id,'9');assert(normalized[0].image.endsWith('9-preview.jpg'));
 assert.equal(normalizePosts([{...media(1),permalink:'javascript:alert(1)'}]).length,0);
 assert.equal(normalizePosts([{...media(1),media_url:'https://attacker.example/image.jpg'}]).length,0);
 assert.equal(normalizePosts([{...media(1),permalink:'https://instagram.com.attacker.example/p/test/'}]).length,0);
});
test('tokens stay server-side; cache avoids repeated calls and refreshes after an hour',async()=>{
 let time=1000;const calls=[];const handler=createInstagramHandler({env,now:()=>time,fetchImpl:apiFetch(calls)});
 const res=await handler(request());assert.equal(res.status,200);const body=await res.json();assert.equal(body.posts.length,6);assert.equal(calls.length,2);
 assert(!JSON.stringify(body).includes(env.INSTAGRAM_ACCESS_TOKEN));assert(res.headers.get('Netlify-CDN-Cache-Control').includes('s-maxage=3600'));
 await handler(request());assert.equal(calls.length,2);time+=3600001;await handler(request());assert.equal(calls.length,4);
});
test('concurrent visitors share the same in-flight request',async()=>{
 const calls=[];const handler=createInstagramHandler({env,fetchImpl:apiFetch(calls)});
 const res=await Promise.all([handler(request()),handler(request()),handler(request())]);assert(res.every(r=>r.status===200));assert.equal(calls.length,2);
});
test('temporary Meta errors serve bounded last-good data without exposing errors',async()=>{
 let time=1000,fail=false;const calls=[];
 const handler=createInstagramHandler({env,now:()=>time,fetchImpl:(...args)=>apiFetch(calls,{fail})(...args)});
 await handler(request());time+=3600001;fail=true;
 let res=await handler(request());assert.equal(res.status,200);assert.equal((await res.json()).status,'stale');
 time+=24*3600000;res=await handler(request());assert.equal(res.status,503);assert(!(await res.text()).includes(env.INSTAGRAM_ACCESS_TOKEN));
});
test('another account cannot be presented as @meva.labs',async()=>{
 const handler=createInstagramHandler({env,fetchImpl:apiFetch([],{wrongAccount:true})});assert.equal((await handler(request())).status,503);
});
