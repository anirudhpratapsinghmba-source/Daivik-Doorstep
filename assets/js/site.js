const WHATSAPP_NUMBER="917983558954";

function siteNav(){
  const nav=document.getElementById("nav");
  if(!nav)return;
  nav.classList.toggle("mobileOpen");
}

function openWhatsApp(){
  window.open(
    "https://wa.me/"+WHATSAPP_NUMBER+"?text="+encodeURIComponent(
      "Hello Daivik Doorstep Car Care\nI want to book a car wash. Please share available slots."
    ),
    "_blank"
  );
}

document.addEventListener("DOMContentLoaded",()=>{
  const dateInput=document.getElementById("bdate");
  if(dateInput){
    const d=new Date();
    d.setMinutes(d.getMinutes()-d.getTimezoneOffset());
    dateInput.min=d.toISOString().split("T")[0];
  }

  const reduce=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const revealTargets=[
    ".heading",
    ".infoCard",
    ".step",
    ".area3d",
    ".visualCopy",
    ".visualPanel",
    ".heroStats span"
  ];

  document.body.classList.add("motion-ready");

  const elements=revealTargets.flatMap(selector=>[
    ...document.querySelectorAll(selector)
  ]);

  elements.forEach((el,index)=>{
    el.classList.add("reveal","stagger-"+((index%6)+1));
  });

  if(reduce){
    elements.forEach(el=>el.classList.add("reveal-visible"));
  }else{
    const observer=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){
          entry.target.classList.add("reveal-visible");
          observer.unobserve(entry.target);
        }
      });
    },{
      threshold:.08,
      rootMargin:"0px 0px -35px 0px"
    });

    elements.forEach(el=>observer.observe(el));

    // Never leave content hidden because an observer is unavailable or delayed.
    window.setTimeout(()=>{
      elements.forEach(el=>el.classList.add("reveal-visible"));
    },1800);
  }

  // One lightweight parallax system. It writes a CSS variable instead of
  // replacing the reveal transform, preventing transform conflicts.
  const parallaxItems=[...document.querySelectorAll("[data-parallax]")];
  let ticking=false;

  function updateParallax(){
    parallaxItems.forEach(el=>{
      const rect=el.getBoundingClientRect();
      const speed=parseFloat(el.dataset.parallax)||0.03;
      const y=(window.innerHeight/2-(rect.top+rect.height/2))*speed;
      el.style.setProperty("--parallax-y",y.toFixed(2)+"px");
    });
    ticking=false;
  }

  if(parallaxItems.length){
    window.addEventListener("scroll",()=>{
      if(!ticking){
        ticking=true;
        requestAnimationFrame(updateParallax);
      }
    },{passive:true});
    updateParallax();
  }

  // Scroll progress stays minimal and never creates layout space.
  const progress=document.createElement("div");
  progress.className="scroll-progress";
  document.body.prepend(progress);

  let progressTick=false;
  function updateProgress(){
    const max=document.documentElement.scrollHeight-window.innerHeight;
    progress.style.width=(max>0?(window.scrollY/max)*100:0)+"%";
    progressTick=false;
  }

  window.addEventListener("scroll",()=>{
    if(!progressTick){
      progressTick=true;
      requestAnimationFrame(updateProgress);
    }
  },{passive:true});
  updateProgress();

  if(!reduce){
    document.querySelectorAll(".infoCard,.visualPanel,.priceFloat").forEach(card=>{
      card.addEventListener("pointermove",event=>{
        const rect=card.getBoundingClientRect();
        card.style.setProperty("--mx",(event.clientX-rect.left)+"px");
        card.style.setProperty("--my",(event.clientY-rect.top)+"px");
        card.style.setProperty("--sx",(event.clientX-rect.left)+"px");
        card.style.setProperty("--sy",(event.clientY-rect.top)+"px");
      },{passive:true});
    });

    document.querySelectorAll(".btn").forEach(button=>{
      button.addEventListener("pointermove",event=>{
        const rect=button.getBoundingClientRect();
        const x=(event.clientX-rect.left-rect.width/2)*.04;
        const y=(event.clientY-rect.top-rect.height/2)*.04;
        button.style.setProperty("--mag-x",x.toFixed(2)+"px");
        button.style.setProperty("--mag-y",y.toFixed(2)+"px");
      },{passive:true});

      button.addEventListener("pointerleave",()=>{
        button.style.setProperty("--mag-x","0px");
        button.style.setProperty("--mag-y","0px");
      });
    });
  }

  // Hero count-up without wrapping/replacing heading content.
  document.querySelectorAll(".heroStats b").forEach(el=>{
    const raw=el.textContent.trim();
    const match=raw.match(/^(\d+(?:\.\d+)?)(.*)$/);
    if(!match)return;

    const target=Number(match[1]);
    const suffix=match[2];
    let started=false;

    const observer=new IntersectionObserver(entries=>{
      if(started||!entries.some(entry=>entry.isIntersecting))return;
      started=true;
      const start=performance.now();
      const duration=800;

      function tick(now){
        const p=Math.min(1,(now-start)/duration);
        const eased=1-Math.pow(1-p,3);
        el.textContent=Math.round(target*eased)+suffix;
        if(p<1)requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
      observer.disconnect();
    },{threshold:.5});

    observer.observe(el);
  });
});

/* cache marker: homepage-motion-final-20261003 */
