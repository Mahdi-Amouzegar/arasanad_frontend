/** فاز ۱۲٫۵-ج-۱ — کلاینت تایپ‌شده‌ی امتیاز سفارش‌ها. */

import type { AuthedRequest } from '@/lib/files/api';

export interface OrderRating {
  id: string;
  projectId: string;
  userId: string;
  score: number;
  comment: string | null;
  createdAt: string;
}

export interface RatingStatus {
  rating: OrderRating | null;
  /** تصمیم سرور؛ در کلاینت حدس زده نمی‌شود. */
  canRate: boolean;
  summary: { average: number | null; count: number };
  serverTime: string;
}

export interface AdminRating extends OrderRating {
  projectCode: string | null;
  projectName: string | null;
  userName: string | null;
}

export interface AdminRatingsView {
  summary: { average: number | null; count: number };
  ratings: AdminRating[];
  serverTime: string;
}

export function createRatingsApi(request: AuthedRequest) {
  return {
    async status(projectId: string): Promise<RatingStatus> {
      const data = await request<RatingStatus>(
        `/projects/${encodeURIComponent(projectId)}/rating`,
      );
      return {
        rating: data.rating ?? null,
        canRate: data.canRate === true,
        summary: {
          average: typeof data.summary?.average === 'number' ? data.summary.average : null,
          count: Number(data.summary?.count ?? 0),
        },
        serverTime: typeof data.serverTime === 'string' ? data.serverTime : '',
      };
    },

    async submit(projectId: string, score: number, comment: string): Promise<RatingStatus> {
      const data = await request<RatingStatus>(
        `/projects/${encodeURIComponent(projectId)}/rating`,
        { method: 'POST', body: { score, comment } },
      );
      return {
        rating: data.rating ?? null,
        canRate: data.canRate === true,
        summary: {
          average: typeof data.summary?.average === 'number' ? data.summary.average : null,
          count: Number(data.summary?.count ?? 0),
        },
        serverTime: typeof data.serverTime === 'string' ? data.serverTime : '',
      };
    },

    async adminList(): Promise<AdminRatingsView> {
      const data = await request<AdminRatingsView>('/admin/ratings');
      return {
        summary: {
          average: typeof data.summary?.average === 'number' ? data.summary.average : null,
          count: Number(data.summary?.count ?? 0),
        },
        ratings: Array.isArray(data.ratings) ? data.ratings : [],
        serverTime: typeof data.serverTime === 'string' ? data.serverTime : '',
      };
    },
  };
}
