(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const header = document.getElementById("homeHeader");
  const compare = document.getElementById("compareWrap");
  const range = document.getElementById("compareRange");
  const before = compare?.querySelector(".compare-before");
  const handle = document.getElementById("compareHandle");

  const setCompare = value => {
    if (!before || !handle) return;
    before.style.clipPath = `inset(0 ${100 - value}% 0 0)`;
    handle.style.left = value + "%";
  };
  if (range) {
    range.addEventListener("input", e => setCompare(e.target.value), {passive:true});
    setCompare(range.value);
  }

  document.querySelectorAll("[data-count]").forEach(el => {
    const target = Number(el.dataset.count);
    if (reduce) { el.textContent = target; return; }
    const obs = new IntersectionObserver(entries => {
      if (!entries.some(e => e.isIntersecting)) return;
      const start = performance.now();
      const duration = 900;
      const tick = now => {
        const p = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased);
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      obs.disconnect();
    }, {threshold:.5});
    obs.observe(el);
  });

  if (!reduce) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, {threshold:.08, rootMargin:"0px 0px -45px 0px"});
    document.querySelectorAll(".reveal").forEach((el, i) => {
      el.style.transitionDelay = Math.min(i % 5, 4) * 70 + "ms";
      observer.observe(el);
    });
  } else {
    document.querySelectorAll(".reveal").forEach(el => el.classList.add("is-visible"));
  }

  let lastY = window.scrollY;
  let ticking = false;
  const updateHeader = () => {
    const y = window.scrollY;
    if (y > 40) header?.classList.add("is-scrolled"); else header?.classList.remove("is-scrolled");
    if (y > lastY && y > 180) header?.classList.add("is-hidden");
    if (y < lastY - 4 || y < 80) header?.classList.remove("is-hidden");
    lastY = y;
    ticking = false;
  };
  window.addEventListener("scroll", () => {
    if (!ticking) { ticking = true; requestAnimationFrame(updateHeader); }
  }, {passive:true});

  if (!reduce && window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    const heroTitle = document.querySelector(".hero-title");
    const heroImage = document.querySelector(".hero-image-shell");
    const heroCopy = document.querySelector(".hero-copy");
    const orbitA = document.querySelector(".hero-orbit-a");
    const orbitB = document.querySelector(".hero-orbit-b");

    gsap.fromTo(heroCopy, {y:45, opacity:0}, {y:0, opacity:1, duration:1.15, ease:"power4.out", delay:.15});
    gsap.fromTo(heroImage, {y:70, scale:.91, opacity:0, rotate:5}, {y:0, scale:1, opacity:1, rotate:2, duration:1.4, ease:"power4.out", delay:.2});
    gsap.fromTo(".hero-line span", {y:"100%"}, {y:"0%", duration:.9, ease:"power4.out", delay:.05});
    gsap.to(heroImage, {y:-70, scale:1.04, ease:"none", scrollTrigger:{trigger:".hero-scene",start:"top top",end:"bottom top",scrub:1}});
    gsap.to(heroTitle, {y:-45, opacity:.3, ease:"none", scrollTrigger:{trigger:".hero-scene",start:"top top",end:"bottom top",scrub:1}});
    gsap.to(orbitA, {rotation:18, scale:1.12, ease:"none", scrollTrigger:{trigger:".hero-scene",start:"top top",end:"bottom top",scrub:1.2}});
    gsap.to(orbitB, {rotation:-22, scale:.9, ease:"none", scrollTrigger:{trigger:".hero-scene",start:"top top",end:"bottom top",scrub:1.2}});

    document.querySelectorAll(".service-panel").forEach(panel => {
      gsap.fromTo(panel, {y:80, opacity:.35}, {y:0, opacity:1, duration:1, ease:"power3.out", scrollTrigger:{trigger:panel,start:"top 88%",end:"top 58%",scrub:1}});
    });
    gsap.to(".manifesto-word", {x:"-12%", ease:"none", scrollTrigger:{trigger:".manifesto-scene",start:"top bottom",end:"bottom top",scrub:1.2}});
    gsap.to(".final-image img", {scale:1.12, yPercent:-5, ease:"none", scrollTrigger:{trigger:".final-scene",start:"top bottom",end:"bottom top",scrub:1}});
  }
})();