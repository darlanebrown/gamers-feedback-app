import { getPreferences }    from './notificationPrefStore';
import { createNotification } from './notificationStore';

export async function notifyTipReceived(
  recipientTag: string,
  senderTag:    string,
): Promise<void> {
  const prefs = await getPreferences(recipientTag);
  if (!prefs.tipReceived) return;
  await createNotification(recipientTag, 'tip', senderTag);
}
