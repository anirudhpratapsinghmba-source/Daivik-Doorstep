const DAIVIK_BASE={lat:29.972586,lng:78.062215};
const FREE_RADIUS_KM=10;
const EXTRA_RATE_PER_KM=8;
const ONLINE_OFFER="DAIVIK10";
const P=window.DAIVIK_PRICING||{};
const $=id=>document.getElementById(id);
let locationConfirmed=false;

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
  locationConfirmed=false;
  const distance=haversineKm(DAIVIK_BASE.lat,DAIVIK_BASE.lng,lat,lng);
  const charge=locationCharge(distance);
  $("bLat").value=lat.toFixed(7);
  $("bLng").value=lng.toFixed(7);
  $("bDistance").value=distance.toFixed(3);
  $("bLocationCharge").value=charge;
  if(address)$("baddress").value=address;
  const accuracyText=Number.isFinite(accuracy)?" • GPS accuracy ±"+Math.round(accuracy)+"m":"";
  setLocationStatus("✓ Service location selected"+accuracyText+". Confirm this pin before booking.");
  const link=$("customerMapLink");
  if(link){link.href="https://www.google.com/maps?q="+lat+","+lng;link.style.display="inline";}
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
function mapMercatorY(lat){
  const s=Math.sin(Math.max(-85.05112878,Math.min(85.05112878,lat))*Math.PI/180);
  return (0.5-Math.log((1+s)/(1-s))/(4*Math.PI));
}
function mapMercatorLat(y){
  return (180/Math.PI)*(2*Math.atan(Math.exp((0.5-y)*2*Math.PI))-Math.PI/2);
}
function mapViewportBBox(lat,lng,zoom=15){
  const el=$("bookingMap");
  const w=Math.max(320,el?.clientWidth||360);
  const h=Math.max(260,el?.clientHeight||350);
  const scale=256*Math.pow(2,zoom);
  const x=(lng+180)/360;
  const y=mapMercatorY(lat);
  const westLng=((x-w/(2*scale))*360)-180;
  const eastLng=((x+w/(2*scale))*360)-180;
  const southLat=mapMercatorLat(y+h/(2*scale));
  const northLat=mapMercatorLat(y-h/(2*scale));
  return {west:westLng,south:southLat,east:eastLng,north:northLat,zoom};
}
function mapPointFromPointer(clientX,clientY){
  const overlay=$("daivikMapOverlay");
  if(!overlay||!window._daivikMapView)return null;
  const r=overlay.getBoundingClientRect();
  const px=Math.max(0,Math.min(r.width,clientX-r.left));
  const py=Math.max(0,Math.min(r.height,clientY-r.top));
  const {lat,lng,zoom}=window._daivikMapView;
  const scale=256*Math.pow(2,zoom);
  const cx=(lng+180)/360;
  const cy=mapMercatorY(lat);
  const x=cx+(px-r.width/2)/scale;
  const y=cy+(py-r.height/2)/scale;
  const lon=x*360-180;
  const latitude=mapMercatorLat(y);
  return {lat:latitude,lng:lon};
}
function buildOsmEmbed(lat,lng,marker=true){
  const b=mapViewportBBox(lat,lng,15);
  const q=[
    "bbox="+[b.west,b.south,b.east,b.north].map(v=>v.toFixed(7)).join("%2C"),
    "layer=mapnik",
    marker?"marker="+encodeURIComponent(lat.toFixed(6)+","+lng.toFixed(6)):""
  ].filter(Boolean).join("&");
  return "https://www.openstreetmap.org/export/embed.html?"+q;
}
function positionMapMarker(lat,lng){
  const marker=$("daivikCustomerPin");
  const overlay=$("daivikMapOverlay");
  if(!marker||!overlay||!window._daivikMapView)return;
  const r=overlay.getBoundingClientRect();
  const scale=256*Math.pow(2,window._daivikMapView.zoom);
  const cx=(window._daivikMapView.lng+180)/360;
  const cy=mapMercatorY(window._daivikMapView.lat);
  const x=((lng+180)/360-cx)*scale+r.width/2;
  const y=(mapMercatorY(lat)-cy)*scale+r.height/2;
  marker.style.left=Math.max(10,Math.min(r.width-10,x))+"px";
  marker.style.top=Math.max(10,Math.min(r.height-10,y))+"px";
}
function osmTileXY(lat,lng,z){
  const n=Math.pow(2,z);
  const x=(lng+180)/360*n;
  const latRad=lat*Math.PI/180;
  const y=(1-Math.asinh(Math.tan(latRad))/Math.PI)/2*n;
  return {x,y};
}
function renderEmbeddedMap(lat=DAIVIK_BASE.lat,lng=DAIVIK_BASE.lng){
  const el=$("bookingMap"); if(!el)return;
  const wrap=$("locationMapModal"); if(wrap)wrap.classList.add("open");
  const zoom=15;
  window._daivikMapView={lat,lng,zoom,bbox:mapViewportBBox(lat,lng,zoom)};
  el.innerHTML="";
  el.style.position="relative";
  el.style.overflow="hidden";
  el.style.background="#dfe8e6";

  const tiles=document.createElement("div");
  tiles.style.cssText="position:absolute;inset:0;overflow:hidden;background:#dfe8e6";
  const center=osmTileXY(lat,lng,zoom);
  const tileSize=256;
  const w=Math.max(320,el.clientWidth||360),h=Math.max(260,el.clientHeight||350);
  const startX=Math.floor(center.x-w/(2*tileSize))-1;
  const startY=Math.floor(center.y-h/(2*tileSize))-1;
  const cols=Math.ceil(w/tileSize)+3, rows=Math.ceil(h/tileSize)+3;
  const max=Math.pow(2,zoom);
  for(let ty=startY;ty<startY+rows;ty++){
    for(let tx=startX;tx<startX+cols;tx++){
      const wrappedX=((tx%max)+max)%max;
      if(ty<0||ty>=max)continue;
      const img=document.createElement("img");
      img.alt="";
      img.draggable=false;
      img.src="https://tile.openstreetmap.org/"+zoom+"/"+wrappedX+"/"+ty+".png";
      img.style.cssText="position:absolute;width:256px;height:256px;max-width:none;left:"+(tx-center.x)*256+w/2+"px;top:"+(ty-center.y)*256+h/2+"px;user-select:none;pointer-events:none";
      img.onerror=()=>{img.style.display="none";};
      tiles.appendChild(img);
    }
  }
  el.appendChild(tiles);

  const overlay=document.createElement("div");
  overlay.id="daivikMapOverlay";
  overlay.style.cssText="position:absolute;inset:0;z-index:20;cursor:crosshair;touch-action:none;background:transparent";
  el.appendChild(overlay);

  const base=document.createElement("div");
  base.id="daivikBasePin";
  base.textContent="🏠";
  base.title="Daivik service base";
  base.style.cssText="position:absolute;z-index:22;transform:translate(-50%,-100%);font-size:23px;filter:drop-shadow(0 2px 2px #0008);pointer-events:none";
  overlay.appendChild(base);

  const customer=document.createElement("div");
  customer.id="daivikCustomerPin";
  customer.textContent="📍";
  customer.title="Your service location — tap/drag to adjust";
  customer.style.cssText="position:absolute;z-index:24;transform:translate(-50%,-100%);font-size:30px;filter:drop-shadow(0 2px 2px #0009);display:none;cursor:grab;touch-action:none";
  overlay.appendChild(customer);

  const hint=document.createElement("div");
  hint.style.cssText="position:absolute;left:10px;right:10px;top:10px;z-index:23;background:rgba(7,16,20,.88);color:#fff;padding:8px 10px;border-radius:10px;font-size:11px;font-weight:800;pointer-events:none";
  hint.textContent=window._daivikCustomerLocation?"📍 Tap anywhere to move the pin • drag the pin for fine adjustment":"📍 Tap the map to place your service pin";
  overlay.appendChild(hint);

  const setPositions=()=>{
    const basePoint=mapPointFromLatLng(DAIVIK_BASE.lat,DAIVIK_BASE.lng);
    if(basePoint){base.style.left=basePoint.x+"px";base.style.top=basePoint.y+"px";}
    if(window._daivikCustomerLocation){
      customer.style.display="block";
      positionMapMarker(window._daivikCustomerLocation.lat,window._daivikCustomerLocation.lng);
    }
  };
  window._daivikMapPointRefresh=setPositions;
  setTimeout(setPositions,50);
  setTimeout(setPositions,250);

  let dragging=false;
  customer.addEventListener("pointerdown",e=>{
    e.preventDefault();e.stopPropagation();dragging=true;customer.style.cursor="grabbing";
    try{customer.setPointerCapture(e.pointerId)}catch(_){}
  });
  customer.addEventListener("pointermove",e=>{
    if(!dragging)return;
    const p=mapPointFromPointer(e.clientX,e.clientY);
    if(p)positionMapMarker(p.lat,p.lng);
  });
  const finishDrag=e=>{
    if(!dragging)return;
    dragging=false;customer.style.cursor="grab";
    const p=mapPointFromPointer(e.clientX,e.clientY);
    if(p)setCustomerPin(p.lat,p.lng,null);
  };
  customer.addEventListener("pointerup",finishDrag);
  customer.addEventListener("pointercancel",finishDrag);
  overlay.addEventListener("click",e=>{
    if(e.target===customer)return;
    const p=mapPointFromPointer(e.clientX,e.clientY);
    if(p)setCustomerPin(p.lat,p.lng,null);
  });

  window.bookingMap={
    invalidateSize:()=>setTimeout(()=>window._daivikMapPointRefresh?.(),50),
    setView:(p)=>{if(p&&Number.isFinite(p[0])&&Number.isFinite(p[1]))renderEmbeddedMap(p[0],p[1])}
  };
}
function mapPointFromLatLng(lat,lng){
  const overlay=$("daivikMapOverlay");
  if(!overlay||!window._daivikMapView)return null;
  const r=overlay.getBoundingClientRect();
  const scale=256*Math.pow(2,window._daivikMapView.zoom);
  const cx=(window._daivikMapView.lng+180)/360;
  const cy=mapMercatorY(window._daivikMapView.lat);
  return {
    x=((lng+180)/360-cx)*scale+r.width/2,
    y=(mapMercatorY(lat)-cy)*scale+r.height/2
  };
}
function showGoogleMapFallback(lat=DAIVIK_BASE.lat,lng=DAIVIK_BASE.lng){
  renderEmbeddedMap(lat,lng);
}
function hideGoogleMapFallback(){}
function ensureBookingMap(){
  if(window.bookingMap){window.bookingMap.invalidateSize();return;}
  renderEmbeddedMap(
    window._daivikCustomerLocation?.lat||DAIVIK_BASE.lat,
    window._daivikCustomerLocation?.lng||DAIVIK_BASE.lng
  );
  setModalStatus("✓ Map ready. Tap anywhere on the map to place the exact service pin.");
}
function setCustomerPin(lat,lng,accuracy=null){
  if(!Number.isFinite(lat)||!Number.isFinite(lng))return;
  window._daivikCustomerLocation={lat,lng};
  updateLocation(lat,lng,"",accuracy);
  renderEmbeddedMap(lat,lng);
  reverseGeocode(lat,lng).then(address=>{
    if(address)$( "baddress").value=address;
    updateLocation(lat,lng,address,accuracy);
    setModalStatus("✓ Pin selected. Adjust it if needed, then Confirm Location.");
  });
  const b=$("confirmLocationBtn");if(b)b.disabled=false;
}
function useMyLocation(){
  openLocationModal();
  if(!window.isSecureContext){
    setModalStatus("GPS requires a secure HTTPS connection. You can still select your location manually on the map.",true);
    return;
  }
  if(!navigator.geolocation){
    setModalStatus("This browser does not provide GPS location. Please select your location manually on the map.",true);
    return;
  }
  const startGPS=()=>{
    setModalStatus("📍 Requesting your exact phone location… Please allow Location if your browser asks.");
    navigator.geolocation.getCurrentPosition(
      p=>{
        console.log("[Daivik GPS SUCCESS]",p.coords.latitude,p.coords.longitude,"accuracy:",p.coords.accuracy);
        setCustomerPin(p.coords.latitude,p.coords.longitude,p.coords.accuracy);
        setModalStatus("✓ Your current location is pinned. Tap/drag to adjust the exact service point, then Confirm Location.");
      },
      err=>{
        console.warn("[Daivik GPS ERROR]",err.code,err.message,err);
        const msg=err.code===1
          ?"Location permission was denied. Allow Location for this site in Chrome Site Settings, then try again."
          :err.code===2
          ?"Your phone could not determine the location. Turn Android Location ON and try again outdoors/near a window."
          :err.code===3
          ?"GPS timed out. Turn Location ON and try again; you can also select the point manually on the map."
          :"Unable to read your location. Please try again or select the point manually on the map.";
        setModalStatus(msg,true);
      },
      {enableHighAccuracy:true,timeout:30000,maximumAge:0}
    );
  };
  if(navigator.permissions?.query){
    navigator.permissions.query({name:"geolocation"}).then(permission=>{
      console.log("[Daivik GPS PERMISSION]",permission.state);
      if(permission.state==="denied"){
        setModalStatus("Location permission is blocked for this site. Open Chrome Site Settings → Location → Allow, then try again.",true);
        return;
      }
      startGPS();
    }).catch(()=>startGPS());
  }else startGPS();
}
function confirmSelectedLocation(){
  const lat=Number($( "bLat").value),lng=Number($( "bLng").value);
  if(!Number.isFinite(lat)||!Number.isFinite(lng)){setModalStatus("First place your pin on the map.",true);return;}
  const distance=Number($( "bDistance").value||0);
  if(!$( "baddress").value.trim())$( "baddress").value="Pinned map location ("+lat.toFixed(6)+", "+lng.toFixed(6)+")";
  setLocationStatus("✓ Service location confirmed. You can now complete the booking.");
  const link=$( "customerMapLink");if(link){link.href="https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(lat+","+lng);link.style.display="inline";}
  setModalStatus("✓ Location confirmed. You can now complete the booking.");
  locationConfirmed=true;
  const submit=$("confirmBookingBtn");
  if(submit){submit.scrollIntoView({behavior:"smooth",block:"center"});}
  setTimeout(closeLocationModal,300);
}
async function searchMapLocation(){
  const input=$( "mapLocationSearch"),q=(input?.value||"").trim();
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
    setModalStatus("✓ Search result selected. Tap again or drag the pin to the exact service point.");
  }catch(e){
    console.warn(e);
    setModalStatus("Search is temporarily unavailable. Tap the map manually to select your location.",true);
  }
}
function setModelPicker(value){
  const select=$("bmodel"),btn=$("modelPickerBtn"),customWrap=$("bmodelCustomWrap");
  if(!select)return;
  select.value=value;
  const opt=select.options[select.selectedIndex];
  const label=value==="__custom__"?"Custom / Other":(opt?.textContent||"Select car model");
  if(btn){btn.innerHTML=label+" <span>⌄</span>";btn.classList.toggle("active",value==="__custom__");btn.setAttribute("aria-expanded","false");}
  if(customWrap)customWrap.hidden=value!=="__custom__";
}
function renderModelOptions(){
  const select=$("bmodel"),list=$("modelOptions");
  if(!select||!list)return;
  const search=($("modelSearch")?.value||"").trim().toLowerCase();
  list.innerHTML="";
  let visible=0,lastBrand="";
  [...select.options].forEach(opt=>{
    if(!opt.value)return;
    const group=opt.parentElement?.tagName==="OPTGROUP"?opt.parentElement:null;
    if(group){
      const brand=group.label;
      if(search&&!brand.toLowerCase().includes(search)&&!opt.textContent.toLowerCase().includes(search))return;
      if(brand!==lastBrand){
        const h=document.createElement("div");h.className="modelGroup";h.textContent=brand;list.appendChild(h);lastBrand=brand;
      }
      const btn=document.createElement("button");
      btn.type="button";btn.className="modelOption";btn.textContent=opt.textContent;
      btn.addEventListener("click",()=>{setModelPicker(opt.value);$("modelPickerPanel").hidden=true;});
      list.appendChild(btn);visible++;
      return;
    }
    if(opt.value==="__custom__"){
      if(search&&!["custom","other"].some(x=>x.includes(search)))return;
      const btn=document.createElement("button");btn.type="button";btn.className="modelOption custom";btn.textContent="✎ Custom / Other — enter manually";
      btn.addEventListener("click",()=>{setModelPicker("__custom__");$("modelPickerPanel").hidden=false;$("bmodelCustom")?.focus();});
      list.appendChild(btn);visible++;
    }
  });
  if(!visible){
    const e=document.createElement("div");e.className="modelEmpty";e.textContent="No model found. Choose Custom / Other.";list.appendChild(e);
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
  custom.value="__custom__";custom.textContent="Custom / Other";
  select.appendChild(custom);
  if(selectedValue){
    const exact=[...select.options].find(o=>o.value===selectedValue||o.textContent===selectedValue||o.value.endsWith(" — "+selectedValue));
    if(exact)select.value=exact.value;
    else {select.value="__custom__";$("bmodelCustom").value=selectedValue;}
  }
  if(customWrap)customWrap.hidden=select.value!=="__custom__";
  setModelPicker(select.value||"");
  renderModelOptions();
}
function guardPastTimeSlots(){
  const date=$("bdate"),time=$("btime");
  if(!date||!time)return;
  const today=new Date();
  const selected=date.value;
  const nowMinutes=today.getHours()*60+today.getMinutes();
  [...time.options].forEach((opt,i)=>{
    if(i===0)return;
    const m=String(opt.value||opt.textContent).match(/^(\d{2}):(\d{2})\s*(AM|PM)/i);
    if(!m){opt.disabled=false;return;}
    let h=Number(m[1]); const min=Number(m[2]); const ap=m[3].toUpperCase();
    if(ap==="PM"&&h!==12)h+=12; if(ap==="AM"&&h===12)h=0;
    opt.disabled=selected===today.toISOString().slice(0,10) && h*60+min<=nowMinutes+30;
  });
  if(time.selectedOptions[0]?.disabled)time.value="";
}
function bindEstimateEvents(){
  ["bwash","baddon"].forEach(id=>$(id)?.addEventListener("change",refreshBookingEstimate));
  $("bvehicle")?.addEventListener("change",()=>{populateBookingModels();refreshBookingEstimate();});
  $("modelPickerBtn")?.addEventListener("click",()=>{const panel=$("modelPickerPanel");if(!panel)return;panel.hidden=!panel.hidden;$("modelPickerBtn").setAttribute("aria-expanded",String(!panel.hidden));if(!panel.hidden){$("modelSearch").value="";renderModelOptions();setTimeout(()=>$("modelSearch")?.focus(),0);}});
  $("modelSearch")?.addEventListener("input",renderModelOptions);
  $("bmodelCustom")?.addEventListener("input",()=>{if($("bmodel").value!=="__custom__")setModelPicker("__custom__");});

  $("bdate")?.addEventListener("change",guardPastTimeSlots);
  guardPastTimeSlots();
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
  refreshBookingEstimate();
});

