const TA="https://www.trackingai.org/home";
// META: [AA model slug, release (month, per Artificial Analysis), total params, active params (MoE), params disclosed?]
// Closed labs do not publish sizes: those are tier estimates, marked est.
const META={
"Claude Fable 5.2":["claude-fable-5-2","2026-11","~5T",null,0],
"Gemini 4 Carbon":["gemini-4-carbon","2026-10","~3T",null,0],
"Claude Opus 5.5":["claude-opus-5-5","2026-09","~3T",null,0],
"GPT-6 Astra":["gpt-6-astra","2026-09","~3T",null,0],
"GPT-6.1 Sol":["gpt-6-1-sol","2026-09","~1T",null,0],
"Claude Sonnet 5.5":["claude-sonnet-5-5","2026-09","~1T",null,0],
"GPT-6.1 Terra":["gpt-6-1-terra","2026-10","~400B",null,0],
"Muse Wonder":["muse-wonder","2026-10","~2T",null,0],
"Grok 4.7":["grok-4-7","2026-09","~3T",null,0],
"Gemini 3.8 Flash":["gemini-3-8-flash","2026-09","~500B",null,0],
"Kimi K3.1 Pro":["kimi-k3-1-pro","2026-10","2.8T","104B",1],
"DeepSeek V4.1 Flash":["deepseek-v4-1-flash-1017","2026-10","552B","16B",1],
"GLM-5.3":["glm-5-3","2026-08","753B","40B",1],
"MiMo-V2.6-Pro":["mimo-v2-6-pro","2026-09","1T","42B",1],
"MiniMax-M3.1-Flash":["minimax-m3-1-flash","2026-10","428B","23B",1],
"Muse Spark Open":["muse-spark-open","2026-10","816B","42B",1],
"DeepSeek V4 Pro":["deepseek-v4-pro","2026-08","1.6T","49B",1],
"Qwen3.8 27B":["qwen3-8-27b","2026-08","27B",null,1],
"Nemotron 3 Ultra":["nvidia-nemotron-3-ultra-550b-a55b","2026-06","550B","55B",1],
"gpt-oss-120b":["gpt-oss-120b","2025-08","117B","5.1B",1]
};
const MON=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const rel=n=>{const [y,m]=META[n][1].split("-");return MON[m-1]+" "+y};
const params=n=>{const [,,t,a,d]=META[n];return d?`${t}${a?` <span class="sub">${a} active</span>`:` <span class="sub">dense</span>`}`:`${t} <span class="est" title="Not disclosed by the lab. Estimate from price, speed and tier relative to open models of known size.">est.</span>`};
const aaUrl=n=>"https://artificialanalysis.ai/models/"+META[n][0];
// [name, org, type, [[mode, AA index v5]], {mode:[offlineIQ, mensaIQ, TrackingAI label]}]
const M=[
["Claude Fable 5.2","Anthropic","closed",[["max",65],["xhigh",62],["high",62],["medium",56],["low",54]],{}],
["Gemini 4 Carbon","Google","closed",[["high",60],["medium",58],["low",54]],{}],
["Claude Opus 5.5","Anthropic","closed",[["max",59],["xhigh",57],["high",52],["medium",48],["low",35]],{max:[134,148,"Claude-5.5 Opus MAX"],high:[127,142,"Claude-5.5 Opus"]}],
["GPT-6 Astra","OpenAI","closed",[["max",57],["xhigh",55],["high",55],["medium",52],["low",43]],{max:[135,147,"GPT 6 Astra Ultra"]}],
["GPT-6.1 Sol","OpenAI","closed",[["max",55],["xhigh",52],["high",50],["medium",46],["low",35]],{max:[130,139,"GPT 6.1 Sol Ultra"]}],
["Claude Sonnet 5.5","Anthropic","closed",[["max",55],["xhigh",50],["high",42],["medium",31],["low",26]],{}],
["GPT-6.1 Terra","OpenAI","closed",[["max",51],["xhigh",45],["high",42],["medium",38],["non-reasoning",31],["low",29]],{}],
["Muse Wonder","Meta","closed",[["Full max",50],["max",44],["high",41]],{}],
["Grok 4.7","SpaceXAI","closed",[["xhigh",35],["high",35],["low",31]],{}],
["Gemini 3.8 Flash","Google","closed",[["high",31],["medium",30],["low",23]],{high:[130,109,"Gemini 3.8 Flash"]}],
["Kimi K3.1 Pro","Moonshot (Kimi)","open",[["thinking",46]],{}],
["DeepSeek V4.1 Flash","DeepSeek","open",[["max",33],["high",29],["non-reasoning",19]],{}],
["GLM-5.3","Z AI","open",[["max",32],["low",23]],{}],
["MiMo-V2.6-Pro","Xiaomi","open",[["thinking",30]],{}],
["MiniMax-M3.1-Flash","MiniMax","open",[["thinking",29]],{}],
["Muse Spark Open","Meta","open",[["xhigh",25]],{}],
["DeepSeek V4 Pro","DeepSeek","open",[["max",23],["non-reasoning",13]],{}],
["Qwen3.8 27B","Alibaba","open",[["xhigh",20],["medium",17],["low",16],["non-reasoning",10]],{}],
["Nemotron 3 Ultra","NVIDIA","open",[["thinking",12]],{}],
["gpt-oss-120b","OpenAI","open",[["high",4]],{}]
];
const rows=[];
for(const [name,org,type,modes,anc] of M)for(const [mode,aa] of modes){
  const a=anc[mode], est=100+0.6*aa;
  rows.push({name,org,type,mode,aa,a,iq:Math.round(a?(est+a[0])/2:est)});
}
rows.sort((x,y)=>y.iq-x.iq||y.aa-x.aa);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const col=t=>t==="open"?"var(--open)":"var(--closed)";
const pct=iq=>Math.max(2,Math.min(100,(iq-100)/45*100));
const ptip=n=>META[n][4]?"Disclosed by the lab (open weights)":"Undisclosed; estimate";
const tip=r=>r.a?`TrackingAI ${r.a[2]}: offline test ${r.a[0]} · Mensa Norway ${r.a[1]}`:"";
const byType={all:rows,closed:rows.filter(r=>r.type==="closed"),open:rows.filter(r=>r.type==="open")};
for(const k in byType)document.getElementById("n-"+k).textContent=byType[k].length;
document.getElementById("m-n").textContent=rows.length;

document.getElementById("podium").innerHTML=rows.filter((r,i)=>rows.findIndex(x=>x.name===r.name)===i).slice(0,3).map((r,i)=>`<div class="pod"><span class="rk">No. ${i+1}</span><span class="score">${r.iq}</span><span class="nm"><i class="dot ${r.type}"></i>${esc(r.name)}</span><span class="md">${esc(r.mode)} mode · AA index ${r.aa}</span></div>`).join("");

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
  try{history.replaceState(null,"",t==="all"?location.pathname:"#"+t)}catch(e){}
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
