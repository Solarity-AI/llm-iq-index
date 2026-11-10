if(typeof rows==="undefined"){const m="The score data did not load. Reload the page; if this keeps happening, the site is being updated.";document.getElementById("rows").innerHTML=`<tr><td colspan="9" class="empty" role="alert">${m}</td></tr>`;throw new Error("data.js missing")}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const col=t=>t==="open"?"var(--open)":"var(--closed)";
const pct=iq=>Math.max(2,Math.min(100,(iq-100)/45*100));
const tip=r=>r.a?`TrackingAI ${r.a[2]}: offline test ${r.a[0]} · Mensa Norway ${r.a[1]}`:"";
const byType={all:rows,closed:rows.filter(r=>r.type==="closed"),open:rows.filter(r=>r.type==="open")};
for(const k in byType)document.getElementById("n-"+k).textContent=byType[k].length;
document.getElementById("m-n").textContent=rows.length;

document.getElementById("podium").innerHTML=topModels(3).map((r,i)=>`<div class="pod"><span class="rk">No. ${i+1}</span><span class="score">${r.iq}</span><span class="nm"><i class="dot ${r.type}"></i>${esc(r.name)}</span><span class="md">${esc(r.mode)} mode · AA index ${r.aa}</span></div>`).join("");

let tab="all";
function render(){
  const q=document.getElementById("q").value.trim().toLowerCase();
  const list=byType[tab];
  const html=list.map((r,i)=>[r,i+1]).filter(([r])=>(r.name+" "+r.mode+" "+r.org).toLowerCase().includes(q)).map(([r,n])=>`<tr class="${n<=3?"top3":""}">
    <td class="rank">${String(n).padStart(2,"0")}</td>
    <td><span class="model">${esc(r.name)}</span> <span class="mode">· ${esc(r.mode)}</span>${r.a?`<span class="tested" title="${esc(tip(r))}">tested</span>`:""}</td>
    <td class="kind"><i class="dot ${r.type}"></i>${esc(r.org)}</td>
    <td class="num hide-sm">${rel(r.name)}</td>
    <td class="num">${params(r.name)}</td>
    <td class="iq">${r.iq}</td>
    <td class="barcell hide-sm"><div class="bar"><i style="width:${pct(r.iq)}%;background:${col(r.type)}"></i></div></td>
    <td class="num">${r.aa}</td>
    <td class="src"><a href="${aaUrl(r.name)}" target="_blank" rel="noopener">Artificial Analysis</a>${r.a?`<a href="${TA}" target="_blank" rel="noopener" title="${esc(tip(r))}">TrackingAI</a>`:""}</td></tr>`).join("");
  document.getElementById("rows").innerHTML=html||`<tr><td colspan="9" class="empty">No model or mode matches “${esc(q)}”. Clear the search to see all entries.</td></tr>`;
}
function setTab(t){
  tab=t;for(const k of ["all","closed","open"])document.getElementById("t-"+k).setAttribute("aria-selected",k===t);
  try{history.replaceState(null,"",t==="all"?location.pathname:"#"+t)}catch{}
  render();
}
for(const k of ["all","closed","open"])document.getElementById("t-"+k).onclick=()=>setTab(k);
document.getElementById("q").oninput=render;
const h=location.hash.slice(1);setTab(["closed","open"].includes(h)?h:"all");

function cards(type){
  return M.filter(m=>m[2]===type).map(m=>{
    const rs=rows.filter(r=>r.name===m[0]);
    return `<article class="card"><div class="row"><div><div class="nm">${esc(m[0])}</div><div class="org">${esc(m[1])} · ${rel(m[0])} · ${params(m[0])}</div><div class="org">best mode: ${esc(rs[0].mode)}</div></div><div class="big">${rs[0].iq}</div></div>
    <div class="modes">${rs.map(r=>`<div class="mrow"><span>${esc(r.mode)}${r.a?" ◆":""}</span><div class="bar"><i style="width:${pct(r.iq)}%;background:${col(type)}"></i></div><b>${r.iq}</b></div>`).join("")}</div></article>`;
  }).join("");
}
document.getElementById("closed").innerHTML=cards("closed");
document.getElementById("open").innerHTML=cards("open");

try{document.getElementById("upd").textContent=new Date(UPDATED).toLocaleString("en-GB",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",timeZone:"UTC",timeZoneName:"short"})}catch{}
