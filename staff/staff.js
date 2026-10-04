/* Daivik staff console — assigned jobs + controlled payment/closure */
(function(){
 const client=window.supabase.createClient(window.DAIVIK_SUPABASE_URL,window.DAIVIK_SUPABASE_ANON_KEY);
 const $=id=>document.getElementById(id);
 let sessionUser=null, settings=null, jobs=[];

 $("loginBtn").onclick=async()=>{
   $("loginMessage").textContent="Signing in…";
   const {error}=await client.auth.signInWithPassword({email:$("email").value.trim(),password:$("password").value});
   $("loginMessage").textContent=error?error.message:"";
 };
 $("logoutBtn").onclick=()=>client.auth.signOut();
 $("refreshBtn").onclick=loadJobs;

 client.auth.onAuthStateChange((_event,session)=>{
   sessionUser=session?.user||null;
   if(!sessionUser){$("loginPanel").hidden=false;$("app").hidden=true;return;}
   $("loginPanel").hidden=true;$("app").hidden=false;loadJobs();
 });

 async function loadJobs(){
   const {data:s,error:se}=await client.from("payment_settings").select("*").eq("id",1).maybeSingle();
   settings=s||null;
   const {data,error}=await client.from("bookings").select("*").order("scheduled_at",{ascending:true}).limit(100);
   if(error){$("jobs").innerHTML='<div class="panel error">'+esc(error.message)+'</div>';return;}
   jobs=data||[];render();
 }
 function render(){
   $("empty").hidden=jobs.length!==0;
   $("jobs").innerHTML=jobs.map(job).join("");
   document.querySelectorAll("[data-action]").forEach(btn=>btn.onclick=()=>action(btn.dataset.action,btn.dataset.id));
   document.querySelectorAll(".method").forEach(x=>x.onchange=()=>togglePayment(x.dataset.id));
 }
 function job(b){
   const terminal=b.status==="Completed"||b.status==="Cancelled";
   const accepted=b.status!=="Pending Confirmation";
   const canStart=["Accepted","In Service"].includes(b.status);
   const canPay=["In Service","Payment Pending"].includes(b.status);
   const canClose=b.payment_status==="Paid"&&Number(b.collected_amount||0)>=Number(b.total||0);
   return '<article class="job">'+
    '<div class="jobhead"><div><div class="id">'+esc(b.id)+'</div><div class="hint">'+esc(b.name)+' • '+esc(b.phone)+'</div></div><span class="badge">'+esc(b.status)+'</span></div>'+
    '<div class="grid">'+
      item("Car",b.model||"Vehicle")+" "+item("Service",label(b.wash)+" • "+label(b.vehicle))+
      item("Schedule",String(b.date)+" • "+String(b.time))+item("Amount","₹"+Number(b.total||0).toLocaleString("en-IN"))+
      item("Location",b.address+" • "+Number(b.distance_km||0).toFixed(1)+" km")+
      item("Payment",label(b.payment_status||"Pending")+(b.payment_method?" • "+b.payment_method:""))+
    '</div>'+
    '<div class="actions">'+
      (canStart?'<button class="btn green" data-action="start" data-id="'+esc(b.id)+'">'+(b.status==="In Service"?"Service In Progress":"Start Service")+'</button>':"")+
      (canPay?paymentBox(b):"")+
      (canClose?'<button class="btn green" data-action="close" data-id="'+esc(b.id)+'">Close Booking / Mark Completed</button>':"")+
      (terminal?'<div class="hint">This booking is closed.</div>':"")+
    '</div></article>';
 }
 function paymentBox(b){
   return '<div class="paymentbox"><b>Final Payment</b><div class="hint" style="margin:5px 0 10px">Record the actual amount collected. Booking cannot be closed until full payment is recorded.</div>'+
     '<div class="amount">₹'+Number(b.total||0).toLocaleString("en-IN")+'</div>'+
     '<div class="paymentchoice" style="margin-top:10px">'+
       '<select class="select method" data-id="'+esc(b.id)+'"><option value="">Choose payment method</option><option value="Cash">Cash</option><option value="UPI">Online UPI</option></select>'+
       '<input id="amt-'+esc(b.id)+'" class="input" type="number" min="1" value="'+Number(b.total||0)+'" placeholder="Amount collected">'+
     '</div>'+
     '<div id="upi-'+esc(b.id)+'" hidden>'+ 
       '<div class="qrwrap"><div id="qr-'+esc(b.id)+'" class="qr">Select UPI</div><div><b>Scan & Pay</b><p class="hint">Customer can scan this QR from another phone. The QR carries the exact booking amount.</p><a id="upiLink-'+esc(b.id)+'" class="btn light" style="display:inline-block;text-decoration:none;margin:5px 0" href="#">Open UPI App</a><input id="ref-'+esc(b.id)+'" class="input" placeholder="UPI transaction / UTR reference"></div></div>'+
     '</div>'+
     '<button class="btn green" style="margin-top:10px;width:100%" data-action="payment" data-id="'+esc(b.id)+'">Payment Received — Record & Continue</button>'+
   '</div>';
 }
 function togglePayment(id){
   const b=jobs.find(x=>x.id===id),sel=document.querySelector(".method[data-id='"+CSS.escape(id)+"']");
   const box=$("upi-"+id);if(!b||!sel||!box)return;
   box.hidden=sel.value!=="UPI";
   if(sel.value==="UPI")renderQr(b);
 }
 function renderQr(b){
   const box=$("qr-"+b.id);if(!box)return;
   box.innerHTML="";
   const upi=(settings?.upi_id||"").trim();
   if(!upi){box.textContent="Business UPI is not configured";return;}
   const amount=Number($("amt-"+b.id)?.value||b.total||0);
   const uri="upi://pay?pa="+encodeURIComponent(upi)+"&pn="+encodeURIComponent(settings?.merchant_name||"Daivik Doorstep Car Care")+"&am="+encodeURIComponent(amount.toFixed(2))+"&cu=INR&tn="+encodeURIComponent("Daivik "+b.id);
   new QRCode(box,{text:uri,width:170,height:170});
   const link=$("upiLink-"+b.id);if(link)link.href=uri;
 }
 async function action(type,id){
   const b=jobs.find(x=>x.id===id);
   if(!b)return;
   if(type==="payment"){
     const sel=document.querySelector(".method[data-id='"+CSS.escape(id)+"']");
     const amount=Number($("amt-"+id)?.value||0),method=sel?.value||"";
     const ref=$("ref-"+id)?.value.trim()||null;
     if(!method)return alert("Cash or Online UPI select karo.");
     if(amount<Number(b.total||0))return alert("Full booking amount record karna zaroori hai.");
     if(method==="UPI"&&!ref)return alert("Payment ke baad UPI transaction / UTR reference enter karo.");
     await rpc(type,id,method,amount,ref);
     return;
   }
   await rpc(type,id,null,null,null);
 }
 async function rpc(type,id,method,amount,ref){
   const {error}=await client.rpc("staff_update_booking",{p_booking_id:id,p_action:type,p_payment_method:method,p_collected_amount:amount,p_payment_reference:ref});
   if(error){alert(error.message);return;}
   await loadJobs();
 }
 function item(k,v){return '<div class="item"><small>'+k+'</small><b>'+esc(v)+'</b></div>'}
 function label(v){return String(v||"").replace(/-/g," ").replace(/_/g," ").replace(/\b\w/g,m=>m.toUpperCase())}
 function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
})();