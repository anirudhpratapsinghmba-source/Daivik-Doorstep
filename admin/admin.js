/* Daivik Admin — booking, staff assignment and payment operations */
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
$("savePaymentSettings").onclick=savePaymentSettings;

client.auth.onAuthStateChange((_event,session)=>{
  const user=session?.user;
  if(!user||(adminEmail&&user.email!==adminEmail)){
    $("loginPanel").hidden=false;$("dashboard").hidden=true;return;
  }
  $("loginPanel").hidden=true;$("dashboard").hidden=false;loadBookings();loadPaymentSettings();
});

async function loadBookings(){
  const {data,error}=await client.from("bookings").select("*").order("created_at",{ascending:false}).limit(200);
  if(error){$("loginMessage").textContent=error.message;return;}
  allBookings=data||[];updateStats();renderAnalytics();renderBookings();
}
async function loadPaymentSettings(){
  const {data,error}=await client.from("payment_settings").select("*").eq("id",1).maybeSingle();
  if(error||!data)return;
  $("merchantName").value=data.merchant_name||"Daivik Doorstep Car Care";
  $("upiId").value=data.upi_id||"";
  $("qrImageUrl").value=data.qr_image_url||"";
  renderQrPreview();
}
async function savePaymentSettings(){
  const payload={id:1,merchant_name:$("merchantName").value.trim()||"Daivik Doorstep Car Care",upi_id:$("upiId").value.trim(),qr_image_url:$("qrImageUrl").value.trim(),updated_at:new Date().toISOString()};
  const {error}=await client.from("payment_settings").update(payload).eq("id",1);
  $("settingsMsg").textContent=error?error.message:"Payment setup saved.";
  renderQrPreview();
}
function renderQrPreview(){
  const box=$("qrPreview");box.innerHTML="";
  const img=$("qrImageUrl").value.trim();
  const upi=$("upiId").value.trim();
  if(img){const el=document.createElement("img");el.src=img;el.alt="Daivik QR";box.appendChild(el);return;}
  if(!upi){box.textContent="Set UPI ID";return;}
  if(window.QRCode){
    const wrap=document.createElement("div");box.appendChild(wrap);
    new QRCode(wrap,{text:upiUri(upi,1,"Daivik Preview"),width:165,height:165});
  }
}
$("upiId").addEventListener("input",renderQrPreview);
$("qrImageUrl").addEventListener("input",renderQrPreview);

