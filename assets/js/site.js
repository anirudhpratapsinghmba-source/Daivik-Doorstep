const WHATSAPP_NUMBER="917983558954";
function siteNav(){const m=document.getElementById("nav");if(m)m.classList.toggle("mobileOpen")}
function openWhatsApp(){window.open("https://wa.me/"+WHATSAPP_NUMBER+"?text="+encodeURIComponent("Hello Daivik Doorstep Car Care 👋\nI want to book a car wash. Please share available slots."),"_blank")}
document.addEventListener("DOMContentLoaded",()=>{const d=new Date();const x=document.getElementById("bdate");if(x){d.setMinutes(d.getMinutes()-d.getTimezoneOffset());x.min=d.toISOString().split("T")[0]}})
