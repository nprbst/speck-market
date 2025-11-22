// @bun
import{A as Q,B as U,z as O}from"./paths-qqmkr5wb.js";import z from"fs/promises";import N from"path";async function V(B){if(!B||B.trim()==="")throw Error(`Missing required argument: path-to-speck-root
Usage: /speck.link <path>
Examples:
  /speck.link ..          (parent directory)
  /speck.link ../..       (grandparent, for monorepo)
  /speck.link /abs/path   (absolute path)`);let E=await O(),j=N.resolve(E,B);try{if(!(await z.stat(j)).isDirectory())throw Error(`Target is not a directory: ${j}`)}catch(x){if(x.code==="ENOENT")throw Error(`Target does not exist: ${j}`);throw x}let q=N.join(E,".speck","root"),K=N.dirname(q),F=N.relative(K,j);try{if(!(await z.lstat(q)).isSymbolicLink())throw Error(`.speck/root exists but is not a symlink
Fix: mv .speck/root .speck/root.backup && /speck.link `+B);let J=await z.readlink(q);if(await z.realpath(q)===j){console.log(`\u2713 Already linked to ${F}`),console.log(`  Speck Root: ${j}`);return}console.log(`Updating link from ${J} to ${F}`),await z.unlink(q)}catch(x){if(x.code!=="ENOENT")throw x}try{await z.symlink(F,q,"dir")}catch(x){let J=x;if(process.platform==="win32"&&(J.code==="EPERM"||J.code==="EACCES"))throw Error(`Symlink creation failed (Windows requires Developer Mode or WSL)

Fix options:
  1. Enable Developer Mode:
`+`     - Settings \u2192 Update & Security \u2192 For developers \u2192 Developer Mode
`+`  2. Use WSL (Windows Subsystem for Linux):
     - Run Speck commands from WSL terminal
  3. Create symlink manually with admin privileges:
     - mklink /D .speck\\root `+B.replace(/\//g,"\\"));throw x}Q();let H=await U();if(H.mode!=="multi-repo")throw Error(`Link created but detection failed - this is a bug
Please report at https://github.com/nprbst/speck/issues`);await W(E),console.log("\u2713 Multi-repo mode enabled"),console.log(`  Speck Root: ${H.speckRoot}`),console.log(`  Repo Root: ${H.repoRoot}`),console.log(`  Specs: ${H.specsDir}`),console.log(`
Next steps:`),console.log('  1. Create shared spec: /speck.specify "Feature description"'),console.log("  2. Generate local plan: /speck.plan"),console.log("  3. Check configuration: /speck.env")}async function W(B){let E=N.join(B,".gitignore");try{let j="";try{j=await z.readFile(E,"utf-8")}catch(H){if(H.code!=="ENOENT")throw H}let q=j.includes("specs/*/spec.md"),K=j.includes("specs/*/contracts/");if(q&&K)return;let F=[];if(!j.endsWith(`
`)&&j.length>0)F.push("");if(!q||!K)F.push("# Speck multi-repo: ignore symlinked shared files");if(!q)F.push("specs/*/spec.md");if(!K)F.push("specs/*/contracts/");if(F.length>0){let H=j+`
`+F.join(`
`)+`
`;await z.writeFile(E,H,"utf-8"),console.log("\u2713 Added .gitignore patterns for symlinked files")}}catch(j){let q=j instanceof Error?j.message:String(j);console.warn(`Warning: Could not update .gitignore: ${q}`)}}async function $(B){if(B.length===0)return console.error(`ERROR: Missing argument
`),console.error(`Usage: bun run .speck/scripts/link-repo.ts <path>
`),console.error("Examples:"),console.error("  bun run .speck/scripts/link-repo.ts .."),console.error("  bun run .speck/scripts/link-repo.ts ../.."),1;try{return await V(B[0]),0}catch(E){let j=E instanceof Error?E.message:String(E);return console.error("ERROR:",j),1}}export{$ as main,V as linkRepo};
