window.addEventListener("DOMContentLoaded",()=>{let t=document.querySelectorAll(".Cutout path"),e=document.getElementById("infoCard"),n=document.getElementById("modalTitle"),s=document.getElementById("navigateButton"),o=document.getElementById("closeCard"),a=document.getElementById("details"),l=null,i="";function d(t){s&&(s.disabled=!t,s.style.opacity=t?"1":"0.6",s.style.pointerEvents=t?"auto":"none",s.title=t?"":"No page linked for this floor")}t.forEach(t=>{t.addEventListener("click",s=>{if(s.stopPropagation(),l&&l!==t&&l.classList.remove("selected"),t.classList.contains("selected"))t.classList.remove("selected"),e.style.display="none",l=null,i="",n.textContent="~",d(!1);else{t.classList.add("selected"),l=t;let s=t.getAttribute("data-name")||t.id||"Info";n.textContent=s,function(t){if(!a)return;let e=(t||"").match(/\d+/),n=e?parseInt(e[0],10):null;19===n||20===n?a.innerHTML=`
    <div>
      <span><strong>Total Units:</strong></span>
      <span>4</span>
    </div>
    <div>
      <span><strong>Size:</strong></span>
      <span>Penthouse- 3 BHK<br>2 Floor<br>2 Lobby</span>
    </div>
    <div>
      <span><strong>Partition:</strong></span>
      <span>A1 | A2 | A3</span>
    </div>
  `:a.innerHTML=`
          <div>
            <span><strong>Total Units:</strong></span>
            <span>8</span>
          </div>
          <div>
            <span><strong>Size:</strong></span>
            <span>3 BHK + 1</span>
          </div>
          <div>
      <span><strong>Partition:</strong></span>
      <span>A1 | A2 | A3</span>
    </div>
        `}(s),d(!!(i=(t.getAttribute("data-link")||"").replace(/^\//,""))),sessionStorage.setItem("lastFloorName",s),sessionStorage.setItem("lastFloorLink",i),e.style.display="flex"}})}),s&&s.addEventListener("click",()=>{i&&(window.location.href=i)}),o&&o.addEventListener("click",()=>{e.style.display="none",l&&(l.classList.remove("selected"),l=null),i="",n.textContent="~",d(!1)}),document.addEventListener("click",t=>{let s=t.target.closest("path"),o=t.target.closest(".info-content");s||o||(e.style.display="none",l&&(l.classList.remove("selected"),l=null),i="",n.textContent="~",d(!1))})});
//# sourceMappingURL=Tower_A.79e1e0d5.js.map
