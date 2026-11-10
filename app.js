if(typeof rows==="undefined"){const m="The score data did not load. Reload the page; if this keeps happening, the site is being updated.";document.getElementById("rows").innerHTML=`<tr><td colspan="9" class="empty" role="alert">${m}</td></tr>`;throw new Error("data.js missing")}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const col=t=>t==="open"?"var(--open)":"var(--closed)";
const pct=iq=>Math.max(2,Math.min(100,(iq-100)/45*100));
const tip=r=>r.a?`TrackingAI ${r.a[2]}: offline test ${r.a[0]} · Mensa Norway ${r.a[1]}`:"";
const byType={all:rows,closed:rows.filter(r=>r.type==="closed"),open:rows.filter(r=>r.type==="open")};
for(const k in byType)document.getElementById("n-"+k).textContent=byType[k].length;
document.getElementById("m-n").textContent=rows.length;

document.getElementById("podium").innerHTML=topModels(3).map((r,i)=>`<div class="pod"><span class="rk">No. ${i+1}</span><span class="score">${r.iq}</span><span class="nm"><i class="dot ${r.type}" aria-hidden="true"></i>${esc(r.name)}<span class="sr-only"> (${r.type==="open"?"open weights":"closed"})</span></span><span class="md">${esc(r.mode)} mode · benchmark ${r.aa}</span></div>`).join("");

let tab="all",sortKey="iq",sortDir=-1;
const open=new Set();
const size=n=>{const m=/([0-9.]+)([BT])/.exec(META[n][2]||"");return m?+m[1]*(m[2]==="T"?1000:1):-1};
const SORTS={iq:r=>r.iq,aa:r=>r.aa,rel:r=>META[r.name][1],params:r=>size(r.name)};
const key=r=>r.name+"|"+r.mode;
function render(){
  const q=document.getElementById("q").value.trim().toLowerCase();
  const list=byType[tab];
  const ranked=list.map((r,i)=>[r,i+1]);
  if(sortKey!=="iq"||sortDir!==-1){const f=SORTS[sortKey];ranked.sort(([a],[b])=>{const x=f(a),y=f(b);return (x<y?-1:x>y?1:0)*sortDir||b.iq-a.iq})}
  const html=ranked.filter(([r])=>(r.name+" "+r.mode+" "+r.org).toLowerCase().includes(q)).map(([r,n])=>`<tr class="${n<=3?"top3":""}">
    <td class="rank">${String(n).padStart(2,"0")}</td>
    <td><i class="dot ${r.type}" aria-hidden="true"></i><span class="model">${esc(r.name)}</span><span class="sr-only"> (${r.type==="open"?"open weights":"closed"})</span> <span class="mode">· ${esc(r.mode)}</span>${r.a?`<button type="button" class="tested" aria-expanded="${open.has(key(r))}" data-key="${esc(key(r))}" title="${esc(tip(r))}">tested</button>${open.has(key(r))?`<span class="tdetail">${esc(tip(r))}</span>`:""}`:""}</td>
    <td class="kind hide-sm">${esc(r.org)}</td>
    <td class="num hide-sm">${rel(r.name)}</td>
    <td class="num hide-sm">${params(r.name)}</td>
    <td class="iq">${r.iq}</td>
    <td class="barcell hide-sm" aria-hidden="true"><div class="bar"><i style="width:${pct(r.iq)}%;background:${col(r.type)}"></i></div></td>
    <td class="num hide-sm">${r.aa}</td>
    <td class="src hide-sm"><a href="${aaUrl(r.name)}" target="_blank" rel="noopener" title="Artificial Analysis model page">Benchmark ↗</a>${r.a?`<a href="${TA}" target="_blank" rel="noopener" title="${esc(tip(r))}">TrackingAI ↗</a>`:""}</td></tr>`).join("");
  const shown=(html.match(/<tr /g)||[]).length;
  document.getElementById("status").textContent=`${shown} of ${list.length} entries shown, sorted by ${{iq:"IQ",aa:"benchmark",rel:"release date",params:"parameters"}[sortKey]}, ${sortDir<0?"highest":"lowest"} first`;
  document.getElementById("rows").innerHTML=html||`<tr><td colspan="9" class="empty">No model or mode matches “${esc(q)}”. Clear the search to see all entries.</td></tr>`;
}
document.getElementById("rows").onclick=e=>{const b=e.target.closest("button.tested");if(!b)return;const k=b.dataset.key;open.has(k)?open.delete(k):open.add(k);render();document.querySelector(`button.tested[data-key="${CSS.escape(k)}"]`)?.focus()};
for(const th of document.querySelectorAll("th[data-sort]"))th.querySelector("button").onclick=()=>{
  const k=th.dataset.sort;sortDir=sortKey===k?-sortDir:-1;sortKey=k;
  for(const o of document.querySelectorAll("th[data-sort]"))o.setAttribute("aria-sort",o===th?(sortDir<0?"descending":"ascending"):"none");
  render();
};
function setTab(t){
  tab=t;for(const k of ["all","closed","open"]){const b=document.getElementById("t-"+k);b.setAttribute("aria-selected",k===t);b.tabIndex=k===t?0:-1}
  document.getElementById("board").setAttribute("aria-labelledby","t-"+t);
  try{history.replaceState(null,"",t==="all"?location.pathname:"#"+t)}catch{}
  render();
}
const TABS=["all","closed","open"];
for(const k of TABS)document.getElementById("t-"+k).onclick=()=>setTab(k);
document.querySelector("[role=tablist]").onkeydown=e=>{const i=TABS.indexOf(tab),j={ArrowRight:i+1,ArrowLeft:i-1,Home:0,End:TABS.length-1}[e.key];if(j===undefined)return;e.preventDefault();const k=TABS[(j+TABS.length)%TABS.length];setTab(k);document.getElementById("t-"+k).focus()};
document.getElementById("q").oninput=render;
const h=location.hash.slice(1);setTab(["closed","open"].includes(h)?h:"all");

function cards(type){
  return M.filter(m=>m[2]===type).map(m=>{
    const rs=rows.filter(r=>r.name===m[0]);
    return `<article class="card"><div class="row"><div><div class="nm">${esc(m[0])}</div><div class="org">${esc(m[1])} · ${rel(m[0])} · ${params(m[0])}</div><div class="org">best mode: ${esc(rs[0].mode)}</div><button type="button" class="showbtn" data-model="${esc(m[0])}">Show in leaderboard</button></div><div class="big">${rs[0].iq}</div></div>
    <div class="modes">${rs.map(r=>`<div class="mrow"><span>${esc(r.mode)}${r.a?` <span title="Measured by TrackingAI" aria-hidden="true">◆</span><span class="sr-only">, measured by TrackingAI</span>`:""}</span><div class="bar" aria-hidden="true"><i style="width:${pct(r.iq)}%;background:${col(type)}"></i></div><b>${r.iq}</b></div>`).join("")}</div></article>`;
  }).join("");
}
document.getElementById("closed").innerHTML=cards("closed");
document.addEventListener("click",e=>{const b=e.target.closest(".showbtn");if(!b)return;const q=document.getElementById("q");q.value=b.dataset.model;setTab("all");document.getElementById("h-board").scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});q.focus({preventScroll:true})});
document.getElementById("open").innerHTML=cards("open");

try{document.getElementById("upd").textContent=new Date(UPDATED).toLocaleString("en-GB",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",timeZone:"UTC",timeZoneName:"short"})}catch{}
