/* Daivik Doorstep — Supabase booking integration */
(function () {
  if (!window.supabase || !window.DAIVIK_SUPABASE_URL || !window.DAIVIK_SUPABASE_ANON_KEY) return;
  const client = window.supabase.createClient(window.DAIVIK_SUPABASE_URL, window.DAIVIK_SUPABASE_ANON_KEY);

  function selectedSlotISO(date, time) {
    const match = String(time).match(/^(\d{2}):\d{2}\s*(AM|PM)/i);
    if (!match) return new Date(date + "T09:00:00").toISOString();
    let hour = Number(match[1]);
    const minute = String(time).match(/^(\d{2}):(\d{2})/)?.[2] || "00";
    const ampm = match[2].toUpperCase();
    if (ampm === "PM" && hour !== 12) hour += 12;
    if (ampm === "AM" && hour === 12) hour = 0;
    return new Date(date + "T" + String(hour).padStart(2,"0") + ":" + minute + ":00").toISOString();
  }

  function showSaved(data) {
    localStorage.setItem("daivikBooking", JSON.stringify(data));
    $("bookingId").textContent = data.id;
    $("sumService").textContent = P[data.vehicle].n + " — " + data.wash.charAt(0).toUpperCase() + data.wash.slice(1) + " Wash";
    $("sumCar").textContent = data.model || "Car model not specified";
    $("sumPrice").textContent = "₹" + Number(data.total).toLocaleString("en-IN");
    $("sumName").textContent = data.name;
    $("sumSlot").textContent = data.date + " • " + data.time;
    $("sumAddress").textContent = data.address + " • " + Number(data.distanceKm || 0).toFixed(1) + " km from base";
    const statusEl=$("firebaseStatus"); if(statusEl) statusEl.textContent = data.status || "Pending Confirmation";
    $("bookingSummary").classList.add("show");
    $("bookingSummary").scrollIntoView({behavior:"smooth",block:"center"});
  }

  window.createBooking = async function () {
    const button=$("confirmBookingBtn"), errorBox=$("bookingError");
    if(button){button.disabled=true;button.textContent="Saving booking…";}
    if(errorBox){errorBox.classList.remove("show");errorBox.textContent="";}
    const name=$("bname").value.trim(), phone=$("bphone").value.trim(), vehicle=$("bvehicle").value,
      model=$("bmodel").value.trim(), wash=$("bwash").value, date=$("bdate").value, time=$("btime").value,
      address=$("baddress").value.trim(), addon=Number($("baddon").value||0),
      lat=Number($("bLat").value), lng=Number($("bLng").value);

    if(!name||!phone||!vehicle||!wash||!date||!time||!address){if(button){button.disabled=false;button.textContent="Confirm Booking Request";}return alert("Please complete all required details.");}
    if(!/^[0-9]{10}$/.test(phone)){if(button){button.disabled=false;button.textContent="Confirm Booking Request";}return alert("Please enter a valid 10-digit mobile number.");}
    if(!Number.isFinite(lat)||!Number.isFinite(lng)){if(button){button.disabled=false;button.textContent="Confirm Booking Request";}return alert("Please select your service location using the map or Use My Location.");}
    if(new Date(date + "T23:59:59") < new Date()){if(button){button.disabled=false;button.textContent="Confirm Booking Request";}return alert("Please select a future service date.");}

    const {data,error}=await client.rpc("create_booking",{
      p_name:name,p_phone:phone,p_vehicle:vehicle,p_model:model,p_wash:wash,p_date:date,p_time:time,
      p_address:address,p_lat:lat,p_lng:lng,p_addon:addon,p_scheduled_at:selectedSlotISO(date,time)
    });
    if(error){ console.error(error); const msg=(error.message||"Booking could not be saved."); if(errorBox){errorBox.textContent=msg+" If this is the first setup, run supabase/schema.sql in Supabase SQL Editor.";errorBox.classList.add("show");} else alert(msg); return; }

    if(errorBox){errorBox.classList.remove("show");errorBox.textContent="";}

    showSaved(data);
  };

  window.trackBooking = async function () {
    const id=$("trackBookingId").value.trim().toUpperCase();
    if(!id) return alert("Enter your booking ID.");
    const {data,error}=await client.rpc("track_booking",{p_booking_id:id});
    if(error || !data || !data.length) return alert("Booking ID not found.");
    const s=data[0];
    $("trackResult").textContent=s.status+(s.accepted_date&&s.accepted_time?" • "+s.accepted_date+" • "+s.accepted_time:"");
    $("trackResult").classList.add("show");
  };

  window.cancelBooking = async function () {
    const raw=localStorage.getItem("daivikBooking");
    if(!raw) return alert("No booking found on this device.");
    const booking=JSON.parse(raw);
    if(!booking.booking_token) return alert("This booking cannot be cancelled from this device.");
    if(!confirm("Cancel booking "+booking.id+"?")) return;
    const {data,error}=await client.rpc("cancel_booking",{p_booking_id:booking.id,p_booking_token:booking.booking_token});
    if(error || !data) return alert("Cancellation is locked within 2 hours of the scheduled service or the booking is already cancelled.");
    booking.status="Cancelled";
    localStorage.setItem("daivikBooking",JSON.stringify(booking));
    alert("Booking cancelled successfully.");
  };
})();
