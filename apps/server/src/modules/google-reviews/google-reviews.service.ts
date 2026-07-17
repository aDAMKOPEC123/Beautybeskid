interface GoogleReview {
  author_name: string;
  rating: number;
  text: string;
  time: number;
  profile_photo_url: string;
  relative_time_description: string;
}

interface CachedData {
  rating: number;
  user_ratings_total: number;
  place_url: string;
  reviews: GoogleReview[];
  fetchedAt: number;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
let cache: CachedData | null = null;

export async function getGoogleReviews(): Promise<CachedData> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache;
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const placeId = process.env.GOOGLE_PLACE_ID;

  if (!apiKey || !placeId) {
    throw new Error('GOOGLE_PLACES_API_KEY or GOOGLE_PLACE_ID not set');
  }

  const url = `https://places.googleapis.com/v1/places/${placeId}?languageCode=pl`;

  const res = await fetch(url, {
    headers: {
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'rating,userRatingCount,reviews,googleMapsUri',
    },
  });
  if (!res.ok) throw new Error(`Places API error: ${res.status}`);

  const json = await res.json() as { rating: number; userRatingCount: number; googleMapsUri?: string; reviews: Array<{ rating: number; text: { text: string }; authorAttribution: { displayName: string; photoUri: string }; relativePublishTimeDescription: string }> };

  cache = {
    rating: json.rating,
    user_ratings_total: json.userRatingCount,
    place_url: json.googleMapsUri ?? 'https://www.google.com/maps/search/?api=1&query=BeskidStudio+By+Wiktoria+%C4%86wik+Mordarka+505',
    reviews: (json.reviews || [])
      .filter(r => r.rating >= 4)
      .map(r => ({
        author_name: r.authorAttribution?.displayName ?? '',
        rating: r.rating,
        text: r.text?.text ?? '',
        time: 0,
        relative_time_description: r.relativePublishTimeDescription ?? '',
        profile_photo_url: r.authorAttribution?.photoUri ?? '',
      })),
    fetchedAt: Date.now(),
  };

  return cache;
}
