/* Connected puzzle: pieces with dotted, animated links into a central hub. */
(function(g){
const S='fill="none" stroke="#174D37" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"';
const LG={
Gmail:'<svg viewBox="0 0 40 40"><path d="M5 31V11l15 11 15-11v20" fill="none" stroke="#EA4335" stroke-width="6" stroke-linejoin="round"/><path d="M5 31V13" stroke="#4285F4" stroke-width="6"/><path d="M35 31V13" stroke="#34A853" stroke-width="6"/></svg>',
Calendar:'<svg viewBox="0 0 40 40"><rect x="2" y="2" width="36" height="36" rx="8" fill="#fff" stroke="#4285F4" stroke-width="3"/><path d="M2 12h36" stroke="#4285F4" stroke-width="8"/><text x="20" y="32" font-size="17" font-weight="700" text-anchor="middle" fill="#4285F4">31</text></svg>',
Notion:'<svg viewBox="0 0 40 40"><rect x="3" y="3" width="34" height="34" rx="7" fill="#fff" stroke="#111" stroke-width="3"/><text x="20" y="29" font-size="24" font-weight="800" font-family="Georgia,serif" text-anchor="middle" fill="#111">N</text></svg>',
Slack:'<svg viewBox="0 0 40 40"><rect x="4" y="16" width="16" height="7" rx="3.5" fill="#36C5F0"/><rect x="16" y="4" width="7" height="16" rx="3.5" fill="#2EB67D"/><rect x="20" y="16" width="16" height="7" rx="3.5" fill="#ECB22E"/><rect x="16" y="20" width="7" height="16" rx="3.5" fill="#E01E5A"/></svg>',
Tasks:`<svg viewBox="0 0 40 40"><rect x="5" y="5" width="30" height="30" rx="9" ${S}/><path d="M12 21l6 6 11-12" ${S}/></svg>`,
Customers:`<svg viewBox="0 0 40 40"><circle cx="15" cy="14" r="6" ${S}/><path d="M4 33c0-6 5-10 11-10s11 4 11 10" ${S}/><circle cx="29" cy="15" r="4.5" ${S}/><path d="M29 24c4 0 8 3 8 8" ${S}/></svg>`};
/* jigsaw outline: k = {t,r,b,l} each 1 (knob out) / -1 (socket) / absent */
function jig(w,h,k){const R=14,C=28,r=17,f=v=>v>0?1:0,sx=(w-2*R-C)/2,sy=(h-2*R-C)/2;let d=`M${R} 0`;
 if(k.t)d+=`L${R+sx} 0A${r} ${r} 0 1 ${f(k.t)} ${R+sx+C} 0`;d+=`L${w-R} 0Q${w} 0 ${w} ${R}`;
 if(k.r)d+=`L${w} ${R+sy}A${r} ${r} 0 1 ${f(k.r)} ${w} ${R+sy+C}`;d+=`L${w} ${h-R}Q${w} ${h} ${w-R} ${h}`;
 if(k.b)d+=`L${w-R-sx} ${h}A${r} ${r} 0 1 ${f(k.b)} ${w-R-sx-C} ${h}`;d+=`L${R} ${h}Q0 ${h} 0 ${h-R}`;
 if(k.l)d+=`L0 ${h-R-sy}A${r} ${r} 0 1 ${f(k.l)} 0 ${h-R-sy-C}`;return d+`L0 ${R}Q0 0 ${R} 0Z`}
const ROW=[82,235,388],TOP=[1.6,34.2,66.7],LEFT=[1.4,70.65],esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function render(items,o={}){let net='',pcs='';
 items.forEach((it,i)=>{const L=it.side==='l',cy=ROW[it.row],sx=L?291:709,ex=L?388:612,a=L?340:660,b=L?350:650,p=`M${sx} ${cy}C${a} ${cy} ${b} 235 ${ex} 235`;
  net+=`<path class="ln ${it.on?'':'off'}" d="${p}"/>`;
  if(it.on)net+=`<circle r="4.5" class="mv"><animateMotion dur="${(3+i*.4).toFixed(1)}s" begin="-${(i*.7).toFixed(1)}s" repeatCount="indefinite" path="${p}"/></circle>`;
  net+=`<circle cx="${sx}" cy="${cy}" r="5.5" class="nd ${it.on?'':'off'}"/>`;
  pcs+=`<button class="pz ${L?'l':'r'} ${it.on?'':'off'}" ${it.id?`data-go="${it.id}"`:''} style="left:${LEFT[L?0:1]}%;top:${TOP[it.row]}%"><svg class="sh" viewBox="-30 -30 320 170"><path d="${jig(260,110,L?{r:1}:{l:1})}"/></svg><span class="tx">${LG[it.logo||it.name]}<span><b>${esc(it.name)}</b><small>${esc(it.sub)}</small></span></span></button>`});
 net+=`<circle cx="388" cy="235" r="6" class="nd"/><circle cx="612" cy="235" r="6" class="nd"/>`;
 const hub=`<div class="hub"><svg class="sh" viewBox="-30 -30 230 230"><path d="${jig(170,170,{t:1,r:1,b:1,l:1})}"/></svg><div class="hc"><svg viewBox="0 0 24 24"><path d="M12 0c.8 6.4 5.6 11.2 12 12-6.4.8-11.2 5.6-12 12-.8-6.4-5.6-11.2-12-12C6.4 11.2 11.2 6.4 12 0z" fill="currentColor"/></svg><b>Aveniq Flow</b><small>${esc(o.hub||'your workspace')}</small></div></div>`;
 return `<div class="pzs">${pcs}${hub}<svg class="net" viewBox="0 0 1000 470">${net}</svg>${o.status?`<div class="okp"><i></i>${esc(o.status)}</div>`:''}</div>`}
g.Puzzle={render,jig};
})(window);
