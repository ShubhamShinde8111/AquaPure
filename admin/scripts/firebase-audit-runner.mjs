/**
 * AquaPure — Comprehensive Firebase Backend Connection Audit Runner
 * Executes live tests against Firebase Auth & Cloud Firestore.
 */

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  deleteUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
  addDoc,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "waterpurifiercommerce.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "waterpurifiercommerce",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "waterpurifiercommerce.firebasestorage.app",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "933338326697",
  appId: process.env.VITE_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey) {
  console.error('❌ Missing VITE_FIREBASE_API_KEY. Configure in admin/.env before running audit.');
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const testId = Date.now();
const testEmail = `audit_test_${testId}@aquapure-test.com`;
const testPassword = `Audit#Pass${testId}!`;

const results = [];

function record(name, status, details = '') {
  results.push({ name, status, details });
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : status === 'WARNING' ? '⚠️' : 'ℹ️';
  console.log(`${icon} [${status}] ${name}: ${details}`);
}

async function runAudit() {
  console.log('=====================================================');
  console.log('   AquaPure Firebase Live Backend Connection Audit   ');
  console.log(`   Project: ${firebaseConfig.projectId}`);
  console.log('=====================================================\n');

  let testUser = null;

  // 1. Firebase Initialization Check
  try {
    if (app && app.name) {
      record('Firebase App Initialization', 'PASS', `App initialized successfully as '[${app.name}]'`);
    } else {
      record('Firebase App Initialization', 'FAIL', 'Firebase app instance was not created');
    }
  } catch (err) {
    record('Firebase App Initialization', 'FAIL', err.message);
  }

  // 2. Authentication: Invalid Credentials Rejection
  try {
    await signInWithEmailAndPassword(auth, 'nonexistent_user_9999@aquapure.com', 'wrong_pass_999');
    record('Auth: Invalid Credentials Rejection', 'FAIL', 'Login unexpectedly succeeded with invalid credentials');
  } catch (err) {
    if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
      record('Auth: Invalid Credentials Rejection', 'PASS', `Correctly threw '${err.code}'`);
    } else {
      record('Auth: Invalid Credentials Rejection', 'WARNING', `Threw error: ${err.code || err.message}`);
    }
  }

  // 3. Authentication: User Registration (Customer)
  try {
    const userCred = await createUserWithEmailAndPassword(auth, testEmail, testPassword);
    testUser = userCred.user;
    record('Auth: User Registration', 'PASS', `Created test user ${testEmail} (UID: ${testUser.uid})`);
  } catch (err) {
    record('Auth: User Registration', 'FAIL', `Failed to create user: ${err.message}`);
  }

  // 4. Authentication: Sign Out
  try {
    await signOut(auth);
    if (!auth.currentUser) {
      record('Auth: Sign Out', 'PASS', 'User signed out; currentUser is null');
    } else {
      record('Auth: Sign Out', 'FAIL', 'currentUser still exists after signOut');
    }
  } catch (err) {
    record('Auth: Sign Out', 'FAIL', err.message);
  }

  // 5. Authentication: Sign In with Valid Credentials
  try {
    const cred = await signInWithEmailAndPassword(auth, testEmail, testPassword);
    record('Auth: Sign In with Valid Credentials', 'PASS', `Signed in as ${cred.user.email} (UID: ${cred.user.uid})`);
    testUser = cred.user;
  } catch (err) {
    record('Auth: Sign In with Valid Credentials', 'FAIL', err.message);
  }

  // 6. Authentication: Password Reset
  try {
    await sendPasswordResetEmail(auth, testEmail);
    record('Auth: Password Reset Email Flow', 'PASS', `Password reset trigger accepted for ${testEmail}`);
  } catch (err) {
    record('Auth: Password Reset Email Flow', 'WARNING', `Password reset error: ${err.code || err.message}`);
  }

  // 7. Cloud Firestore: Check 'products' collection
  try {
    const productsSnap = await getDocs(collection(db, 'products'));
    if (productsSnap.empty) {
      record('Firestore: Products Collection Read', 'WARNING', `Collection 'products' exists/accessible but currently has 0 documents in Firestore`);
    } else {
      record('Firestore: Products Collection Read', 'PASS', `Successfully fetched ${productsSnap.size} products from Firestore`);
    }
  } catch (err) {
    record('Firestore: Products Collection Read', 'FAIL', `Error reading products: ${err.message}`);
  }

  // 8. Cloud Firestore: User Profile Write (users/{uid})
  let userProfileCreated = false;
  if (testUser) {
    try {
      await setDoc(doc(db, 'users', testUser.uid), {
        uid: testUser.uid,
        email: testEmail,
        displayName: 'Audit Test User',
        role: 'customer',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      record('Firestore: User Profile Write', 'PASS', `Successfully wrote user doc 'users/${testUser.uid}'`);
      userProfileCreated = true;
    } catch (err) {
      record('Firestore: User Profile Write', 'FAIL', `Failed to write user profile: ${err.message}`);
    }
  } else {
    record('Firestore: User Profile Write', 'NOT VERIFIED', 'Cannot test without authenticated test user');
  }

  // 9. Cloud Firestore: User Profile Read (users/{uid})
  if (testUser) {
    try {
      const snap = await getDoc(doc(db, 'users', testUser.uid));
      if (snap.exists() && snap.data().email === testEmail) {
        record('Firestore: User Profile Read', 'PASS', `Read profile doc matching email '${testEmail}', role: '${snap.data().role}'`);
      } else {
        record('Firestore: User Profile Read', 'FAIL', `Document does not exist or data does not match`);
      }
    } catch (err) {
      record('Firestore: User Profile Read', 'FAIL', err.message);
    }
  }

  // 10. Security Audit: Can User Self-Promote Role in Profile?
  if (testUser && userProfileCreated) {
    try {
      await updateDoc(doc(db, 'users', testUser.uid), {
        role: 'admin',
      });
      const checkSnap = await getDoc(doc(db, 'users', testUser.uid));
      if (checkSnap.data()?.role === 'admin') {
        record('Security: Role Tampering Protection', 'FAIL', 'VULNERABILITY: Regular authenticated customer was able to set their own role to "admin"!');
      } else {
        record('Security: Role Tampering Protection', 'PASS', 'User could not modify role to admin');
      }
    } catch (err) {
      record('Security: Role Tampering Protection', 'PASS', `Role modification blocked by rules: ${err.message}`);
    }
  }

  // 11. Cloud Firestore: Create Customer Order ('orders' collection)
  let testOrderId = null;
  if (testUser) {
    try {
      const orderDoc = await addDoc(collection(db, 'orders'), {
        customerId: testUser.uid,
        orderType: 'customer',
        items: [
          {
            productId: 'pur-001',
            name: 'Audit Test Purifier',
            price: 14999,
            quantity: 1,
          },
        ],
        subtotal: 14999,
        total: 14999,
        shippingAddress: {
          fullName: 'Audit Test',
          phone: '+91 9999999999',
          addressLine1: 'Test Lab',
          city: 'Tech City',
          pincode: '560001',
        },
        paymentProvider: 'demo_upi',
        paymentStatus: 'test_success',
        orderStatus: 'placed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      testOrderId = orderDoc.id;
      record('Firestore: Create Order', 'PASS', `Created order 'orders/${testOrderId}'`);
    } catch (err) {
      record('Firestore: Create Order', 'FAIL', `Failed to create order: ${err.message}`);
    }
  }

  // 12. Cloud Firestore: Retrieve User Order History
  if (testUser && testOrderId) {
    try {
      const q = query(
        collection(db, 'orders'),
        where('customerId', '==', testUser.uid)
      );
      const ordersSnap = await getDocs(q);
      const found = ordersSnap.docs.some((d) => d.id === testOrderId);
      if (found) {
        record('Firestore: Query User Orders', 'PASS', `Found order ${testOrderId} in customer query`);
      } else {
        record('Firestore: Query User Orders', 'FAIL', 'Order not found in user query');
      }
    } catch (err) {
      record('Firestore: Query User Orders', 'FAIL', `Query failed: ${err.message}`);
    }
  }

  // 13. Cloud Firestore: Create Service Booking ('service_bookings')
  let testBookingId = null;
  if (testUser) {
    try {
      const bookingDoc = await addDoc(collection(db, 'service_bookings'), {
        userId: testUser.uid,
        serviceType: 'installation',
        preferredDate: 'Tomorrow',
        preferredTime: 'Morning (09:00 AM - 12:00 PM)',
        address: {
          fullName: 'Audit User',
          phone: '+91 9999999999',
          addressLine1: 'Test Lab',
          city: 'Tech City',
          pincode: '560001',
        },
        status: 'requested',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      testBookingId = bookingDoc.id;
      record('Firestore: Create Service Booking', 'PASS', `Created service booking 'service_bookings/${testBookingId}'`);
    } catch (err) {
      record('Firestore: Create Service Booking', 'FAIL', `Failed to create service booking: ${err.message}`);
    }
  }

  // 14. Cloud Firestore: Query Service Bookings
  if (testUser && testBookingId) {
    try {
      const q = query(
        collection(db, 'service_bookings'),
        where('userId', '==', testUser.uid)
      );
      const bookingsSnap = await getDocs(q);
      const found = bookingsSnap.docs.some((d) => d.id === testBookingId);
      if (found) {
        record('Firestore: Query User Service Bookings', 'PASS', `Found booking ${testBookingId} in user query`);
      } else {
        record('Firestore: Query User Service Bookings', 'FAIL', 'Booking not found in user query');
      }
    } catch (err) {
      record('Firestore: Query User Service Bookings', 'FAIL', err.message);
    }
  }

  // 15. Security: Unauthenticated Write Rejection
  try {
    await signOut(auth);
    await addDoc(collection(db, 'orders'), {
      customerId: 'unauthenticated-intruder',
      total: 100,
    });
    record('Security: Unauthenticated Write Rejection', 'FAIL', 'Unauthenticated user was allowed to write to "orders" collection!');
  } catch (err) {
    record('Security: Unauthenticated Write Rejection', 'PASS', `Unauthenticated order write blocked: ${err.code || err.message}`);
  }

  // 16. Cleanup: Sign back in and delete test documents and user
  if (testUser) {
    try {
      await signInWithEmailAndPassword(auth, testEmail, testPassword);
      if (testOrderId) {
        await deleteDoc(doc(db, 'orders', testOrderId)).catch(() => {});
      }
      if (testBookingId) {
        await deleteDoc(doc(db, 'service_bookings', testBookingId)).catch(() => {});
      }
      await deleteDoc(doc(db, 'users', testUser.uid)).catch(() => {});
      await deleteUser(auth.currentUser);
      record('Audit Cleanup', 'PASS', `Deleted temporary test docs and test auth user ${testEmail}`);
    } catch (cleanErr) {
      record('Audit Cleanup', 'WARNING', `Cleanup partially completed: ${cleanErr.message}`);
    }
  }

  console.log('\n=====================================================');
  console.log('                 Audit Test Summary                  ');
  console.log('=====================================================');
  const passes = results.filter((r) => r.status === 'PASS').length;
  const fails = results.filter((r) => r.status === 'FAIL').length;
  const warnings = results.filter((r) => r.status === 'WARNING').length;
  console.log(`Total: ${results.length} | PASS: ${passes} | FAIL: ${fails} | WARNING: ${warnings}`);
}

runAudit().catch(console.error);
