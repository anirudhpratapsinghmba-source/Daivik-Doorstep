const WHATSAPP_NUMBER="917983558954";
const P={
 hatchback:{n:"Hatchback",basic:399,medium:599,premium:899},
 sedan:{n:"Sedan",basic:499,medium:699,premium:999},
 "compact-suv":{n:"Compact SUV",basic:599,medium:799,premium:1099},
 "mid-suv":{n:"Mid-Size SUV",basic:699,medium:899,premium:1199},
 "full-suv":{n:"Full-Size SUV / 7-Seater",basic:799,medium:999,premium:1299},
 "luxury-suv":{n:"Luxury / Premium SUV",basic:999,medium:1199,premium:1499}
};
const $=id=>document.getElementById(id);
function calc(){
 const v=$("vehicle").value,w=$("wash").value;
 if(!v||!w){alert("Please select your car category and wash type.");return}
 const price=P[v][w];
 $("rn").textContent=P[v].n+" — "+w.charAt(0).toUpperCase()+w.slice(1)+" Wash";
 $("ri").textContent=$("model").value||"Doorstep service";
 $("rp").textContent="₹"+price.toLocaleString("en-IN");
 $("result").classList.add("show");
}
function openBooking(service="",vehicleKey=""){
 const panel=$("bookingPanel");
 if(vehicleKey && P[vehicleKey]) $("bvehicle").value=vehicleKey;
 if(service && service.toLowerCase().includes("basic")) $("bwash").value="basic";
 if(service && service.toLowerCase().includes("medium")) $("bwash").value="medium";
 if(service && service.toLowerCase().includes("premium")) $("bwash").value="premium";
 panel.scrollIntoView({behavior:"smooth",block:"center"});
 setTimeout(()=>$("bname").focus(),450);
}
function bookCalc(){openBooking("",$("vehicle").value);}
function openWhatsApp(){
 window.open("https://wa.me/"+WHATSAPP_NUMBER+"?text="+encodeURIComponent("Hello Daivik Doorstep Car Care 👋\n\nI want to book a car wash. Please share available slots."),"_blank");
}
function createBooking(){
 const name=$("bname").value.trim(), phone=$("bphone").value.trim(), vehicle=$("bvehicle").value, model=$("bmodel").value.trim(), wash=$("bwash").value, date=$("bdate").value, time=$("btime").value, address=$("baddress").value.trim(), addon=Number($("baddon").value||0);
 if(!name||!phone||!vehicle||!wash||!date||!time||!address){alert("Please complete all required details.");return}
 if(!/^[0-9]{10}$/.test(phone)){alert("Please enter a valid 10-digit mobile number.");return}
 const total=P[vehicle][wash]+addon;
 const id="DVK-"+Date.now().toString().slice(-6);
 const data={id,name,phone,vehicle,model,wash,date,time,address,addon,total,status:"Pending Confirmation",createdAt:new Date().toISOString()};
 localStorage.setItem("daivikBooking",JSON.stringify(data));
 $("bookingId").textContent=id;
 $("sumService").textContent=P[vehicle].n+" — "+wash.charAt(0).toUpperCase()+wash.slice(1)+" Wash";
 $("sumCar").textContent=(model||"Car model not specified")+(addon?" • Add-on included":"");
 $("sumPrice").textContent="₹"+total.toLocaleString("en-IN");
 $("sumName").textContent=name;
 $("sumSlot").textContent=date+" • "+time;
 $("sumAddress").textContent=address;
 $("bookingSummary").classList.add("show");
 $("bookingSummary").scrollIntoView({behavior:"smooth",block:"center"});
}
function sendSavedBooking(){
 const raw=localStorage.getItem("daivikBooking");
 if(!raw){alert("No booking found.");return}
 const d=JSON.parse(raw);
 const msg="🚗 DAIVIK DOORSTEP CAR CARE — BOOKING REQUEST\n\n🆔 Booking ID: "+d.id+"\n👤 Name: "+d.name+"\n📱 Phone: "+d.phone+"\n🚘 Car: "+(d.model||"Not specified")+"\n📋 Category: "+P[d.vehicle].n+"\n🧽 Wash: "+d.wash.charAt(0).toUpperCase()+d.wash.slice(1)+" Wash\n➕ Add-on: "+(d.addon?"₹"+d.addon:"None")+"\n💰 Total: ₹"+d.total.toLocaleString("en-IN")+"\n📅 Date: "+d.date+"\n⏰ Time: "+d.time+"\n📍 Address: "+d.address+"\n\nPlease confirm my booking.";
 window.open("https://wa.me/"+WHATSAPP_NUMBER+"?text="+encodeURIComponent(msg),"_blank");
}
function editBooking(){$("bookingSummary").classList.remove("show");$("bookingPanel").scrollIntoView({behavior:"smooth",block:"center"});}
document.addEventListener("DOMContentLoaded",()=>{
 const d=new Date(); d.setMinutes(d.getMinutes()-d.getTimezoneOffset()); $("bdate").min=d.toISOString().split("T")[0];
});