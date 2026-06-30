// src/types/index.ts

export type ReviewClassification = 'helpful' | 'spam' | 'toxic' | 'pending';

export interface Review {
  id: string;
  gameTitle: string;
  platform: string;
  rating: number; // 1-10
  headline: string;
  body: string;
  pros: string;
  cons: string;
  playtime: string;
  reviewerTag: string;
  classification: ReviewClassification;
  classificationReason?: string;
  createdAt: string;
}

export interface GameSummary {
  title: string;
  averageRating: number;
  reviewCount: number;
  topTags: string[];
}

export const PLATFORMS = [
  'PC',
  'PlayStation 5',
  'PlayStation 4',
  'Xbox Series X/S',
  'Xbox One',
  'Nintendo Switch',
  'Steam Deck',
  'Mobile',
] as const;

export const GENRES = [
  'Action RPG',
  'FPS',
  'Strategy',
  'Sports',
  'Horror',
  'Adventure',
  'Fighting',
  'Simulation',
  'Indie',
  'MMORPG',
] as const;

export type Platform = (typeof PLATFORMS)[number];
export type Genre = (typeof GENRES)[number];
