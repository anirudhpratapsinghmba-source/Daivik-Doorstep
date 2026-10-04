/* Daivik Admin — Supabase booking operations */
const client=window.supabase.createClient(window.DAIVIK_SUPABASE_URL,window.DAIVIK_SUPABASE_ANON_KEY);
const adminEmail=window.DAIVIK_ADMIN_EMAIL||"";
const $=id=>document.getElementById(id);
let allBookings=[];

$("loginBtn").onclick=async()=>{
 $("loginMessage").textContent="Signing in…";
 const {error}=await client.auth.signInWithPassword({email:$("email").value.trim(),password:$("password").value});
 $("loginMessage").textContent=error?error.message:"";
};
$("logoutBtn").onclick=()=>client.auth.signOut();
$("refreshBtn").onclick=loadBookings;
$("search").addEventListener("input",renderBookings);
$("statusFilter").addEventListener("change",renderBookings);

client.auth.onAuthStateChange((_event,session)=>{
 const user=session?.user;
 if(!user||(adminEmail&&user.email!==adminEmail)){
   $("loginPanel").hidden=false;$("dashboard").hidden=true;return;
 }
 $("loginPanel").hidden=true;$("dashboard").hidden=false;loadBookings();
});

async function loadBookings(){
 const {data,error}=await client.from("bookings").select("*").order("created_at",{ascending:false}).limit(200);
 if(error){$("loginMessage").textContent=error.message;return;}
 allBookings=data||[];
 updateStats();renderBookings();
}
function updateStats(){
 $("count").textContent=allBookings.length;
 $("pending").textContent=allBookings.filter(b=>b.status==="Pending Confirmation").length;
 $("accepted").textContent=allBookings.filter(b=>b.status==="Accepted").length;
 $("completed").textContent=allBookings.filter(b=>b.status==="Completed").length;
}
function renderBookings(){
 const q=($("search").value||"").trim().toLowerCase(),filter=$("statusFilter").value;
 const rows=allBookings.filter(b=>{
   const hay=[b.id,b.name,b.phone,b.vehicle,b.model,b.wash,b.address].join(" ").toLowerCase();
   return (!q||hay.includes(q))&&(!filter||b.status===filter);
 });
 $("empty").hidden=rows.length!==0;
 $("bookingRows").innerHTML=rows.map(b=>row(b)).join("");
 document.querySelectorAll(".save").forEach(x=>x.onclick=()=>updateBooking(x.dataset.id));
}
function row(b){
 const total=Number(b.total||0),charge=Number(b.location_charge||0);
 const map=b.lat&&b.lng?"<a class='maplink' href='https://www.google.com/maps?q="+encodeURIComponent(b.lat+","+b.lng)+"' target='_blank' rel='noopener'>📍 Open pin</a>":"—";
 return "<tr>"+
 "<td><b>"+esc(b.id)+"</b><br><span class='muted'>"+esc(b.status)+"</span></td>"+
 "<td><b>"+esc(b.name)+"</b><br>"+esc(b.phone)+"</td>"+
 "<td><b>"+esc(b.model||"Vehicle")+"</b><br>"+esc(label(b.vehicle))+" • "+esc(label(b.wash))+"</td>"+
 "<td>"+esc(b.date)+"<br>"+esc(b.time)+"</td>"+
 "<td>"+esc(b.address)+"<br><b>"+Number(b.distance_km||0).toFixed(1)+" km</b> • ₹"+charge.toLocaleString("en-IN")+" charge<br>"+map+"</td>"+
 "<td><b>₹"+total.toLocaleString("en-IN")+"</b><br><span class='muted'>Base ₹"+Number(b.base_price||0).toLocaleString("en-IN")+" + add-on ₹"+Number(b.addon||0).toLocaleString("en-IN")+"</span></td>"+
 "<td><div class='manage'><select data-id='"+esc(b.id)+"' class='status'>"+opts(b.status)+"</select><input data-id='"+esc(b.id)+"' class='acceptedDate' type='date' value='"+esc(b.accepted_date||"")+"'><input data-id='"+esc(b.id)+"' class='acceptedTime' placeholder='Accepted time' value='"+esc(b.accepted_time||"")+"'><button data-id='"+esc(b.id)+"' class='save btn green'>Save booking</button></div></td></tr>";
}
function opts(current){return ["Pending Confirmation","Accepted","Cancelled","Completed"].map(s=>"<option"+(s===current?" selected":"")+">"+s+"</option>").join("")}
async function updateBooking(id){
 const status=document.querySelector(".status[data-id='"+CSS.escape(id)+"']").value;
 const date=document.querySelector(".acceptedDate[data-id='"+CSS.escape(id)+"']").value||null;
 const time=document.querySelector(".acceptedTime[data-id='"+CSS.escape(id)+"']").value.trim()||null;
 const {error}=await client.from("bookings").update({status,accepted_date:date,accepted_time:time,updated_at:new Date().toISOString()}).eq("id",id);
 if(error)return alert(error.message);
 await loadBookings();
}
function label(v){return String(v||"").replace(/-/g," ").replace(/\b\w/g,m=>m.toUpperCase())}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
