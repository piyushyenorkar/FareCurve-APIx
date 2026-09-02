const urls=['https://www.sarvam.ai/','https://sarvam.ai/'];
for(const u of urls){
 try{
  const c=new AbortController(); const t=setTimeout(()=>c.abort(),25000);
  const r=await fetch(u,{signal:c.signal,headers:{'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36','Accept':'text/html,application/xhtml+xml','Accept-Language':'en-US,en;q=0.9'}});
  clearTimeout(t);
  const b=await r.text();
  console.log('#####',u,r.status,'bytes',b.length);
  if(r.ok){
    // extract css links and inline styles + font refs
    const css=[...b.matchAll(/href="([^"]+\.css[^"]*)"/g)].map(m=>m[1]);
    console.log('CSS:',css.slice(0,10));
    const fonts=[...b.matchAll(/font-family:\s*([^;"}]+)/g)].map(m=>m[1]).slice(0,20);
    console.log('FONTS:',[...new Set(fonts)]);
    const colors=[...b.matchAll(/#[0-9a-fA-F]{6}\b/g)].map(m=>m[0]);
    const cnt={}; colors.forEach(c=>cnt[c]=(cnt[c]||0)+1);
    console.log('TOP COLORS:',Object.entries(cnt).sort((a,b)=>b[1]-a[1]).slice(0,25));
    const vars=[...b.matchAll(/--[a-z0-9-]+:\s*[^;}"]+/gi)].map(m=>m[0]).slice(0,40);
    console.log('VARS:',vars);
  }
 }catch(e){console.log('#####',u,'ERR',e.name,e.message);}
}
