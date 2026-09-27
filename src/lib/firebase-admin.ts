import "server-only";

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

function adminApp() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;
  if (!projectId || !clientEmail || !privateKey || !storageBucket) {
    throw new Error("Firebase Admin não configurado");
  }
  return getApps()[0] ?? initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    storageBucket,
  });
}

export const firebaseAdminAuth = () => getAuth(adminApp());
export const firestore = () => getFirestore(adminApp());
export const firebaseBucket = () => getStorage(adminApp()).bucket();
