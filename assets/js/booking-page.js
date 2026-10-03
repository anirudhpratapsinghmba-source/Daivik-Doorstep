const DAIVIK_BASE={lat:29.972586,lng:78.062215};
const FREE_RADIUS_KM=10, EXTRA_RATE_PER_KM=8;
const P=window.DAIVIK_PRICING||{};
const $=id=>document.getElementById(id);

function haversineKm(a,b,c,d){const R=6371,rad=Math.PI/180,x=(c-a)*rad,y=(d-b)*rad;const h=Math.sin(x/2)**2+Math.cos(a*rad)*Math.cos(c*rad)*Math.sin(y/2)**2;return 2*R*Math.asin(Math.sqrt(h))}
function setLocationStatus(message,error=false){const el=$("distanceNotice");if(!el)return;el.textContent=message;el.classList.toggle("error",!!error)}
function updateLocation(lat,lng,address="",accuracy=null){
 if(!Number.isFinite(lat)||!Number.isFinite(lng))return;
 const distance=haversineKm(DAIVIK_BASE.lat,DAIVIK_BASE.lng,lat,lng);
 const charge=distance>FREE_RADIUS_KM?Math.round((distance-FREE_RADIUS_KM)*EXTRA_RATE_PER_KM):0;
 $("bLat").value=lat.toFixed(7);$("bLng").value=lng.toFixed(7);$("bDistance").value=distance.toFixed(3);$("bLocationCharge").value=charge;
 if(address)$("baddress").value=address;
 const accuracyText=Number.isFinite(accuracy)?" • GPS ±"+Math.round(accuracy)+"m":"";
 setLocationStatus(distance<=FREE_RADIUS_KM?"✓ Exact location selected • "+distance.toFixed(1)+" km from base — FREE service charge"+accuracyText:"⚠ Exact location selected • "+distance.toFixed(1)+" km from base — ₹"+charge.toLocaleString("en-IN")+" service charge"+accuracyText);
 $("customerMapLink").href="https://www.google.com/maps?q="+lat+","+lng;$("customerMapLink").style.display="inline";
 const q=$("quickLocationStatus");if(q)q.textContent=distance<=FREE_RADIUS_KM?"✓ Location selected — Free service charge":"⚠ Location selected — ₹"+charge.toLocaleString("en-IN")+" service charge";
}
async function reverseGeocode(lat,lng){
 try{const r=await fetch("https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat="+encodeURIComponent(lat)+"&lon="+encodeURIComponent(lng),{headers:{Accept:"application/json"}});if(!r.ok)throw new Error("reverse geocode failed");const d=await r.json();return d.display_name||""}catch(e){return""}
}
function openLocationModal(){const m=$("locationModal");if(m){m.classList.add("open");m.setAttribute("aria-hidden","false")}setTimeout(()=>{if(window.bookingMap)window.bookingMap.invalidateSize()},120)}
function closeLocationModal(){const m=$("locationModal");if(m){m.classList.remove("open");m.setAttribute("aria-hidden","true")}}
function setModalStatus(message,error=false){const el=$("modalLocationStatus");if(el){el.textContent=message;el.classList.toggle("error",!!error)}}
function openMapPicker(){openLocationModal();const mapWrap=$("locationMapModal");if(mapWrap)mapWrap.classList.add("open");ensureBookingMap();setTimeout(()=>window.bookingMap.invalidateSize(),180);setModalStatus("Tap anywhere on the map to place your exact service pin. You can drag the pin afterwards.")}
function ensureBookingMap(){
 if(window.bookingMap)return;
 const mapEl=$("bookingMap");if(!mapEl)return;
 window.bookingMap=L.map(mapEl,{zoomControl:true,scrollWheelZoom:true}).setView([DAIVIK_BASE.lat,DAIVIK_BASE.lng],13);
 L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"© OpenStreetMap contributors"}).addTo(window.bookingMap);
 window.baseMarker=L.marker([DAIVIK_BASE.lat,DAIVIK_BASE.lng]).addTo(window.bookingMap).bindPopup("Daivik Service Base");
 window.customerMarker=null;window.customerAccuracyCircle=null;
 window.bookingMap.on("click",async e=>{
   setCustomerPin(e.latlng.lat,e.latlng.lng,null,true);
 });
}
function setCustomerPin(lat,lng,accuracy=null,fromMap=false){
 if(window.customerMarker)window.bookingMap.removeLayer(window.customerMarker);
 if(window.customerAccuracyCircle)window.bookingMap.removeLayer(window.customerAccuracyCircle);
 window.customerMarker=L.marker([lat,lng],{draggable:true}).addTo(window.bookingMap).bindPopup("Your service location").openPopup();
 if(Number.isFinite(accuracy)&&accuracy>0)window.customerAccuracyCircle=L.circle([lat,lng],{radius:accuracy,weight:1,fillOpacity:.08}).addTo(window.bookingMap);
 window.customerMarker.on("dragend",async e=>{const p=e.target.getLatLng();setCustomerPin(p.lat,p.lng,null,true)});
 setLocationStatus("📍 Pin placed. Getting address…");setModalStatus("📍 Pin placed. Getting exact address…");
 reverseGeocode(lat,lng).then(address=>{updateLocation(lat,lng,address,accuracy);setModalStatus("✓ Exact location selected. Fare calculated from your GPS/map pin.");});
 if(fromMap)window.bookingMap.setView([lat,lng],Math.max(window.bookingMap.getZoom(),16),{animate:true});
 setTimeout(()=>window.bookingMap.invalidateSize(),150);
}
function toggleLocationMap(){
 const w=$("locationMapWrap");w.classList.toggle("open");
 if(w.classList.contains("open")){ensureBookingMap();setTimeout(()=>window.bookingMap.invalidateSize(),150)}
}
function openMapsForLocation(){
  openLocationModal();
  const mapWrap=$("locationMapModal");
  if(mapWrap)mapWrap.classList.add("open");
  setModalStatus("📍 Google Maps खोल रहा हूँ. वहाँ अपनी current location confirm करें, फिर Back दबाकर Daivik पर लौटें. लौटते ही fare calculate होगा.");
  sessionStorage.setItem("daivikLocationPending","1");
  sessionStorage.setItem("daivikLocationStartedAt",String(Date.now()));
  const mapsIntent="google.navigation:q=My+Location";
  const mapsWeb="https://www.google.com/maps/search/?api=1&query=My%20Location";
  try{
    const a=document.createElement("a");a.href=mapsIntent;a.style.display="none";document.body.appendChild(a);a.click();a.remove();
  }catch(err){console.warn("Maps app launch failed",err)}
  setTimeout(()=>{if(document.visibilityState==="visible")window.location.href=mapsWeb},1200);
}
function useMyLocation(){openMapsForLocation()}
function resumeLocationAfterMaps(){
  if(sessionStorage.getItem("daivikLocationPending")!=="1")return;
  if(!navigator.geolocation){
    setModalStatus("GPS उपलब्ध नहीं है. Website map पर exact pin select करें.",true);return;
  }
  setModalStatus("✓ वापस आ गए. Phone GPS से exact location और fare calculate हो रहा है…");
  navigator.geolocation.getCurrentPosition(p=>{
    const{latitude:lat,longitude:lng,accuracy}=p.coords;
    ensureBookingMap();
    if(window.bookingMap)window.bookingMap.setView([lat,lng],18,{animate:true});
    setCustomerPin(lat,lng,accuracy,false);
    sessionStorage.removeItem("daivikLocationPending");
    sessionStorage.removeItem("daivikLocationStartedAt");
    setModalStatus("✓ Exact location received. Distance और doorstep fare calculate हो गया.");
  },err=>{
    const msg=err.code===1?"Location permission denied. Browser में Location Allow करें और फिर button दबाएँ.":"Phone GPS नहीं मिला. Location/GPS ON करके फिर button दबाएँ.";
    setModalStatus(msg,true);setLocationStatus(msg,true);
  },{enableHighAccuracy:true,timeout:15000,maximumAge:0});
}
function openBookingLocation(){openLocationModal();const w=$("locationMapWrap");w.classList.add("open");ensureBookingMap();setTimeout(()=>window.bookingMap.invalidateSize(),150)}
function createBooking(){
 const name=$("bname").value.trim(),phone=$("bphone").value.trim(),vehicle=$("bvehicle").value,model=$("bmodel").value.trim(),wash=$("bwash").value,date=$("bdate").value,time=$("btime").value,address=$("baddress").value.trim(),addon=Number($("baddon").value||0),lat=Number($("bLat").value),lng=Number($("bLng").value),distanceKm=Number($("bDistance").value||0),locationCharge=Number($("bLocationCharge").value||0);
 if(!name||!phone||!vehicle||!wash||!date||!time||!address)return alert("Please complete all required details and select your service location.");
 if(!/^[0-9]{10}$/.test(phone))return alert("Please enter a valid 10-digit mobile number.");
 if(!Number.isFinite(lat)||!Number.isFinite(lng))return alert("Please select the exact service location using “Use My Location” or drop a pin on the map. An address alone cannot be used to calculate the doorstep charge.");
 const total=P[vehicle][wash]+addon+locationCharge,id="DVK-"+Date.now().toString().slice(-6),data={id,name,phone,vehicle,model,wash,date,time,address,lat,lng,distanceKm,locationCharge,addon,total,status:"Pending Confirmation",createdAt:new Date().toISOString()};
 localStorage.setItem("daivikBooking",JSON.stringify(data));showBooking(data)
}
function showBooking(d){$("bookingId").textContent=d.id;$("sumService").textContent=P[d.vehicle].n+" — "+d.wash.charAt(0).toUpperCase()+d.wash.slice(1)+" Wash";$("sumCar").textContent=d.model||"Car model not specified";$("sumPrice").textContent="₹"+d.total.toLocaleString("en-IN");$("sumName").textContent=d.name;$("sumSlot").textContent=d.date+" • "+d.time;$("sumAddress").textContent=d.address+" • "+Number(d.distanceKm||0).toFixed(1)+" km from base";$("bookingSummary").classList.add("show");$("bookingSummary").scrollIntoView({behavior:"smooth",block:"center"})}
function sendSavedBooking(){const d=JSON.parse(localStorage.getItem("daivikBooking")||"null");if(!d)return alert("No booking found.");const msg="🚗 DAIVIK DOORSTEP CAR CARE — BOOKING REQUEST\\n\\n🆔 "+d.id+"\\n👤 "+d.name+"\\n📱 "+d.phone+"\\n🚘 "+(d.model||"Not specified")+"\\n🧽 "+d.wash+" Wash\\n💰 Total: ₹"+d.total.toLocaleString("en-IN")+"\\n📅 "+d.date+" • "+d.time+"\\n📍 "+d.address+"\\n📏 "+Number(d.distanceKm||0).toFixed(1)+" km | Location charge: ₹"+Number(d.locationCharge||0)+"\\n🗺️ https://www.google.com/maps?q="+d.lat+","+d.lng;window.open("https://wa.me/"+WHATSAPP_NUMBER+"?text="+encodeURIComponent(msg),"_blank")}
document.addEventListener("DOMContentLoaded",()=>{const q=new URLSearchParams(location.search);const w=q.get("wash"),p=q.get("plan");if(w&&P[Object.keys(P)[0]])$("bwash").value=w;if(p)$("bookingType").textContent=p.charAt(0).toUpperCase()+p.slice(1)+" Monthly Plan";setTimeout(resumeLocationAfterMaps,250)});\nwindow.addEventListener("pageshow",()=>setTimeout(resumeLocationAfterMaps,300));\ndocument.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")setTimeout(resumeLocationAfterMaps,350)});
