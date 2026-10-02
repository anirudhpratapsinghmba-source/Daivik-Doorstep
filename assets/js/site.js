const WHATSAPP_NUMBER="917983558954";
function siteNav(){const m=document.getElementById("nav");if(!m)return;const open=m.classList.toggle("mobileOpen");m.style.display=open?"flex":""}
function openWhatsApp(){window.open("https://wa.me/"+WHATSAPP_NUMBER+"?text="+encodeURIComponent("Hello Daivik Doorstep Car Care 👋\nI want to book a car wash. Please share available slots."),"_blank")}
document.addEventListener("DOMContentLoaded",()=>{const d=new Date();const x=document.getElementById("bdate");if(x){d.setMinutes(d.getMinutes()-d.getTimezoneOffset());x.min=d.toISOString().split("T")[0]}})


/* Final combined scroll motion */
(function(){
  function init(){
    const body=document.body;if(!body)return;
    body.classList.add('motion-ready');
    const selectors='.motion-section,.visualSplit,.heading,.infoCard,.step,.area3d,.visualCopy,.visualPanel,.heroStats span';
    const els=[...document.querySelectorAll(selectors)];
    els.forEach((el,i)=>{el.classList.add('reveal');el.classList.add('stagger-'+((i%6)+1));});
    const io=new IntersectionObserver(entries=>entries.forEach(e=>{
      if(e.isIntersecting){e.target.classList.add('reveal-visible');io.unobserve(e.target);}
    }),{threshold:.10,rootMargin:'0px 0px -40px 0px'});
    els.forEach(e=>io.observe(e));
    const progress=document.createElement('div');progress.className='scroll-progress';document.body.prepend(progress);
    let ticking=false;
    function update(){
      const max=document.documentElement.scrollHeight-innerHeight;
      progress.style.width=(max>0?scrollY/max*100:0)+'%';
      document.querySelectorAll('[data-parallax]').forEach(el=>{
        const r=el.getBoundingClientRect(),speed=parseFloat(el.dataset.parallax)||.03;
        const y=(innerHeight/2-(r.top+r.height/2))*speed;
        el.style.transform='translate3d(0,'+y+'px,0)';
      });
      ticking=false;
    }
    addEventListener('scroll',()=>{if(!ticking){ticking=true;requestAnimationFrame(update)}},{passive:true});update();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();


/* React Bits-inspired interaction layer */
(function(){
  function initPremium(){
    document.querySelectorAll('.infoCard,.visualPanel,.priceFloat').forEach(card=>{
      card.addEventListener('pointermove',e=>{const r=card.getBoundingClientRect();card.style.setProperty('--mx',(e.clientX-r.left)+'px');card.style.setProperty('--my',(e.clientY-r.top)+'px')},{passive:true});
    });
    document.querySelectorAll('.heroStats b').forEach(el=>{
      const raw=el.textContent.trim(); const n=parseFloat(raw); if(!Number.isFinite(n))return;
      const suffix=raw.replace(String(n),''); el.textContent='0'+suffix;
      const start=performance.now(),duration=900;
      function tick(now){const p=Math.min(1,(now-start)/duration),ease=1-Math.pow(1-p,3);el.textContent=Math.round(n*ease)+suffix;if(p<1)requestAnimationFrame(tick)}
      const parent=el.closest('.heroStats span');
      if(parent){const io=new IntersectionObserver(es=>{if(es.some(x=>x.isIntersecting)){requestAnimationFrame(tick);io.disconnect()}},{threshold:.5});io.observe(parent)}
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initPremium);else initPremium();
})();


/* Premium motion controller */
(function(){
  function premiumMotion(){
    const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.querySelectorAll('.infoCard,.serviceCard,.priceCard,.planCard,.addonCard,.step,.reviewCard,.area3d,.visualPanel').forEach(el=>el.setAttribute('data-spotlight',''));
    if(!reduce){
      const cursor=document.createElement('div');cursor.className='motion-cursor';document.body.appendChild(cursor);document.body.classList.add('cursor-ready');
      let cx=innerWidth/2,cy=innerHeight/2,tx=cx,ty=cy,active=false;
      addEventListener('pointermove',e=>{tx=e.clientX;ty=e.clientY;active=true},{passive:true});
      function cursorTick(){cx+=(tx-cx)*.12;cy+=(ty-cy)*.12;cursor.style.left=cx+'px';cursor.style.top=cy+'px';if(active)requestAnimationFrame(cursorTick)}requestAnimationFrame(cursorTick);
      document.querySelectorAll('[data-spotlight]').forEach(el=>el.addEventListener('pointermove',e=>{const r=el.getBoundingClientRect();el.style.setProperty('--sx',(e.clientX-r.left)+'px');el.style.setProperty('--sy',(e.clientY-r.top)+'px')},{passive:true}));
      document.querySelectorAll('.btn').forEach(btn=>{btn.classList.add('magnetic');btn.addEventListener('pointermove',e=>{const r=btn.getBoundingClientRect();btn.style.transform='translate('+((e.clientX-r.left-r.width/2)*.06)+'px,'+((e.clientY-r.top-r.height/2)*.06)+'px)'},{passive:true});btn.addEventListener('pointerleave',()=>btn.style.transform='')});
    }
    const h=document.querySelector('.heroCopy h1');
    if(h&&!reduce&&!h.dataset.words){h.dataset.words='1';const span=h.querySelector('span');const parts=[...h.childNodes];parts.forEach(n=>{if(n===span)return;if(n.nodeType===3){const frag=document.createDocumentFragment();n.textContent.trim().split(/(\s+)/).forEach((w,i)=>{if(!w.trim()){frag.append(w);return}const s=document.createElement('span');s.className='motion-word';s.style.animationDelay=(i*.055)+'s';s.textContent=w;frag.append(s);});n.replaceWith(frag)}});if(span){const s=document.createElement('span');s.className='motion-word';s.style.animationDelay='.25s';s.innerHTML=span.innerHTML;span.replaceWith(s)}}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',premiumMotion);else premiumMotion();
})();
