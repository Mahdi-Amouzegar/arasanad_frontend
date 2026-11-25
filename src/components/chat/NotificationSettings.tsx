'use client';

/**
 * فاز ۱۲٫۳۱ — تنظیمات جامع کانالها و تکرویدادهای اعلان.
 *
 * ⚠️ فهرست رویداد‌ها، عنوانها و گروهها را فقط از بکند می‌گیریم؛ فرانت فهرست
 *    موازی ندارد. تمام تغییرات در یک درخواست ذخیره می‌شوند تا ارسال تکراری رخ ندهد.
 * ⚠️ Toastهای خطا/موفقیت عملیات تحت تأثیر تنظیم «اعلان داخل برنامه» نیستند.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useAlert } from '@/components/ui/AlertProvider';
import { useNotifications } from './NotificationProvider';
import {
  type NotificationChannel,
  type NotificationChannelFlags,
  type NotificationGroupId,
} from '@/lib/notifications/api';
import { groupToggleState } from '@/lib/notifications/preferences.mjs';

const CHANNELS: Array<{ id: NotificationChannel; label: string; hint: string }> = [
  { id: 'telegram', label: 'اعلان تلگرام', hint: 'پس از اتصال ربات، پیام‌ها از طریق تلگرام ارسال می‌شوند.' },
  { id: 'browser', label: 'اعلان مرورگر', hint: 'نمایش نوتیف سیستمعامل توسط سایت؛ مجوز مرورگر جداگانه است.' },
  { id: 'inapp', label: 'اعلان داخل برنامه (Toast)', hint: 'فقط Toast ناشی از رویداد‌ها؛ خطاها و نتیجه عملیات همیشه نمایش می‌یابند.' },
];

type EventFlags = Partial<NotificationChannelFlags>;
type DraftEvents = Record<string, EventFlags>;

function ChannelToggle({
  checked,
  mixed = false,
  disabled = false,
  label,
  onChange,
}: {
  checked: boolean;
  mixed?: boolean;
  disabled?: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={mixed ? 'mixed' : checked}
      aria-label={label}
      disabled={disabled}
      className={`notif-toggle${checked || mixed ? ' notif-toggle--on' : ''}${mixed ? ' notif-toggle--mixed' : ''}`}
      onClick={onChange}
    >
      <span className="notif-toggle__dot" aria-hidden="true" />
    </button>
  );
}

export function NotificationSettingsPanel() {
  const { settings, settingsLoading, updateSettings } = useNotifications();
  const { showToast } = useAlert();
  const [channels, setChannels] = useState<NotificationChannelFlags>({
    telegram: true,
    browser: true,
    inapp: true,
  });
  const [events, setEvents] = useState<DraftEvents>({});
  const [saving, setSaving] = useState(false);

  const catalog = useMemo(() => settings?.catalog ?? [], [settings?.catalog]);
  const groups = useMemo(() => settings?.groups ?? [], [settings?.groups]);

  useEffect(() => {
    if (!settings) return;
    const current = settings;
    setChannels({ ...current.channels });
    const next: DraftEvents = {};
    for (const item of catalog) {
      next[item.type] = { ...(current.events[item.type] ?? {}) };
    }
    setEvents(next);
  }, [settings, settings?.updatedAt, catalog]);

  const dirty = useMemo(() => {
    if (!settings) return false;
    if (CHANNELS.some(({ id }) => channels[id] !== settings.channels[id])) return true;
    return catalog.some((item) =>
      (['telegram', 'browser', 'inapp'] as NotificationChannel[]).some(
        (channel) => item.channels[channel]
          && (events[item.type]?.[channel] ?? true) !== (settings.events[item.type]?.[channel] ?? true),
      ),
    );
  }, [catalog, channels, events, settings]);

  const applyChannel = useCallback((channel: NotificationChannel, value: boolean) => {
    setChannels((current) => ({ ...current, [channel]: value }));
  }, []);

  const applyEvent = useCallback(
    (type: string, channel: NotificationChannel, value: boolean) => {
      setEvents((current) => ({ ...current, [type]: { ...(current[type] ?? {}), [channel]: value } }));
    },
    [],
  );

  const applyGroup = useCallback(
    (groupItems: typeof catalog, channel: NotificationChannel) => {
      const state = groupToggleState(groupItems, channel, { channels, events });
      const value = state !== 'all';
      setEvents((current) => {
        const next = { ...current };
        for (const item of groupItems) {
          if (!item.channels[channel]) continue;
          next[item.type] = { ...(next[item.type] ?? {}), [channel]: value };
        }
        return next;
      });
    },
    [channels, events],
  );

  async function save() {
    if (!settings || saving || !dirty) return;
    setSaving(true);
    try {
      const changedChannels: Partial<NotificationChannelFlags> = {};
      for (const { id } of CHANNELS) {
        if (channels[id] !== settings.channels[id]) changedChannels[id] = channels[id];
      }
      const changedEvents: Array<{ type: string } & EventFlags> = [];
      for (const item of catalog) {
        const patch: EventFlags = {};
        for (const channel of ['telegram', 'browser', 'inapp'] as NotificationChannel[]) {
          if (!item.channels[channel]) continue;
          const nextValue = events[item.type]?.[channel] ?? true;
          const oldValue = settings.events[item.type]?.[channel] ?? true;
          if (nextValue !== oldValue) patch[channel] = nextValue;
        }
        if (Object.keys(patch).length > 0) changedEvents.push({ type: item.type, ...patch });
      }
      await updateSettings({
        ...(Object.keys(changedChannels).length > 0 ? { channels: changedChannels } : {}),
        ...(changedEvents.length > 0 ? { events: changedEvents } : {}),
      });
      showToast({ type: 'success', title: 'تنظیمات اعلان‌ها ذخیره شد' });
    } catch (error) {
      showToast({
        type: 'error',
        title: 'ذخیره تنظیمات ناموفق بود',
        message: error instanceof Error ? error.message : 'خطای شبکه',
      });
    } finally {
      setSaving(false);
    }
  }

  if (settingsLoading && !settings) return <p className="prj-muted">در حال خواندن تنظیمات اعلان‌ها…</p>;
  if (!settings || catalog.length === 0) {
    return <p className="prj-muted">تنظیمات اعلان‌ها در دسترس نیستند.</p>;
  }

  return (
    <div className="notif-settings">
      <div className="notif-settings__channels">
        {CHANNELS.map(({ id, label, hint }) => (
          <div key={id} className="notif-settings__channel">
            <div>
              <strong>{label}</strong>
              <p>{hint}</p>
            </div>
            <ChannelToggle
              checked={channels[id]}
              label={label}
              onChange={() => applyChannel(id, !channels[id])}
            />
          </div>
        ))}
      </div>

      <h3 className="notif-settings__heading">تنظیم اعلان‌های هر رویداد</h3>
      <p className="prj-muted">
        هر رویداد را می‌توانید جداگانه در هر کانال روشن یا خاموش کنید. خاموش کردن عمومی یک کانال بر
        تمام رویدادهای همان کانال غلبه می‌کند.
      </p>

      <div className="notif-settings__groups">
        {groups.map((group) => {
          const items = catalog.filter((item) => item.group === group.id as NotificationGroupId);
          return (
            <details key={group.id} className="notif-group" open>
              <summary>{group.title}</summary>
              <div className="notif-group__actions">
                {CHANNELS.map(({ id, label }) => {
                  const supported = items.filter((item) => item.channels[id]);
                  if (supported.length === 0) return null;
                  return (
                    <div key={id} className="notif-group__action">
                      <span>همهٔ {label}</span>
                      <ChannelToggle
                        checked={groupToggleState(supported, id, { channels, events }) === 'all'}
                        mixed={groupToggleState(supported, id, { channels, events }) === 'mixed'}
                        label={`تغییر گروهی ${group.title} در کانال ${label}`}
                        onChange={() => applyGroup(supported, id)}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="prj-table-wrap">
                <table className="prj-table notif-settings__table">
                  <thead>
                    <tr>
                      <th scope="col">نام اعلان</th>
                      {CHANNELS.map(({ id, label }) => (
                        <th key={id} scope="col">{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.type}>
                        <td>{item.title}</td>
                        {CHANNELS.map(({ id, label }) => (
                          <td key={id}>
                            {item.channels[id] ? (
                              <ChannelToggle
                                checked={events[item.type]?.[id] ?? true}
                                label={`${item.title} — ${label}`}
                                onChange={() => applyEvent(item.type, id, !(events[item.type]?.[id] ?? true))}
                              />
                            ) : (
                              <span className="prj-muted" aria-label="پشتیبانی نمی‌شود">—</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          );
        })}
      </div>

      <div className="notif-settings__actions">
        <Button
          variant="primary"
          size="sm"
          leadingIcon={<Icon name="check" size={15} />}
          disabled={!dirty || saving}
          loading={saving}
          onClick={() => void save()}
        >
          ذخیره تنظیمات
        </Button>
      </div>
    </div>
  );
}
