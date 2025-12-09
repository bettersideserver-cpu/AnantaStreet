window.addEventListener("DOMContentLoaded",()=>{let e=document.getElementById("mainImage");if(!e)return;let t=e.getAttribute("data-full");if(!t)return;let d=new Image;d.decoding="async",d.src=t;let n=()=>{e.src=t,e.classList.add("is-loaded")};"decode"in d?d.decode().then(n).catch(n):(d.onload=n,d.onerror=n)});
//# sourceMappingURL=site.c50a11a2.js.map
