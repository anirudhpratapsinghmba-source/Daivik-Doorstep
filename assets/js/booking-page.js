const DAIVIK_BASE={lat:29.972586,lng:78.062215};
const FREE_RADIUS_KM=10;
const EXTRA_RATE_PER_KM=8;
const ONLINE_OFFER="DAIVIK10";
const P=window.DAIVIK_PRICING||{};
const $=id=>document.getElementById(id);

function haversineKm(a,b,c,d){
  const R=6371,rad=Math.PI/180;
  const x=(c-a)*rad,y=(d-b)*rad;
  const h=Math.sin(x/2)**2+Math.cos(a*rad)*Math.cos(c*rad)*Math.sin(y/2)**2;
  return 2*R*Math.asin(Math.sqrt(h));
}
function money(n){return "₹"+Number(n||0).toLocaleString("en-IN");}
function getOfferCode(){
  const q=new URLSearchParams(location.search);
  return (q.get("offer")||ONLINE_OFFER).toUpperCase();
}
function offerDiscount(base){
  return getOfferCode()==="DAIVIK10" ? Math.round(Number(base||0)*0.10) : 0;
}
function locationCharge(distance){
  return distance>FREE_RADIUS_KM ? Math.round((distance-FREE_RADIUS_KM)*EXTRA_RATE_PER_KM) : 0;
}
function setLocationStatus(message,error=false){
  const el=$("distanceNotice");
  if(!el)return;
  el.textContent=message;
  el.classList.toggle("error",!!error);
}
function refreshBookingEstimate(){
  const vehicle=$("bvehicle")?.value;
  const wash=$("bwash")?.value;
  const addon=Number($("baddon")?.value||0);
  const distance=Number($("bDistance")?.value||0);
  const charge=Number.isFinite(distance)&&distance>0?locationCharge(distance):0;
  const base=vehicle&&P[vehicle]&&P[vehicle][wash]!=null?Number(P[vehicle][wash]):0;
  const discount=offerDiscount(base);
  const total=Math.max(0,base-discount+addon+charge);
  const eb=$("estimateBase"),ed=$("estimateDiscount"),el=$("estimateLocation"),et=$("estimateTotal");
  if(eb)eb.textContent=base?money(base):"Select vehicle + service";
  if(ed)ed.textContent=base?money(discount)+" saved":"10% OFF";
  if(el)el.textContent=distance>0?(charge?money(charge)+" extra":"FREE within 10 km"):"Select location";
  if(et)et.textContent=base?money(total):"₹0";
  const ultra=$('bwash')?.querySelector('option[value="ultra_basic"]');
  if(ultra)ultra.disabled=!!vehicle&&!["hatchback","sedan"].includes(vehicle);
  if(vehicle&&!["hatchback","sedan"].includes(vehicle)&&wash==="ultra_basic"){
    $("bwash").value="basic";
    return refreshBookingEstimate();
  }
}
function updateLocation(lat,lng,address="",accuracy=null){
  if(!Number.isFinite(lat)||!Number.isFinite(lng))return;
  const distance=haversineKm(DAIVIK_BASE.lat,DAIVIK_BASE.lng,lat,lng);
  const charge=locationCharge(distance);
  $("bLat").value=lat.toFixed(7);
  $("bLng").value=lng.toFixed(7);
  $("bDistance").value=distance.toFixed(3);
  $("bLocationCharge").value=charge;
  if(address)$("baddress").value=address;
  const accuracyText=Number.isFinite(accuracy)?" • GPS ±"+Math.round(accuracy)+"m":"";
  setLocationStatus(distance<=FREE_RADIUS_KM
    ?"✓ Exact location selected • "+distance.toFixed(1)+" km from Daivik base — FREE service charge"+accuracyText
    :"⚠ Exact location selected • "+distance.toFixed(1)+" km from Daivik base — "+money(charge)+" service charge"+accuracyText);
  const link=$("customerMapLink");
  if(link){link.href="https://www.google.com/maps?q="+lat+","+lng;link.style.display="inline";}
  const q=$("quickLocationStatus");
  if(q)q.textContent=distance<=FREE_RADIUS_KM?"✓ Location selected — Free service charge":"⚠ Location selected — "+money(charge)+" service charge";
  refreshBookingEstimate();
}
async function reverseGeocode(lat,lng){
  try{
    const r=await fetch("https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat="+encodeURIComponent(lat)+"&lon="+encodeURIComponent(lng),{headers:{Accept:"application/json"}});
    if(!r.ok)throw new Error("reverse geocode failed");
    const d=await r.json();
    return d.display_name||"";
  }catch(e){return "";}
}
function openLocationModal(){
  const m=$("locationModal");
  if(m){m.classList.add("open");m.setAttribute("aria-hidden","false");}
  setTimeout(()=>{if(window.bookingMap)window.bookingMap.invalidateSize();},120);
}
function closeLocationModal(){
  const m=$("locationModal");
  if(m){m.classList.remove("open");m.setAttribute("aria-hidden","true");}
}
function setModalStatus(message,error=false){
  const el=$("modalLocationStatus");
  if(el){el.textContent=message;el.classList.toggle("error",!!error);}
}
function openMapPicker(){
  openLocationModal();
  const mapWrap=$("locationMapModal");
  if(mapWrap)mapWrap.classList.add("open");
  ensureBookingMap();
  setTimeout(()=>window.bookingMap.invalidateSize(),180);
  setModalStatus("Tap the map to place the customer pin. Drag the pin for precision.");
}
function ensureBookingMap(){
  if(window.bookingMap)return;
  const mapEl=$("bookingMap");
  if(!mapEl)return;
  window.bookingMap=L.map(mapEl,{zoomControl:true,scrollWheelZoom:true}).setView([DAIVIK_BASE.lat,DAIVIK_BASE.lng],13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"© OpenStreetMap contributors"}).addTo(window.bookingMap);
  window.baseMarker=L.marker([DAIVIK_BASE.lat,DAIVIK_BASE.lng]).addTo(window.bookingMap).bindPopup("Daivik Service Base").openPopup();
  window.customerMarker=null;
  window.customerAccuracyCircle=null;
  window.locationRouteLine=null;
  window.bookingMap.on("click",e=>setCustomerPin(e.latlng.lat,e.latlng.lng,null,true));
}
function setCustomerPin(lat,lng,accuracy=null,fromMap=false){
  if(window.customerMarker)window.bookingMap.removeLayer(window.customerMarker);
  if(window.customerAccuracyCircle)window.bookingMap.removeLayer(window.customerAccuracyCircle);
  if(window.locationRouteLine)window.bookingMap.removeLayer(window.locationRouteLine);
  window.customerMarker=L.marker([lat,lng],{draggable:true}).addTo(window.bookingMap).bindPopup("Customer Service Location").openPopup();
  window.locationRouteLine=L.polyline([[DAIVIK_BASE.lat,DAIVIK_BASE.lng],[lat,lng]],{weight:4,dashArray:"8 8"}).addTo(window.bookingMap);
  const bounds=L.latLngBounds([[DAIVIK_BASE.lat,DAIVIK_BASE.lng],[lat,lng]]);
  window.bookingMap.fitBounds(bounds,{padding:[40,40],maxZoom:16});
  if(Number.isFinite(accuracy)&&accuracy>0)window.customerAccuracyCircle=L.circle([lat,lng],{radius:accuracy,weight:1,fillOpacity:.08}).addTo(window.bookingMap);
  window.customerMarker.on("dragend",e=>{const p=e.target.getLatLng();setCustomerPin(p.lat,p.lng,null,true);});
  setLocationStatus("📍 Pin placed. Getting address…");
  setModalStatus("📍 Pin placed. Getting the address and calculating the fare…");
  reverseGeocode(lat,lng).then(address=>{
    updateLocation(lat,lng,address,accuracy);
    setModalStatus("✓ Exact customer location selected. Fare calculated from the fixed Daivik base.");
  });
  if(fromMap)window.bookingMap.setView([lat,lng],Math.max(window.bookingMap.getZoom(),16),{animate:true});
  setTimeout(()=>window.bookingMap.invalidateSize(),150);
}
function useMyLocation(){
  openLocationModal();
  const mapWrap=$("locationMapModal");
  if(mapWrap)mapWrap.classList.add("open");
  ensureBookingMap();
  setTimeout(()=>window.bookingMap.invalidateSize(),180);
  if(!navigator.geolocation){
    setModalStatus("GPS is not supported. Please select the location on the website map.",true);
    return;
  }
  setModalStatus("📍 Getting your exact phone location…");
  navigator.geolocation.getCurrentPosition(
    p=>{
      const{latitude:lat,longitude:lng,accuracy}=p.coords;
      sessionStorage.setItem("daivikMapsPending","1");
      sessionStorage.setItem("daivikMapsLat",String(lat));
      sessionStorage.setItem("daivikMapsLng",String(lng));
      sessionStorage.setItem("daivikMapsAccuracy",String(accuracy||0));
      sessionStorage.setItem("daivikMapsStartedAt",String(Date.now()));
      setCustomerPin(lat,lng,accuracy,false);
      setModalStatus("📍 Location found. Opening Google Maps. Check the location/address there, then press Back to return to Daivik.");
      const mapsUrl="https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(lat+","+lng);
      const isAndroid=/Android/i.test(navigator.userAgent);
      const isIOS=/iPhone|iPad|iPod/i.test(navigator.userAgent);
      try{
        if(isAndroid)window.location.href="intent://maps.google.com/?q="+encodeURIComponent(lat+","+lng)+"#Intent;scheme=https;package=com.google.android.apps.maps;end";
        else if(isIOS)window.location.href="comgooglemaps://?q="+encodeURIComponent(lat+","+lng);
        else window.location.href=mapsUrl;
      }catch(e){window.location.href=mapsUrl;}
      setTimeout(()=>{if(document.visibilityState==="visible"&&!document.hidden)window.location.href=mapsUrl;},1400);
    },
    err=>{
      console.warn("GPS location failed",err);
      const msg=err.code===1?"Location permission was denied. Allow Location for this browser, then try again.":"Phone GPS could not be read. Turn on Location/GPS and try again.";
      setModalStatus(msg,true);
      setLocationStatus(msg,true);
    },
    {enableHighAccuracy:true,timeout:20000,maximumAge:0}
  );
}
function resumeAfterMaps(){
  if(sessionStorage.getItem("daivikMapsPending")!=="1")return;
  const started=Number(sessionStorage.getItem("daivikMapsStartedAt")||0);
  if(started&&Date.now()-started<1000)return;
  const lat=Number(sessionStorage.getItem("daivikMapsLat"));
  const lng=Number(sessionStorage.getItem("daivikMapsLng"));
  const accuracy=Number(sessionStorage.getItem("daivikMapsAccuracy")||0);
  if(!Number.isFinite(lat)||!Number.isFinite(lng)){
    setModalStatus("Location could not be restored. Please use location again.",true);
    return;
  }
  setModalStatus("✓ Back on Daivik. Recalculating your doorstep charge…");
  ensureBookingMap();
  if(window.bookingMap)window.bookingMap.setView([lat,lng],18,{animate:true});
  setCustomerPin(lat,lng,accuracy,false);
  sessionStorage.removeItem("daivikMapsPending");
  sessionStorage.removeItem("daivikMapsLat");
  sessionStorage.removeItem("daivikMapsLng");
  sessionStorage.removeItem("daivikMapsAccuracy");
  sessionStorage.removeItem("daivikMapsStartedAt");
}
function openBookingLocation(){
  openLocationModal();
  const w=$("locationMapWrap");
  if(w)w.classList.add("open");
  ensureBookingMap();
  setTimeout(()=>window.bookingMap.invalidateSize(),150);
}
function bindEstimateEvents(){
  ["bvehicle","bwash","baddon"].forEach(id=>$(id)?.addEventListener("change",refreshBookingEstimate));
  refreshBookingEstimate();
}
document.addEventListener("DOMContentLoaded",()=>{
  const q=new URLSearchParams(location.search);
  const w=q.get("wash"),p=q.get("plan"),vehicle=q.get("vehicle"),model=q.get("model");
  if(w&&["ultra_basic","basic","medium","premium"].includes(w))$("bwash").value=w;
  if(vehicle&&P[vehicle])$("bvehicle").value=vehicle;
  if(model)$("bmodel").value=model;
  if(p)$("bookingType").textContent=p.charAt(0).toUpperCase()+p.slice(1)+" Monthly Plan";
  const note=$("bookingOfferNote");
  if(note){note.textContent="🎁 DAIVIK10 online booking offer is active — 10% off the service price. Location charges, if any, are calculated separately.";note.style.display="block";}
  bindEstimateEvents();
  setTimeout(resumeAfterMaps,600);
});
window.addEventListener("pageshow",()=>setTimeout(resumeAfterMaps,600));
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")setTimeout(resumeAfterMaps,800);});
