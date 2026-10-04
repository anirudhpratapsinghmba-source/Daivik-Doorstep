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
function ensureLocationControls(){
  const card=document.querySelector(".locationCard");
  if(!card||document.getElementById("mapLocationSearch"))return;
  const actions=card.querySelector(".locationActions");
  if(!actions)return;
  const row=document.createElement("div");
  row.style.cssText="display:flex;gap:8px;margin-top:10px";
  row.innerHTML='<input id="mapLocationSearch" type="search" placeholder="Search area, landmark, address or pincode" style="flex:1;padding:12px;border:1px solid #d7e0e3;border-radius:10px"><button type="button" class="btn outlineDark" id="mapSearchBtn">Search</button>';
  actions.insertAdjacentElement("afterend",row);
  row.querySelector("#mapSearchBtn").addEventListener("click",searchMapLocation);
  const footer=card.querySelector(".locationCard > div:last-child");
  if(footer){
    const confirm=document.createElement("button");
    confirm.type="button";confirm.className="btn green";confirm.textContent="✓ Confirm Location";
    confirm.style.marginLeft="8px";confirm.addEventListener("click",confirmSelectedLocation);
    footer.insertBefore(confirm,footer.firstChild);
  }
}
function setModalStatus(message,error=false){
  const el=$("modalLocationStatus");
  if(el){el.textContent=message;el.classList.toggle("error",!!error);}
}
function openLocationModal(){
  const m=$("locationModal");
  if(m){m.classList.add("open");m.setAttribute("aria-hidden","false");}
  const wrap=$("locationMapModal");
  if(wrap)wrap.classList.add("open");
  ensureBookingMap();
  setTimeout(()=>window.bookingMap&&window.bookingMap.invalidateSize(),250);
  setModalStatus("Map ready. Tap the map to place your service pin.");
}
function closeLocationModal(){
  const m=$("locationModal");
  if(m){m.classList.remove("open");m.setAttribute("aria-hidden","true");}
}
function openMapPicker(){openLocationModal();}
function ensureBookingMap(){
  if(window.bookingMap){setTimeout(()=>window.bookingMap.invalidateSize(),100);return;}
  const el=$("bookingMap");
  if(!el||!window.L){setModalStatus("Map library could not load. Please refresh the page.",true);return;}
  window.bookingMap=L.map(el,{zoomControl:true,scrollWheelZoom:true,dragging:true,tap:true,attributionControl:true}).setView([DAIVIK_BASE.lat,DAIVIK_BASE.lng],14);
  const primary=L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"© OpenStreetMap contributors"});
  const fallback=L.tileLayer("https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",{maxZoom:19,attribution:"© OpenStreetMap © CARTO"});
  window.mapTileFallbackUsed=false;
  primary.on("tileerror",function(){
    if(window.mapTileFallbackUsed)return;
    window.mapTileFallbackUsed=true;
    window.bookingMap.removeLayer(primary);
    fallback.addTo(window.bookingMap);
    setModalStatus("Map switched to backup map service. Tap to place your pin.");
  });
  primary.addTo(window.bookingMap);
  window.baseMarker=L.marker([DAIVIK_BASE.lat,DAIVIK_BASE.lng]).addTo(window.bookingMap).bindPopup("Daivik Service Base");
  window.customerMarker=null;window.locationRouteLine=null;window.customerAccuracyCircle=null;
  window.bookingMap.on("click",e=>setCustomerPin(e.latlng.lat,e.latlng.lng,null));
  setTimeout(()=>window.bookingMap.invalidateSize(),300);
}
function setCustomerPin(lat,lng,accuracy=null){
  if(!window.bookingMap||!Number.isFinite(lat)||!Number.isFinite(lng))return;
  if(window.customerMarker)window.bookingMap.removeLayer(window.customerMarker);
  if(window.customerAccuracyCircle)window.bookingMap.removeLayer(window.customerAccuracyCircle);
  if(window.locationRouteLine)window.bookingMap.removeLayer(window.locationRouteLine);
  window.customerMarker=L.marker([lat,lng],{draggable:true}).addTo(window.bookingMap).bindPopup("Your service location").openPopup();
  window.locationRouteLine=L.polyline([[DAIVIK_BASE.lat,DAIVIK_BASE.lng],[lat,lng]],{weight:4,dashArray:"8 8"}).addTo(window.bookingMap);
  if(Number.isFinite(accuracy)&&accuracy>0)window.customerAccuracyCircle=L.circle([lat,lng],{radius:accuracy,weight:1,fillOpacity:.08}).addTo(window.bookingMap);
  window.customerMarker.on("dragend",e=>{const p=e.target.getLatLng();setCustomerPin(p.lat,p.lng,null);});
  updateLocation(lat,lng,"",accuracy);
  reverseGeocode(lat,lng).then(address=>{
    if(address)$("baddress").value=address;
    updateLocation(lat,lng,address,accuracy);
    setModalStatus("✓ Pin selected. Check the distance/charge below, adjust the pin if needed, then Confirm Location.");
  });
  const b=$("confirmLocationBtn");if(b)b.disabled=false;
  window.bookingMap.setView([lat,lng],16,{animate:true});
}
function useMyLocation(){
  openLocationModal();
  if(!navigator.geolocation){
    setModalStatus("GPS is not available. Tap the map to select your location.",true);return;
  }
  setModalStatus("📍 Reading your phone location…");
  navigator.geolocation.getCurrentPosition(
    p=>{
      setCustomerPin(p.coords.latitude,p.coords.longitude,p.coords.accuracy);
      setModalStatus("✓ Your current location is pinned. Drag the pin to the exact service point, then Confirm Location.");
    },
    err=>{
      console.warn("GPS failed",err);
      setModalStatus(err.code===1?"Location permission denied. You can still select the location manually on the map.":"GPS unavailable. You can still select the location manually on the map.",true);
    },
    {enableHighAccuracy:true,timeout:15000,maximumAge:0}
  );
}
function confirmSelectedLocation(){
  const lat=Number($("bLat").value),lng=Number($("bLng").value);
  if(!Number.isFinite(lat)||!Number.isFinite(lng)){setModalStatus("First place your pin on the map.",true);return;}
  const distance=Number($("bDistance").value||0),charge=Number($("bLocationCharge").value||0);
  if(!$("baddress").value.trim())$("baddress").value="Pinned map location ("+lat.toFixed(6)+", "+lng.toFixed(6)+")";
  setLocationStatus(distance<=FREE_RADIUS_KM?"✓ Location confirmed • "+distance.toFixed(1)+" km from Daivik base — FREE service charge":"✓ Location confirmed • "+distance.toFixed(1)+" km from Daivik base — "+money(charge)+" service charge");
  const link=$("customerMapLink");if(link){link.href="https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(lat+","+lng);link.style.display="inline";}
  setModalStatus("✓ Location confirmed. You can now complete the booking.");
  refreshBookingEstimate();
  setTimeout(closeLocationModal,300);
}
async function searchMapLocation(){
  const input=$("mapLocationSearch"),q=(input?.value||"").trim();
  if(!q){setModalStatus("Enter an area, landmark, address or pincode.",true);return;}
  if(!window.bookingMap)ensureBookingMap();
  setModalStatus("🔎 Searching "+q+"…");
  try{
    const r=await fetch("https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=in&q="+encodeURIComponent(q),{headers:{Accept:"application/json"}});
    if(!r.ok)throw new Error("search failed");
    const rows=await r.json();
    if(!rows.length){setModalStatus("No location found. Try a nearby landmark or full address.",true);return;}
    const p=rows[0];
    setCustomerPin(Number(p.lat),Number(p.lon),null);
    setModalStatus("✓ Search result selected. Drag the pin to the exact service point if needed.");
  }catch(e){
    console.warn(e);
    setModalStatus("Search is temporarily unavailable. Tap the map manually to select your location.",true);
  }
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
