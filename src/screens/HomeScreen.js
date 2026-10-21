import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, SafeAreaView, ActivityIndicator,
  ScrollView, Alert, Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../lib/ThemeContext";
import { useAuth } from "../lib/AuthContext";
import { OTT, STATUS } from "../lib/theme";
import {
  subscribeMyWatches, subscribeFriendWatches,
  addWatch, getUsersByUids,
} from "../lib/db";
import { searchTMDB } from "../lib/tmdb";
import WatchCard from "../components/WatchCard";

const TABS = ["전체", "나의 시청", "친구들"];
const STATUS_KEYS = Object.keys(STATUS);
const MODAL_OTT_KEYS = ["netflix", "tving", "wavve", "disneyplus", "watcha", "coupangplay", "other"];
const TMDB_KEY = "7baea0b714dbb25a96c6a9f1ba91f88e";

export default function HomeScreen() {
  const { C } = useTheme();
  const { user, profile } = useAuth();
  const [tab, setTab] = useState("전체");
  const [myWatches, setMyWatches] = useState([]);
  const [friendWatches, setFriendWatches] = useState([]);
  const [friendProfiles, setFriendProfiles] = useState({});
  const [addModal, setAddModal] = useState(false);

  useEffect(() => {
    if (!user) return;
    return subscribeMyWatches(user.uid, setMyWatches);
  }, [user]);

  useEffect(() => {
    if (!profile?.friends?.length) { setFriendWatches([]); return; }
    const unsubList = [];
    profile.friends.forEach(fid => {
      const unsub = subscribeFriendWatches(fid, (watches) => {
        setFriendWatches(prev => {
          const filtered = prev.filter(w => w.uid !== fid);
          return [...filtered, ...watches].sort((a, b) =>
            (b.watchedAt?.seconds || 0) - (a.watchedAt?.seconds || 0)
          );
        });
      });
      unsubList.push(unsub);
    });
    return () => unsubList.forEach(u => u());
  }, [profile?.friends]);

  // 친구 프로필 로드
  useEffect(() => {
    if (!profile?.friends?.length) return;
    getUsersByUids(profile.friends).then(users => {
      const map = {};
      users.forEach(u => { map[u.id] = u; });
      setFriendProfiles(map);
    });
  }, [profile?.friends]);

  const allWatches = [...myWatches, ...friendWatches].sort((a, b) => {
    const aT = a.watchedAt?.seconds || a.createdAt?.seconds || 0;
    const bT = b.watchedAt?.seconds || b.createdAt?.seconds || 0;
    return bT - aT;
  });

  const displayWatches =
    tab === "나의 시청" ? myWatches :
    tab === "친구들" ? friendWatches :
    allWatches;

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    tabRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, backgroundColor: C.surface, borderBottomColor: C.border },
    tab: { marginRight: 4 },
    tabChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
    tabText: { fontSize: 14, fontWeight: "600" },
    filterBtn: { marginLeft: "auto", padding: 4 },
    emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
    emptyText: { fontSize: 16, fontWeight: "600", marginTop: 12, color: C.text3 },
    emptySubText: { fontSize: 13, color: C.text3 },
    fab: { position: "absolute", right: 20, bottom: 20, width: 58, height: 58, borderRadius: 29, backgroundColor: C.red, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 6 },
  });

  return (
    <View style={s.container}>
      <View style={s.tabRow}>
        {TABS.map(t => (
          <TouchableOpacity key={t} style={s.tab} onPress={() => setTab(t)}>
            <View style={[s.tabChip, tab === t && { backgroundColor: C.red + "18" }]}>
              <Text style={[s.tabText, { color: tab === t ? C.red : C.text3 }]}>{t}</Text>
            </View>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={s.filterBtn}>
          <Ionicons name="list" size={20} color={C.text3} />
        </TouchableOpacity>
      </View>

      {displayWatches.length === 0 ? (
        <View style={s.emptyWrap}>
          <Ionicons name="film-outline" size={48} color={C.text3} />
          <Text style={s.emptyText}>시청 기록이 없어요</Text>
          <Text style={s.emptySubText}>첫 번째 기록을 추가해보세요!</Text>
        </View>
      ) : (
        <FlatList
          data={displayWatches}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <WatchCard watch={item} friendProfiles={friendProfiles} />
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: 90 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity style={s.fab} onPress={() => setAddModal(true)}>
        <Ionicons name="add" size={30} color="#FFF" />
      </TouchableOpacity>

      <AddWatchModal
        visible={addModal}
        onClose={() => setAddModal(false)}
        profile={profile}
        friends={profile?.friends || []}
        friendProfiles={friendProfiles}
        onSave={async (data) => {
          if (!user) return;
          await addWatch(user.uid, {
            ...data,
            displayName: profile?.displayName || "사용자",
          });
          setAddModal(false);
        }}
      />
    </View>
  );
}

// ────────────────────────────────────────────────────────────────
// AddWatchModal
// ────────────────────────────────────────────────────────────────
function AddWatchModal({ visible, onClose, onSave, profile, friends, friendProfiles }) {
  const { C } = useTheme();
  const [ott, setOtt] = useState("netflix");
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("watching");
  const [rating, setRating] = useState(0);
  const [memo, setMemo] = useState("");
  const [loading, setLoading] = useState(false);
  const [trending, setTrending] = useState([]);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [showPopular, setShowPopular] = useState(true);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [posterUrl, setPosterUrl] = useState(null);
  const [tmdbId, setTmdbId] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [sharedFriends, setSharedFriends] = useState([]);
  const debounceRef = useRef(null);

  // 트렌딩 로드
  useEffect(() => {
    if (!visible) return;
    setTrendingLoading(true);
    fetch(`https://api.themoviedb.org/3/trending/all/week?api_key=${TMDB_KEY}&language=ko-KR`)
      .then(r => r.json())
      .then(data => {
        const items = (data.results || []).slice(0, 10).map(item => ({
          tmdbId: item.id,
          title: item.title || item.name || "제목 없음",
          posterUrl: item.poster_path ? `https://image.tmdb.org/t/p/w185${item.poster_path}` : null,
          mediaType: item.media_type,
          year: (item.release_date || item.first_air_date || "").slice(0, 4),
        }));
        setTrending(items);
      })
      .catch(() => setTrending([]))
      .finally(() => setTrendingLoading(false));
  }, [visible]);

  function reset() {
    setOtt("netflix"); setTitle(""); setStatus("watching");
    setRating(0); setMemo(""); setPosterUrl(null);
    setTmdbId(null); setSearchResults([]); setShowDropdown(false);
    setSharedFriends([]);
  }

  function handleClose() { reset(); onClose(); }

  function handleTitleChange(text) {
    setTitle(text);
    setPosterUrl(null); setTmdbId(null); setShowDropdown(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim()) { setSearchResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const results = await searchTMDB(text);
      setSearchResults(results);
      setShowDropdown(results.length > 0);
      setSearching(false);
    }, 350);
  }

  function handleSelectResult(item) {
    setTitle(item.title);
    setPosterUrl(item.posterUrl);
    setTmdbId(item.tmdbId);
    setShowDropdown(false);
    setSearchResults([]);
    setShowPopular(false);
  }

  function handleSelectTrending(item) {
    setTitle(item.title);
    setPosterUrl(item.posterUrl);
    setTmdbId(item.tmdbId);
    setShowPopular(false);
  }

  function toggleFriendShare(fid) {
    setSharedFriends(prev =>
      prev.includes(fid) ? prev.filter(id => id !== fid) : [...prev, fid]
    );
  }

  async function handleSave() {
    if (!title.trim()) { Alert.alert("오류", "작품명을 입력해주세요."); return; }
    setLoading(true);
    try {
      await onSave({
        title: title.trim(), ott, rating, memo, status,
        posterUrl, tmdbId, sharedWith: sharedFriends,
      });
      reset();
    } catch (e) {
      Alert.alert("오류", e.message);
    } finally { setLoading(false); }
  }

  const ms = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.surface },
    headerTitle: { fontSize: 17, fontWeight: "700", color: C.text },
    closeBtn: { position: "absolute", right: 16, width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
    section: { paddingHorizontal: 20, paddingVertical: 14 },
    sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
    sectionLabel: { fontSize: 14, fontWeight: "700", color: C.red },
    collapseBtn: { fontSize: 13, color: C.text3 },
    label: { fontSize: 13, fontWeight: "700", marginBottom: 10, color: C.red },
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5 },
    chipText: { fontSize: 13 },
    // 트렌딩
    trendList: { marginTop: 4 },
    trendItem: { width: 90, marginRight: 10, alignItems: "center" },
    trendPoster: { width: 90, height: 130, borderRadius: 10, backgroundColor: C.surface2 },
    trendTitle: { fontSize: 11, color: C.text, marginTop: 5, textAlign: "center" },
    trendEmpty: { fontSize: 13, color: C.text3 },
    // 검색
    searchRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    titleInput: { flex: 1, height: 48, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, fontSize: 15, borderColor: C.border, backgroundColor: C.surface, color: C.text },
    searchBtn: { width: 48, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: C.red },
    posterBadge: { position: "absolute", left: 8, top: 8, width: 32, height: 32, borderRadius: 6 },
    dropdown: { borderWidth: 1, borderRadius: 12, marginTop: 6, overflow: "hidden", backgroundColor: C.surface, borderColor: C.border, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 6 },
    dropItem: { flexDirection: "row", alignItems: "center", padding: 10, borderBottomWidth: 1, borderBottomColor: C.border, gap: 10 },
    dropPoster: { width: 34, height: 50, borderRadius: 5 },
    dropPosterEmpty: { width: 34, height: 50, borderRadius: 5, alignItems: "center", justifyContent: "center", backgroundColor: C.surface2 },
    dropTitle: { fontSize: 14, fontWeight: "600", color: C.text },
    dropMeta: { fontSize: 12, marginTop: 2, color: C.text3 },
    // 별점
    starsRow: { flexDirection: "row", gap: 8 },
    star: { fontSize: 32 },
    // 메모
    memoInput: { borderWidth: 1.5, borderRadius: 12, padding: 14, fontSize: 14, minHeight: 90, lineHeight: 20, borderColor: C.border, backgroundColor: C.surface, color: C.text },
    // 친구 공유
    friendRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    friendChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5 },
    friendAvatar: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
    friendAvatarText: { color: "#FFF", fontSize: 10, fontWeight: "700" },
    friendName: { fontSize: 13, fontWeight: "600" },
    noFriends: { fontSize: 13, color: C.text3 },
    // footer
    footer: { flexDirection: "row", paddingHorizontal: 20, paddingVertical: 12, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.bg, gap: 10 },
    cancelBtn: { flex: 1, height: 50, borderRadius: 12, borderWidth: 1.5, borderColor: C.border, alignItems: "center", justifyContent: "center" },
    cancelText: { fontSize: 15, fontWeight: "600", color: C.text3 },
    saveBtn: { flex: 2, height: 50, borderRadius: 12, backgroundColor: C.red, alignItems: "center", justifyContent: "center" },
    saveBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <SafeAreaView style={ms.container}>
        <View style={ms.header}>
          <Text style={ms.headerTitle}>새 시청 추가</Text>
          <TouchableOpacity style={ms.closeBtn} onPress={handleClose}>
            <Ionicons name="close" size={22} color={C.text3} />
          </TouchableOpacity>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* 🔥 지금 인기 */}
          <View style={ms.section}>
            <View style={ms.sectionHeader}>
              <Text style={ms.sectionLabel}>🔥 지금 인기</Text>
              <TouchableOpacity onPress={() => setShowPopular(p => !p)}>
                <Text style={ms.collapseBtn}>{showPopular ? "접기 ▲" : "펼치기 ▼"}</Text>
              </TouchableOpacity>
            </View>
            {showPopular && (
              trendingLoading
                ? <ActivityIndicator color={C.red} style={{ marginVertical: 16 }} />
                : trending.length === 0
                  ? <Text style={ms.trendEmpty}>불러올 수 없어요</Text>
                  : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={ms.trendList}>
                      {trending.map(item => (
                        <TouchableOpacity key={item.tmdbId} style={ms.trendItem} onPress={() => handleSelectTrending(item)}>
                          {item.posterUrl
                            ? <Image source={{ uri: item.posterUrl }} style={ms.trendPoster} resizeMode="cover" />
                            : <View style={ms.trendPoster}><Ionicons name="film-outline" size={30} color={C.text3} /></View>}
                          <Text style={ms.trendTitle} numberOfLines={2}>{item.title}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )
            )}
          </View>

          {/* OTT 플랫폼 */}
          <View style={ms.section}>
            <Text style={ms.label}>OTT 플랫폼</Text>
            <View style={ms.chipRow}>
              {MODAL_OTT_KEYS.map(key => {
                const info = OTT[key];
                const selected = ott === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[ms.chip, { borderColor: selected ? info.color : C.border }, selected && { backgroundColor: info.color + "18" }]}
                    onPress={() => setOtt(key)}
                  >
                    <Text style={[ms.chipText, { color: selected ? info.color : C.text3, fontWeight: selected ? "700" : "500" }]}>{info.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* 작품명 검색 */}
          <View style={ms.section}>
            <Text style={ms.label}>작품명</Text>
            <View style={ms.searchRow}>
              <View style={{ flex: 1, position: "relative" }}>
                {posterUrl && (
                  <Image source={{ uri: posterUrl }} style={ms.posterBadge} />
                )}
                <TextInput
                  style={[ms.titleInput, posterUrl && { paddingLeft: 50 }]}
                  value={title}
                  onChangeText={handleTitleChange}
                  placeholder="예) 오징어게임, 무빙..."
                  placeholderTextColor={C.text3}
                  returnKeyType="search"
                />
              </View>
              <TouchableOpacity
                style={ms.searchBtn}
                onPress={() => {
                  if (!title.trim()) return;
                  setSearching(true);
                  searchTMDB(title).then(r => {
                    setSearchResults(r); setShowDropdown(r.length > 0); setSearching(false);
                  });
                }}
              >
                {searching
                  ? <ActivityIndicator size="small" color="#FFF" />
                  : <Ionicons name="search" size={20} color="#FFF" />}
              </TouchableOpacity>
            </View>
            {showDropdown && searchResults.length > 0 && (
              <View style={ms.dropdown}>
                {searchResults.map((item, idx) => (
                  <TouchableOpacity
                    key={item.tmdbId}
                    style={[ms.dropItem, idx === searchResults.length - 1 && { borderBottomWidth: 0 }]}
                    onPress={() => handleSelectResult(item)}
                  >
                    {item.posterUrl
                      ? <Image source={{ uri: item.posterUrl }} style={ms.dropPoster} resizeMode="cover" />
                      : <View style={ms.dropPosterEmpty}><Ionicons name="film-outline" size={16} color={C.text3} /></View>}
                    <View style={{ flex: 1 }}>
                      <Text style={ms.dropTitle} numberOfLines={1}>{item.title}</Text>
                      <Text style={ms.dropMeta}>{item.mediaType === "tv" ? "드라마" : "영화"}{item.year ? ` · ${item.year}` : ""}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* 시청 상태 */}
          <View style={ms.section}>
            <Text style={ms.label}>시청 상태</Text>
            <View style={ms.chipRow}>
              {STATUS_KEYS.map(key => {
                const info = STATUS[key];
                const selected = status === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[ms.chip, { borderColor: selected ? info.color : C.border }, selected && { backgroundColor: info.color + "18" }]}
                    onPress={() => setStatus(key)}
                  >
                    <Text style={[ms.chipText, { color: selected ? info.color : C.text3, fontWeight: selected ? "700" : "500" }]}>{info.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* 평점 */}
          <View style={ms.section}>
            <Text style={ms.label}>평점</Text>
            <View style={ms.starsRow}>
              {[1,2,3,4,5].map(n => (
                <TouchableOpacity key={n} onPress={() => setRating(n === rating ? 0 : n)}>
                  <Text style={[ms.star, { color: n <= rating ? "#FFB800" : C.border }]}>★</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 후기 */}
          <View style={ms.section}>
            <Text style={ms.label}>후기 (선택)</Text>
            <TextInput
              style={ms.memoInput}
              value={memo}
              onChangeText={setMemo}
              placeholder={"예) 몰입감 최고 😭\n3화부터 완전히 빠져들었다..."}
              placeholderTextColor={C.text3}
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* 친구와 공유 */}
          <View style={ms.section}>
            <Text style={[ms.label, { color: C.text }]}>
              친구와 공유 <Text style={{ color: C.text3, fontWeight: "400", fontSize: 11 }}>(선택)</Text>
            </Text>
            {friends.length === 0 ? (
              <Text style={ms.noFriends}>친구를 추가하면 공유할 수 있어요!</Text>
            ) : (
              <View style={ms.friendRow}>
                {friends.map(fid => {
                  const fp = friendProfiles[fid];
                  const name = fp?.displayName || "친구";
                  const initial = name[0].toUpperCase();
                  const selected = sharedFriends.includes(fid);
                  return (
                    <TouchableOpacity
                      key={fid}
                      style={[ms.friendChip, { borderColor: selected ? C.red : C.border }, selected && { backgroundColor: C.red + "18" }]}
                      onPress={() => toggleFriendShare(fid)}
                    >
                      <View style={[ms.friendAvatar, { backgroundColor: selected ? C.red : "#607D8B" }]}>
                        <Text style={ms.friendAvatarText}>{initial}</Text>
                      </View>
                      <Text style={[ms.friendName, { color: selected ? C.red : C.text }]}>{name}</Text>
                      {selected && <Ionicons name="checkmark" size={14} color={C.red} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          <View style={{ height: 20 }} />
        </ScrollView>

        <View style={ms.footer}>
          <TouchableOpacity style={ms.cancelBtn} onPress={handleClose}>
            <Text style={ms.cancelText}>취소</Text>
          </TouchableOpacity>
          <TouchableOpacity style={ms.saveBtn} onPress={handleSave} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={ms.saveBtnText}>추가하기</Text>}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
