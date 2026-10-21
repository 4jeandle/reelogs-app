import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getDatabase } from "firebase/database";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyAm19ZyhJQsIHRXcqzEXbtAEL9ubHJMNP8",
  authDomain: "ottmovie-5e14a.firebaseapp.com",
  databaseURL: "https://ottmovie-5e14a-default-rtdb.firebaseio.com",
  projectId: "ottmovie-5e14a",
  storageBucket: "ottmovie-5e14a.firebasestorage.app",
  messagingSenderId: "88239151094",
  appId: "1:88239151094:web:3a8c6234de6e0074aed9d7"
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
export const db = getFirestore(app);
export const storage = getStorage(app);
export const rtdb = getDatabase(app);
