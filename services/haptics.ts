/**
 * Dynamic Haptic Feedback Utility
 * Uses the Web Vibration API to provide tactile feedback for key interactions.
 */

export const Haptics = {
  /**
   * Light tap for subtle confirmation (e.g., input focus, small toggle)
   */
  light: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  },

  /**
   * Medium feedback for standard actions (e.g., successful transaction log)
   */
  success: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([15, 30, 15]);
    }
  },

  /**
   * Sharp warning for critical events (e.g., budget violation, panic trigger)
   */
  warning: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100]);
    }
  },

  /**
   * Triple heavy pulse for error states
   */
  error: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }
  }
};
