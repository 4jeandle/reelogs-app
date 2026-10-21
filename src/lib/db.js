import {
  collection, doc, addDoc, updateDoc, deleteDoc, getDoc, getDocs,
  query, where, orderBy, onSnapshot, serverTimestamp, arrayUnion, arrayRemove,
  setDoc, limit
} from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { ref as rtdbRef, set, onValue, onDisconnect, serverTimestamp as rtServerTimestamp } from "firebase/database";
import { db, storage, rtdb, auth } from "./firebase";

// ── 시청 기록 ──────────────────────────────────────────────
export function subscribeMyWatches(uid, callback) {
  const q = query(collection(db, "watches"), where("uid", "==", uid), orderBy("watchedAt", "desc"));
  return onSnapshot(q, snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
}

export function subscribeFriendWatches(friendUid, callback) {
  const q = query(collection(db, "watches"), where("uid", "==", friendUid), orderBy("watchedAt", "desc"));
  return onSnapshot(q, snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
}

export async function addWatch(uid, data) {
  return addDoc(collection(db, "watches"), {
    uid,
    ...data,
    watchedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  });
}

export async function updateWatch(watchId, data) {
  return updateDoc(doc(db, "watches", watchId), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteWatch(watchId) {
  return deleteDoc(doc(db, "watches", watchId));
}

// ── 그룹 ──────────────────────────────────────────────────
export async function createGroup(uid, name) {
  const { customAlphabet } = await import("nanoid");
  const nanoid = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 6);
  const code = nanoid();
  const ref = await addDoc(collection(db, "groups"), {
    name,
    code,
    ownerId: uid,
    members: [uid],
    createdAt: serverTimestamp(),
  });
  return { id: ref.id, code };
}

export function subscribeMyGroups(uid, callback) {
  const q = query(collection(db, "groups"), where("members", "array-contains", uid));
  return onSnapshot(q, snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
}

export function subscribeGroupWatches(memberUids, callback) {
  if (!memberUids || memberUids.length === 0) return () => {};
  const q = query(collection(db, "watches"), where("uid", "in", memberUids.slice(0, 10)), orderBy("watchedAt", "desc"));
  return onSnapshot(q, snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
}

export async function addMemberToGroup(groupId, uid) {
  return updateDoc(doc(db, "groups", groupId), { members: arrayUnion(uid) });
}

export async function removeMemberFromGroup(groupId, uid) {
  return updateDoc(doc(db, "groups", groupId), { members: arrayRemove(uid) });
}

export async function deleteGroup(groupId) {
  return deleteDoc(doc(db, "groups", groupId));
}

export async function joinGroupByCode(uid, code) {
  const q = query(collection(db, "groups"), where("code", "==", code.toUpperCase()));
  const snap = await getDocs(q);
  if (snap.empty) throw new Error("그룹을 찾을 수 없습니다.");
  const groupDoc = snap.docs[0];
  const group = groupDoc.data();
  if (group.members.includes(uid)) throw new Error("이미 참여한 그룹입니다.");
  await updateDoc(groupDoc.ref, { members: arrayUnion(uid) });
  return { id: groupDoc.id, ...group };
}

// ── 친구 ──────────────────────────────────────────────────
export async function addFriendByCode(myUid, code) {
  const q = query(collection(db, "users"), where("inviteCode", "==", code.toUpperCase()));
  const snap = await getDocs(q);
  if (snap.empty) throw new Error("사용자를 찾을 수 없습니다.");
  const friendDoc = snap.docs[0];
  if (friendDoc.id === myUid) throw new Error("자기 자신을 친구로 추가할 수 없습니다.");

  const meRef = doc(db, "users", myUid);
  const friendRef = doc(db, "users", friendDoc.id);

  await updateDoc(meRef, { friends: arrayUnion(friendDoc.id) });
  await updateDoc(friendRef, { friends: arrayUnion(myUid) });
  return { id: friendDoc.id, ...friendDoc.data() };
}

export async function removeFriend(myUid, friendUid) {
  await updateDoc(doc(db, "users", myUid), { friends: arrayRemove(friendUid) });
  await updateDoc(doc(db, "users", friendUid), { friends: arrayRemove(myUid) });
}

// ── 유저 ──────────────────────────────────────────────────
export async function getUsersByUids(uids) {
  if (!uids || uids.length === 0) return [];
  const results = [];
  for (let i = 0; i < uids.length; i += 10) {
    const chunk = uids.slice(i, i + 10);
    const q = query(collection(db, "users"), where("__name__", "in", chunk));
    const snap = await getDocs(q);
    snap.docs.forEach(d => results.push({ id: d.id, ...d.data() }));
  }
  return results;
}

export async function createUserProfile(uid, data) {
  const { customAlphabet } = await import("nanoid");
  const nanoid = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 6);
  const inviteCode = nanoid();
  await setDoc(doc(db, "users", uid), {
    ...data,
    inviteCode,
    friends: [],
    createdAt: serverTimestamp(),
  });
  return inviteCode;
}

export function subscribeUserProfile(uid, callback) {
  return onSnapshot(doc(db, "users", uid), snap => {
    if (snap.exists()) callback({ id: snap.id, ...snap.data() });
    else callback(null);
  });
}

// ── 댓글 ──────────────────────────────────────────────────
export async function addComment(watchId, uid, text) {
  return addDoc(collection(db, "watches", watchId, "comments"), {
    uid, text, createdAt: serverTimestamp(),
  });
}

export async function deleteComment(watchId, commentId) {
  return deleteDoc(doc(db, "watches", watchId, "comments", commentId));
}

export function subscribeComments(watchId, callback) {
  const q = query(collection(db, "watches", watchId, "comments"), orderBy("createdAt", "asc"));
  return onSnapshot(q, snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
}

// ── 좋아요 ─────────────────────────────────────────────────
export async function toggleLike(watchId, uid) {
  const ref = doc(db, "watches", watchId, "likes", uid);
  const snap = await getDoc(ref);
  if (snap.exists()) await deleteDoc(ref);
  else await setDoc(ref, { uid, createdAt: serverTimestamp() });
}

export function subscribeLikes(watchId, callback) {
  return onSnapshot(collection(db, "watches", watchId, "likes"), snap => {
    callback(snap.docs.map(d => d.id));
  });
}

// ── 북마크 ─────────────────────────────────────────────────
export async function toggleBookmark(watchId, uid) {
  const ref = doc(db, "users", uid, "bookmarks", watchId);
  const snap = await getDoc(ref);
  if (snap.exists()) await deleteDoc(ref);
  else await setDoc(ref, { watchId, createdAt: serverTimestamp() });
}

export function subscribeBookmarks(uid, callback) {
  return onSnapshot(collection(db, "users", uid, "bookmarks"), snap => {
    callback(snap.docs.map(d => d.id));
  });
}

// ── 좋아요한 기록 ──────────────────────────────────────────
export async function getLikedWatches(uid) {
  const { collectionGroup } = await import("firebase/firestore");
  const likesQ = query(collectionGroup(db, "likes"), where("uid", "==", uid));
  const snap = await getDocs(likesQ);
  const watchIds = snap.docs.map(d => d.ref.parent.parent.id);
  if (watchIds.length === 0) return [];
  const results = [];
  for (let i = 0; i < watchIds.length; i += 10) {
    const chunk = watchIds.slice(i, i + 10);
    const wq = query(collection(db, "watches"), where("__name__", "in", chunk));
    const wsnap = await getDocs(wq);
    wsnap.docs.forEach(d => results.push({ id: d.id, ...d.data() }));
  }
  return results;
}

// ── 프로필 사진 ────────────────────────────────────────────
export async function uploadProfilePhoto(uid, uri) {
  const response = await fetch(uri);
  const blob = await response.blob();
  const ref = storageRef(storage, `profiles/${uid}.jpg`);
  await uploadBytes(ref, blob, { contentType: "image/jpeg" });
  const url = await getDownloadURL(ref);
  await updateDoc(doc(db, "users", uid), { photoURL: url });
  return url;
}

// ── 온라인 상태 ────────────────────────────────────────────
export function setupPresence(uid) {
  const userRef = rtdbRef(rtdb, `presence/${uid}`);
  set(userRef, { online: true, lastSeen: rtServerTimestamp() });
  onDisconnect(userRef).set({ online: false, lastSeen: rtServerTimestamp() });
}

export function subscribePresence(uid, callback) {
  const userRef = rtdbRef(rtdb, `presence/${uid}`);
  return onValue(userRef, snap => callback(snap.val()));
}
