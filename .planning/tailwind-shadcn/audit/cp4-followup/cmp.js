const fs=require("fs");
const H=JSON.parse(fs.readFileSync(process.argv[2],"utf8")).results, P=JSON.parse(fs.readFileSync(process.argv[3],"utf8")).results;
const find=(R,w,h,c)=>R.find(r=>r.cell.w===w&&r.cell.h===h&&!!r.cell.collapsed===c);
const pairs=[[375,667,false,375,667],[900,800,false,900,800],[1024,800,false,1024,800],[1280,800,false,1280,800],[1440,900,false,1440,900],[1024,768,false,1024,768],[1280,720,false,1280,720],[1024,800,true,1248,800],[1280,800,true,1504,800],[1440,900,true,1664,900]];
const norm=(r)=>{const dx=r.main.x; const R=(b)=>b&&{x:+(b.x-dx).toFixed(2),y:b.y,w:b.w,h:b.h};
 return {kcols:r.kpiGrid.cols, tiles:r.tiles.map(t=>({stat:R(t.stat),pad:t.statPadding,cols:t.statCols,value:R(t.value),kids:t.kids.map(k=>({t:k.text,...R(k)}))})),
 trends:r.trends.cols, qa:R(r.quickActions.card), qaS:[r.quickActions.scrollW,r.quickActions.clientW], btn:r.quickActions.buttons.map(b=>R(b)), donut:R(r.donut.svg), dock:R(r.dock.panel), ov:r.overlap};};
for(const [hw,hh,hc,pw,ph] of pairs){const a=norm(find(H,hw,hh,hc)), b=norm(find(P,pw,ph,false));
 const diffs=[]; for(const k of Object.keys(a)){ if(JSON.stringify(a[k])!==JSON.stringify(b[k])) diffs.push(k);} 
 console.log(`HEAD ${hw}x${hh}${hc?" coll":""} vs PRE ${pw}x${ph}: ${diffs.length?"DIFF "+diffs.join(","):"identical"}`);
 for (const k of diffs) console.log("   ", k, JSON.stringify(a[k]).slice(0,300), "\n    vs", JSON.stringify(b[k]).slice(0,300));}