function renderAnalytics(){const now=new Date(),days=[];for(let i=6;i>=0;i--){const d=new Date(now);d.setHours(0,0,0,0);d.setDate(d.getDate()-i);days.push(d)}const paid=allBookings.filter(b=>b.payment_status==="Paid"),revenue=paid.reduce((s,b)=>s+Number(b.collected_amount||b.total||0),0),avg=allBookings.length?allBookings.reduce((s,b)=>s+Number(b.total||0),0)/allBookings.length:0,cancelled=allBookings.filter(b=>b.status==="Cancelled").length,open=allBookings.filter(b=>!["Completed","Cancelled"].includes(b.status)).length,rate=allBookings.length?Math.round(paid.length/allBookings.length*100):0,cancelRate=allBookings.length?Math.round(cancelled/allBookings.length*100):0;const values=days.map(d=>allBookings.filter(b=>{const x=new Date(b.created_at||b.date);return x.getFullYear()===d.getFullYear()&&x.getMonth()===d.getMonth()&&x.getDate()===d.getDate()}).reduce((s,b)=>s+Number(b.total||0),0)),max=Math.max(1,...values);$("revenueChart").innerHTML=values.map((v,i)=>"<div class=barCol><b>"+(v?"₹"+Math.round(v):"")+"</b><div class=bar style=height:"+Math.max(3,Math.round(v/max*125))+"px></div><small>"+days[i].toLocaleDateString("en-IN",{weekday:"short"}).slice(0,3)+"</small></div>").join("");$("analyticsRevenue").textContent=money(revenue);$("avgOrder").textContent=money(avg);$("collectionRate").textContent=rate+"%";$("cancelRate").textContent=cancelRate+"%";$("openBookings").textContent=open;$("analyticsInsight").textContent=cancelRate>15?"Cancellation rate is high — review slot confirmation and customer reminders.":open>10?"You have a sizeable open queue — prioritise pending confirmations and staff assignment.":paid.length?"Collections are active. Keep payment status updated after every doorstep job.":"New bookings will appear here automatically after the first customer booking."}
function updateStats(){
  $("count").textContent=allBookings.length;
  $("pending").textContent=allBookings.filter(b=>b.status==="Pending Confirmation").length;
  $("accepted").textContent=allBookings.filter(b=>b.status==="Accepted").length;
  $("completed").textContent=allBookings.filter(b=>b.status==="Completed").length;
  $("paid").textContent=allBookings.filter(b=>b.payment_status==="Paid").length;
}
function renderBookings(){
  const q=($("search").value||"").trim().toLowerCase(),filter=$("statusFilter").value;
  const rows=allBookings.filter(b=>{
    const hay=[b.id,b.name,b.phone,b.vehicle,b.model,b.wash,b.address,b.payment_status,b.assigned_staff_email].join(" ").toLowerCase();
    return (!q||hay.includes(q))&&(!filter||b.status===filter);
  });
  $("empty").hidden=rows.length!==0;$("bookingRows").innerHTML=rows.map(row).join("");
  document.querySelectorAll(".save").forEach(x=>x.onclick=()=>updateBooking(x.dataset.id));
}
function row(b){
  const total=Number(b.total||0),charge=Number(b.location_charge||0),discount=Number(b.discount_amount||0);
  const map=b.lat&&b.lng?"<a class='maplink' href='https://www.google.com/maps?q="+encodeURIComponent(b.lat+","+b.lng)+"' target='_blank' rel='noopener'>📍 Open customer pin</a>":"—";
  return "<tr>"+
  "<td><b>"+esc(b.id)+"</b><br><span class='muted'>"+esc(b.status)+"</span></td>"+
  "<td><b>"+esc(b.name)+"</b><br>"+esc(b.phone)+"</td>"+
  "<td><b>"+esc(b.model||"Vehicle")+"</b><br>"+esc(label(b.vehicle))+" • "+esc(label(b.wash))+"</td>"+
  "<td>"+esc(b.date)+"<br>"+esc(b.time)+"</td>"+
  "<td>"+esc(b.address)+"<br><b>"+Number(b.distance_km||0).toFixed(1)+" km</b> • "+money(charge)+" location charge<br>"+map+"</td>"+
  "<td><b>"+money(total)+"</b><br><span class='muted'>Base "+money(b.base_price)+" − offer "+money(discount)+" + add-on "+money(b.addon)+"</span></td>"+
  "<td><b>"+esc(b.payment_status||"Pending")+"</b><br><span class='muted'>"+esc(b.payment_method||"—")+" • Collected "+money(b.collected_amount)+"</span>"+(b.payment_reference?"<br><span class='muted'>Ref: "+esc(b.payment_reference)+"</span>":"")+"</td>"+
  "<td><div class='manage'>"+
  "<input data-id='"+esc(b.id)+"' class='staffEmail' type='email' placeholder='Service person email' value='"+esc(b.assigned_staff_email||"")+"'>"+
  "<select data-id='"+esc(b.id)+"' class='status'>"+opts(b.status)+"</select>"+
  "<select data-id='"+esc(b.id)+"' class='paymentStatus'>"+paymentOpts(b.payment_status)+"</select>"+
  "<select data-id='"+esc(b.id)+"' class='paymentMethod'><option value=''>Payment method</option><option "+(b.payment_method==="Cash"?"selected":"")+">Cash</option><option "+(b.payment_method==="UPI"?"selected":"")+">UPI</option></select>"+
  "<input data-id='"+esc(b.id)+"' class='collectedAmount' type='number' min='0' placeholder='Collected amount' value='"+(b.collected_amount||"")+"'>"+
  "<input data-id='"+esc(b.id)+"' class='paymentReference' placeholder='UPI txn/ref (optional for cash)' value='"+esc(b.payment_reference||"")+"'>"+
  "<input data-id='"+esc(b.id)+"' class='acceptedDate' type='date' value='"+esc(b.accepted_date||"")+"'>"+
  "<input data-id='"+esc(b.id)+"' class='acceptedTime' placeholder='Accepted time' value='"+esc(b.accepted_time||"")+"'>"+
  "<button data-id='"+esc(b.id)+"' class='save btn green'>Save booking</button></div></td></tr>";
}
function opts(current){return ["Pending Confirmation","Accepted","In Service","Payment Pending","Cancelled","Completed"].map(s=>"<option"+(s===current?" selected":"")+">"+s+"</option>").join("");}
function paymentOpts(current){const c=current||"Pending";return ["Pending","Paid","Failed","Refunded"].map(s=>"<option"+(s===c?" selected":"")+">"+s+"</option>").join("");}
async function updateBooking(id){
  const q=s=>document.querySelector(s+"[data-id='"+CSS.escape(id)+"']");
  const status=q(".status").value,paymentStatus=q(".paymentStatus").value,paymentMethod=q(".paymentMethod").value||null;
  const collected=Number(q(".collectedAmount").value||0);
  const ref=q(".paymentReference").value.trim()||null;
  const staff=q(".staffEmail").value.trim().toLowerCase()||null;
  const date=q(".acceptedDate").value||null,time=q(".acceptedTime").value.trim()||null;
  const patch={status,accepted_date:date,accepted_time:time,payment_status:paymentStatus,payment_method:paymentMethod,collected_amount:collected,payment_reference:ref,assigned_staff_email:staff,updated_at:new Date().toISOString()}; if(paymentStatus==="Paid"){patch.paid_at=new Date().toISOString();patch.paid_by=adminEmail;} if(status==="Completed"){patch.closed_at=new Date().toISOString();patch.closed_by=adminEmail;}
  if(paymentStatus==="Paid"&&!patch.payment_method) return alert("Select Cash or UPI for a Paid booking.");
  if(paymentStatus==="Paid"&&!patch.collected_amount) return alert("Enter collected amount.");
  if(status==="Completed"&&(paymentStatus!=="Paid"||collected<Number(allBookings.find(b=>b.id===id)?.total||0))) return alert("A booking can be closed only after full payment is recorded.");
  if(staff&& !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(staff)) return alert("Enter a valid staff email.");
  const {error}=await client.from("bookings").update(patch).eq("id",id);
  if(error)return alert(error.message);
  await loadBookings();
}
function upiUri(upi,amount,note){return "upi://pay?pa="+encodeURIComponent(upi)+"&pn="+encodeURIComponent($("merchantName").value.trim()||"Daivik Doorstep Car Care")+"&am="+encodeURIComponent(Number(amount).toFixed(2))+"&cu=INR&tn="+encodeURIComponent(note);}
function money(v){return "₹"+Number(v||0).toLocaleString("en-IN");}
function label(v){return String(v||"").replace(/-/g," ").replace(/\b\w/g,m=>m.toUpperCase());}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
