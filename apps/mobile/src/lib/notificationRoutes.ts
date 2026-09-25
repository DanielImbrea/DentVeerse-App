type NotificationRouteInput = {
  type: string;
  target_type: string | null;
  target_id: string | null;
};

/** Maps in-app / push notification metadata to an Expo Router path. */
export function getNotificationRoute(notification: NotificationRouteInput): string | null {
  if (notification.target_id && notification.target_type) {
    switch (notification.target_type) {
      case 'post':
        return `/post/${notification.target_id}`;
      case 'clinic':
        return `/clinic/${notification.target_id}`;
      case 'laboratory':
        return `/laboratory/${notification.target_id}`;
      case 'conversation':
        return `/conversation/${notification.target_id}`;
      case 'opportunity':
        return `/opportunity/${notification.target_id}`;
      case 'comment':
        return notification.target_id ? `/post/${notification.target_id}` : null;
      default:
        break;
    }
  }

  if (notification.type === 'new_message' && notification.target_id) {
    return `/conversation/${notification.target_id}`;
  }

  return null;
}
