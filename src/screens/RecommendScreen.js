import React, { useState, useEffect, useCallback, useContext } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Image, Modal, ActivityIndicator, Linking,
  ScrollView, Platform, Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemeContext } from "../../App";
import { OTT } from "../lib/theme";

const TMDB_KEY = "7baea0b714dbb25a96c6a9f1ba91f88e";
const TMDB_BASE = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p/w500";
const BACKDROP_BASE = "https://image.tmdb.org/t/p/w780";

const SCREEN_W = Dimensions.get("window").width;

// ─── TMDB API helpers ───────────────────────────────────────────────
async function tmdbFetch(path, params = {}) {
  const qs = new URLSearchParams({ api_key: TMDB_KEY, language: "ko-KR", ...params }).toString();
  const res = await fetch(`${TMDB_BASE}${path}?${qs}`);
  return res.json();
}

async function fetchTrending() {
  const [movies, tvs] = await Promise.all([
    tmdbFetch("/trending/movie/week"),
    tmdbFetch("/trending/tv/week"),
  ]);
  // 교차 배치
  const m = (movies.results || []).slice(0, 10);
  const t = (tvs.results || []).slice(0, 10);
  const mixed = [];
  for (let i = 0; i < Math.max(m.length, t.length); i++) {
    if (m[i]) mixed.push({ ...m[i], media_type: "movie" });
    if (t[i]) mixed.push({ ...t[i], media_type: "tv" });
  }
  return mixed;
}

async function searchContent(query) {
  const data = await tmdbFetch("/search/multi", { query, include_adult: false });
  return (data.results || []).filter(r => r.media_type === "movie" || r.media_type === "tv");
}

async function fetchVideos(id, type) {
  const data = await tmdbFetch(`/${type}/${id}/videos`);
  const items = data.results || [];
  // 한국어 예고편 우선, 없으면 영어
  const trailer =
    items.find(v => v.type === "Trailer" && v.site === "YouTube" && v.iso_639_1 === "ko") ||
    items.find(v => v.type === "Trailer" && v.site === "YouTube") ||
    items.find(v => v.site === "YouTube");
  return trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;
}

async function fetchDetail(id, type) {
  return tmdbFetch(`/${type}/${id}`, { append_to_response: "credits" });
}

// ─── 장르 칩 ─────────────────────────────────────────────────────────
const GENRE_MAP = {
  28:"액션", 12:"어드벤처", 16:"애니메이션", 35:"코미디", 80:"범죄",
  99:"다큐", 18:"드라마", 10751:"가족", 14:"판타지", 36:"역사",
  27:"공포", 10402:"음악", 9648:"미스터리", 10749:"로맨스", 878:"SF",
  10770:"TV 영화", 53:"스릴러", 10752:"전쟁", 37:"서부",
  10759:"액션·어드벤처", 10762:"어린이", 10763:"뉴스", 10764:"리얼리티",
  10765:"SF·판타지", 10766:"드라마", 10767:"토크쇼", 10768:"전쟁·정치",
};

