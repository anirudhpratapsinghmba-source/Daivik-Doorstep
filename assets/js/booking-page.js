const DAIVIK_BASE={lat:29.972586,lng:78.062215};
const FREE_RADIUS_KM=10, EXTRA_RATE_PER_KM=8;
const P=window.DAIVIK_PRICING||{};
const $=id=>document.getElementById(id);
function haversineKm(a,b,c,d){const R=6371,rad=Math.PI/180,x=(c-a)*rad,y=(d-b)*rad;const h=Math.sin(x/2)**2+Math.cos(a*rad)*Math.cos(c*rad)*Math.sin(y/2)**2;return 2*R*Math.asin(Math.sqrt(h))}
function updateLocation(lat,lng,address=""){
 const distance=haversineKm(DAIVIK_BASE.lat,DAIVIK_BASE.lng,lat,lng);
 const charge=distance>FREE_RADIUS_KM?Math.round((distance-FREE_RADIUS_KM)*EXTRA_RATE_PER_KM):0;
 $("bLat").value=lat;$("bLng").value=lng;$("bDistance").value=distance.toFixed(3);$("bLocationCharge").value=charge;
 if(address)$("baddress").value=address;
 $("distanceNotice").textContent=distance<=FREE_RADIUS_KM?"✓ "+distance.toFixed(1)+" km from base — FREE service charge":"⚠ "+distance.toFixed(1)+" km from base — ₹"+charge.toLocaleString("en-IN")+" service charge";
 $("customerMapLink").href="https://www.google.com/maps?q="+lat+","+lng;
 $("customerMapLink").style.display="inline";
 const q=$("quickLocationStatus");if(q)q.textContent=distance<=FREE_RADIUS_KM?"✓ Location selected — Free service charge":"⚠ Location selected — ₹"+charge.toLocaleString("en-IN")+" service charge";
}
async function reverseGeocode(lat,lng){try{const r=await fetch("https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat="+lat+"&lon="+lng);const d=await r.json();return d.display_name||""}catch(e){return""}}
function ensureBookingMap(){
 if(window.bookingMap)return;
 window.bookingMap=L.map("bookingMap").setView([DAIVIK_BASE.lat,DAIVIK_BASE.lng],13);
 L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"© OpenStreetMap contributors"}).addTo(window.bookingMap);
 L.marker([DAIVIK_BASE.lat,DAIVIK_BASE.lng]).addTo(window.bookingMap).bindPopup("Daivik Service Base").openPopup();
 window.customerMarker=null;
 window.bookingMap.on("click",async e=>{if(window.customerMarker)window.bookingMap.removeLayer(window.customerMarker);window.customerMarker=L.marker(e.latlng).addTo(window.bookingMap);const address=await reverseGeocode(e.latlng.lat,e.latlng.lng);updateLocation(e.latlng.lat,e.latlng.lng,address)});
}
function toggleLocationMap(){const w=$("locationMapWrap");w.classList.toggle("open");if(w.classList.contains("open")){ensureBookingMap();setTimeout(()=>bookingMap.invalidateSize(),100)}}
function useMyLocation(){if(!navigator.geolocation)return alert("Location is not supported by this browser.");navigator.geolocation.getCurrentPosition(async p=>{const{latitude:lat,longitude:lng}=p.coords;ensureBookingMap();bookingMap.setView([lat,lng],15);if(window.customerMarker)bookingMap.removeLayer(window.customerMarker);window.customerMarker=L.marker([lat,lng]).addTo(bookingMap);const address=await reverseGeocode(lat,lng);updateLocation(lat,lng,address)},()=>alert("Location permission was not allowed. Please select your location on the map."),{enableHighAccuracy:true,timeout:10000})}
function openBookingLocation(){document.getElementById("locationMapWrap").classList.add("open");ensureBookingMap();setTimeout(()=>bookingMap.invalidateSize(),100)}
function createBooking(){
 const name=$("bname").value.trim(),phone=$("bphone").value.trim(),vehicle=$("bvehicle").value,model=$("bmodel").value.trim(),wash=$("bwash").value,date=$("bdate").value,time=$("btime").value,address=$("baddress").value.trim(),addon=Number($("baddon").value||0),lat=Number($("bLat").value),lng=Number($("bLng").value),distanceKm=Number($("bDistance").value||0),locationCharge=Number($("bLocationCharge").value||0);
 if(!name||!phone||!vehicle||!wash||!date||!time||!address)return alert("Please complete all required details and select your service location.");
 if(!/^[0-9]{10}$/.test(phone))return alert("Please enter a valid 10-digit mobile number.");
 if(!Number.isFinite(lat)||!Number.isFinite(lng))return alert("Please select your service location using the map or Use My Location.");
 const total=P[vehicle][wash]+addon+locationCharge,id="DVK-"+Date.now().toString().slice(-6),data={id,name,phone,vehicle,model,wash,date,time,address,lat,lng,distanceKm,locationCharge,addon,total,status:"Pending Confirmation",createdAt:new Date().toISOString()};
 localStorage.setItem("daivikBooking",JSON.stringify(data));showBooking(data)
}
function showBooking(d){$("bookingId").textContent=d.id;$("sumService").textContent=P[d.vehicle].n+" — "+d.wash.charAt(0).toUpperCase()+d.wash.slice(1)+" Wash";$("sumCar").textContent=d.model||"Car model not specified";$("sumPrice").textContent="₹"+d.total.toLocaleString("en-IN");$("sumName").textContent=d.name;$("sumSlot").textContent=d.date+" • "+d.time;$("sumAddress").textContent=d.address+" • "+Number(d.distanceKm||0).toFixed(1)+" km from base";$("bookingSummary").classList.add("show");$("bookingSummary").scrollIntoView({behavior:"smooth",block:"center"})}
function sendSavedBooking(){const d=JSON.parse(localStorage.getItem("daivikBooking")||"null");if(!d)return alert("No booking found.");const msg="🚗 DAIVIK DOORSTEP CAR CARE — BOOKING REQUEST\n\n🆔 "+d.id+"\n👤 "+d.name+"\n📱 "+d.phone+"\n🚘 "+(d.model||"Not specified")+"\n🧽 "+d.wash+" Wash\n💰 Total: ₹"+d.total.toLocaleString("en-IN")+"\n📅 "+d.date+" • "+d.time+"\n📍 "+d.address+"\n📏 "+Number(d.distanceKm||0).toFixed(1)+" km | Location charge: ₹"+Number(d.locationCharge||0)+"\n🗺️ https://www.google.com/maps?q="+d.lat+","+d.lng;window.open("https://wa.me/"+WHATSAPP_NUMBER+"?text="+encodeURIComponent(msg),"_blank")}
document.addEventListener("DOMContentLoaded",()=>{const q=new URLSearchParams(location.search);const w=q.get("wash"),p=q.get("plan");if(w&&P[Object.keys(P)[0]])$("bwash").value=w;if(p)$("bookingType").textContent=p.charAt(0).toUpperCase()+p.slice(1)+" Monthly Plan";});
