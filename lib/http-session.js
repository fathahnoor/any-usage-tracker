'use strict';
function domainMatches(host,domain){const d=domain.replace(/^\./,'');return host===d||(domain.startsWith('.')&&host.endsWith('.'+d));}
class CookieJar {
 constructor(cookies=[]){this.cookies=cookies.filter(c=>c&&typeof c.name==='string'&&typeof c.value==='string').map(c=>({...c}));}
 header(url){const u=new URL(url),now=Date.now()/1000;return this.cookies.filter(c=>domainMatches(u.hostname,c.domain)&&u.pathname.startsWith(c.path||'/')&&(!c.secure||u.protocol==='https:')&&(!c.expires||c.expires<0||c.expires>now)).map(c=>c.name+'='+c.value).join('; ');}
 absorb(url,response){const host=new URL(url).hostname;const values=response.headers.getSetCookie?.()||[];for(const line of values){const parts=line.split(';').map(s=>s.trim());const eq=parts[0].indexOf('=');if(eq<1)continue;const c={name:parts[0].slice(0,eq),value:parts[0].slice(eq+1),domain:host,path:'/'};for(const attr of parts.slice(1)){const [key,...rest]=attr.split('=');const value=rest.join('=');switch(key.toLowerCase()){case'domain':if(domainMatches(host,value))c.domain=value;break;case'path':c.path=value;break;case'secure':c.secure=true;break;case'httponly':c.httpOnly=true;break;case'expires':c.expires=Date.parse(value)/1000;break;case'max-age':c.expires=Date.now()/1000+Number(value);break;}}this.cookies=this.cookies.filter(x=>!(x.name===c.name&&x.domain===c.domain&&x.path===c.path));this.cookies.push(c);}}
 toJSON(){return this.cookies;}
}
async function requestJson(url,options={},fetchImpl=fetch){let r;try{r=await fetchImpl(url,{...options,signal:options.signal||AbortSignal.timeout(25000)});}catch{throw new Error('Koneksi API sumber gagal');}let json;try{json=await r.json();}catch{throw new Error('API sumber tidak mengembalikan JSON (HTTP '+r.status+')');}return {response:r,json};}
module.exports={CookieJar,requestJson};
