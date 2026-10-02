const WHATSAPP_NUMBER="917983558954";
function siteNav(){const m=document.getElementById("nav");if(!m)return;const open=m.classList.toggle("mobileOpen");m.style.display=open?"flex":""}
function openWhatsApp(){window.open("https://wa.me/"+WHATSAPP_NUMBER+"?text="+encodeURIComponent("Hello Daivik Doorstep Car Care 👋\nI want to book a car wash. Please share available slots."),"_blank")}
document.addEventListener("DOMContentLoaded",()=>{const d=new Date();const x=document.getElementById("bdate");if(x){d.setMinutes(d.getMinutes()-d.getTimezoneOffset());x.min=d.toISOString().split("T")[0]}})


/* Global scroll motion */
(function(){
  function initScrollMotion(){
    const body=document.body;
    if(!body) return;
    body.classList.add('motion-ready');
    if(!document.querySelector('.scroll-progress')){
      const bar=document.createElement('div');
      bar.className='scroll-progress';
      document.body.prepend(bar);
    }

    const candidates=[
      '.sec','.heroCopy','.heading','.infoCard','.serviceCard','.priceCard','.planCard',
      '.addonCard','.step','.faqItem','.reviewCard','.area3d','.bookingBox','.contactCard',
      '.pricingTable','.membershipTable','.heroStats span'
    ];
    const seen=new Set();
    let index=0;
    candidates.forEach(sel=>{
      document.querySelectorAll(sel).forEach(el=>{
        if(seen.has(el)) return;
        seen.add(el);
        if(!el.classList.contains('hero3d') && !el.classList.contains('heroCopy')) el.classList.add('reveal');
        const delay=(index++%6)+1;
        el.classList.add('stagger-'+delay);
      });
    });

    document.querySelectorAll('.infoCard,.serviceCard,.priceCard,.planCard,.addonCard,.step,.contactCard').forEach(el=>el.classList.add('motion-card'));

    const observer=new IntersectionObserver((entries)=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){
          entry.target.classList.add('reveal-visible');
          observer.unobserve(entry.target);
        }
      });
    },{threshold:.12,rootMargin:'0px 0px -50px 0px'});
    document.querySelectorAll('.reveal,.reveal-left,.reveal-right,.reveal-scale').forEach(el=>observer.observe(el));

    const bar=document.querySelector('.scroll-progress');
    let ticking=false;
    const update=()=>{
      const max=document.documentElement.scrollHeight-window.innerHeight;
      bar.style.width=(max>0?(window.scrollY/max)*100:0)+'%';
      document.querySelectorAll('[data-parallax]').forEach(el=>{
        const speed=parseFloat(el.dataset.parallax)||.08;
        const rect=el.getBoundingClientRect();
        const offset=(window.innerHeight/2-(rect.top+rect.height/2))*speed;
        el.style.transform='translate3d(0,'+offset+'px,0)';
      });
      ticking=false;
    };
    window.addEventListener('scroll',()=>{if(!ticking){ticking=true;requestAnimationFrame(update)}},{passive:true});
    update();

    document.querySelectorAll('h1,h2').forEach((heading)=>{
      if(heading.dataset.motionTitle) return;
      heading.dataset.motionTitle='1';
      const parts=heading.textContent.trim().split(/(\s+)/);
      heading.innerHTML=parts.map((p,i)=>/\s+/.test(p)?p:'<span class="word" style="animation-delay:'+(i*.035)+'s">'+p+'</span>').join('');
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',initScrollMotion);
  else initScrollMotion();
})();
