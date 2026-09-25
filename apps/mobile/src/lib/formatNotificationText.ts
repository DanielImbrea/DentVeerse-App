type NotificationLike = {
  type: string;
  body: string | null;
};

/** Human-readable Romanian label when DB body is missing (legacy rows). */
export function formatNotificationText(notification: NotificationLike): string {
  if (notification.body?.trim()) return notification.body.trim();

  switch (notification.type) {
    case 'new_follower':
      return 'Urmăritor nou';
    case 'new_like':
      return 'Apreciere nouă la o postare';
    case 'new_comment':
      return 'Comentariu nou';
    case 'new_message':
      return 'Mesaj nou';
    case 'collaboration_request':
      return 'Cerere de colaborare';
    case 'opportunity_response':
      return 'Răspuns la o oportunitate';
    case 'verification_approved':
      return 'Verificare aprobată';
    case 'new_review':
      return 'Recenzie nouă';
    default:
      return notification.type;
  }
}
