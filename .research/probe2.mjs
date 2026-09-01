import fs from 'fs';
const hosts=['www.goindigo.in','www.airindia.com','www.makemytrip.com','www.yatra.com','www.akasaair.com','www.spicejet.com','www.airindiaexpress.com','www.easemytrip.com','www.cleartrip.com','www.ixigo.com','www.goibibo.com'];
for(const h of hosts){
  try{
    const c=new AbortController(); const t=setTimeout(()=>c.abort(),25000);
    const r=await fetch(`https://${h}/robots.txt`,{signal:c.signal,headers:{'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'}});
    clearTimeout(t);
    const b=await r.text();
    fs.writeFileSync(`robots_${h}.txt`,b);
    const lines=b.split('\n').filter(l=>/flight|air|search|book/i.test(l));
    console.log('#####',h,r.status,'bytes',b.length,'| flight/search/book lines:');
    console.log(lines.slice(0,45).map(l=>'  '+l.trim()).join('\n'));
  }catch(e){console.log('#####',h,'ERR',e.name);}
}
