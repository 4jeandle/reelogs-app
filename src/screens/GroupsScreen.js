import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, ScrollView, Image, SafeAreaView, KeyboardAvoidingView, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../lib/ThemeContext";
import { useAuth } from "../lib/AuthContext";
import { subscribeMyGroups, createGroup, joinGroupByCode, deleteGroup, subscribeGroupWatches, fetchMemberProfiles, sendGroupMessage, subscribeGroupMessages } from "../lib/db";
import WatchCard from "../components/WatchCard";

export default function GroupsScreen() {
  const { C } = useTheme();
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [createModal, setCreateModal] = useState(false);
  const [joinModal, setJoinModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);

  useEffect(() => {
    if (!user) return;
    return subscribeMyGroups(user.uid, setGroups);
  }, [user]);

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    header: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      paddingHorizontal: 16, paddingVertical: 12,
      backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border,
    },
    headerTitle: { fontSize: 18, fontWeight: "700", color: C.text },
    headerBtns: { flexDirection: "row", gap: 8 },
    headerBtn: {
      flexDirection: "row", alignItems: "center", gap: 4,
      borderWidth: 1, borderColor: C.border, borderRadius: 8,
      paddingHorizontal: 10, paddingVertical: 6,
    },
    headerBtnText: { fontSize: 13, color: C.text3, fontWeight: "600" },
    listContent: { padding: 16, gap: 12 },
    groupCard: {
      backgroundColor: C.surface, borderRadius: 14,
      padding: 16, borderWidth: 1, borderColor: C.border,
    },
    groupTop: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
    clapIcon: {
      width: 44, height: 44, borderRadius: 10, backgroundColor: C.red + "15",
      alignItems: "center", justifyContent: "center", marginRight: 12,
    },
    groupName: { fontSize: 16, fontWeight: "700", color: C.text, flex: 1 },
    groupCode: { fontSize: 12, color: C.text3 },
    memberRow: { flexDirection: "row", alignItems: "center" },
    memberChip: {
      width: 28, height: 28, borderRadius: 14,
      backgroundColor: C.red, alignItems: "center", justifyContent: "center",
      marginLeft: -6, borderWidth: 2, borderColor: C.surface,
    },
    memberChipText: { color: "#FFF", fontSize: 11, fontWeight: "700" },
    memberCount: { marginLeft: 8, fontSize: 12, color: C.text3 },
    dashedCard: {
      borderRadius: 14, padding: 20,
      borderWidth: 1.5, borderColor: C.border, borderStyle: "dashed",
      alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8,
    },
    dashedText: { fontSize: 15, color: C.text3, fontWeight: "600" },
    empty: { textAlign: "center", color: C.text3, marginTop: 60, fontSize: 14, lineHeight: 22 },
  });

  const COLORS = ["#FF3B30", "#FF9500", "#34C759", "#007AFF", "#AF52DE", "#FF2D55"];

  if (selectedGroup) {
    return <GroupDetailScreen group={selectedGroup} onBack={() => setSelectedGroup(null)} C={C} user={user} />;
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitle}>그룹</Text>
        <View style={s.headerBtns}>
          <TouchableOpacity style={s.headerBtn} onPress={() => setJoinModal(true)}>
            <Ionicons name="key-outline" size={14} color={C.text3} />
            <Text style={s.headerBtnText}>코드 참여</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.headerBtn, { borderColor: C.red, backgroundColor: C.red }]} onPress={() => setCreateModal(true)}>
            <Ionicons name="add" size={14} color="#FFF" />
            <Text style={[s.headerBtnText, { color: "#FFF" }]}>새 그룹</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.listContent}>
        {groups.length === 0 && (
          <Text style={s.empty}>아직 속한 그룹이 없어요{"\n"}새 그룹을 만들거나 코드로 참여해보세요!</Text>
        )}
        {groups.map((group, idx) => {
          const memberCount = group.members?.length || 0;
          const displayMembers = (group.memberNames || []).slice(0, 4);
          return (
            <TouchableOpacity key={group.id} style={s.groupCard} onPress={() => setSelectedGroup(group)}>
              <View style={s.groupTop}>
                <View style={s.clapIcon}>
                  <Ionicons name="film" size={22} color={C.red} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.groupName}>{group.name}</Text>
                  <Text style={s.groupCode}>#{group.code}</Text>
                </View>
                <TouchableOpacity onPress={() => Alert.alert("그룹 나가기", `"${group.name}"에서 나가시겠습니까?`, [
                  { text: "취소", style: "cancel" },
                  { text: "나가기", style: "destructive", onPress: () => deleteGroup(group.id) },
                ])}>
                  <Ionicons name="ellipsis-horizontal" size={20} color={C.text3} />
                </TouchableOpacity>
              </View>
              <View style={s.memberRow}>
                {[...Array(Math.min(memberCount, 5))].map((_, i) => (
                  <View key={i} style={[s.memberChip, { backgroundColor: COLORS[i % COLORS.length] }]}>
                    <Text style={s.memberChipText}>{String.fromCharCode(65 + i)}</Text>
                  </View>
                ))}
                {memberCount > 5 && (
                  <View style={[s.memberChip, { backgroundColor: C.border }]}>
                    <Text style={[s.memberChipText, { color: C.text3 }]}>+{memberCount - 5}</Text>
                  </View>
                )}
                <Text style={s.memberCount}>멤버 {memberCount}명</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity style={s.dashedCard} onPress={() => setCreateModal(true)}>
          <Ionicons name="add-circle-outline" size={22} color={C.text3} />
          <Text style={s.dashedText}>새 그룹 만들기</Text>
        </TouchableOpacity>
      </ScrollView>

      <CreateGroupModal visible={createModal} onClose={() => setCreateModal(false)} user={user} C={C} />
      <JoinGroupModal visible={joinModal} onClose={() => setJoinModal(false)} user={user} C={C} />
    </View>
  );
}

function CreateGroupModal({ visible, onClose, user, C }) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!name.trim()) { Alert.alert("오류", "그룹 이름을 입력해주세요."); return; }
    setLoading(true);
    try {
      const result = await createGroup(user.uid, name.trim());
      Alert.alert("그룹 생성 완료", `그룹 코드: ${result.code}\n친구에게 코드를 공유하세요!`);
      setName(""); onClose();
    } catch (e) {
      Alert.alert("오류", e.message);
    } finally { setLoading(false); }
  }

  const s = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
    sheet: { backgroundColor: C.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
    handle: { width: 36, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: "center", marginBottom: 20 },
    title: { fontSize: 18, fontWeight: "700", color: C.text, marginBottom: 20 },
    input: { borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: C.text, marginBottom: 16 },
    btn: { backgroundColor: C.red, borderRadius: 10, paddingVertical: 14, alignItems: "center" },
    btnText: { color: "#FFF", fontWeight: "700", fontSize: 15 },
  });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={s.sheet}>
          <View style={s.handle} />
          <Text style={s.title}>새 그룹 만들기</Text>
          <TextInput style={s.input} value={name} onChangeText={setName} placeholder="그룹 이름" placeholderTextColor={C.text3} />
          <TouchableOpacity style={s.btn} onPress={handleCreate} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={s.btnText}>만들기</Text>}
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

