'use strict';

/* Release-environment fallback for hosts that provide Node.js but no npm
   executable. It runs only the repository's Node-only package scripts and
   preserves npm's pre/post hook order. It is intentionally not an installer. */
const {spawnSync}=require('node:child_process');
const scripts=require('../package.json').scripts||{};
const requested=String(process.argv[2]||'').trim();

function execute(name){
 const script=scripts[name];
 if(!script)return;
 for(const segment of script.split(' && ')){
  const parts=segment.trim().split(/\s+/);
  if(parts.shift()!=='node')throw new Error(`Direct Node fallback cannot execute non-Node command in ${name}: ${segment}`);
  const result=spawnSync(process.execPath,parts,{cwd:process.cwd(),env:process.env,stdio:'inherit',shell:false});
  if(result.status!==0)process.exit(Number.isInteger(result.status)?result.status:1);
 }
}

if(!requested||!scripts[requested])throw new Error(`Unknown package script: ${requested||'(missing)'}`);
execute(`pre${requested}`);
execute(requested);
execute(`post${requested}`);
