import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Notif } from "@/components/basics/NotificationsWindow";

interface NotificationState {
  notifications: Notif[];
  dissmissedIds: string[];

  dismissNotification(id: number): void;
  dismissAll(): void;

  addNotification(not: Notif): void;
  addNotificationsInBatch(not: Notif[]): void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      dissmissedIds: [],

      dismissNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
          dissmissedIds: [...state.dissmissedIds, id.toString()],
        })),

      dismissAll: () =>
        set((state) => ({
          dissmissedIds: [
            ...state.dissmissedIds,
            ...state.notifications.map((n) => n.id.toString()),
          ],
          notifications: [],
        })),

      addNotification: (not) => {
        const { dissmissedIds, notifications } = get();

        // Don't re-add dismissed notifications
        if (dissmissedIds.includes(not.id.toString())) return;

        // Prevent duplicate IDs
        if (notifications.some((n) => n.id === not.id)) return;

        set({ notifications: [...notifications, not] });
      },

      addNotificationsInBatch: (batch) => {
        const { dissmissedIds, notifications } = get();

        const filtered = batch.filter(
          (n) =>
            !dissmissedIds.includes(n.id.toString()) &&
            !notifications.some((existing) => existing.id === n.id)
        );

        if (filtered.length === 0) return;

        set({
          notifications: [...notifications, ...filtered],
        });
      },
    }),
    { name: "notifications" }
  )
);
