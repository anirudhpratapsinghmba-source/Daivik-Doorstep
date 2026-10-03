/* Daivik Admin — Supabase */
const client = window.supabase.createClient(window.DAIVIK_SUPABASE_URL, window.DAIVIK_SUPABASE_ANON_KEY);
const adminEmail = window.DAIVIK_ADMIN_EMAIL || "";
const $ = id => document.getElementById(id);

$("loginBtn").onclick = async function () {
  $("loginMessage").textContent = "Signing in…";
  const {error}=await client.auth.signInWithPassword({
    email:$("email").value.trim(),
    password:$("password").value
  });
  $("loginMessage").textContent = error ? error.message : "";
};

$("logoutBtn").onclick = () => client.auth.signOut();

client.auth.onAuthStateChange((_event,session) => {
  const user=session?.user;
  if(!user || (adminEmail && user.email !== adminEmail)){
    $("loginPanel").hidden=false; $("dashboard").hidden=true; return;
  }
  $("loginPanel").hidden=true; $("dashboard").hidden=false; loadBookings();
});

async function loadBookings(){
  const {data,error}=await client.from("bookings").select("*").order("created_at",{ascending:false}).limit(100);
  if(error){$("loginMessage").textContent=error.message;return;}
  $("count").textContent=data.length;
  $("bookingRows").innerHTML=data.map(b=>"<tr>"+
    "<td><b>"+esc(b.id)+"</b><br>"+esc(b.status)+"</td>"+
    "<td>"+esc(b.name)+"<br>"+esc(b.phone)+"</td>"+
    "<td>"+esc(b.vehicle)+"<br>"+esc(b.model||"")+"</td>"+
    "<td>"+esc(b.wash)+"<br>₹"+Number(b.total||0).toLocaleString("en-IN")+"</td>"+
    "<td>"+esc(b.date)+"<br>"+esc(b.time)+"</td>"+
    "<td>"+esc(b.address)+"<br><b>"+Number(b.distance_km||0).toFixed(1)+" km</b> • ₹"+Number(b.location_charge||0).toLocaleString("en-IN")+" location charge<br>"+(b.lat&&b.lng?"<a href='https://www.google.com/maps?q="+encodeURIComponent(b.lat+","+b.lng)+"' target='_blank' rel='noopener'>📍 Open Customer Location</a>":"")+"</td>"+
    "<td><select data-id='"+esc(b.id)+"' class='status'><option>Pending Confirmation</option><option>Accepted</option><option>Cancelled</option><option>Completed</option></select><input data-id='"+esc(b.id)+"' class='acceptedDate' type='date' value='"+esc(b.accepted_date||"")+"'><input data-id='"+esc(b.id)+"' class='acceptedTime' placeholder='Accepted time' value='"+esc(b.accepted_time||"")+"'><button data-id='"+esc(b.id)+"' class='save'>Save</button></td></tr>").join("");
  data.forEach(b=>{const s=document.querySelector(".status[data-id='"+CSS.escape(b.id)+"']");if(s)s.value=b.status||"Pending Confirmation";});
  document.querySelectorAll(".save").forEach(el=>el.onclick=()=>updateBooking(el.dataset.id));
}

async function updateBooking(id){
  const status=document.querySelector(".status[data-id='"+CSS.escape(id)+"']").value;
  const date=document.querySelector(".acceptedDate[data-id='"+CSS.escape(id)+"']").value||null;
  const time=document.querySelector(".acceptedTime[data-id='"+CSS.escape(id)+"']").value.trim()||null;
  const {error}=await client.from("bookings").update({
    status,accepted_date:date,accepted_time:time,updated_at:new Date().toISOString()
  }).eq("id",id);
  if(error)return alert(error.message);
  alert("Booking updated.");
  loadBookings();
}

function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
