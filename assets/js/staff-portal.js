/* Daivik Service Staff Portal — controlled service/payment workflow */
const client=window.supabase.createClient(window.DAIVIK_SUPABASE_URL,window.DAIVIK_SUPABASE_ANON_KEY);
const $=id=>document.getElementById(id);
let currentEmail="",settings={merchant_name:"Daivik Doorstep Car Care",upi_id:"",qr_image_url:""};

$("sendOtp").onclick=async()=>{
  const email=$("staffEmail").value.trim().toLowerCase();
  if(!/^\S+@\S+\.\S+$/.test(email))return $("loginMsg").textContent="Enter a valid email.";
  $("loginMsg").textContent="Sending…";
  const {error}=await client.auth.signInWithOtp({email,options:{shouldCreateUser:true}});
  if(error){$("loginMsg").textContent=error.message;return;}
  $("loginMsg").textContent="Check email for the login code/link.";
  $("otpBox").hidden=false;
};
$("verifyOtp").onclick=async()=>{
  const email=$("staffEmail").value.trim().toLowerCase(),token=$("otp").value.trim();
  if(!token)return $("loginMsg").textContent="Enter the code.";
  const {error}=await client.auth.verifyOtp({email,token,type:"email"});
  if(error)$("loginMsg").textContent=error.message;
};
$("logout").onclick=()=>client.auth.signOut();
client.auth.onAuthStateChange((_event,session)=>{
  const email=session?.user?.email?.toLowerCase();
  if(!email){$("login").hidden=false;$("app").hidden=true;return;}
  currentEmail=email;$("login").hidden=true;$("app").hidden=false;$("who").textContent="Signed in as "+email;load();
});
async function load(){
  const [{data:rows,error:e1},{data:cfg}]=await Promise.all([
    client.from("bookings").select("*").eq("assigned_staff_email",currentEmail).order("scheduled_at",{ascending:true}),
    client.from("payment_settings").select("*").eq("id",1).maybeSingle()
  ]);
  if(e1){$("loginMsg").textContent=e1.message;return;}
  settings=cfg||settings;render(rows||[]);
}
function render(rows){
  $("empty").hidden=rows.length!==0;
  $("cards").innerHTML=rows.map(card).join("");
  document.querySelectorAll(".start").forEach(b=>b.onclick=()=>action(b.dataset.id,"start"));
  document.querySelectorAll(".payOpen").forEach(b=>b.onclick=()=>togglePay(b.dataset.id,true));
  document.querySelectorAll(".payCancel").forEach(b=>b.onclick=()=>togglePay(b.dataset.id,false));
  document.querySelectorAll(".cash").forEach(b=>b.onclick=()=>setMethod(b.dataset.id,"Cash"));
  document.querySelectorAll(".upi").forEach(b=>b.onclick=()=>setMethod(b.dataset.id,"UPI"));
  document.querySelectorAll(".recordPay").forEach(b=>b.onclick=()=>recordPayment(b.dataset.id));
  document.querySelectorAll(".close").forEach(b=>b.onclick=()=>action(b.dataset.id,"close"));
  document.querySelectorAll(".upiAmount").forEach(x=>x.addEventListener("input",()=>drawQr(x.dataset.id)));
  document.querySelectorAll(".paymentbox").forEach(x=>{if(x.dataset.method==="UPI")drawQr(x.dataset.id);});
}
function card(b){
  const total=Number(b.total||0),paid=Number(b.collected_amount||0);
  let primary="";
  if(b.status==="Accepted")primary="<button class='btn green start' data-id='"+esc(b.id)+"'>Start Service</button>";
  if(b.status==="In Service")primary="<button class='btn green payOpen' data-id='"+esc(b.id)+"'>Collect Payment</button>";
  if(b.status==="Payment Pending"&&b.payment_status==="Paid")primary="<button class='btn green close' data-id='"+esc(b.id)+"'>Close Booking</button>";
  const payBox=(b.status==="In Service"||b.status==="Payment Pending")&&b.payment_status!=="Paid"?paymentBox(b):"";
  return "<div class='card'><div><span class='pill'>"+esc(b.status)+"</span><h2 style='margin:10px 0 4px'>"+esc(b.id)+"</h2><p><b>"+esc(b.name)+"</b> • "+esc(b.phone)+"<br>"+esc(b.model||"Vehicle")+" • "+esc(label(b.vehicle))+" • "+esc(label(b.wash))+"</p><p class='sub'>"+esc(b.date)+" • "+esc(b.time)+"<br>"+esc(b.address)+"</p><div class='amount'>₹"+total.toLocaleString("en-IN")+"</div><div class='hint'>Payment: "+esc(b.payment_status||"Pending")+" • Collected: ₹"+paid.toLocaleString("en-IN")+"</div><div class='actions'>"+primary+(b.lat&&b.lng?"<a class='btn light' target='_blank' href='https://www.google.com/maps?q="+encodeURIComponent(b.lat+","+b.lng)+"'>Open Location</a>":"")+"<a class='btn light' href='tel:"+esc(b.phone)+"'>Call Customer</a></div>"+payBox+"</div><div><div class='qr' id='qr-"+esc(b.id)+"'><b>UPI QR</b><div class='hint'>QR appears when UPI is selected.</div></div></div></div>";
}
function paymentBox(b){
  return "<div id='pay-"+esc(b.id)+"' class='paymentbox show' data-method='Cash'><b>Payment Collection</b><div class='method'><button class='btn light cash' data-id='"+esc(b.id)+"'>Cash</button><button class='btn light upi' data-id='"+esc(b.id)+"'>Online / UPI</button></div><input id='amount-"+esc(b.id)+"' class='input upiAmount' data-id='"+esc(b.id)+"' type='number' min='1' value='"+Number(b.total||0)+"' placeholder='Amount collected'><input id='ref-"+esc(b.id)+"' class='input' placeholder='UPI transaction/reference ID (required for UPI)'><button class='btn green recordPay' data-id='"+esc(b.id)+"'>Mark Payment Received</button><button class='btn light payCancel' data-id='"+esc(b.id)+"' style='margin-left:6px'>Cancel</button><div class='hint' style='margin-top:8px'>Do not close the booking until the actual payment is received and the collected amount is recorded.</div></div>";
}
function togglePay(id,on){const x=$("pay-"+id);if(x)x.classList.toggle("show",on);}
function setMethod(id,method){
  const box=$("pay-"+id);if(!box)return;
  box.dataset.method=method;
  box.querySelector(".cash").classList.toggle("active",method==="Cash");
  box.querySelector(".upi").classList.toggle("active",method==="UPI");
  const ref=$("ref-"+id);ref.placeholder=method==="UPI"?"UPI transaction/reference ID (required for UPI)":"Receipt / note (optional for cash)";
  const qr=$("qr-"+id);
  if(method==="UPI")drawQr(id);else qr.innerHTML="<b>CASH PAYMENT</b><div class='hint' style='margin-top:8px'>Collect ₹"+Number($("amount-"+id).value||0).toLocaleString("en-IN")+" in cash, then record the amount.</div>";
}
function drawQr(id){
  const box=$("qr-"+id),pay=$("pay-"+id);if(!box||!pay)return;
  if(pay.dataset.method!=="UPI")return;
  const amount=Number($("amount-"+id)?.value||0);
  if(!settings.upi_id){box.innerHTML="<b>UPI not configured</b><div class='hint'>Admin must add the business UPI ID.</div>";return;}
  box.innerHTML="";
  if(settings.qr_image_url){const img=document.createElement("img");img.src=settings.qr_image_url;img.alt="Daivik UPI QR";box.appendChild(img);}
  if(window.QRCode){
    const holder=document.createElement("div");holder.style.marginTop="10px";box.appendChild(holder);
    const uri="upi://pay?pa="+encodeURIComponent(settings.upi_id)+"&pn="+encodeURIComponent(settings.merchant_name||"Daivik Doorstep Car Care")+"&am="+encodeURIComponent(amount.toFixed(2))+"&cu=INR&tn="+encodeURIComponent("Daivik "+id);
    new QRCode(holder,{text:uri,width:210,height:210});
  }
  const t=document.createElement("div");t.className="hint";t.style.marginTop="8px";t.textContent="Pay exactly ₹"+amount.toLocaleString("en-IN")+" • "+settings.upi_id;box.appendChild(t);
}
async function recordPayment(id){
  const pay=$("pay-"+id),method=pay?.dataset.method||"Cash",amount=Number($("amount-"+id)?.value||0),ref=$("ref-"+id)?.value.trim()||null;
  const booking=await getBooking(id);
  if(!booking)return;
  if(amount<Number(booking.total))return alert("Full booking amount ₹"+Number(booking.total).toLocaleString("en-IN")+" is required before closing.");
  if(method==="UPI"&&!ref)return alert("Enter the UPI transaction/reference ID after the customer completes payment.");
  await action(id,"payment",method,amount,ref);
}
async function action(id,act,method=null,amount=null,ref=null){
  const {data,error}=await client.rpc("staff_update_booking",{p_booking_id:id,p_action:act,p_payment_method:method,p_collected_amount:amount,p_payment_reference:ref});
  if(error)return alert(error.message);
  await load();
}
async function getBooking(id){
  const {data}=await client.from("bookings").select("*").eq("id",id).maybeSingle();
  return data||null;
}
function money(v){return "₹"+Number(v||0).toLocaleString("en-IN")}
function label(v){return String(v||"").replace(/-/g," ").replace(/\b\w/g,m=>m.toUpperCase())}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
