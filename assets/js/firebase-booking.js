/* Daivik Doorstep Firebase booking integration.
   Requires Firebase web SDK + firebase-config.js.
*/
(function () {
  const cfg = window.DAIVIK_FIREBASE_CONFIG || {};
  if (!window.firebase || !cfg.apiKey || String(cfg.apiKey).startsWith("PASTE_")) return;

  if (!firebase.apps.length) firebase.initializeApp(cfg);
  const db = firebase.firestore();
  const auth = firebase.auth();

  async function getUser() {
    if (auth.currentUser) return auth.currentUser;
    const result = await auth.signInAnonymously();
    return result.user;
  }

  function newBookingId() {
    return "DVK-" + Math.random().toString(36).slice(2, 12).toUpperCase();
  }

  window.createBooking = async function () {
    const name = $("bname").value.trim();
    const phone = $("bphone").value.trim();
    const vehicle = $("bvehicle").value;
    const model = $("bmodel").value.trim();
    const wash = $("bwash").value;
    const date = $("bdate").value;
    const time = $("btime").value;
    const address = $("baddress").value.trim();
    const lat = Number($("bLat").value);
    const lng = Number($("bLng").value);
    const distanceKm = Number($("bDistance").value || 0);
    const locationCharge = Number($("bLocationCharge").value || 0);
    const addon = Number($("baddon").value || 0);

    if (!name || !phone || !vehicle || !wash || !date || !time || !address) {
      alert("Please complete all required details.");
      return;
    }
    if (!/^[0-9]{10}$/.test(phone)) {
      alert("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!Number.isFinite(lat)||!Number.isFinite(lng)) {
      alert("Please select your service location using the map or Use My Location.");
      return;
    }

    try {
      const currentUser = await getUser();
      const total = P[vehicle][wash] + addon + locationCharge;
      const id = newBookingId();

      const booking = {
        id, name, phone, vehicle, model, wash, date, time, address, lat, lng, distanceKm, locationCharge, addon, total,
        status: "Pending Confirmation",
        createdBy: currentUser.uid,
        scheduledAt: new Date(date + "T09:00:00").getTime(),
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      await db.collection("bookings").doc(id).set(booking);
      await db.collection("bookingStatus").doc(id).set({
        bookingId: id,
        status: "Pending Confirmation",
        acceptedDate: "",
        acceptedTime: "",
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      localStorage.setItem("daivikBooking", JSON.stringify(booking));

      $("bookingId").textContent = id;
      $("sumService").textContent = P[vehicle].n + " — " + wash.charAt(0).toUpperCase() + wash.slice(1) + " Wash";
      $("sumCar").textContent = model || "Car model not specified";
      $("sumPrice").textContent = "₹" + total.toLocaleString("en-IN");
      $("sumName").textContent = name;
      $("sumSlot").textContent = date + " • " + time;
      $("sumAddress").textContent = address + " • " + distanceKm.toFixed(1) + " km from base";
      $("firebaseStatus").textContent = "Pending Confirmation";
      $("bookingSummary").classList.add("show");

      db.collection("bookingStatus").doc(id).onSnapshot(function (snapshot) {
        if (!snapshot.exists) return;
        const status = snapshot.data();
        $("firebaseStatus").textContent = status.status +
          (status.acceptedDate && status.acceptedTime ? " • " + status.acceptedDate + " • " + status.acceptedTime : "");
      });
    } catch (error) {
      console.error(error);
      alert("Firebase booking failed. Please use WhatsApp while the Firebase project is being configured.");
    }
  };

  window.trackBooking = async function () {
    const id = $("trackBookingId").value.trim().toUpperCase();
    if (!id) return alert("Enter your booking ID.");
    const snapshot = await db.collection("bookingStatus").doc(id).get();
    if (!snapshot.exists) return alert("Booking ID not found.");
    const status = snapshot.data();
    $("trackResult").textContent = status.status +
      (status.acceptedDate && status.acceptedTime ? " • " + status.acceptedDate + " • " + status.acceptedTime : "");
    $("trackResult").classList.add("show");
  };
})();
window.cancelBooking = async function () {
  const raw = localStorage.getItem("daivikBooking");
  if (!raw) return alert("No booking found on this device.");
  const booking = JSON.parse(raw);
  if (booking.scheduledAt && Date.now() > Number(booking.scheduledAt) - 7200000) {
    return alert("Cancellation is locked within 2 hours of the scheduled service.");
  }
  if (!confirm("Cancel booking " + booking.id + "?")) return;
  try {
    const currentUser = firebase.auth().currentUser || (await firebase.auth().signInAnonymously()).user;
    await firebase.firestore().collection("bookings").doc(booking.id).update({
      status: "Cancelled",
      cancelledBy: currentUser.uid,
      cancelledAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    await firebase.firestore().collection("bookingStatus").doc(booking.id).set({
      status: "Cancelled",
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, {merge:true});
  } catch (e) {
    console.error(e);
    alert("Cancellation could not be completed. Please contact Daivik.");
  }
};
