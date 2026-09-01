const targets = {
 'DGCA home':'https://www.dgca.gov.in/digigov-portal/',
 'DGCA traffic':'https://www.dgca.gov.in/digigov-portal/?page=jsp/dgca/InventoryList.jsp',
 'PPAC atf':'https://ppac.gov.in/prices/atf-price',
 'PPAC home':'https://ppac.gov.in/',
 'IOCL atf':'https://iocl.com/aviation-fuel-price',
 'Amadeus':'https://developers.amadeus.com/self-service/category/flights/api-doc/flight-offers-search',
};
for(const [k,u] of Object.entries(targets)){
  try{
    const c=new AbortController(); const t=setTimeout(()=>c.abort(),25000);
    const r=await fetch(u,{signal:c.signal,redirect:'follow',headers:{'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'}});
    clearTimeout(t);
    const b=await r.text();
    console.log('#####',k,r.status,r.url,'bytes',b.length);
    const txt=b.replace(/<script[\s\S]*?<\/script>/g,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
    console.log('  ',txt.slice(0,500));
  }catch(e){console.log('#####',k,'ERR',e.name,e.message);}
}
