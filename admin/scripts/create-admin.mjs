/**
 * AquaPure — Create / Promote Admin Script
 * Usage:
 *   node scripts/create-admin.mjs [email] [password]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

// Automatically load admin/.env if available
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('❌ Missing Firebase config. Set VITE_FIREBASE_* env vars or create admin/.env');
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const email = process.argv[2] || 'admin@aquapure.com';
const password = process.argv[3] || 'Admin@123456';

async function main() {
  console.log(`Connecting to Firebase (${firebaseConfig.projectId})...`);
  console.log(`Setting up admin user: ${email}`);

  let user;
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    user = cred.user;
    console.log(`✅ Created new user in Firebase Auth (UID: ${user.uid})`);
  } catch (err) {
    if (err.code === 'auth/email-already-in-use') {
      console.log(`Account already exists in Auth. Authenticating to verify...`);
      try {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        user = cred.user;
        console.log(`✅ Signed in as existing user (UID: ${user.uid})`);
      } catch (signErr) {
        console.error(`❌ Could not authenticate with existing account: ${signErr.message}`);
        console.log(`Tip: If you forgot the password, reset it in the Firebase Console.`);
        process.exit(1);
      }
    } else {
      console.error(`❌ Error creating user: ${err.message}`);
      process.exit(1);
    }
  }

  // Set admin role in Firestore
  try {
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: email,
      displayName: 'AquaPure Admin',
      role: 'admin',
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    console.log(`✅ Assigned role: 'admin' in Firestore 'users/${user.uid}'`);
    console.log(`\n🎉 Admin account is ready!`);
    console.log(`-----------------------------------`);
    console.log(`Email:    ${email}`);
    console.log(`Password: ${password}`);
    console.log(`-----------------------------------`);
    process.exit(0);
  } catch (dbErr) {
    console.error(`❌ Error updating Firestore: ${dbErr.message}`);
    process.exit(1);
  }
}

main();
