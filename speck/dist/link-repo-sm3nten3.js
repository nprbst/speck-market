// @bun
import{A as O,B as Q,z as N}from"./paths-x5kskk5z.js";import z from"fs/promises";import K from"path";async function V(B){if(!B||B.trim()==="")throw Error(`Missing required argument: path-to-speck-root
Usage: /speck.link <path>
Examples:
  /speck.link ..          (parent directory)
  /speck.link ../..       (grandparent, for monorepo)
  /speck.link /abs/path   (absolute path)`);let E=await N(),F=K.resolve(E,B);try{if(!(await z.stat(F)).isDirectory())throw Error(`Target is not a directory: ${F}`)}catch(j){if(j.code==="ENOENT")throw Error(`Target does not exist: ${F}`);throw j}let q=K.join(E,".speck","root"),J=K.dirname(q),H=K.relative(J,F);try{if(!(await z.lstat(q)).isSymbolicLink())throw Error(`.speck/root exists but is not a symlink
Fix: mv .speck/root .speck/root.backup && /speck.link `+B);let U=await z.readlink(q);if(await z.realpath(q)===F){console.log(`\u2713 Already linked to ${H}`),console.log(`  Speck Root: ${F}`);return}console.log(`Updating link from ${U} to ${H}`),await z.unlink(q)}catch(j){if(j.code!=="ENOENT")throw j}try{await z.symlink(H,q,"dir")}catch(j){if(process.platform==="win32"&&(j.code==="EPERM"||j.code==="EACCES"))throw Error(`Symlink creation failed (Windows requires Developer Mode or WSL)

Fix options:
  1. Enable Developer Mode:
`+`     - Settings \u2192 Update & Security \u2192 For developers \u2192 Developer Mode
`+`  2. Use WSL (Windows Subsystem for Linux):
     - Run Speck commands from WSL terminal
  3. Create symlink manually with admin privileges:
     - mklink /D .speck\\root `+B.replace(/\//g,"\\"));throw j}O();let x=await Q();if(x.mode!=="multi-repo")throw Error(`Link created but detection failed - this is a bug
Please report at https://github.com/nprbst/speck/issues`);await W(E),console.log("\u2713 Multi-repo mode enabled"),console.log(`  Speck Root: ${x.speckRoot}`),console.log(`  Repo Root: ${x.repoRoot}`),console.log(`  Specs: ${x.specsDir}`),console.log(`
Next steps:`),console.log('  1. Create shared spec: /speck.specify "Feature description"'),console.log("  2. Generate local plan: /speck.plan"),console.log("  3. Check configuration: /speck.env")}async function W(B){let E=K.join(B,".gitignore"),F=["","# Speck multi-repo: ignore symlinked shared files","specs/*/spec.md","specs/*/contracts/"];try{let q="";try{q=await z.readFile(E,"utf-8")}catch(j){if(j.code!=="ENOENT")throw j}let J=q.includes("specs/*/spec.md"),H=q.includes("specs/*/contracts/");if(J&&H)return;let x=[];if(!q.endsWith(`
`)&&q.length>0)x.push("");if(!J||!H)x.push("# Speck multi-repo: ignore symlinked shared files");if(!J)x.push("specs/*/spec.md");if(!H)x.push("specs/*/contracts/");if(x.length>0){let j=q+`
`+x.join(`
`)+`
`;await z.writeFile(E,j,"utf-8"),console.log("\u2713 Added .gitignore patterns for symlinked files")}}catch(q){console.warn(`Warning: Could not update .gitignore: ${q.message}`)}}async function $(B){if(B.length===0)return console.error(`ERROR: Missing argument
`),console.error(`Usage: bun run .speck/scripts/link-repo.ts <path>
`),console.error("Examples:"),console.error("  bun run .speck/scripts/link-repo.ts .."),console.error("  bun run .speck/scripts/link-repo.ts ../.."),1;try{return await V(B[0]),0}catch(E){return console.error("ERROR:",E.message),1}}export{$ as main,V as linkRepo};
