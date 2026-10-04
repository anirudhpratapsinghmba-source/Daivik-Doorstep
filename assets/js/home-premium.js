/* Daivik front-page pricing calculator */
(() => {
 const prices={
  hatchback:{n:"Hatchback",ultra_basic:299,basic:399,medium:599,premium:899,models:["Maruti Swift","Hyundai Grand i10","Tata Tiago","Maruti Baleno","Other"]},
  sedan:{n:"Sedan",ultra_basic:299,basic:399,medium:599,premium:899,models:["Honda City","Hyundai Verna","Maruti Dzire","Honda Amaze","Other"]},
  "compact-suv":{n:"Compact SUV",basic:599,medium:799,premium:1099,models:["Hyundai Venue","Kia Sonet","Tata Nexon","Maruti Brezza","Other"]},
  "mid-suv":{n:"Mid-Size SUV",basic:699,medium:899,premium:1199,models:["Hyundai Creta","Kia Seltos","Toyota Hyryder","Maruti Grand Vitara","Other"]},
  "full-suv":{n:"Full-Size SUV / 7-Seater",basic:799,medium:999,premium:1299,models:["Toyota Fortuner","MG Hector","XUV700","Safari","Other"]},
  "luxury-suv":{n:"Luxury / Premium SUV",basic:999,medium:1199,premium:1499,models:["Jeep Meridian","Toyota Land Cruiser","BMW X1","Mercedes-Benz GLA","Other"]}
 };
 const vehicle=document.getElementById("calcVehicle"),model=document.getElementById("calcModel"),wash=document.getElementById("calcWash");
 const original=document.getElementById("calcOriginal"),price=document.getElementById("calcPrice"),name=document.getElementById("calcName"),discount=document.getElementById("calcDiscount");
 const chips=[...document.querySelectorAll("[data-wash]")];
 if(!vehicle||!model||!wash)return;
 const money=n=>"₹"+Number(n).toLocaleString("en-IN");
 function fillModels(){
   const p=prices[vehicle.value]||prices.hatchback;
   model.innerHTML=p.models.map(x=>"<option>"+x+"</option>").join("");
   update();
 }
 function update(){
   const p=prices[vehicle.value]||prices.hatchback;
   const base=p[wash.value]||p.basic;
   const offer=Math.round(base*.10), final=base-offer;
   name.textContent=(model.value||"Your car")+" • "+p.n+" • "+wash.value.charAt(0).toUpperCase()+wash.value.slice(1);
   original.textContent=money(base);
   price.textContent=money(final);
   discount.textContent="10% ONLINE BOOKING OFFER • Save "+money(offer);
   chips.forEach(c=>c.classList.toggle("active",c.dataset.wash===wash.value));
 }
 chips.forEach(chip=>chip.addEventListener("click",()=>{wash.value=chip.dataset.wash;update()}));
 vehicle.addEventListener("change",fillModels);
 wash.addEventListener("change",update);
 model.addEventListener("change",update);
 fillModels();
 const book=document.getElementById("calcBook");
 if(book)book.addEventListener("click",e=>{
   e.preventDefault();
   location.href="booking.html?vehicle="+encodeURIComponent(vehicle.value)+"&wash="+encodeURIComponent(wash.value)+"&model="+encodeURIComponent(model.value)+"&offer=DAIVIK10";
 });
})();
