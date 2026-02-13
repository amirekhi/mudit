import { useEffect } from "react";
import { useNotificationStore } from "@/store/useNotificationStore";
import { authFetch } from "@/lib/TanStackQuery/authQueries/authFetch";

export function useNotification() {
  const addNotificationsInBatch = useNotificationStore(
    (s) => s.addNotificationsInBatch
  );

  useEffect(() => {
    async function load() {
      const res = await authFetch("/api/notifications/me");

      if (!res.ok) return;

      const data = await res.json();
      addNotificationsInBatch(data);
    }

    load();
  }, [addNotificationsInBatch]);
}
