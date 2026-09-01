const hosts=['www.goindigo.in','www.airindia.com','www.makemytrip.com','www.yatra.com'];
for(const h of hosts){
  try{
    const c=new AbortController(); const t=setTimeout(()=>c.abort(),20000);
    const r=await fetch(`https://${h}/robots.txt`,{signal:c.signal,headers:{'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36','Accept':'text/plain,*/*'}});
    clearTimeout(t);
    const b=await r.text();
    console.log('#####',h,r.status,r.headers.get('content-type'));
    console.log(b.slice(0,1400));
  }catch(e){console.log('#####',h,'ERR',e.name,e.message);}
}
