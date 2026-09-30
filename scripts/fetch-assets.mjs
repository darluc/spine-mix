import { mkdir, access, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
const out = new URL('../public/assets/', import.meta.url);
await mkdir(out,{recursive:true});
const base='https://raw.githubusercontent.com/EsotericSoftware/spine-runtimes/4.3/examples/mix-and-match/export/';
const files=['mix-and-match-pro.json','mix-and-match-pma.atlas','mix-and-match-pma.png'];
for (const f of files) {
  const dst=new URL(f,out);
  try { await access(dst,constants.R_OK); console.log('assets: exists',f); continue; } catch {}
  console.log('assets: downloading',f);
  const r=await fetch(base+f,{redirect:'follow'});
  if(!r.ok) throw new Error(`${f}: HTTP ${r.status}`);
  const b=Buffer.from(await r.arrayBuffer());
  if(b.length<100) throw new Error(`${f}: unexpectedly small (${b.length} bytes)`);
  await writeFile(dst,b);
}
console.log('assets: ready');
