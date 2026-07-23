export interface GoogleReview {
  author_name: string;
  author_uri: string;
  rating: number;
  text: string;
  time: number;
  profile_photo_url: string;
  relative_time_description: string;
  google_maps_uri: string;
}

export interface GoogleReviewsData {
  rating: number;
  user_ratings_total: number;
  place_url: string;
  reviews: GoogleReview[];
}

export async function getGoogleReviews(): Promise<GoogleReviewsData> {
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

  const json = await res.json() as {
    rating: number;
    userRatingCount: number;
    googleMapsUri?: string;
    reviews?: Array<{
      rating: number;
      text?: { text?: string };
      authorAttribution?: { displayName?: string; uri?: string; photoUri?: string };
      relativePublishTimeDescription?: string;
      googleMapsUri?: string;
    }>;
  };

  return {
    rating: json.rating,
    user_ratings_total: json.userRatingCount,
    place_url: json.googleMapsUri ?? 'https://www.google.com/maps/place/?q=place_id:ChIJY6kyM0odFkcRMunk0OJ9lic',
    reviews: (json.reviews || [])
      .filter(r => r.rating >= 4)
      .map(r => ({
        author_name: r.authorAttribution?.displayName ?? '',
        author_uri: r.authorAttribution?.uri ?? '',
        rating: r.rating,
        text: r.text?.text ?? '',
        time: 0,
        relative_time_description: r.relativePublishTimeDescription ?? '',
        profile_photo_url: r.authorAttribution?.photoUri ?? '',
        google_maps_uri: r.googleMapsUri ?? json.googleMapsUri ?? '',
      })),
  };
}