function JoinGroupModal({ visible, onClose, user, C }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleJoin() {
    if (!code.trim()) { Alert.alert("오류", "코드를 입력해주세요."); return; }
    setLoading(true);
    try {
      const group = await joinGroupByCode(user.uid, code.trim());
      Alert.alert("참여 완료", `"${group.name}" 그룹에 참여했어요!`);
      setCode(""); onClose();
    } catch (e) {
      Alert.alert("오류", e.message);
    } finally { setLoading(false); }
  }

  const s = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
    sheet: { backgroundColor: C.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
    handle: { width: 36, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: "center", marginBottom: 20 },
    title: { fontSize: 18, fontWeight: "700", color: C.text, marginBottom: 20 },
    input: {
      borderWidth: 1, borderColor: C.border, borderRadius: 10,
      paddingHorizontal: 14, paddingVertical: 12, fontSize: 18,
      color: C.text, marginBottom: 16, textAlign: "center", letterSpacing: 4, fontWeight: "700",
    },
    btn: { backgroundColor: C.red, borderRadius: 10, paddingVertical: 14, alignItems: "center" },
    btnText: { color: "#FFF", fontWeight: "700", fontSize: 15 },
  });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={s.sheet}>
          <View style={s.handle} />
          <Text style={s.title}>코드로 그룹 참여</Text>
          <TextInput style={s.input} value={code} onChangeText={t => setCode(t.toUpperCase())} placeholder="XXXXXX" placeholderTextColor={C.text3} maxLength={6} autoCapitalize="characters" />
          <TouchableOpacity style={s.btn} onPress={handleJoin} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={s.btnText}>참여하기</Text>}
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─────────────────────────────────────────────
// GroupDetailScreen
// ─────────────────────────────────────────────
const TMDB_KEY = "7baea0b714dbb25a96c6a9f1ba91f88e";
const TMDB_BASE = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p/w342";

