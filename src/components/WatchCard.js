import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Image, Linking,
  Modal, TextInput, FlatList, Alert, KeyboardAvoidingView,
  Platform, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../lib/ThemeContext";
import { useAuth } from "../lib/AuthContext";
import { OTT, STATUS, formatTime } from "../lib/theme";
import {
  toggleLike, subscribeLikes,
  toggleBookmark, subscribeBookmarks,
  addComment, deleteComment, subscribeComments,
  deleteWatch, updateWatch,
} from "../lib/db";

// ────────────────────────────────────────────────────────────────
// CommentModal
// ────────────────────────────────────────────────────────────────
function CommentModal({ visible, onClose, watch, C }) {
  const { user, profile } = useAuth();
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!visible || !watch?.id) return;
    return subscribeComments(watch.id, setComments);
  }, [visible, watch?.id]);

  async function handleSend() {
    if (!text.trim() || !user) return;
    setSending(true);
    try {
      await addComment(watch.id, user.uid, text.trim());
      setText("");
    } catch (e) {
      Alert.alert("오류", e.message);
    } finally { setSending(false); }
  }

  async function handleDelete(commentId, commentUid) {
    if (commentUid !== user?.uid) return;
    Alert.alert("삭제", "댓글을 삭제할까요?", [
      { text: "취소", style: "cancel" },
      { text: "삭제", style: "destructive", onPress: async () => {
        try { await deleteComment(watch.id, commentId); } catch (e) { Alert.alert("오류", e.message); }
      }},
    ]);
  }

  function formatCommentTime(ts) {
    if (!ts) return "";
    const d = new Date(ts.seconds * 1000);
    const h = d.getHours(), m = String(d.getMinutes()).padStart(2, "0");
    const ampm = h < 12 ? "오전" : "오후";
    return `${ampm} ${h % 12 || 12}:${m}`;
  }

  const s = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
    sheet: { backgroundColor: C.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "80%", paddingBottom: Platform.OS === "ios" ? 34 : 16 },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 1, borderBottomColor: C.border },
    headerTitle: { fontSize: 16, fontWeight: "700", color: C.text },
    closeBtn: { padding: 4 },
    watchTitle: { fontSize: 13, color: C.text3, padding: 12, paddingTop: 8, paddingBottom: 4 },
    commentList: { flexGrow: 0 },
    commentItem: { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 10, gap: 10 },
    avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.red, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    avatarText: { color: "#FFF", fontSize: 12, fontWeight: "700" },
    bubble: { flex: 1 },
    commentName: { fontSize: 12, fontWeight: "600", color: C.text3, marginBottom: 3 },
    commentText: { fontSize: 14, color: C.text, lineHeight: 20 },
    commentTime: { fontSize: 11, color: C.text3, marginTop: 4 },
    deleteHint: { fontSize: 11, color: C.red, marginTop: 2 },
    empty: { textAlign: "center", color: C.text3, paddingVertical: 32, fontSize: 13 },
    inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: C.border },
    input: { flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: C.text, maxHeight: 100 },
    sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.red, alignItems: "center", justifyContent: "center" },
    sendBtnDisabled: { backgroundColor: C.border },
  });

  const canSend = text.trim().length > 0 && !sending;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={s.sheet}>
          <View style={s.header}>
            <Text style={s.headerTitle}>댓글</Text>
            <TouchableOpacity style={s.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={22} color={C.text3} />
            </TouchableOpacity>
          </View>
          <Text style={s.watchTitle}>💬 {watch?.title}</Text>
          <FlatList
            data={comments}
            keyExtractor={c => c.id}
            style={s.commentList}
            contentContainerStyle={{ paddingBottom: 8 }}
            ListEmptyComponent={<Text style={s.empty}>첫 댓글을 남겨보세요!</Text>}
            renderItem={({ item }) => {
              const name = item.displayName || "사용자";
              const initial = name[0].toUpperCase();
              const isMine = item.uid === user?.uid;
              return (
                <TouchableOpacity onLongPress={() => isMine && handleDelete(item.id, item.uid)} activeOpacity={0.7}>
                  <View style={s.commentItem}>
                    <View style={[s.avatar, { backgroundColor: isMine ? C.red : "#607D8B" }]}>
                      <Text style={s.avatarText}>{initial}</Text>
                    </View>
                    <View style={s.bubble}>
                      <Text style={s.commentName}>{isMine ? "나" : name}</Text>
                      <Text style={s.commentText}>{item.text}</Text>
                      <Text style={s.commentTime}>{formatCommentTime(item.createdAt)}</Text>
                      {isMine && <Text style={s.deleteHint}>길게 눌러 삭제</Text>}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
          <View style={s.inputRow}>
            <TextInput
              style={s.input}
              value={text}
              onChangeText={setText}
              placeholder="댓글 달기..."
              placeholderTextColor={C.text3}
              multiline
            />
            <TouchableOpacity
              style={[s.sendBtn, !canSend && s.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!canSend}
            >
              {sending
                ? <ActivityIndicator color="#FFF" size="small" />
                : <Ionicons name="send" size={18} color="#FFF" />}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ────────────────────────────────────────────────────────────────
// EditWatchModal
// ────────────────────────────────────────────────────────────────
function EditWatchModal({ visible, onClose, watch, C }) {
  const STATUS_KEYS = ["watching", "completed", "paused", "dropped", "want"];
  const STATUS_LABELS = { watching: "시청중", completed: "완료", paused: "일시정지", dropped: "드롭", want: "보고싶어요" };
  const [status, setStatus] = useState(watch?.status || "completed");
  const [rating, setRating] = useState(watch?.rating || 0);
  const [memo, setMemo] = useState(watch?.memo || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible && watch) {
      setStatus(watch.status || "completed");
      setRating(watch.rating || 0);
      setMemo(watch.memo || "");
    }
  }, [visible, watch]);

  async function handleSave() {
    if (!watch?.id) return;
    setSaving(true);
    try {
      await updateWatch(watch.id, { status, rating, memo });
      onClose();
    } catch (e) {
      Alert.alert("오류", e.message);
    } finally { setSaving(false); }
  }

  const STATUS_COLORS = { watching: "#4CAF50", completed: "#2196F3", paused: "#FF9800", dropped: "#9E9E9E", want: "#E91E63" };

  const s = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
    sheet: { backgroundColor: C.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: Platform.OS === "ios" ? 40 : 24 },
    handle: { width: 36, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
    title: { fontSize: 16, fontWeight: "700", color: C.text, marginBottom: 16 },
    label: { fontSize: 13, color: C.text3, marginBottom: 8, fontWeight: "600" },
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
    chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: C.border },
    chipText: { fontSize: 13, fontWeight: "600", color: C.text3 },
    starRow: { flexDirection: "row", gap: 6, marginBottom: 16 },
    star: { fontSize: 28 },
    input: { borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: C.text, minHeight: 80, textAlignVertical: "top", marginBottom: 16 },
    saveBtn: { backgroundColor: C.red, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
    saveBtnText: { color: "#FFF", fontWeight: "700", fontSize: 15 },
  });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={s.sheet}>
          <View style={s.handle} />
          <Text style={s.title}>✏️ {watch?.title} 수정</Text>
          <Text style={s.label}>시청 상태</Text>
          <View style={s.chipRow}>
            {STATUS_KEYS.map(k => {
              const active = status === k;
              return (
                <TouchableOpacity key={k} style={[s.chip, active && { backgroundColor: STATUS_COLORS[k] + "20", borderColor: STATUS_COLORS[k] }]} onPress={() => setStatus(k)}>
                  <Text style={[s.chipText, active && { color: STATUS_COLORS[k] }]}>{STATUS_LABELS[k]}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={s.label}>평점</Text>
          <View style={s.starRow}>
            {[1,2,3,4,5].map(n => (
              <TouchableOpacity key={n} onPress={() => setRating(n === rating ? 0 : n)}>
                <Text style={s.star}>{n <= rating ? "★" : "☆"}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={s.label}>한줄평</Text>
          <TextInput style={s.input} value={memo} onChangeText={setMemo} placeholder="감상을 남겨보세요..." placeholderTextColor={C.text3} multiline />
          <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#FFF" /> : <Text style={s.saveBtnText}>저장하기</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ────────────────────────────────────────────────────────────────
// WatchCard (main)
// ────────────────────────────────────────────────────────────────
export default function WatchCard({ watch, friendProfiles }) {
  const { C } = useTheme();
  const { user, profile } = useAuth();
  const [likedUids, setLikedUids] = useState([]);
  const [bookmarkedIds, setBookmarkedIds] = useState([]);
  const [commentCount, setCommentCount] = useState(0);
  const [commentModal, setCommentModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [moreSheet, setMoreSheet] = useState(false);

  // 실시간 좋아요
  useEffect(() => {
    if (!watch?.id) return;
    return subscribeLikes(watch.id, setLikedUids);
  }, [watch?.id]);

  // 실시간 북마크 (내 것만)
  useEffect(() => {
    if (!user?.uid) return;
    return subscribeBookmarks(user.uid, setBookmarkedIds);
  }, [user?.uid]);

  // 실시간 댓글 수
  useEffect(() => {
    if (!watch?.id) return;
    return subscribeComments(watch.id, (cs) => setCommentCount(cs.length));
  }, [watch?.id]);

  const ott = OTT[watch.ott] || OTT.other;
  const statusInfo = STATUS[watch.status] || STATUS.completed;
  const isLiked = likedUids.includes(user?.uid);
  const isBookmarked = bookmarkedIds.includes(watch.id);
  const isMyWatch = watch.uid === user?.uid;

  const displayName = watch.uid === user?.uid
    ? (profile?.displayName || "나")
    : (friendProfiles?.[watch.uid]?.displayName || watch.displayName || "친구");

  async function handleWatch() {
    if (ott.scheme) {
      try {
        const ok = await Linking.canOpenURL(ott.scheme);
        if (ok) { await Linking.openURL(ott.scheme); return; }
      } catch {}
    }
    if (ott.url) Linking.openURL(ott.url);
  }

  function handleMore() { setMoreSheet(true); }

  function handleEdit() { setMoreSheet(false); setTimeout(() => setEditModal(true), 200); }

  function handleDelete() {
    setMoreSheet(false);
    setTimeout(() => {
      Alert.alert("삭제", `"${watch.title}"을(를) 삭제할까요?`, [
        { text: "취소", style: "cancel" },
        { text: "삭제", style: "destructive", onPress: async () => {
          try { await deleteWatch(watch.id); } catch (e) { Alert.alert("오류", e.message); }
        }},
      ]);
    }, 200);
  }

  const s = StyleSheet.create({
    card: { borderRadius: 16, marginBottom: 16, overflow: "hidden", backgroundColor: C.surface, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
    posterWrap: { height: 200, position: "relative" },
    poster: { width: "100%", height: "100%" },
    posterPlaceholder: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center", backgroundColor: C.surface2 },
    ottBadge: { position: "absolute", top: 10, left: 10, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: ott.color },
    ottBadgeText: { color: "#FFF", fontSize: 11, fontWeight: "700" },
    moreBtn: { position: "absolute", top: 10, right: 10, width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" },
    meta: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingTop: 12, paddingBottom: 6, gap: 8 },
    avatar: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: C.red },
    avatarText: { color: "#FFF", fontSize: 14, fontWeight: "700" },
    metaInfo: { flex: 1 },
    userName: { fontSize: 13, fontWeight: "600", color: C.text },
    timeText: { fontSize: 11, marginTop: 1, color: C.text3 },
    statusChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: statusInfo.color + "20" },
    statusText: { fontSize: 11, fontWeight: "700", color: statusInfo.color },
    title: { fontSize: 16, fontWeight: "700", paddingHorizontal: 14, paddingBottom: 4, color: C.text },
    stars: { fontSize: 14, color: "#FFB800", paddingHorizontal: 14, paddingBottom: 4 },
    memo: { fontSize: 13, lineHeight: 18, paddingHorizontal: 14, paddingBottom: 8, color: C.text3 },
    actions: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: C.border, gap: 6 },
    actionBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 8, borderRadius: 10 },
    actionCount: { fontSize: 12, fontWeight: "600" },
    watchBtn: { flex: 1, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: ott.color },
    watchBtnText: { color: "#FFF", fontSize: 14, fontWeight: "700" },
    // More sheet
    moreOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
    moreSheet: { backgroundColor: C.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: Platform.OS === "ios" ? 40 : 24 },
    moreHandle: { width: 36, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
    moreTitle: { fontSize: 14, fontWeight: "600", color: C.text3, marginBottom: 16, textAlign: "center" },
    moreBtn2: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, borderTopWidth: 1, borderTopColor: C.border },
    moreBtnText: { fontSize: 15, fontWeight: "600", color: C.text },
    moreBtnDestructive: { color: "#FF3B30" },
    moreCancelBtn: { alignItems: "center", paddingVertical: 14, marginTop: 8 },
    moreCancelText: { fontSize: 15, color: C.text3, fontWeight: "600" },
  });

  return (
    <View style={s.card}>
      {/* 포스터 */}
      <View style={s.posterWrap}>
        {watch.posterUrl
          ? <Image source={{ uri: watch.posterUrl }} style={s.poster} resizeMode="cover" />
          : <View style={s.posterPlaceholder}><Ionicons name="film-outline" size={40} color={C.text3} /></View>}
        <View style={s.ottBadge}><Text style={s.ottBadgeText}>{ott.name}</Text></View>
        {isMyWatch && (
          <TouchableOpacity style={s.moreBtn} onPress={handleMore}>
            <Ionicons name="ellipsis-horizontal" size={18} color="#FFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* 유저 메타 */}
      <View style={s.meta}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{(displayName || "?")[0].toUpperCase()}</Text>
        </View>
        <View style={s.metaInfo}>
          <Text style={s.userName}>{displayName}</Text>
          <Text style={s.timeText}>{formatTime(watch.watchedAt || watch.createdAt)}</Text>
        </View>
        <View style={s.statusChip}><Text style={s.statusText}>{statusInfo.label}</Text></View>
      </View>

      {/* 제목, 별점, 한줄평 */}
      <Text style={s.title} numberOfLines={1}>{watch.title}</Text>
      {watch.rating > 0 && <Text style={s.stars}>{"★".repeat(watch.rating)}{"☆".repeat(5 - watch.rating)}</Text>}
      {!!watch.memo && <Text style={s.memo} numberOfLines={2}>{watch.memo}</Text>}

      {/* 액션 */}
      <View style={s.actions}>
        <TouchableOpacity style={s.actionBtn} onPress={() => user && toggleLike(watch.id, user.uid)}>
          <Ionicons name={isLiked ? "heart" : "heart-outline"} size={22} color={isLiked ? "#E53935" : C.text3} />
          {likedUids.length > 0 && <Text style={[s.actionCount, { color: isLiked ? "#E53935" : C.text3 }]}>{likedUids.length}</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={s.watchBtn} onPress={handleWatch}>
          <Text style={s.watchBtnText}>▶ 보기</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.actionBtn} onPress={() => setCommentModal(true)}>
          <Ionicons name="chatbubble-outline" size={22} color={C.text3} />
          {commentCount > 0 && <Text style={[s.actionCount, { color: C.text3 }]}>{commentCount}</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={s.actionBtn} onPress={() => user && toggleBookmark(watch.id, user.uid)}>
          <Ionicons name={isBookmarked ? "bookmark" : "bookmark-outline"} size={22} color={isBookmarked ? C.red : C.text3} />
        </TouchableOpacity>
      </View>

      {/* 댓글 모달 */}
      <CommentModal visible={commentModal} onClose={() => setCommentModal(false)} watch={watch} C={C} />

      {/* 수정 모달 */}
      <EditWatchModal visible={editModal} onClose={() => setEditModal(false)} watch={watch} C={C} />

      {/* ··· 더보기 시트 (내 게시물만) */}
      <Modal visible={moreSheet} animationType="slide" transparent onRequestClose={() => setMoreSheet(false)}>
        <TouchableOpacity style={s.moreOverlay} activeOpacity={1} onPress={() => setMoreSheet(false)}>
          <TouchableOpacity activeOpacity={1} style={s.moreSheet}>
            <View style={s.moreHandle} />
            <Text style={s.moreTitle}>{watch.title}</Text>
            <TouchableOpacity style={s.moreBtn2} onPress={handleEdit}>
              <Ionicons name="pencil-outline" size={20} color={C.text} />
              <Text style={s.moreBtnText}>수정하기</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.moreBtn2} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={20} color="#FF3B30" />
              <Text style={[s.moreBtnText, s.moreBtnDestructive]}>삭제하기</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.moreCancelBtn} onPress={() => setMoreSheet(false)}>
              <Text style={s.moreCancelText}>취소</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
