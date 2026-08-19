import { useEffect } from 'react';
import { checkDueReminders, ensureReminderServiceWorker } from '../services/reminderService.js';

export default function ReminderNotifier() {
  useEffect(() => {
    let active = true;

    const check = async () => {
      if (!active) return;
      try {
        await ensureReminderServiceWorker();
        await checkDueReminders();
      } catch (error) {
        console.warn('Não foi possível verificar lembretes:', error);
      }
    };

    check();
    const interval = window.setInterval(check, 60_000);
    const onChanged = () => check();
    window.addEventListener('mm-erp-reminders-changed', onChanged);
    window.addEventListener('focus', onChanged);

    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener('mm-erp-reminders-changed', onChanged);
      window.removeEventListener('focus', onChanged);
    };
  }, []);

  return null;
}
