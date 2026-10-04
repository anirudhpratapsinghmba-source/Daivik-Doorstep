/* Daivik front-page pricing calculator — full India model catalogue */
(() => {
 const prices={
  hatchback:{n:"Hatchback",ultra_basic:299,basic:399,medium:599,premium:899},
  sedan:{n:"Sedan",ultra_basic:299,basic:399,medium:599,premium:899},
  "compact-suv":{n:"Compact SUV",basic:599,medium:799,premium:1099},
  "mid-suv":{n:"Mid-Size SUV",basic:699,medium:899,premium:1199},
  "full-suv":{n:"Full-Size SUV / 7-Seater",basic:799,medium:999,premium:1299},
  "luxury-suv":{n:"Luxury / Premium SUV",basic:999,medium:1199,premium:1499}
 };
 const vehicle=document.getElementById("calcVehicle"),model=document.getElementById("calcModel"),wash=document.getElementById("calcWash");
 const original=document.getElementById("calcOriginal"),price=document.getElementById("calcPrice"),name=document.getElementById("calcName"),discount=document.getElementById("calcDiscount");
 const chips=[...document.querySelectorAll("[data-wash]")];
 const catalogue=window.DAIVIK_CAR_MODELS||{};
 if(!vehicle||!model||!wash)return;
 const money=n=>"₹"+Number(n||0).toLocaleString("en-IN");

 function fillModels(){
   const groups=catalogue[vehicle.value]||{};
   model.innerHTML="";
   Object.entries(groups).forEach(([brand,models])=>{
     const optgroup=document.createElement("optgroup");
     optgroup.label=brand;
     models.forEach(m=>{
       const option=document.createElement("option");
       option.value=brand+" — "+m;
       option.textContent=m;
       optgroup.appendChild(option);
     });
     model.appendChild(optgroup);
   });
   const custom=document.createElement("option");
   custom.value="__custom__";
   custom.textContent="✎ My model isn't listed — enter manually";
   model.appendChild(custom);
   update();
 }

 function update(){
   const p=prices[vehicle.value]||prices.hatchback;
   const ultraChip=chips.find(c=>c.dataset.wash==="ultra_basic");
   const ultraAllowed=["hatchback","sedan"].includes(vehicle.value);
   if(ultraChip)ultraChip.disabled=!ultraAllowed;
   if(wash.value==="ultra_basic"&&!ultraAllowed){
     wash.value="basic";
     chips.forEach(c=>c.classList.toggle("active",c.dataset.wash===wash.value));
   }
   const base=Number(p[wash.value]||p.basic);
   const saved=Math.round(base*.10);
   const final=base-saved;
   const selected=model.options[model.selectedIndex];
   const customValue=document.getElementById("calcCustomModel")?.value.trim();
   const modelName=model.value==="__custom__"?(customValue||"Custom model"):selected?selected.textContent:"Select your model";
   name.textContent=(modelName==="✎ My model isn't listed — enter manually"?"Custom model":modelName)+" • "+p.n;
   original.textContent="Standard "+money(base);
   price.textContent=money(final);
   discount.textContent="10% ONLINE BOOKING OFFER • SAVE "+money(saved);
   const book=document.getElementById("calcBook");
   if(book){
     const params=new URLSearchParams({vehicle:vehicle.value,model:model.value==="__custom__"?(document.getElementById("calcCustomModel")?.value.trim()||"Custom model"):model.value,wash:wash.value,offer:"DAIVIK10"});
     book.href="booking.html?"+params.toString();
   }
 }

 vehicle.addEventListener("change",fillModels);
 document.getElementById("calcCustomModel")?.addEventListener("input",update);
 model.addEventListener("change",()=>{
   const wrap=document.getElementById("calcCustomWrap");
   if(wrap)wrap.hidden=model.value!=="__custom__";
   update();
 });
 chips.forEach(chip=>chip.addEventListener("click",()=>{
   if(chip.disabled)return;
   wash.value=chip.dataset.wash;
   chips.forEach(c=>c.classList.toggle("active",c===chip));
   update();
 }));
 fillModels();
})();