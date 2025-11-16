(function(){const d=document.createElement("link").relList;if(d&&d.supports&&d.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))c(a);new MutationObserver(a=>{for(const s of a)if(s.type==="childList")for(const i of s.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&c(i)}).observe(document,{childList:!0,subtree:!0});function l(a){const s={};return a.integrity&&(s.integrity=a.integrity),a.referrerPolicy&&(s.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?s.credentials="include":a.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function c(a){if(a.ep)return;a.ep=!0;const s=l(a);fetch(a.href,s)}})();const B=15e3,I=[{value:"auto",label:"Auto (babel)"},{value:"babel",label:"JavaScript (babel)"},{value:"typescript",label:"TypeScript"},{value:"json",label:"JSON"},{value:"html",label:"HTML"},{value:"css",label:"CSS"},{value:"scss",label:"SCSS"},{value:"markdown",label:"Markdown"},{value:"yaml",label:"YAML"},{value:"graphql",label:"GraphQL"}],j=`
function greet(name) {
  console.log('Hello, ' + name + '!');
}

greet('World');

const items = ['apple', 'banana', 'cherry'];
console.log(items.map(item => item.toUpperCase()).join(', '));
`.trim();class A{constructor(){this.worker=new Worker(new URL(""+new URL("minify.worker-CPM0D-4_.js",import.meta.url).href,import.meta.url),{type:"module"}),this.pending=new Map,this.requestId=0,this.worker.onmessage=d=>{const{ok:l,error:c,result:a,requestId:s}=d.data??{},i=this.pending.get(s);i&&(this.pending.delete(s),l?i.resolve(a):i.reject(new Error(c||"Unknown worker error")))}}runTask(d,l,c,a=B){const s=++this.requestId;return new Promise((i,y)=>{const u=typeof a=="number"&&a>0?setTimeout(()=>{this.pending.delete(s),y(new Error(`Minification timed out after ${a} ms`))},a):null,v=p=>{u&&clearTimeout(u),i(p)},g=p=>{u&&clearTimeout(u),y(p)};this.pending.set(s,{resolve:v,reject:g}),this.worker.postMessage({code:l,options:c,requestId:s,mode:d})})}}async function $(){const r=document.querySelector("#app");if(!r)return;r.innerHTML=`
    <header>
      <div>
        <h1>JS Compression Tool</h1>
        <p>Minify or beautify JavaScript in your browser. Powered by Terser & Prettier (runs in a Web Worker).</p>
      </div>
      <div class="header-actions">
        <button id="use-sample" class="ghost">Use sample code</button>
      </div>
    </header>

    <section class="panel mode-panel">
      <div class="mode-toggle" role="radiogroup" aria-label="Action mode">
        <label><input type="radio" name="mode" id="mode-minify" value="minify" checked /> Minify</label>
        <label><input type="radio" name="mode" id="mode-beautify" value="beautify" /> Beautify</label>
      </div>
      <div class="field parser-field" id="parser-field">
        <label for="parser-select">Parser (beautify)</label>
        <select id="parser-select">
          ${I.map(e=>`<option value="${e.value}" ${e.value==="auto"?"selected":""}>${e.label}</option>`).join("")}
        </select>
      </div>
    </section>

    <section class="panel">
      <div class="field">
        <label for="input-code">Source code</label>
        <textarea id="input-code" rows="12" placeholder="Paste or type JavaScript here"></textarea>
      </div>

      <div class="input-actions">
        <button id="paste-btn" class="ghost">Paste from clipboard</button>
      </div>

      <div class="controls-row">
        <label class="file-label">
          <span>Upload .js</span>
          <input type="file" id="file-input" accept=".js,text/javascript" />
        </label>
        <div class="toggles">
          <label><input type="checkbox" id="opt-compress" checked /> Compress</label>
          <label><input type="checkbox" id="opt-mangle" checked /> Mangle names</label>
          <label title="Advanced: may break public APIs"><input type="checkbox" id="opt-mangle-props" /> Mangle properties</label>
          <label><input type="checkbox" id="opt-sourcemap" /> Source map</label>
        </div>
      </div>

      <div class="actions">
        <button id="run-btn">Run</button>
        <div id="status" class="status">
          <span id="status-message"></span>
          <span id="status-time"></span>
        </div>
      </div>
    </section>

    <section class="panel">
      <div class="output-header">
        <div>
          <h2>Output</h2>
          <div id="stats" class="stats"></div>
        </div>
        <div class="download-actions">
          <button id="copy-out-btn" class="ghost">Copy to clipboard</button>
          <button id="download-btn" disabled>Download minified.js</button>
          <button id="download-map-btn" disabled>Download minified.js.map</button>
        </div>
      </div>
      <textarea id="output-code" rows="10" readonly placeholder="Minified code will appear here"></textarea>
      <p class="note">Heads up: property mangling can break code that relies on specific property names—enable only when you understand the risks.</p>
    </section>

    <footer>
      <div>
        Using @terser/terser and @prettier/prettier • All processing done locally in browser
      </div>
      <div>
        <a href="https://jjw.is-a.dev" target="_blank">@thejjw</a> • 2025.11
      </div>
    </footer>
  `;const d=new A,l=r.querySelector("#input-code"),c=r.querySelector("#output-code"),a=r.querySelector("#file-input"),s=r.querySelector("#opt-compress"),i=r.querySelector("#opt-mangle"),y=r.querySelector("#opt-mangle-props"),u=r.querySelector("#opt-sourcemap"),v=r.querySelector("#parser-select"),g=r.querySelector("#parser-field"),p=r.querySelector("#run-btn"),x=r.querySelector("#status"),P=r.querySelector("#status-message"),C=r.querySelector("#status-time"),q=r.querySelector("#stats"),S=r.querySelector("#download-btn"),w=r.querySelector("#download-map-btn"),T=r.querySelector("#use-sample"),k=r.querySelector("#paste-btn"),L=r.querySelector("#copy-out-btn"),U=r.querySelectorAll('input[name="mode"]');let f="",m="",b="minify";function n(e,t="info",o){P.textContent=e,C.textContent=o!=null?`${o} ms`:"",x.dataset.tone=t}const E=e=>{if(!e){q.textContent="";return}const{originalBytes:t,outputBytes:o}=e.stats,h=t-o,R=t>0?(h/t*100).toFixed(1):"0.0";q.textContent=`${t} B → ${o} B (${R}% saved)`},M=()=>{const e=b==="beautify";p.textContent=e?"Beautify":"Minify",[s,i,y,u].forEach(t=>{t&&(t.disabled=e,e&&t===u&&(u.checked=!1))}),g&&(g.style.display=e?"flex":"none"),w.disabled=e||!m};l.value=j,n("Ready","info"),M();const O=async()=>{const e=l.value;if(!e.trim()){n("Please enter code to process.","warn");return}const t=performance.now();n(b==="beautify"?"Beautifying...":"Minifying...","info"),p.disabled=!0,S.disabled=!0,w.disabled=!0,c.value="",E(null);try{const o=await d.runTask(b,e,b==="beautify"?{parser:(v==null?void 0:v.value)||"auto"}:{compress:s.checked,mangle:i.checked,mangleProps:y.checked,sourceMap:u.checked});f=o.code,m=o.map||"",c.value=o.code,E(o);const h=Math.round(performance.now()-t);n("Done","success",h),S.disabled=!o.code,w.disabled=b==="beautify"||!o.map}catch(o){f="",m="",c.value="";const h=Math.round(performance.now()-t);n((o==null?void 0:o.message)??"Operation failed","error",h)}finally{p.disabled=!1}};p.addEventListener("click",O),T.addEventListener("click",()=>{l.value=j,n("Loaded sample code","info")}),U.forEach(e=>{e.addEventListener("change",t=>{t.target.checked&&(b=t.target.value,m="",M(),n(b==="beautify"?"Beautify mode":"Minify mode","info"))})}),k==null||k.addEventListener("click",async()=>{var e;if(!((e=navigator.clipboard)!=null&&e.readText)){n("Clipboard API not available.","warn");return}try{const t=await navigator.clipboard.readText();if(!t){n("Clipboard is empty.","warn");return}l.value=t,n("Pasted from clipboard","success")}catch{n("Paste failed. Browser blocked clipboard.","error")}}),L==null||L.addEventListener("click",async()=>{var e;if(!f){n("Nothing to copy.","warn");return}if(!((e=navigator.clipboard)!=null&&e.writeText)){n("Clipboard API not available.","warn");return}try{await navigator.clipboard.writeText(f),n("Copied output to clipboard","success")}catch{n("Copy failed. Browser blocked clipboard.","error")}}),a.addEventListener("change",e=>{const[t]=e.target.files||[];if(!t)return;const o=new FileReader;o.onload=()=>{l.value=String(o.result||""),n(`Loaded ${t.name}`,"info")},o.onerror=()=>n("Failed to read file.","error"),o.readAsText(t),a.value=""}),S.addEventListener("click",()=>{if(!f)return;const e=new Blob([f],{type:"text/javascript"}),t=URL.createObjectURL(e),o=document.createElement("a");o.href=t,o.download="minified.js",o.click(),URL.revokeObjectURL(t)}),w.addEventListener("click",()=>{if(!m)return;const e=new Blob([m],{type:"application/json"}),t=URL.createObjectURL(e),o=document.createElement("a");o.href=t,o.download="minified.js.map",o.click(),URL.revokeObjectURL(t)})}$();
