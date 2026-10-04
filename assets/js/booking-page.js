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
  const mapWrap=$("locationMapModal");
  if(mapWrap)mapWrap.classList.add("open");
  ensureBookingMap();
  setTimeout(()=>window.bookingMap&&window.bookingMap.invalidateSize(),180);
  setModalStatus("Search your address, tap the map, or use your current location. Then confirm the pin.");
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
  setModalStatus("Tap anywhere on the map to place your service pin. Drag the pin for precision.");
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
  if(!window.bookingMap||!Number.isFinite(lat)||!Number.isFinite(lng))return;
  if(window.customerMarker)window.bookingMap.removeLayer(window.customerMarker);
  if(window.customerAccuracyCircle)window.bookingMap.removeLayer(window.customerAccuracyCircle);
  if(window.locationRouteLine)window.bookingMap.removeLayer(window.locationRouteLine);

  window.customerMarker=L.marker([lat,lng],{draggable:true}).addTo(window.bookingMap).bindPopup("Your Service Location").openPopup();
  window.locationRouteLine=L.polyline([[DAIVIK_BASE.lat,DAIVIK_BASE.lng],[lat,lng]],{weight:4,dashArray:"8 8"}).addTo(window.bookingMap);
  const bounds=L.latLngBounds([[DAIVIK_BASE.lat,DAIVIK_BASE.lng],[lat,lng]]);
  window.bookingMap.fitBounds(bounds,{padding:[40,40],maxZoom:16});
  if(Number.isFinite(accuracy)&&accuracy>0)window.customerAccuracyCircle=L.circle([lat,lng],{radius:accuracy,weight:1,fillOpacity:.08}).addTo(window.bookingMap);

  window.customerMarker.on("dragend",e=>{
    const p=e.target.getLatLng();
    setCustomerPin(p.lat,p.lng,null,true);
  });

  setLocationStatus("📍 Pin placed. Getting address and calculating distance…");
  setModalStatus("📍 Pin placed. You can drag it to the exact entrance/parking point.");

  reverseGeocode(lat,lng).then(address=>{
    updateLocation(lat,lng,address,accuracy);
    setModalStatus("✓ Pin selected: "+(address||"Exact map location")+". Review the pin, then tap Confirm Location.");
  });

  if(fromMap)window.bookingMap.setView([lat,lng],Math.max(window.bookingMap.getZoom(),16),{animate:true});
  setTimeout(()=>window.bookingMap.invalidateSize(),150);
}
function useMyLocation(){
  openLocationModal();
  if(!navigator.geolocation){
    setModalStatus("GPS is not supported. Please select your location directly on the map.",true);
    return;
  }
  setModalStatus("📍 Getting your exact phone location…");
  navigator.geolocation.getCurrentPosition(
    p=>{
      const{latitude:lat,longitude:lng,accuracy}=p.coords;
      setCustomerPin(lat,lng,accuracy,false);
      setModalStatus("✓ Your phone location is pinned. Drag the marker if needed, then tap Confirm Location.");
    },
    err=>{
      console.warn("GPS location failed",err);
      const msg=err.code===1
        ?"Location permission was denied. You can still tap the map and place the pin manually."
        :"Phone GPS could not be read. You can still select the location manually on the map.";
      setModalStatus(msg,true);
      setLocationStatus(msg,true);
    },
    {enableHighAccuracy:true,timeout:20000,maximumAge:0}
  );
}
function confirmSelectedLocation(){
  const lat=Number($("bLat").value),lng=Number($("bLng").value);
  if(!Number.isFinite(lat)||!Number.isFinite(lng)){
    setModalStatus("Please select or pin your exact service location first.",true);
    return;
  }
  const distance=Number($("bDistance").value||0);
  const charge=Number($("bLocationCharge").value||0);
  const address=$("baddress").value.trim();
  const label=address||("Pinned location • "+lat.toFixed(5)+", "+lng.toFixed(5));
  setLocationStatus(distance<=FREE_RADIUS_KM
    ?"✓ Location confirmed • "+distance.toFixed(1)+" km from Daivik base — FREE service charge"
    :"✓ Location confirmed • "+distance.toFixed(1)+" km from Daivik base — "+money(charge)+" service charge");
  setModalStatus("✓ Location confirmed. Distance and doorstep charge are locked for this booking.");
  const link=$("customerMapLink");
  if(link){link.href="https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(lat+","+lng);link.style.display="inline";}
  refreshBookingEstimate();
  setTimeout(closeLocationModal,350);
}
async function searchMapLocation(){
  const input=$("mapLocationSearch");
  const q=(input?.value||"").trim();
  if(!q)return setModalStatus("Enter an address, area, landmark or pincode to search.",true);
  setModalStatus("🔎 Searching for "+q+"…");
  try{
    const url="https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=in&q="+encodeURIComponent(q);
    const r=await fetch(url,{headers:{Accept:"application/json"}});
    if(!r.ok)throw new Error("search failed");
    const results=await r.json();
    if(!results.length){setModalStatus("No matching location found. Try a nearby landmark or full address.",true);return;}
    const first=results[0],lat=Number(first.lat),lng=Number(first.lon);
    window.bookingMap.setView([lat,lng],17,{animate:true});
    setCustomerPin(lat,lng,null,true);
    setModalStatus("✓ Search result pinned. Drag the pin if the exact spot needs adjustment.");
  }catch(e){
    console.warn("Map search failed",e);
    setModalStatus("Map search is temporarily unavailable. You can tap the map to place the pin manually.",true);
  }
}
function openBookingLocation(){
  openLocationModal();
  const w=$("locationMapWrap");
  if(w)w.classList.add("open");
  ensureBookingMap();
  setTimeout(()=>window.bookingMap.invalidateSize(),150);
}
function openBookingLocation(){
  openLocationModal();
  const w=$("locationMapWrap");
  if(w)w.classList.add("open");
  ensureBookingMap();
  setTimeout(()=>window.bookingMap.invalidateSize(),150);
}
function populateBookingModels(selectedValue=""){
  const select=$("bmodel"), customWrap=$("bmodelCustomWrap");
  if(!select)return;
  const groups=window.DAIVIK_CAR_MODELS?.[$("bvehicle")?.value]||{};
  select.innerHTML='<option value="">Select car model</option>';
  Object.entries(groups).forEach(([brand,models])=>{
    const og=document.createElement("optgroup");og.label=brand;
    models.forEach(model=>{
      const opt=document.createElement("option");
      opt.value=brand+" — "+model;opt.textContent=model;
      og.appendChild(opt);
    });
    select.appendChild(og);
  });
  const custom=document.createElement("option");
  custom.value="__custom__";custom.textContent="✎ Custom / Other — enter manually";
  select.appendChild(custom);
  if(selectedValue){
    const options=[...select.options];
    const exact=options.find(o=>o.value===selectedValue||o.textContent===selectedValue);
    if(exact)select.value=exact.value;
    else if(selectedValue!==""){
      select.value="__custom__";
      $("bmodelCustom").value=selectedValue;
    }
  }
  if(customWrap)customWrap.hidden=select.value!=="__custom__";
}
function bindEstimateEvents(){
  ["bwash","baddon"].forEach(id=>$(id)?.addEventListener("change",refreshBookingEstimate));
  $("bvehicle")?.addEventListener("change",()=>{populateBookingModels();refreshBookingEstimate();});
  $("bmodel")?.addEventListener("change",()=>{const w=$("bmodelCustomWrap");if(w)w.hidden=$("bmodel").value!=="__custom__";});
  refreshBookingEstimate();
}
document.addEventListener("DOMContentLoaded",()=>{
  const q=new URLSearchParams(location.search);
  const w=q.get("wash"),p=q.get("plan"),vehicle=q.get("vehicle"),model=q.get("model");
  if(w&&["ultra_basic","basic","medium","premium"].includes(w))$("bwash").value=w;
  if(vehicle&&P[vehicle])$("bvehicle").value=vehicle;
  populateBookingModels(model||"");
  if(p)$("bookingType").textContent=p.charAt(0).toUpperCase()+p.slice(1)+" Monthly Plan";
  const note=$("bookingOfferNote");
  if(note){note.textContent="🎁 DAIVIK10 online booking offer is active — 10% off the service price. Location charges, if any, are calculated separately.";note.style.display="block";}
  bindEstimateEvents();
  setTimeout(resumeAfterMaps,600);
});
window.addEventListener("pageshow",()=>setTimeout(resumeAfterMaps,600));
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")setTimeout(resumeAfterMaps,800);});