// ─── 상세 모달 ────────────────────────────────────────────────────────
function DetailModal({ item, visible, onClose, C, bookmarked, onToggleBookmark }) {
  const [videoUrl, setVideoUrl] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingVideo, setLoadingVideo] = useState(true);

  useEffect(() => {
    if (!item || !visible) return;
    setVideoUrl(null);
    setDetail(null);
    setLoadingVideo(true);
    const type = item.media_type === "movie" ? "movie" : "tv";
    Promise.all([
      fetchVideos(item.id, type),
      fetchDetail(item.id, type),
    ]).then(([url, det]) => {
      setVideoUrl(url);
      setDetail(det);
      setLoadingVideo(false);
    }).catch(() => setLoadingVideo(false));
  }, [item?.id, visible]);

  if (!item) return null;

  const title = item.title || item.name || "";
  const overview = item.overview || "줄거리 정보가 없어요.";
  const genres = (item.genre_ids || []).map(id => GENRE_MAP[id]).filter(Boolean);
  const rating = item.vote_average ? item.vote_average.toFixed(1) : "-";
  const year = (item.release_date || item.first_air_date || "").slice(0, 4);
  const typeLabel = item.media_type === "movie" ? "영화" : "드라마";

  const s = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "flex-end" },
    sheet: { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "92%", overflow: "hidden" },
    backdrop: { width: "100%", height: 220 },
    backdropOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, height: 80, background: "transparent" },
    closeBtn: { position: "absolute", top: 12, right: 12, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 16, padding: 4 },
    body: { padding: 20 },
    typeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
    typeBadge: { backgroundColor: C.red + "22", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    typeBadgeText: { fontSize: 11, fontWeight: "700", color: C.red },
    year: { fontSize: 13, color: C.text3 },
    titleText: { fontSize: 22, fontWeight: "800", color: C.text, marginBottom: 8, lineHeight: 28 },
    meta: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
    rating: { flexDirection: "row", alignItems: "center", gap: 4 },
    ratingText: { fontSize: 14, fontWeight: "700", color: C.text },
    genreRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 16 },
    genre: { backgroundColor: C.bg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
    genreText: { fontSize: 12, color: C.text3 },
    overview: { fontSize: 14, lineHeight: 22, color: C.text3, marginBottom: 20 },
    btnRow: { flexDirection: "row", gap: 10 },
    trailerBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: C.red, borderRadius: 12, paddingVertical: 13 },
    trailerBtnText: { color: "#FFF", fontWeight: "700", fontSize: 14 },
    bookmarkBtn: { width: 48, height: 48, borderRadius: 12, borderWidth: 1.5, borderColor: C.border, alignItems: "center", justifyContent: "center" },
    noTrailer: { fontSize: 12, color: C.text3, textAlign: "center", marginTop: 8 },
  });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
        <View style={s.sheet}>
          {/* 배경 이미지 */}
          {item.backdrop_path ? (
            <Image source={{ uri: BACKDROP_BASE + item.backdrop_path }} style={s.backdrop} resizeMode="cover" />
          ) : item.poster_path ? (
            <Image source={{ uri: IMG_BASE + item.poster_path }} style={[s.backdrop, { resizeMode: "cover" }]} />
          ) : (
            <View style={[s.backdrop, { backgroundColor: C.border, alignItems: "center", justifyContent: "center" }]}>
              <Ionicons name="film-outline" size={48} color={C.text3} />
            </View>
          )}
          <TouchableOpacity style={s.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={20} color="#FFF" />
          </TouchableOpacity>

          <ScrollView style={s.body} showsVerticalScrollIndicator={false}>
            <View style={s.typeRow}>
              <View style={s.typeBadge}><Text style={s.typeBadgeText}>{typeLabel}</Text></View>
              {year ? <Text style={s.year}>{year}</Text> : null}
            </View>
            <Text style={s.titleText}>{title}</Text>
            <View style={s.meta}>
              <View style={s.rating}>
                <Ionicons name="star" size={14} color="#FFB800" />
                <Text style={s.ratingText}>{rating}</Text>
              </View>
            </View>
            {genres.length > 0 && (
              <View style={s.genreRow}>
                {genres.map(g => (
                  <View key={g} style={s.genre}><Text style={s.genreText}>{g}</Text></View>
                ))}
              </View>
            )}
            <Text style={s.overview}>{overview}</Text>

            <View style={s.btnRow}>
              <TouchableOpacity
                style={[s.trailerBtn, (loadingVideo || !videoUrl) && { backgroundColor: C.border }]}
                disabled={loadingVideo || !videoUrl}
                onPress={() => videoUrl && Linking.openURL(videoUrl)}
              >
                {loadingVideo
                  ? <ActivityIndicator color="#FFF" size="small" />
                  : <><Ionicons name="play-circle" size={18} color="#FFF" /><Text style={s.trailerBtnText}>예고편 보기</Text></>
                }
              </TouchableOpacity>
              <TouchableOpacity style={s.bookmarkBtn} onPress={() => onToggleBookmark(item)}>
                <Ionicons
                  name={bookmarked ? "bookmark" : "bookmark-outline"}
                  size={22}
                  color={bookmarked ? C.red : C.text3}
                />
              </TouchableOpacity>
            </View>
            {!loadingVideo && !videoUrl && (
              <Text style={s.noTrailer}>예고편을 찾을 수 없어요</Text>
            )}
            <View style={{ height: 30 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── 콘텐츠 카드 ──────────────────────────────────────────────────────
function ContentCard({ item, onPress, bookmarked, onToggleBookmark, C }) {
  const title = item.title || item.name || "";
  const rating = item.vote_average ? item.vote_average.toFixed(1) : "-";
  const year = (item.release_date || item.first_air_date || "").slice(0, 4);
  const typeLabel = item.media_type === "movie" ? "영화" : "드라마";
  const genres = (item.genre_ids || []).slice(0, 2).map(id => GENRE_MAP[id]).filter(Boolean);

  const s = StyleSheet.create({
    card: { flexDirection: "row", backgroundColor: C.surface, borderRadius: 16, marginBottom: 14, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
    poster: { width: 90, height: 134 },
    posterPlaceholder: { width: 90, height: 134, backgroundColor: C.border, alignItems: "center", justifyContent: "center" },
    info: { flex: 1, padding: 12, justifyContent: "space-between" },
    topRow: { gap: 4 },
    badgeRow: { flexDirection: "row", gap: 6, alignItems: "center", marginBottom: 4 },
    badge: { backgroundColor: C.red + "18", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
    badgeText: { fontSize: 10, fontWeight: "700", color: C.red },
    titleText: { fontSize: 15, fontWeight: "700", color: C.text, lineHeight: 20 },
    genreRow: { flexDirection: "row", gap: 4, flexWrap: "wrap", marginTop: 4 },
    genreText: { fontSize: 11, color: C.text3 },
    bottomRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
    ratingRow: { flexDirection: "row", alignItems: "center", gap: 3 },
    ratingText: { fontSize: 13, fontWeight: "600", color: C.text },
    year: { fontSize: 12, color: C.text3 },
    btnRow: { flexDirection: "row", gap: 6 },
    trailerBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.red, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
    trailerBtnText: { fontSize: 12, color: "#FFF", fontWeight: "700" },
    bookmarkBtn: { width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  });

  return (
    <TouchableOpacity style={s.card} activeOpacity={0.85} onPress={onPress}>
      {item.poster_path
        ? <Image source={{ uri: IMG_BASE + item.poster_path }} style={s.poster} resizeMode="cover" />
        : <View style={s.posterPlaceholder}><Ionicons name="film-outline" size={32} color={C.text3} /></View>
      }
      <View style={s.info}>
        <View style={s.topRow}>
          <View style={s.badgeRow}>
            <View style={s.badge}><Text style={s.badgeText}>{typeLabel}</Text></View>
            {year ? <Text style={s.year}>{year}</Text> : null}
          </View>
          <Text style={s.titleText} numberOfLines={2}>{title}</Text>
          {genres.length > 0 && (
            <View style={s.genreRow}>
              {genres.map((g, i) => (
                <Text key={g} style={s.genreText}>{g}{i < genres.length - 1 ? " · " : ""}</Text>
              ))}
            </View>
          )}
        </View>
        <View style={s.bottomRow}>
          <View style={s.ratingRow}>
            <Ionicons name="star" size={12} color="#FFB800" />
            <Text style={s.ratingText}>{rating}</Text>
          </View>
          <View style={s.btnRow}>
            <TouchableOpacity style={s.trailerBtn} onPress={onPress}>
              <Ionicons name="play" size={11} color="#FFF" />
              <Text style={s.trailerBtnText}>상세보기</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.bookmarkBtn} onPress={() => onToggleBookmark(item)}>
              <Ionicons
                name={bookmarked ? "bookmark" : "bookmark-outline"}
                size={15}
                color={bookmarked ? C.red : C.text3}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── 메인 화면 ────────────────────────────────────────────────────────
export default function RecommendScreen() {
  const C = useContext(ThemeContext);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [bookmarks, setBookmarks] = useState({}); // { id: item }
  const [tab, setTab] = useState("trending"); // "trending" | "bookmarks"

  useEffect(() => {
    fetchTrending().then(data => { setItems(data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const handleSearch = useCallback(async (q) => {
    if (!q.trim()) {
      setTab("trending");
      return;
    }
    setSearching(true);
    const results = await searchContent(q).catch(() => []);
    setItems(results);
    setSearching(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) handleSearch(searchQuery);
      else {
        setLoading(true);
        fetchTrending().then(data => { setItems(data); setLoading(false); }).catch(() => setLoading(false));
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  function toggleBookmark(item) {
    setBookmarks(prev => {
      const next = { ...prev };
      if (next[item.id]) delete next[item.id];
      else next[item.id] = item;
      return next;
    });
  }

  const displayItems = tab === "bookmarks"
    ? Object.values(bookmarks)
    : items;

  const s = React.useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    searchBox: { flexDirection: "row", alignItems: "center", backgroundColor: C.surface, borderRadius: 12, marginHorizontal: 16, marginVertical: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 8, borderWidth: 1, borderColor: C.border },
    searchInput: { flex: 1, fontSize: 14, color: C.text },
    tabRow: { flexDirection: "row", paddingHorizontal: 16, marginBottom: 4, gap: 4 },
    tabBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
    tabBtnText: { fontSize: 13, fontWeight: "600" },
    list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 100 },
    empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, paddingBottom: 80 },
    emptyText: { fontSize: 15, color: C.text3, fontWeight: "600" },
    emptySubText: { fontSize: 13, color: C.text3 },
    sectionTitle: { fontSize: 18, fontWeight: "800", color: C.text, paddingHorizontal: 16, marginBottom: 4, marginTop: 4 },
  }), [C]);

  return (
    <View style={s.container}>
      {/* 검색창 */}
      <View style={s.searchBox}>
        <Ionicons name="search" size={16} color={C.text3} />
        <TextInput
          style={s.searchInput}
          placeholder="작품 검색..."
          placeholderTextColor={C.text3}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={16} color={C.text3} />
          </TouchableOpacity>
        )}
      </View>

      {/* 탭 */}
      <View style={s.tabRow}>
        {[["trending", "🔥 트렌딩"], ["bookmarks", `🔖 찜 (${Object.keys(bookmarks).length})`]].map(([key, label]) => (
          <TouchableOpacity
            key={key}
            style={[s.tabBtn, tab === key && { backgroundColor: C.red + "18" }]}
            onPress={() => { setTab(key); setSearchQuery(""); }}
          >
            <Text style={[s.tabBtnText, { color: tab === key ? C.red : C.text3 }]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 섹션 타이틀 */}
      {!searchQuery && tab === "trending" && (
        <Text style={s.sectionTitle}>이번 주 인기작</Text>
      )}
      {searchQuery ? (
        <Text style={s.sectionTitle}>"{searchQuery}" 검색 결과</Text>
      ) : null}

      {/* 리스트 */}
      {loading || searching ? (
        <View style={s.empty}><ActivityIndicator color={C.red} size="large" /></View>
      ) : displayItems.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name={tab === "bookmarks" ? "bookmark-outline" : "search-outline"} size={48} color={C.text3} />
          <Text style={s.emptyText}>{tab === "bookmarks" ? "찜한 작품이 없어요" : "검색 결과가 없어요"}</Text>
          {tab === "bookmarks" && <Text style={s.emptySubText}>마음에 드는 작품을 찜해보세요</Text>}
        </View>
      ) : (
        <FlatList
          data={displayItems}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <ContentCard
              item={item}
              C={C}
              bookmarked={!!bookmarks[item.id]}
              onToggleBookmark={toggleBookmark}
              onPress={() => setSelectedItem(item)}
            />
          )}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      )}

      {/* 상세 모달 */}
      <DetailModal
        item={selectedItem}
        visible={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        C={C}
        bookmarked={selectedItem ? !!bookmarks[selectedItem.id] : false}
        onToggleBookmark={toggleBookmark}
      />
    </View>
  );
}
