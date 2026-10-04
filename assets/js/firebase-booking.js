/* Daivik Doorstep — Supabase booking integration */
(function () {
  const $=id=>document.getElementById(id);
  const fail=(button,message)=>{
    if(button){button.disabled=false;button.textContent="Confirm Booking Request";}
    const box=$("bookingError");
    if(box){box.textContent=message;box.classList.add("show");}
    else alert(message);
  };

  if(!window.supabase || !window.DAIVIK_SUPABASE_URL || !window.DAIVIK_SUPABASE_ANON_KEY){
    window.createBooking=()=>fail($("confirmBookingBtn"),"Booking service is temporarily unavailable. Please refresh the page and try again.");
    return;
  }

  const client=window.supabase.createClient(window.DAIVIK_SUPABASE_URL,window.DAIVIK_SUPABASE_ANON_KEY);

  function selectedSlotISO(date,time){
    const match=String(time).match(/^(\d{2}):(\d{2})\s*(AM|PM)/i);
    if(!match)return new Date(date+"T09:00:00").toISOString();
    let hour=Number(match[1]),minute=match[2],ampm=match[3].toUpperCase();
    if(ampm==="PM"&&hour!==12)hour+=12;
    if(ampm==="AM"&&hour===12)hour=0;
    return new Date(date+"T"+String(hour).padStart(2,"0")+":"+minute+":00").toISOString();
  }

  function showSaved(data){
    localStorage.setItem("daivikBooking",JSON.stringify(data));
    $("bookingId").textContent=data.id;
    $("sumService").textContent=((window.DAIVIK_PRICING?.[data.vehicle]?.n)||data.vehicle)+" — "+String(data.wash||"").replaceAll("_"," ")+" Wash";
    $("sumCar").textContent=data.model||"Car model not specified";
    const addonEl=$("sumAddon");if(addonEl)addonEl.textContent="₹"+Number(data.addon||0).toLocaleString("en-IN");
    $("sumPrice").textContent="₹"+Number(data.total||0).toLocaleString("en-IN");
    $("sumName").textContent=data.name||"";
    $("sumSlot").textContent=(data.date||"")+" • "+(data.time||"");
    $("sumAddress").textContent=data.address||"";
    const statusEl=$("firebaseStatus");if(statusEl)statusEl.textContent=data.status||"Pending Confirmation";
    $("bookingSummary").classList.add("show");
    $("bookingSummary").scrollIntoView({behavior:"smooth",block:"center"});
  }

  function getOfferCode(){ return ""; }

  window.createBooking=async function(){
    const button=$("confirmBookingBtn"),errorBox=$("bookingError");
    if(button){button.disabled=true;button.textContent="Saving booking…";}
    if(errorBox){errorBox.classList.remove("show");errorBox.textContent="";}

    const name=$("bname").value.trim(),phone=$("bphone").value.trim(),vehicle=$("bvehicle").value,
      model=($("bmodel").value==="__custom__"?$("bmodelCustom").value.trim():$("bmodel").value.trim()),
      wash=$("bwash").value,date=$("bdate").value,time=$("btime").value,address=$("baddress").value.trim(),
      addon=Number($("baddon").value||0),lat=Number($("bLat").value),lng=Number($("bLng").value);

    if(!name||!phone||!vehicle||!model||!wash||!date||!time||!address)
      return fail(button,"Please complete all required booking details.");
    if(!/^[0-9]{10}$/.test(phone))
      return fail(button,"Please enter a valid 10-digit mobile number.");
    if(!window.daivikLocationConfirmed)
      return fail(button,"Please select your exact service location and press “Confirm Location” before booking.");
    if(!Number.isFinite(lat)||!Number.isFinite(lng))
      return fail(button,"Please select your service location using the map or Use My Location.");
    if(new Date(date+"T23:59:59")<new Date())
      return fail(button,"Please select a future service date.");

    const {data,error}=await client.rpc("create_booking",{
      p_name:name,p_phone:phone,p_vehicle:vehicle,p_model:model,p_wash:wash,p_date:date,p_time:time,
      p_address:address,p_lat:lat,p_lng:lng,p_addon:addon,p_offer_code:getOfferCode(),p_scheduled_at:selectedSlotISO(date,time)
    });
    if(error){
      console.error("[Daivik booking error]",error);
      return fail(button,(error.message||"Booking could not be saved.")+" If this is the first setup, run supabase/schema.sql in Supabase SQL Editor.");
    }

    if(errorBox){errorBox.classList.remove("show");errorBox.textContent="";}
    showSaved(data);
    if(button){button.disabled=false;button.textContent="Booking Saved ✓";}
    try{
      localStorage.setItem("daivik_last_booking_v1",JSON.stringify({id:data.id,wash:data.wash,vehicle:data.vehicle,model:data.model,at:Date.now()}));
      localStorage.removeItem("daivik_booking_draft_v1");
    }catch(e){}
  };

  window.sendSavedBooking=function(){
    try{
      const raw=localStorage.getItem("daivikBooking");
      if(!raw)return alert("Booking details are not available on this device.");
      const d=JSON.parse(raw);
      const msg=[
        "Hello Daivik Doorstep Car Wash,",
        "I have submitted a booking request.",
        "",
        "Booking ID: "+d.id,
        "Service: "+(P[d.vehicle]?.n||d.vehicle)+" — "+String(d.wash||"").replaceAll("_"," "),
        "Car: "+(d.model||"Not specified"),
        "Date/Time: "+d.date+" • "+d.time,
        "Total: ₹"+Number(d.total||0).toLocaleString("en-IN"),
        "Status: "+(d.status||"Pending Confirmation")
      ].join("\n");
      window.open("https://wa.me/917983558954?text="+encodeURIComponent(msg),"_blank","noopener");
    }catch(e){alert("Could not prepare the WhatsApp message.");}
  };

})();