"use client";

import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { useNotificationStore } from "@/store/useNotificationStore";
import { useNotification } from "@/hooks/useNotification";

export interface Notif {
  id: number;
  title: string;
  description: string;
}

export const NotificationsWindow = () => {
  useNotification();

  const data = useNotificationStore((s) => s.notifications);
  const dismissAll = useNotificationStore((s) => s.dismissAll);

  const [currentPage, setCurrentPage] = useState(0);
  const [isOpen, setIsOpen] = useState(false); // ✅ Closed by default

  const PAGE_SIZE = 3;

  const notificationsData = useMemo(() => {
    const result: Notif[][] = [];
    for (let i = 0; i < data.length; i += PAGE_SIZE) {
      result.push(data.slice(i, i + PAGE_SIZE));
    }
    return result;
  }, [data]);

  // ✅ Open automatically if notifications appear
  useEffect(() => {
    if (data.length > 0) {
      setIsOpen(true);
    } else {
      setIsOpen(false); // Close if all notifications dismissed
    }
  }, [data.length]);

  useEffect(() => {
    if (currentPage > notificationsData.length - 1 && notificationsData.length > 0) {
      setCurrentPage(notificationsData.length - 1);
    }
  }, [notificationsData.length, currentPage]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentPage < notificationsData.length - 1) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentPage > 0) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const isLastPage = currentPage === notificationsData.length - 1;

  const handleCloseAfterSeen = () => {
    dismissAll(); // dismiss all seen notifications
    setIsOpen(false);
  };

  return (
    <div className="w-96 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-lg p-4 relative">
      {/* Top Right Close (does NOT dismiss) */}
      <button
        onClick={() => setIsOpen(false)}
        className="absolute top-2 right-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white transition"
      >
        ✕
      </button>

      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
        Notifications
      </h2>

      <ul className="space-y-3 min-h-[120px]">
        {notificationsData[currentPage]?.map((note) => (
          <li key={note.id} className="border-b border-neutral-200 dark:border-neutral-800 pb-2">
            <h3 className="font-semibold text-gray-900 dark:text-white">{note.title}</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">{note.description}</p>
          </li>
        ))}
      </ul>

      {notificationsData.length > 0 && (
        <div className="flex justify-between items-center mt-4">
          <motion.button
            onClick={handlePrev}
            disabled={currentPage === 0}
            whileHover={{ x: -4, opacity: 0.8 }}
            className="px-3 py-1 bg-gray-200 dark:bg-neutral-800 rounded disabled:opacity-40 transition"
          >
            ← Prev
          </motion.button>

          <span className="text-sm text-gray-500 dark:text-gray-400">
            Page {currentPage + 1} of {notificationsData.length}
          </span>

          {!isLastPage ? (
            <motion.button
              onClick={handleNext}
              whileHover={{ x: 4, opacity: 0.8 }}
              className="px-3 py-1 bg-gray-200 dark:bg-neutral-800 rounded transition"
            >
              Next →
            </motion.button>
          ) : (
            <motion.button
              onClick={handleCloseAfterSeen}
              whileHover={{ scale: 1.05, opacity: 0.8 }}
              className="px-3 py-1 bg-gray-200 dark:bg-neutral-800 rounded transition"
            >
              Close
            </motion.button>
          )}
        </div>
      )}
    </div>
  );
};
