const DAIVIK_BASE={lat:29.972586,lng:78.062215};
const FREE_RADIUS_KM=10;
const EXTRA_RATE_PER_KM=8;
const ONLINE_OFFER="DAIVIK10";
const P=window.DAIVIK_PRICING||{};
const $=id=>document.getElementById(id);
let locationConfirmed=false;
window.daivikLocationConfirmed=false;

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
function offerDiscount(base){return getOfferCode()==="DAIVIK10"?Math.round(Number(base||0)*.10):0;}
function locationCharge(distance){return distance>FREE_RADIUS_KM?Math.round((distance-FREE_RADIUS_KM)*EXTRA_RATE_PER_KM):0;}
function setLocationStatus(msg,error=false){
  const el=$("distanceNotice");
  if(el){el.textContent=msg;el.classList.toggle("error",error);}
}
function refreshBookingEstimate(){
  const vehicle=$("bvehicle")?.value,wash=$("bwash")?.value;
  const ultra=$("bwash")?.querySelector('option[value="ultra_basic"]');
  if(ultra)ultra.disabled=!!vehicle&&!["hatchback","sedan"].includes(vehicle);
  if(vehicle&&!["hatchback","sedan"].includes(vehicle)&&wash==="ultra_basic")$("bwash").value="basic";
}
function setModalStatus(msg,error=false){
  const el=$("modalLocationStatus");
  if(el){el.textContent=msg;el.classList.toggle("error",error);}
}
function mapMercatorY(lat){
  const s=Math.sin(Math.max(-85.05112878,Math.min(85.05112878,lat))*Math.PI/180);
  return .5-Math.log((1+s)/(1-s))/(4*Math.PI);
}
function mapMercatorLat(y){return 180/Math.PI*(2*Math.atan(Math.exp((.5-y)*2*Math.PI))-Math.PI/2);}
function osmTileXY(lat,lng,z){
  const n=2**z;
  return {x:(lng+180)/360*n,y:(1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2*n};
}
function mapPointFromPointer(x,y){
  const overlay=$("daivikMapOverlay");
  if(!overlay||!window._daivikMapView)return null;
  const r=overlay.getBoundingClientRect(),px=Math.max(0,Math.min(r.width,x-r.left)),py=Math.max(0,Math.min(r.height,y-r.top));
  const v=window._daivikMapView,scale=256*2**v.zoom;
  const cx=(v.lng+180)/360,cy=mapMercatorY(v.lat);
  return {lng:(cx+(px-r.width/2)/scale)*360-180,lat:mapMercatorLat(cy+(py-r.height/2)/scale)};
}
function mapPointFromLatLng(lat,lng){
  const overlay=$("daivikMapOverlay");
  if(!overlay||!window._daivikMapView)return null;
  const r=overlay.getBoundingClientRect(),v=window._daivikMapView,scale=256*2**v.zoom;
  const cx=(v.lng+180)/360,cy=mapMercatorY(v.lat);
  return {x:((lng+180)/360-cx)*scale+r.width/2,y:(mapMercatorY(lat)-cy)*scale+r.height/2};
}
function positionMapMarker(lat,lng){
  const marker=$("daivikCustomerPin"),overlay=$("daivikMapOverlay");
  const p=mapPointFromLatLng(lat,lng);
  if(!marker||!overlay||!p)return;
  marker.style.left=Math.max(10,Math.min(overlay.clientWidth-10,p.x))+"px";
  marker.style.top=Math.max(10,Math.min(overlay.clientHeight-10,p.y))+"px";
}
function renderEmbeddedMap(lat=DAIVIK_BASE.lat,lng=DAIVIK_BASE.lng){
  const el=$("bookingMap");
  if(!el)return;
  const zoom=15;
  window._daivikMapView={lat,lng,zoom};
  el.innerHTML="";
  el.style.position="relative";
  el.style.overflow="hidden";
  el.style.background="#dfe8e6";
  const center=osmTileXY(lat,lng,zoom),w=Math.max(320,el.clientWidth||360),h=Math.max(260,el.clientHeight||350);
  const tiles=document.createElement("div");
  tiles.style.cssText="position:absolute;inset:0;overflow:hidden";
  const startX=Math.floor(center.x-w/512)-1,startY=Math.floor(center.y-h/512)-1;
  const cols=Math.ceil(w/256)+3,rows=Math.ceil(h/256)+3,max=2**zoom;
  for(let ty=startY;ty<startY+rows;ty++){
    for(let tx=startX;tx<startX+cols;tx++){
      if(ty<0||ty>=max)continue;
      const img=document.createElement("img"),xx=((tx%max)+max)%max;
      img.src="https://tile.openstreetmap.org/"+zoom+"/"+xx+"/"+ty+".png";
      img.alt="";img.draggable=false;
      img.style.cssText="position:absolute;width:256px;height:256px;max-width:none;left:"+(tx-center.x)*256+w/2+"px;top:"+(ty-center.y)*256+h/2+"px;pointer-events:none";
      img.onerror=()=>img.remove();
      tiles.appendChild(img);
    }
  }
  el.appendChild(tiles);
  const overlay=document.createElement("div");
  overlay.id="daivikMapOverlay";
  overlay.style.cssText="position:absolute;inset:0;z-index:10;cursor:crosshair;touch-action:none";
  el.appendChild(overlay);
  const base=document.createElement("div");
  base.textContent="🏠";base.style.cssText="position:absolute;z-index:20;font-size:24px;transform:translate(-50%,-100%);pointer-events:none";
  overlay.appendChild(base);
  const customer=document.createElement("div");
  customer.id="daivikCustomerPin";customer.textContent="📍";
  customer.style.cssText="position:absolute;z-index:21;font-size:32px;transform:translate(-50%,-100%);display:none;cursor:grab;touch-action:none";
  overlay.appendChild(customer);
  const hint=document.createElement("div");
  hint.textContent=window._daivikCustomerLocation?"Tap map or drag pin to adjust":"Tap the map to place your service pin";
  hint.style.cssText="position:absolute;top:10px;left:10px;right:10px;z-index:22;background:#080c0ee8;color:#fff;padding:9px;border-radius:10px;font-size:11px;font-weight:800;pointer-events:none";
  overlay.appendChild(hint);
  const refresh=()=>{
    const bp=mapPointFromLatLng(DAIVIK_BASE.lat,DAIVIK_BASE.lng);
    if(bp){base.style.left=bp.x+"px";base.style.top=bp.y+"px";}
    if(window._daivikCustomerLocation){customer.style.display="block";positionMapMarker(window._daivikCustomerLocation.lat,window._daivikCustomerLocation.lng);}
  };
  refresh();
  let dragging=false;
  customer.addEventListener("pointerdown",e=>{e.preventDefault();e.stopPropagation();dragging=true;customer.style.cursor="grabbing";try{customer.setPointerCapture(e.pointerId)}catch(_){}});
  customer.addEventListener("pointermove",e=>{if(dragging){const p=mapPointFromPointer(e.clientX,e.clientY);if(p)positionMapMarker(p.lat,p.lng)}});
  const endDrag=e=>{if(!dragging)return;dragging=false;customer.style.cursor="grab";const p=mapPointFromPointer(e.clientX,e.clientY);if(p)setCustomerPin(p.lat,p.lng)};
  customer.addEventListener("pointerup",endDrag);customer.addEventListener("pointercancel",endDrag);
  overlay.addEventListener("click",e=>{if(e.target===customer)return;const p=mapPointFromPointer(e.clientX,e.clientY);if(p)setCustomerPin(p.lat,p.lng)});
  window.bookingMap={invalidateSize:refresh,setView:p=>{if(p)renderEmbeddedMap(p[0],p[1])}};
}
function ensureBookingMap(){renderEmbeddedMap(window._daivikCustomerLocation?.lat||DAIVIK_BASE.lat,window._daivikCustomerLocation?.lng||DAIVIK_BASE.lng);}
function updateLocation(lat,lng,address="",accuracy=null){
  const distance=haversineKm(DAIVIK_BASE.lat,DAIVIK_BASE.lng,lat,lng),charge=locationCharge(distance);
  $("bLat").value=lat.toFixed(7);$("bLng").value=lng.toFixed(7);$("bDistance").value=distance.toFixed(3);$("bLocationCharge").value=charge;
  if(address)$("baddress").value=address;
  locationConfirmed=false;window.daivikLocationConfirmed=false;
  setLocationStatus("✓ Service location selected"+(accuracy?" • GPS accuracy ±"+Math.round(accuracy)+"m":"")+". Confirm this pin before booking.");
}
async function reverseGeocode(lat,lng){
  try{
    const r=await fetch("https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat="+encodeURIComponent(lat)+"&lon="+encodeURIComponent(lng),{headers:{Accept:"application/json"}});
    if(!r.ok)return "";
    const d=await r.json();return d.display_name||"";
  }catch(_){return "";}
}
function setCustomerPin(lat,lng,accuracy=null){
  if(!Number.isFinite(lat)||!Number.isFinite(lng))return;
  window._daivikCustomerLocation={lat,lng};updateLocation(lat,lng,"",accuracy);renderEmbeddedMap(lat,lng);
  const btn=$("confirmLocationBtn");if(btn)btn.disabled=false;
  reverseGeocode(lat,lng).then(a=>{if(a){$("baddress").value=a;updateLocation(lat,lng,a,accuracy);}$("confirmLocationBtn").disabled=false;setModalStatus("✓ Pin selected. Adjust if needed, then Confirm Location.")});
}
function useMyLocation(){
  openLocationModal();
  if(!window.isSecureContext||!navigator.geolocation){setModalStatus("GPS is unavailable here. Use the map or search to select your location.",true);return;}
  setModalStatus("Requesting your phone location…");
  navigator.geolocation.getCurrentPosition(p=>{setCustomerPin(p.coords.latitude,p.coords.longitude,p.coords.accuracy);setModalStatus("✓ GPS location pinned. Adjust if needed, then Confirm Location.")},e=>{setModalStatus(e.code===1?"Location permission was denied. Allow it in browser settings.":"GPS could not determine your location. You can select the point manually.",true)},{enableHighAccuracy:true,timeout:30000,maximumAge:0});
}
function openLocationModal(){
  const m=$("locationModal");if(m){m.classList.add("open");m.setAttribute("aria-hidden","false")}
  ensureBookingMap();setModalStatus("Map ready. Tap the map to place your exact service pin.");
}
function closeLocationModal(){
  const m=$("locationModal");if(m){m.classList.remove("open");m.setAttribute("aria-hidden","true")}
}
function openMapPicker(){openLocationModal()}
function confirmSelectedLocation(){
  const lat=Number($("bLat").value),lng=Number($("bLng").value);
  if(!Number.isFinite(lat)||!Number.isFinite(lng)){setModalStatus("First place your pin on the map.",true);return}
  if(!$("baddress").value.trim())$("baddress").value="Pinned map location ("+lat.toFixed(6)+", "+lng.toFixed(6)+")";
  locationConfirmed=true;window.daivikLocationConfirmed=true;
  setLocationStatus("✓ Service location confirmed. You can now complete the booking.");
  const link=$("customerMapLink");if(link){link.href="https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(lat+","+lng);link.style.display="inline"}
  setModalStatus("✓ Location confirmed.");setTimeout(closeLocationModal,250);
}
async function searchMapLocation(){
  const q=($("mapLocationSearch")?.value||"").trim();
  if(!q){setModalStatus("Enter an area, landmark, address or pincode.",true);return}
  setModalStatus("Searching…");
  try{
    const r=await fetch("https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=in&q="+encodeURIComponent(q),{headers:{Accept:"application/json"}});
    const rows=await r.json();
    if(!rows.length){setModalStatus("No location found. Try a nearby landmark or full address.",true);return}
    setCustomerPin(Number(rows[0].lat),Number(rows[0].lon));openLocationModal();setModalStatus("✓ Search result selected. Adjust the pin if needed.");
  }catch(_){setModalStatus("Search is temporarily unavailable. Tap the map manually.",true)}
}
function setModelPicker(value){
  const select=$("bmodel"),btn=$("modelPickerBtn"),custom=$("bmodelCustomWrap");if(!select)return;
  select.value=value;const opt=select.options[select.selectedIndex];
  btn.textContent=value==="__custom__"?"Custom / Other":(opt?.textContent||"Select car model")+" ⌄";
  if(custom)custom.hidden=value!=="__custom__";
}
function renderModelOptions(){
  const select=$("bmodel"),list=$("modelOptions"),q=($("modelSearch")?.value||"").toLowerCase().trim();if(!select||!list)return;
  list.innerHTML="";let count=0,last="";
  [...select.options].forEach(opt=>{
    if(!opt.value)return;
    const group=opt.parentElement?.tagName==="OPTGROUP";
    if(group){
      const brand=opt.parentElement.label;
      if(q&&!brand.toLowerCase().includes(q)&&!opt.textContent.toLowerCase().includes(q))return;
      if(last!==brand){const h=document.createElement("div");h.className="modelGroup";h.textContent=brand;list.appendChild(h);last=brand}
      const b=document.createElement("button");b.type="button";b.className="modelOption";b.textContent=opt.textContent;b.onclick=()=>{setModelPicker(opt.value);$("modelPickerPanel").hidden=true};list.appendChild(b);count++;
    }
  });
  const custom=[...select.options].find(o=>o.value==="__custom__");
  if(custom&&(!q||"custom other".includes(q))){const b=document.createElement("button");b.type="button";b.className="modelOption custom";b.textContent="✎ Custom / Other — enter manually";b.onclick=()=>{setModelPicker("__custom__");$("modelPickerPanel").hidden=false;$("bmodelCustom").focus()};list.appendChild(b);count++}
  if(!count){const e=document.createElement("div");e.className="modelEmpty";e.textContent="No model found. Choose Custom / Other.";list.appendChild(e)}
}
function populateBookingModels(selectedValue=""){
  const select=$("bmodel"),groups=window.DAIVIK_CAR_MODELS?.[$("bvehicle").value]||{};if(!select)return;
  select.innerHTML='<option value="">Select car model</option>';
  Object.entries(groups).forEach(([brand,models])=>{const og=document.createElement("optgroup");og.label=brand;models.forEach(model=>{const o=document.createElement("option");o.value=brand+" — "+model;o.textContent=model;og.appendChild(o)});select.appendChild(og)});
  const custom=document.createElement("option");custom.value="__custom__";custom.textContent="Custom / Other";select.appendChild(custom);
  if(selectedValue){const exact=[...select.options].find(o=>o.value===selectedValue||o.textContent===selectedValue||o.value.endsWith(" — "+selectedValue));if(exact)select.value=exact.value;else{$("bmodelCustom").value=selectedValue;select.value="__custom__"}}
  setModelPicker(select.value||"");renderModelOptions();
}
function guardPastTimeSlots(){
  const date=$("bdate"),time=$("btime");if(!date||!time)return;
  const now=new Date(),today=new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,10),mins=now.getHours()*60+now.getMinutes();
  [...time.options].forEach((o,i)=>{if(!i)return;const m=o.value.match(/^(\d{2}):(\d{2})\s*(AM|PM)/i);if(!m)return;let h=+m[1];if(m[3].toUpperCase()==="PM"&&h!==12)h+=12;if(m[3].toUpperCase()==="AM"&&h===12)h=0;o.disabled=date.value===today&&h*60+ +m[2]<=mins+30});
}
document.addEventListener("DOMContentLoaded",()=>{
  const q=new URLSearchParams(location.search),vehicle=q.get("vehicle"),wash=q.get("wash"),model=q.get("model");
  if(vehicle&&P[vehicle])$("bvehicle").value=vehicle;
  if(wash&&["ultra_basic","basic","medium","premium"].includes(wash))$("bwash").value=wash;
  populateBookingModels(model||"");
  $("bvehicle")?.addEventListener("change",()=>{populateBookingModels();refreshBookingEstimate()});
  $("bwash")?.addEventListener("change",refreshBookingEstimate);
  $("bdate")?.addEventListener("change",guardPastTimeSlots);
  $("modelPickerBtn")?.addEventListener("click",()=>{const p=$("modelPickerPanel");p.hidden=!p.hidden;if(!p.hidden){$("modelSearch").value="";renderModelOptions();$("modelSearch").focus()}});
  $("modelSearch")?.addEventListener("input",renderModelOptions);
  $("bmodelCustom")?.addEventListener("input",()=>{if($("bmodel").value!=="__custom__")setModelPicker("__custom__")});
  $("mapSearchBtn")?.addEventListener("click",searchMapLocation);
  guardPastTimeSlots();refreshBookingEstimate();
});