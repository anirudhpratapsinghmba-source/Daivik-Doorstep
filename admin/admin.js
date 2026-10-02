const cfg = window.DAIVIK_FIREBASE_CONFIG || {};
const adminEmail = window.DAIVIK_ADMIN_EMAIL || "";

if (window.firebase && cfg.apiKey && !String(cfg.apiKey).startsWith("PASTE_")) {
  if (!firebase.apps.length) firebase.initializeApp(cfg);
  const auth = firebase.auth();
  const db = firebase.firestore();

  const $ = id => document.getElementById(id);

  $("loginBtn").onclick = async function () {
    try {
      await auth.signInWithEmailAndPassword($("email").value.trim(), $("password").value);
      $("loginMessage").textContent = "";
    } catch (e) {
      $("loginMessage").textContent = e.message;
    }
  };

  $("logoutBtn").onclick = () => auth.signOut();

  auth.onAuthStateChanged(function (user) {
    if (!user || (adminEmail && user.email !== adminEmail)) {
      $("loginPanel").hidden = false;
      $("dashboard").hidden = true;
      return;
    }
    $("loginPanel").hidden = true;
    $("dashboard").hidden = false;
    loadBookings();
  });

  function esc(v) {
    return String(v || "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", """:"&quot;", "'":"&#039;" }[c]));
  }

  function loadBookings() {
    db.collection("bookings").orderBy("createdAt", "desc").limit(100).onSnapshot(function (snapshot) {
      $("count").textContent = snapshot.size;
      $("bookingRows").innerHTML = snapshot.docs.map(doc => {
        const b = doc.data();
        return "<tr>" +
          "<td><b>"+esc(b.id)+"</b><br>"+esc(b.status)+"</td>" +
          "<td>"+esc(b.name)+"<br>"+esc(b.phone)+"</td>" +
          "<td>"+esc(b.vehicle)+"<br>"+esc(b.model)+"</td>" +
          "<td>"+esc(b.wash)+"<br>₹"+Number(b.total || 0).toLocaleString("en-IN")+"</td>" +
          "<td>"+esc(b.date)+"<br>"+esc(b.time)+"</td>" +
          "<td>"+esc(b.address)+"</td>" +
          "<td><select data-id='"+esc(b.id)+"' class='status'><option>Pending Confirmation</option><option>Accepted</option><option>Cancelled</option><option>Completed</option></select><input data-id='"+esc(b.id)+"' class='acceptedDate' type='date' value='"+esc(b.acceptedDate)+"'><input data-id='"+esc(b.id)+"' class='acceptedTime' placeholder='Accepted time' value='"+esc(b.acceptedTime)+"'><button data-id='"+esc(b.id)+"' class='save'>Save</button></td>" +
          "</tr>";
      }).join("");

      document.querySelectorAll(".status").forEach(el => {
        const doc = snapshot.docs.find(x => x.id === el.dataset.id);
        if (doc) el.value = doc.data().status || "Pending Confirmation";
      });
      document.querySelectorAll(".save").forEach(el => el.onclick = () => updateBooking(el.dataset.id));
    });
  }

  async function updateBooking(id) {
    const status = document.querySelector(".status[data-id='"+CSS.escape(id)+"']").value;
    const date = document.querySelector(".acceptedDate[data-id='"+CSS.escape(id)+"']").value;
    const time = document.querySelector(".acceptedTime[data-id='"+CSS.escape(id)+"']").value.trim();

    await db.collection("bookings").doc(id).update({
      status: status,
      acceptedDate: date,
      acceptedTime: time,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    await db.collection("bookingStatus").doc(id).set({
      bookingId: id,
      status: status,
      acceptedDate: date,
      acceptedTime: time,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    alert("Booking updated.");
  }
}