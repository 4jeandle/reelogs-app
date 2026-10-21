import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, ScrollView, Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../lib/ThemeContext";
import { useAuth } from "../lib/AuthContext";
import { subscribeMyGroups, createGroup, joinGroupByCode, deleteGroup, subscribeGroupWatches } from "../lib/db";
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
function GroupDetailScreen({ group, onBack, C, user }) {
  const [watches, setWatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [memberProfiles, setMemberProfiles] = useState([]);

  useEffect(() => {
    import("firebase/firestore").then(({ getDoc, doc, getDocs, collection, query, where, orderBy }) => {
      import("../lib/firebase").then(({ db }) => {
        // 멤버 프로필 가져오기
        const fetchMembers = async () => {
          const profiles = [];
          for (const uid of (group.members || [])) {
            try {
              const snap = await getDoc(doc(db, "users", uid));
              if (snap.exists()) profiles.push({ uid, ...snap.data() });
            } catch {}
          }
          setMemberProfiles(profiles);
        };
        fetchMembers();
      });
    });
  }, [group]);

  useEffect(() => {
    if (!group.members || group.members.length === 0) { setLoading(false); return; }
    setLoading(true);
    const unsub = subscribeGroupWatches(group.members, (data) => {
      setWatches(data);
      setLoading(false);
    });
    return unsub;
  }, [group.members]);

  const s = React.useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    header: {
      flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14,
      backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border,
    },
    back: { padding: 4, marginRight: 8 },
    headerTitle: { fontSize: 17, fontWeight: "700", color: C.text, flex: 1 },
    headerCode: { fontSize: 13, color: C.text3 },
    memberSection: {
      backgroundColor: C.surface, paddingVertical: 14, paddingHorizontal: 16,
      borderBottomWidth: 1, borderBottomColor: C.border,
    },
    memberLabel: { fontSize: 12, color: C.text3, fontWeight: "600", marginBottom: 10 },
    memberRow: { flexDirection: "row", gap: 12 },
    memberItem: { alignItems: "center", gap: 4 },
    memberAvatar: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: C.red, alignItems: "center", justifyContent: "center",
    },
    memberAvatarText: { color: "#FFF", fontSize: 15, fontWeight: "700" },
    memberName: { fontSize: 11, color: C.text3, maxWidth: 48, textAlign: "center" },
    empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
    emptyText: { fontSize: 15, color: C.text3 },
  }), [C]);

  const COLORS = ["#FF3B30", "#FF9500", "#34C759", "#007AFF", "#AF52DE"];

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity style={s.back} onPress={onBack}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{group.name}</Text>
        <Text style={s.headerCode}>#{group.code}</Text>
      </View>

      {/* 멤버 목록 */}
      <View style={s.memberSection}>
        <Text style={s.memberLabel}>멤버 {memberProfiles.length}명</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={s.memberRow}>
            {memberProfiles.map((m, i) => (
              <View key={m.uid} style={s.memberItem}>
                <View style={[s.memberAvatar, { backgroundColor: COLORS[i % COLORS.length] }]}>
                  {m.photoURL
                    ? <Image source={{ uri: m.photoURL }} style={{ width: 40, height: 40, borderRadius: 20 }} />
                    : <Text style={s.memberAvatarText}>{(m.displayName || "?")[0].toUpperCase()}</Text>}
                </View>
                <Text style={s.memberName} numberOfLines={1}>{m.displayName || "멤버"}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* 그룹 기록 피드 */}
      {loading ? (
        <View style={s.empty}><ActivityIndicator color={C.red} /></View>
      ) : watches.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="film-outline" size={48} color={C.text3} />
          <Text style={s.emptyText}>아직 기록이 없어요</Text>
        </View>
      ) : (
        <FlatList
          data={watches}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <WatchCard watch={item} />}
          contentContainerStyle={{ paddingVertical: 8 }}
        />
      )}
    </View>
  );
}
