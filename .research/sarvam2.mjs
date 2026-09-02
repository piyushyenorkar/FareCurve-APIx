const r=await fetch('https://www.sarvam.ai/',{headers:{'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36'}});
const b=await r.text();
const styles=[...b.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m=>m[1]).join('\n');
console.log('=== inline style bytes',styles.length);
// font-face + families
console.log('--- @font-face families:'); console.log([...new Set([...styles.matchAll(/font-family:([^;}]+)/g)].map(m=>m[1].trim()))].slice(0,25).join('\n'));
console.log('--- backdrop/blur/glass:'); console.log([...new Set([...styles.matchAll(/[^;{}]*(backdrop-filter|blur\(|rgba\(255,\s*255,\s*255,\s*0?\.[0-9]+\))[^;{}]*/g)].map(m=>m[0].trim()))].slice(0,25).join('\n'));
console.log('--- radius:'); console.log([...new Set([...styles.matchAll(/border-radius:[^;}]+/g)].map(m=>m[0]))].slice(0,20).join('\n'));
console.log('--- bg colors:'); console.log([...new Set([...styles.matchAll(/background(-color)?:\s*(#[0-9a-f]{3,8}|rgba?\([^)]+\)|var\([^)]+\))/gi)].map(m=>m[0]))].slice(0,30).join('\n'));
console.log('--- body/main classes:'); console.log([...b.matchAll(/<(?:body|main|section)[^>]*class="([^"]{20,300})"/g)].map(m=>m[1]).slice(0,8).join('\n\n'));
