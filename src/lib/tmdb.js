const TMDB_API_KEY = "7baea0b714dbb25a96c6a9f1ba91f88e";
const BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

export async function searchTMDB(query) {
  if (!query || query.trim().length < 1) return [];
  try {
    const res = await fetch(
      `${BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=ko-KR&include_adult=false`
    );
    const data = await res.json();
    return (data.results || [])
      .filter(item => item.media_type === "movie" || item.media_type === "tv")
      .slice(0, 6)
      .map(item => ({
        tmdbId: item.id,
        title: item.title || item.name,
        originalTitle: item.original_title || item.original_name,
        posterUrl: item.poster_path ? `${IMAGE_BASE}${item.poster_path}` : null,
        year: (item.release_date || item.first_air_date || "").slice(0, 4),
        mediaType: item.media_type,
        rating: item.vote_average ? Math.round(item.vote_average / 2) : 0,
      }));
  } catch (e) {
    console.error("TMDB search error:", e);
    return [];
  }
}
