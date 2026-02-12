"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface Notification {
  id: number;
  title: string;
  description: string;
}

const notificationsData: Notification[][] = [
  [
    { id: 1, title: "Welcome!", description: "Thanks for joining our music app." },
    { id: 2, title: "New Feature", description: "Check out the new playlist editor." },
  ],
  [
    { id: 3, title: "Update Available", description: "Version 1.0.1 is live." },
    { id: 4, title: "Tip", description: "Try using keyboard shortcuts to navigate faster." },
  ],
  [
    { id: 5, title: "Playlist Reminder", description: "You haven't created a playlist yet." },
    { id: 6, title: "Feature Spotlight", description: "Explore curated playlists for you." },
  ],
  [
    { id: 7, title: "Survey", description: "Help us improve by answering a short survey." },
    { id: 8, title: "Promo", description: "Get 1 month free premium subscription." },
  ],
];

export const NotificationsWindow = () => {
  const [currentPage, setCurrentPage] = useState(0);
  const [isOpen, setIsOpen] = useState(true);

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentPage < notificationsData.length - 1) setCurrentPage((prev) => prev + 1);
  };

  const handlePrev = () => {
    if (currentPage > 0) setCurrentPage((prev) => prev - 1);
  };

  return (
    <div className="w-96 bg-white dark:bg-neutral-900 border rounded-lg shadow-lg p-4 relative">
      {/* Close Button */}
      <button
        onClick={() => setIsOpen(false)}
        className="absolute top-2 right-4 text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white"
      >
        ✕
      </button>

      <h2 className="text-xl font-bold mb-4">Notifications</h2>

      <ul className="space-y-3">
        {notificationsData[currentPage].map((note) => (
          <li key={note.id} className="border-b pb-2">
            <h3 className="font-semibold">{note.title}</h3>
            <p className="text-gray-600 dark:text-gray-300">{note.description}</p>
          </li>
        ))}
      </ul>

      <div className="flex justify-between items-center mt-4">
        {/* Previous Button */}
        <motion.button
          onClick={handlePrev}
          disabled={currentPage === 0}
          whileHover={{ x: -4, opacity: 0.8 }}
          className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50"
        >
          &#8592; Prev
        </motion.button>

        <span className="text-sm text-gray-500 dark:text-gray-400">
          Page {currentPage + 1} of {notificationsData.length}
        </span>

        {/* Next / Close Button */}
        {currentPage < notificationsData.length - 1 ? (
          <motion.button
            onClick={handleNext}
            whileHover={{ x: 4, opacity: 0.8 }}
            className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded"
          >
            Next &#8594;
          </motion.button>
        ) : (
          <motion.button
            onClick={() => setIsOpen(false)}
            whileHover={{ scale: 1.1, opacity: 0.8 }}
            className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded"
          >
            Close
          </motion.button>
        )}
      </div>
    </div>
  );
};
