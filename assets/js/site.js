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
