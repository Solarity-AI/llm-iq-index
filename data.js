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
/** IQ for one mode: 100 + 0.6 × AA index, averaged with TrackingAI offline IQ when that exact mode was tested. */
function iqFor(aa,anchor){const est=100+0.6*aa;return Math.round(anchor?(est+anchor[0])/2:est)}
const rows=[];
for(const [name,org,type,modes,anc] of M)for(const [mode,aa] of modes){
  const a=anc[mode];
  rows.push({name,org,type,mode,aa,a,iq:iqFor(aa,a)});
}
rows.sort((x,y)=>y.iq-x.iq||y.aa-x.aa);
/** Best-scoring mode of each distinct model, highest first. */
const topModels=n=>rows.filter((r,i)=>rows.findIndex(x=>x.name===r.name)===i).slice(0,n);
