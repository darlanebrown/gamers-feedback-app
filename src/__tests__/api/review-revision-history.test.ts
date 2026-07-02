jest.mock('@/lib/revisionStore', () => ({
  getRevisionHistory: jest.fn(),
  createRevision:     jest.fn(),
}));

jest.mock('@/lib/reviewStore', () => ({
  getReviewById: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/reviews/[id]/history/route';
import { getRevisionHistory } from '@/lib/revisionStore';
import { getReviewById } from '@/lib/reviewStore';

const mockGetHistory   = getRevisionHistory as jest.Mock;
const mockGetReviewById = getReviewById     as jest.Mock;

const REVIEW_ID = 'rev1';

const SAMPLE_REVISIONS = [
  {
    id: 'rv2', reviewId: REVIEW_ID, editedAt: '2026-07-02T10:00:00.000Z',
    headline: 'Updated title', body: 'Updated body.', pros: 'Great',
    cons: 'None', rating: 9, playtime: '20h',
  },
  {
    id: 'rv1', reviewId: REVIEW_ID, editedAt: '2026-07-01T10:00:00.000Z',
    headline: 'Original title', body: 'Original body.', pros: 'Good',
    cons: 'A bit short', rating: 8, playtime: '15h',
  },
];

function makeReq(id: string) {
  return new NextRequest(`http://localhost/api/reviews/${id}/history`);
}

function makeParams(id: string) {
  return Promise.resolve({ id });
}

beforeEach(() => {
  jest.resetAllMocks();
  mockGetHistory.mockResolvedValue(SAMPLE_REVISIONS);
});

describe('GET /api/reviews/[id]/history', () => {
  it('returns 404 when review does not exist', async () => {
    mockGetReviewById.mockResolvedValue(null);
    const res = await GET(makeReq(REVIEW_ID), { params: makeParams(REVIEW_ID) });
    expect(res.status).toBe(404);
  });

  it('returns revision history newest-first', async () => {
    mockGetReviewById.mockResolvedValue({ id: REVIEW_ID });
    const res = await GET(makeReq(REVIEW_ID), { params: makeParams(REVIEW_ID) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.revisions).toHaveLength(2);
    expect(body.revisions[0].id).toBe('rv2');
    expect(body.revisions[1].id).toBe('rv1');
  });

  it('includes all editable fields in each revision', async () => {
    mockGetReviewById.mockResolvedValue({ id: REVIEW_ID });
    const res = await GET(makeReq(REVIEW_ID), { params: makeParams(REVIEW_ID) });
    const body = await res.json();
    const first = body.revisions[0];
    expect(first).toMatchObject({
      headline: 'Updated title',
      body:     'Updated body.',
      pros:     'Great',
      cons:     'None',
      rating:   9,
      playtime: '20h',
      editedAt: '2026-07-02T10:00:00.000Z',
    });
  });

  it('returns empty array when no revisions exist', async () => {
    mockGetReviewById.mockResolvedValue({ id: REVIEW_ID });
    mockGetHistory.mockResolvedValue([]);
    const res = await GET(makeReq(REVIEW_ID), { params: makeParams(REVIEW_ID) });
    const body = await res.json();
    expect(body.revisions).toEqual([]);
  });

  it('calls getRevisionHistory with the review id', async () => {
    mockGetReviewById.mockResolvedValue({ id: REVIEW_ID });
    await GET(makeReq(REVIEW_ID), { params: makeParams(REVIEW_ID) });
    expect(mockGetHistory).toHaveBeenCalledWith(REVIEW_ID);
  });
});
