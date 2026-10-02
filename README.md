# Daivik-Doorstep

Professional doorstep car-care booking website.

## Firebase booking architecture

- GitHub Pages hosts the frontend.
- Firebase Authentication provides anonymous customer sessions and email/password admin login.
- Cloud Firestore stores booking records and customer-visible booking status.
- Customer booking status can be tracked using the booking ID.
- Admin can move bookings between Pending Confirmation, Accepted, Cancelled and Completed.
- Accepted date/time can be published to the customer.
- Customer cancellation is restricted to more than 2 hours before the scheduled service; Firestore rules enforce the server-side time check.
- WhatsApp remains available as a fallback confirmation channel.

## Firebase setup

1. Create a Firebase project.
2. Add a Web App and copy its Firebase config.
3. Enable **Authentication → Sign-in method → Anonymous**.
4. Enable **Authentication → Sign-in method → Email/Password** for the admin account.
5. Create a Cloud Firestore database.
6. Put the Web App config into `assets/js/firebase-config.js`.
7. Set `DAIVIK_ADMIN_EMAIL` in that file to the admin email.
8. Replace `PASTE_ADMIN_EMAIL` in `firestore.rules` with the same admin email and publish the rules.
9. Create the admin email/password account in Firebase Authentication.
10. Open `admin-dashboard.html` after deployment for the booking dashboard.

The Firebase Web config is intended for client-side use; never place a service-account private key in the repository.

## Deployment

GitHub Pages deploys the `main` branch from the repository root.

Live site:
https://anirudhpratapsinghmba-source.github.io/Daivik-Doorstep/