async function tmdbSearch(query) {
  const qs = new URLSearchParams({ api_key: TMDB_KEY, language: "ko-KR", query, include_adult: false }).toString();
  const res = await fetch(`${TMDB_BASE}/search/multi?${qs}`);
  const data = await res.json();
  return (data.results || []).filter(r => r.media_type === "movie" || r.media_type === "tv").slice(0, 15);
}

// 작품 선택 시트
function ContentPickerSheet({ visible, onClose, onSelect, C }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const inputRef = React.useRef(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      const r = await tmdbSearch(query).catch(() => []);
      setResults(r);
      setSearching(false);
    }, 400);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (visible) setTimeout(() => inputRef.current?.focus(), 300);
    else { setQuery(""); setResults([]); }
  }, [visible]);

  const s = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
    sheet: { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, height: "75%", overflow: "hidden" },
    handle: { width: 36, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: "center", marginTop: 12, marginBottom: 12 },
    header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, gap: 10 },
    searchBox: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: C.bg, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, gap: 6 },
    searchInput: { flex: 1, fontSize: 14, color: C.text },
    cancelBtn: { paddingHorizontal: 4 },
    cancelText: { fontSize: 14, color: C.text3 },
    item: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, gap: 12 },
    poster: { width: 42, height: 62, borderRadius: 6, backgroundColor: C.border },
    itemInfo: { flex: 1 },
    itemTitle: { fontSize: 14, fontWeight: "700", color: C.text },
    itemMeta: { fontSize: 12, color: C.text3, marginTop: 2 },
    emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 40 },
    emptyText: { fontSize: 14, color: C.text3, marginTop: 8 },
    hintText: { fontSize: 14, color: C.text3 },
  });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
        <View style={s.sheet}>
          <View style={s.handle} />
          <View style={s.header}>
            <View style={s.searchBox}>
              <Ionicons name="search" size={15} color={C.text3} />
              <TextInput
                ref={inputRef}
                style={s.searchInput}
                placeholder="작품 검색..."
                placeholderTextColor={C.text3}
                value={query}
                onChangeText={setQuery}
              />
              {query.length > 0 && (
                <TouchableOpacity onPress={() => setQuery("")}>
                  <Ionicons name="close-circle" size={15} color={C.text3} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
              <Text style={s.cancelText}>취소</Text>
            </TouchableOpacity>
          </View>

          {searching ? (
            <View style={s.emptyWrap}><ActivityIndicator color={C.red} /></View>
          ) : results.length === 0 ? (
            <View style={s.emptyWrap}>
              <Ionicons name="film-outline" size={36} color={C.text3} />
              <Text style={s.emptyText}>{query ? "검색 결과가 없어요" : "작품 이름을 검색하세요"}</Text>
            </View>
          ) : (
            <FlatList
              data={results}
              keyExtractor={item => String(item.id)}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const title = item.title || item.name || "";
                const year = (item.release_date || item.first_air_date || "").slice(0, 4);
                const typeLabel = item.media_type === "movie" ? "영화" : "드라마";
                return (
                  <TouchableOpacity style={s.item} onPress={() => { onSelect(item); onClose(); }}>
                    {item.poster_path
                      ? <Image source={{ uri: IMG_BASE + item.poster_path }} style={s.poster} resizeMode="cover" />
                      : <View style={[s.poster, { alignItems: "center", justifyContent: "center" }]}><Ionicons name="film-outline" size={20} color={C.text3} /></View>
                    }
                    <View style={s.itemInfo}>
                      <Text style={s.itemTitle} numberOfLines={1}>{title}</Text>
                      <Text style={s.itemMeta}>{typeLabel}{year ? ` · ${year}` : ""}</Text>
                    </View>
                    <Ionicons name="add-circle" size={22} color={C.red} />
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

// 채팅 메시지 버블
function MessageBubble({ msg, isMe, senderName, senderInitial, senderColor, C }) {
  const s = StyleSheet.create({
    row: { flexDirection: isMe ? "row-reverse" : "row", alignItems: "flex-end", marginBottom: 12, paddingHorizontal: 12, gap: 8 },
    avatar: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
    avatarText: { color: "#FFF", fontSize: 11, fontWeight: "700" },
    col: { maxWidth: "72%", gap: 3 },
    senderName: { fontSize: 11, color: C.text3, marginBottom: 2, marginLeft: isMe ? 0 : 4, textAlign: isMe ? "right" : "left" },
    bubble: {
      backgroundColor: isMe ? C.red : C.surface,
      borderRadius: 18,
      borderBottomRightRadius: isMe ? 4 : 18,
      borderBottomLeftRadius: isMe ? 18 : 4,
      paddingHorizontal: 14, paddingVertical: 10,
      shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 1,
    },
    text: { fontSize: 14, color: isMe ? "#FFF" : C.text, lineHeight: 20 },
    // 작품 카드 버블
    contentCard: {
      backgroundColor: isMe ? C.red : C.surface,
      borderRadius: 16,
      borderBottomRightRadius: isMe ? 4 : 16,
      borderBottomLeftRadius: isMe ? 16 : 4,
      overflow: "hidden",
      width: 220,
      shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
    },
    cardPoster: { width: "100%", height: 120 },
    cardPosterPlaceholder: { width: "100%", height: 120, backgroundColor: isMe ? "rgba(255,255,255,0.15)" : C.border, alignItems: "center", justifyContent: "center" },
    cardBody: { padding: 10 },
    cardTitle: { fontSize: 14, fontWeight: "700", color: isMe ? "#FFF" : C.text, marginBottom: 2 },
    cardMeta: { fontSize: 11, color: isMe ? "rgba(255,255,255,0.7)" : C.text3 },
  });

  const COLORS = ["#FF3B30","#FF9500","#34C759","#007AFF","#AF52DE"];

  return (
    <View style={s.row}>
      {!isMe && (
        <View style={[s.avatar, { backgroundColor: senderColor || C.red }]}>
          <Text style={s.avatarText}>{senderInitial}</Text>
        </View>
      )}
      <View style={s.col}>
        {!isMe && <Text style={s.senderName}>{senderName}</Text>}
        {msg.type === "content" ? (
          <View style={s.contentCard}>
            {msg.content?.poster_path
              ? <Image source={{ uri: IMG_BASE + msg.content.poster_path }} style={s.cardPoster} resizeMode="cover" />
              : <View style={s.cardPosterPlaceholder}><Ionicons name="film-outline" size={28} color={isMe ? "rgba(255,255,255,0.5)" : C.text3} /></View>
            }
            <View style={s.cardBody}>
              <Text style={s.cardTitle} numberOfLines={1}>{msg.content?.title || msg.content?.name || ""}</Text>
              <Text style={s.cardMeta}>{msg.content?.media_type === "movie" ? "영화" : "드라마"}{(msg.content?.release_date || msg.content?.first_air_date || "").slice(0,4) ? ` · ${(msg.content?.release_date || msg.content?.first_air_date || "").slice(0,4)}` : ""}</Text>
            </View>
          </View>
        ) : (
          <View style={s.bubble}>
            <Text style={s.text}>{msg.text}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function GroupDetailScreen({ group, onBack, C, user }) {
  const [messages, setMessages] = useState([]);
  const [memberProfiles, setMemberProfiles] = useState([]);
  const [text, setText] = useState("");
  const [pickerVisible, setPickerVisible] = useState(false);
  const [sending, setSending] = useState(false);
  const flatListRef = React.useRef(null);

  const MEMBER_COLORS = ["#FF3B30","#FF9500","#34C759","#007AFF","#AF52DE","#FF2D55","#5856D6"];

  useEffect(() => {
    fetchMemberProfiles(group.members || []).then(setMemberProfiles).catch(() => {});
  }, [group.id]);

  useEffect(() => {
    return subscribeGroupMessages(group.id, (msgs) => {
      setMessages(msgs);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });
  }, [group.id]);

  async function handleSendText() {
    const t = text.trim();
    if (!t || sending) return;
    setText("");
    setSending(true);
    await sendGroupMessage(group.id, user.uid, { type: "text", text: t }).catch(() => {});
    setSending(false);
  }

  async function handleSendContent(content) {
    setSending(true);
    await sendGroupMessage(group.id, user.uid, { type: "content", content }).catch(() => {});
    setSending(false);
  }

  function getMemberInfo(uid) {
    const idx = (group.members || []).indexOf(uid);
    const profile = memberProfiles.find(m => m.uid === uid);
    return {
      name: profile?.displayName || "멤버",
      initial: (profile?.displayName || "?")[0].toUpperCase(),
      color: MEMBER_COLORS[idx % MEMBER_COLORS.length],
    };
  }

  const s = React.useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border, gap: 10 },
    back: { padding: 4 },
    headerInfo: { flex: 1 },
    headerTitle: { fontSize: 16, fontWeight: "700", color: C.text },
    headerSub: { fontSize: 12, color: C.text3, marginTop: 1 },
    messageList: { flex: 1, paddingTop: 12 },
    inputRow: { flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 12, paddingVertical: 10, backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.border, gap: 8 },
    plusBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.red, alignItems: "center", justifyContent: "center" },
    inputBox: { flex: 1, backgroundColor: C.bg, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, fontSize: 14, color: C.text, maxHeight: 100, borderWidth: 1, borderColor: C.border },
    sendBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.red, alignItems: "center", justifyContent: "center" },
    sendBtnDisabled: { backgroundColor: C.border },
    empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
    emptyText: { fontSize: 14, color: C.text3 },
    emptySubText: { fontSize: 12, color: C.text3 },
    dateDivider: { alignItems: "center", marginVertical: 8 },
    dateDividerText: { fontSize: 11, color: C.text3, backgroundColor: C.bg, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  }), [C]);

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      {/* 헤더 */}
      <View style={s.header}>
        <TouchableOpacity style={s.back} onPress={onBack}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </TouchableOpacity>
        <View style={s.headerInfo}>
          <Text style={s.headerTitle}>{group.name}</Text>
          <Text style={s.headerSub}>멤버 {(group.members || []).length}명 · #{group.code}</Text>
        </View>
      </View>

      {/* 메시지 목록 */}
      {messages.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="chatbubbles-outline" size={48} color={C.text3} />
          <Text style={s.emptyText}>대화를 시작해보세요</Text>
          <Text style={s.emptySubText}>+ 버튼으로 작품을 공유할 수 있어요</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          style={s.messageList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => {
            const isMe = item.uid === user?.uid;
            const { name, initial, color } = getMemberInfo(item.uid);
            return (
              <MessageBubble
                msg={item}
                isMe={isMe}
                senderName={name}
                senderInitial={initial}
                senderColor={color}
                C={C}
              />
            );
          }}
          contentContainerStyle={{ paddingBottom: 12 }}
        />
      )}

      {/* 입력창 */}
      <View style={s.inputRow}>
        <TouchableOpacity style={s.plusBtn} onPress={() => setPickerVisible(true)}>
          <Ionicons name="add" size={20} color="#FFF" />
        </TouchableOpacity>
        <TextInput
          style={s.inputBox}
          value={text}
          onChangeText={setText}
          placeholder="메시지 입력..."
          placeholderTextColor={C.text3}
          multiline
          returnKeyType="send"
          onSubmitEditing={handleSendText}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[s.sendBtn, !text.trim() && s.sendBtnDisabled]}
          onPress={handleSendText}
          disabled={!text.trim() || sending}
        >
          <Ionicons name="send" size={16} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* 작품 선택 시트 */}
      <ContentPickerSheet
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={handleSendContent}
        C={C}
      />
    </KeyboardAvoidingView>
  );
}
