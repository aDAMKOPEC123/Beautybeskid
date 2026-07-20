import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getGoogleReviews } from './google-reviews.service';

const originalApiKey = process.env.GOOGLE_PLACES_API_KEY;
const originalPlaceId = process.env.GOOGLE_PLACE_ID;

describe('google reviews service', () => {
  beforeEach(() => {
    process.env.GOOGLE_PLACES_API_KEY = 'test-google-places-api-key';
    process.env.GOOGLE_PLACE_ID = 'test-place-id';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalApiKey === undefined) delete process.env.GOOGLE_PLACES_API_KEY;
    else process.env.GOOGLE_PLACES_API_KEY = originalApiKey;
    if (originalPlaceId === undefined) delete process.env.GOOGLE_PLACE_ID;
    else process.env.GOOGLE_PLACE_ID = originalPlaceId;
  });

  it('maps required attribution links and does not persist Place content between calls', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        rating: 4.9,
        userRatingCount: 42,
        googleMapsUri: 'https://maps.google.com/place',
        reviews: [
          {
            rating: 5,
            text: { text: 'Bardzo dobra wizyta.' },
            relativePublishTimeDescription: 'miesiąc temu',
            googleMapsUri: 'https://maps.google.com/review/1',
            authorAttribution: {
              displayName: 'Anna',
              uri: 'https://maps.google.com/contrib/anna',
              photoUri: 'https://example.com/anna.jpg',
            },
          },
          {
            rating: 3,
            text: { text: 'Ta opinia nie jest publikowana.' },
            authorAttribution: { displayName: 'Ewa' },
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const first = await getGoogleReviews();
    await getGoogleReviews();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://places.googleapis.com/v1/places/test-place-id?languageCode=pl',
      expect.objectContaining({
        headers: {
          'X-Goog-Api-Key': 'test-google-places-api-key',
          'X-Goog-FieldMask': 'rating,userRatingCount,reviews,googleMapsUri',
        },
      }),
    );
    expect(first).toEqual({
      rating: 4.9,
      user_ratings_total: 42,
      place_url: 'https://maps.google.com/place',
      reviews: [
        {
          author_name: 'Anna',
          author_uri: 'https://maps.google.com/contrib/anna',
          rating: 5,
          text: 'Bardzo dobra wizyta.',
          time: 0,
          relative_time_description: 'miesiąc temu',
          profile_photo_url: 'https://example.com/anna.jpg',
          google_maps_uri: 'https://maps.google.com/review/1',
        },
      ],
    });
  });

  it('requires both Google Places values', async () => {
    delete process.env.GOOGLE_PLACES_API_KEY;

    await expect(getGoogleReviews()).rejects.toThrow('GOOGLE_PLACES_API_KEY or GOOGLE_PLACE_ID not set');
  });

  it('reports a failed Places API response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }));

    await expect(getGoogleReviews()).rejects.toThrow('Places API error: 403');
  });
});
