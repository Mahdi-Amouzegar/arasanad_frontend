'use client';

import { FileName } from '@/components/ui/FileName';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/account';
import { useSiteConfig } from '@/lib/site-config';
import {
  createProjectsApi,
  getDesignPresets,
  getLanguages,
  getPricingRules,
  getServiceTypes,
  type CreateProjectBody,
  type DesignPreset,
  type ServiceType,
} from '@/lib/projects/api';
import {
  DEFAULT_DESIGN_SPEC,
  DELIVERY_UNITS,
  DELIVERY_VALUE_MAX,
  DELIVERY_VALUE_MIN,
  deliveryHoursFrom,
  PAPER_SIZES,
  SOURCE_TYPES,
  calculateDeposit,
  calculateEstimate,
  isUrgent,
  mergeDesignSpec,
  validateProjectDraft,
  type DesignSpec,
} from '@/lib/projects/core.mjs';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { FormField, Input, Select, Textarea } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Money } from '@/components/ui/Money';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAlert } from '@/components/ui/AlertProvider';
import {
  FileManagerModal,
  localFileSignature,
  type SelectedFile,
  type SelectedLink,
} from '@/components/files/FileManagerModal';
import { UploaderBadge } from '@/components/files/UploaderBadge';
import { cx } from '@/lib/cx';
import { RevisionPolicyDialog } from './RevisionPolicyDialog';
import { errorText, formatHours } from './ui-utils';
import { loadGuestDraft } from '@/lib/guest-order';
import { loadForwardDraft } from '@/lib/chat/forward-draft';
import { ORDER_DESCRIPTION_MAX } from '@/lib/chat/forward-core.mjs';

const EMPTY_RULES = { urgencyMultiplier: 1.3, depositRatio: 0.5, roundStep: 500 };
const ATTACHMENT_ISSUE = 'حداقل یک فایل یا لینک پیوست کنید.';

/** فاز ۱۲٫۲۴-C: نگاشت هر هشدار به «بخش» کاغذی که باید اصلاح شود. */
const DETAILS_SECTION = 'prj-section-details';
const ATTACHMENTS_SECTION = 'prj-section-attachments';

const ISSUE_TARGETS: Record<string, string> = {
  name: DETAILS_SECTION,
  serviceTypeId: DETAILS_SECTION,
  language: DETAILS_SECTION,
  sourceType: DETAILS_SECTION,
  sourcePageCount: DETAILS_SECTION,
  deliveryHours: DETAILS_SECTION,
  outputFormat: DETAILS_SECTION,
  design: DETAILS_SECTION,
  'design.mode': DETAILS_SECTION,
  'design.spec': DETAILS_SECTION,
  'design.spec.paperSize': DETAILS_SECTION,
  [ATTACHMENT_ISSUE]: ATTACHMENTS_SECTION,
};

function focusIssue(target: string) {
  const section = document.getElementById(target);
  if (!section) return;
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  section.focus({ preventScroll: true });
}

/** Phase 12.8-y: removed service type must stay hidden even from a stale catalog response. */
function isVisibleServiceType(item: ServiceType): boolean {
  return (
    item.isActive &&
    item.id !== 'fa-en' &&
    !['table-ar', 'table-en'].includes(item.id) &&
    !item.name.includes('فارسی-انگلیسی')
  );
}

/**
 * Phase 7+8 order form. The server computes and snapshots every price; this
 * screen only shows a live estimate and never sends an amount.
 * File attachment is handled by the reusable FileManagerModal (Phase 8).
 */
export function ProjectNewForm() {
  const router = useRouter();
  const { user, loading, authedRequest } = useAuth();
  const { showToast } = useAlert();
  const api = useMemo(() => createProjectsApi(authedRequest), [authedRequest]);

  // Phase 8: file attachment state
  const [fmOpen, setFmOpen] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<SelectedFile[]>([]);
  const [attachedLinks, setAttachedLinks] = useState<SelectedLink[]>([]);

  const [services, setServices] = useState<ServiceType[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [presets, setPresets] = useState<DesignPreset[]>([]);
  const [rules, setRules] = useState(EMPTY_RULES);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [serviceTypeId, setServiceTypeId] = useState('');
  const [language, setLanguage] = useState<string>('');
  const [sourceType, setSourceType] = useState<string>(SOURCE_TYPES[0] ?? '');
  const [description, setDescription] = useState('');
  const [specialRequirements, setSpecialRequirements] = useState('');
  const [pageCount, setPageCount] = useState('10');
  // فاز ۱۲٫۲-هـ: عدد ۱–۲۴ + واحد (ساعت/روز/هفته)؛ ساعت حاصل در بدنه ارسال می‌شود.
  const [deliveryValue, setDeliveryValue] = useState<string>('2');
  const [deliveryUnit, setDeliveryUnit] = useState<string>('day');
  // فاز ۱۲٫۳-ج: چند فرمت خروجی قابل انتخاب است و به‌صورت «PDF, Word» ذخیره می‌شود.
  // فاز ۱۲٫۳۰-A: پیش‌فرض و فهرست مجاز از مرجع مرکزی بکند خوانده می‌شوند.
  const { order: siteOrder } = useSiteConfig('');
  const [outputFormats, setOutputFormats] = useState<string[]>([]);

  useEffect(() => {
    if (siteOrder.allowedOutputFormats.length === 0) return;
    setOutputFormats((current) => {
      const valid = current.filter((item) => siteOrder.allowedOutputFormats.includes(item));
      if (valid.length > 0) return valid;
      const fallback = siteOrder.defaultOutputFormat || siteOrder.allowedOutputFormats[0];
      return fallback ? [fallback] : [];
    });
  }, [siteOrder.defaultOutputFormat, siteOrder.allowedOutputFormats]);

  // فاز ۱۲٫۳۰-B: انتخابگر روش پرداخت تنها برای مشتری دارای مجوز اعتبار
  // نمایش داده می‌شود؛ مجوز را بکند تعیین می‌کند نه ظاهر فرم.
  const [creditEnabled, setCreditEnabled] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'cash' | 'credit'>('credit');
  useEffect(() => {
    if (!user || loading) return;
    let alive = true;
    void authedRequest<{ creditEnabled: boolean }>('/credit/me')
      .then((data) => {
        if (!alive) return;
        setCreditEnabled(data.creditEnabled === true);
      })
      .catch(() => {
        if (alive) setCreditEnabled(false);
      });
    return () => { alive = false; };
  }, [user, loading, authedRequest]);

  const [designMode, setDesignMode] = useState<'standard' | 'custom'>('standard');
  const [designSubmode, setDesignSubmode] = useState<'like_original' | 'custom'>(
    'like_original',
  );
  const [presetId, setPresetId] = useState('');
  const [spec, setSpec] = useState<DesignSpec>({ ...DEFAULT_DESIGN_SPEC });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  /** فاز ۱۲٫۹-ط: تمام ایرادها یکجا بالای دکمه‌ی ثبت نمایش داده می‌شوند. */
  const [submitIssues, setSubmitIssues] = useState<Array<{ key: string; message: string }>>([]);

  /** فاز ۱۲٫۲۴-C: کلیک روی هشدار، کادر مربوط را نشانه می‌رود. */
  function handleIssueClick(key: string) {
    const target = ISSUE_TARGETS[key];
    if (!target) return;
    focusIssue(target);
  }

  useEffect(() => {
    let alive = true;
    void Promise.all([
      getServiceTypes(),
      getLanguages(),
      getDesignPresets(),
      getPricingRules(),
    ])
      .then(([serviceRows, languageCatalog, presetRows, ruleRows]) => {
        if (!alive) return;
        const visibleRows = serviceRows.filter(isVisibleServiceType);
        setServices(visibleRows);
        setLanguages(languageCatalog.languages);
        setLanguage((current) => current || languageCatalog.defaultLanguage);
        setPresets(presetRows);
        setRules(ruleRows ?? EMPTY_RULES);
        setServiceTypeId((current) => current || visibleRows[0]?.id || '');
        setPresetId((current) => current || presetRows[0]?.id || '');
        setCatalogError(null);
      })
      .catch((caught) => {
        if (alive) setCatalogError(errorText(caught, 'کاتالوگ خدمت‌ها دریافت نشد'));
      })
      .finally(() => {
        if (alive) setCatalogLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  // فاز ۱۲٫۶-پ: پیش‌نویس مهمان پس از ورود دوباره در همان سفارش باز می‌شود.
  useEffect(() => {
    if (typeof window === 'undefined' || services.length === 0) return;
    const id = new URLSearchParams(window.location.search).get('draft');
    if (!id) return;
    const draft = loadGuestDraft(id);
    if (!draft || !services.some((item) => item.id === draft.serviceId)) return;
    setServiceTypeId(draft.serviceId);
    setPageCount(String(draft.pages));
    setDeliveryValue('2');
    setDeliveryUnit(draft.urgent ? 'hour' : 'day');
    showToast({
      type: 'success',
      title: 'پیش‌نویس بازگشایی شد',
      message: 'برآورد مهمان در فرم ثبت سفارش بازگردانده شد.',
    });
  }, [services, showToast]);

  // فاز ۱۲٫۱۱: پیام‌ها و فایل‌های فورواردشده یک‌بار در فرم قرار می‌گیرند.
  useEffect(() => {
    const draft = loadForwardDraft();
    if (!draft) return;
    setDescription((current) => {
      const merged = current.trim() ? `${current.trim()}\n\n${draft.text}` : draft.text;
      return merged.slice(0, ORDER_DESCRIPTION_MAX);
    });
    setAttachedFiles((current) => {
      const seen = new Set(current.map((file) => file.id));
      const added = draft.files.filter((file) => !seen.has(file.id)).slice(0, 20);
      return [...current, ...added].slice(0, 20);
    });
    setAttachedLinks((current) => {
      const seen = new Set(current.map((link) => link.id));
      const added = draft.links.filter((link) => !seen.has(link.id)).slice(0, 20);
      return [...current, ...added].slice(0, 20);
    });
    showToast({
      type: 'success',
      title: 'پیام‌ها به سفارش اضافه شد',
      message: 'توضیحات و پیوست‌ها را بررسی و سپس سفارش را ثبت کنید.',
    });
  }, [showToast]);

  useEffect(() => {
    if (services.length === 0 || services.some((item) => item.id === serviceTypeId))
      return;
    setServiceTypeId(services[0]?.id ?? '');
  }, [services, serviceTypeId]);

  /** فاز ۱۲٫۹-د: در حالت «مانند فایل اصلی» مشخصات فایل نهایی قابل ویرایش نیست. */
  const likeOriginal = designMode === 'custom' && designSubmode === 'like_original';

  const preset = presets.find((item) => item.id === presetId) ?? null;
  const baseSpec = (preset?.spec ?? DEFAULT_DESIGN_SPEC) as DesignSpec;

  // Selecting a preset prefills the spec; the user can still edit every field.
  useEffect(() => {
    setSpec(mergeDesignSpec(baseSpec, {}));
  }, [presetId, presets]); // eslint-disable-line react-hooks/exhaustive-deps

  const service = services.find((item) => item.id === serviceTypeId) ?? null;
  const pages = Number(pageCount) || 1;
  const hours = deliveryHoursFrom(deliveryValue, deliveryUnit) ?? 48;
  const estimate = calculateEstimate({
    pricePerPage: service?.pricePerPage ?? 0,
    pages,
    urgent: isUrgent(hours),
    multiplier: rules.urgencyMultiplier,
    step: rules.roundStep,
  });
  const deposit = calculateDeposit(estimate, rules.depositRatio, rules.roundStep);

  function updateSpec(path: string, value: string | number) {
    setSpec((previous) => {
      if (path.startsWith('margins.')) {
        const key = path.slice('margins.'.length);
        return { ...previous, margins: { ...(previous.margins ?? {}), [key]: value } };
      }
      return { ...previous, [path]: value };
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    const draft = {
      name,
      serviceTypeId,
      language,
      sourceType,
      description,
      specialRequirements,
      sourcePageCount: Number(pageCount),
      deliveryHours: hours,
      outputFormat: outputFormats,
      design: {
        mode: designMode,
        submode: designSubmode,
        presetId: presetId || null,
        spec,
      },
    };
    const result = validateProjectDraft(draft);
    const noAttachment = attachedFiles.length === 0 && attachedLinks.length === 0;
    const issues = [
      ...Object.entries(result.errors).map(([key, message]) => ({ key, message })),
      ...(noAttachment ? [{ key: ATTACHMENT_ISSUE, message: ATTACHMENT_ISSUE }] : []),
    ];
    setSubmitIssues(issues);
    if (issues.length > 0) {
      setErrors(result.errors);
      // فاز ۱۲٫۱۰-ب: پیام نبود پیوست فقط در prj-submit-issues نمایش داده
      // می‌شود؛ تنظیم جداگانه‌ی submitError باعث تکرار هشدار می‌شد.
      setSubmitError(null);
      showToast({
        type: 'error',
        title: 'فرم ناقص است',
        message: 'موارد مشخص‌شده را اصلاح کنید.',
      });
      return;
    }
    setErrors({});
    setSubmitError(null);

    const attachedFileIds = attachedFiles.map((f) => f.id);
    const attachedLinkIds = attachedLinks.map((l) => l.id);
    const body: CreateProjectBody = {
      name: name.trim(),
      serviceTypeId,
      language,
      sourceType,
      description: description.trim(),
      sourcePageCount: Number(pageCount),
      deliveryHours: hours,
      outputFormat: outputFormats.join(', '),
      paymentMode: creditEnabled ? paymentMode : undefined,
      specialRequirements: specialRequirements.trim(),
      design: {
        mode: designMode,
        submode: designMode === 'custom' ? designSubmode : undefined,
        presetId: presetId || null,
        spec: spec as Record<string, unknown>,
      },
      fileIds: attachedFileIds,
      linkIds: attachedLinkIds,
    };

    setSubmitting(true);
    try {
      setSubmitIssues([]);
      // فاز ۱۲٫۸-ب: فایل/لینک در همان تراکنش ثبت سفارش پیوست می‌شوند؛
      // مسیر جداگانهٔ attach برای سفارش ثبت‌شده مسدود است.
      const project = await api.createProject(body);

      showToast({
        type: 'success',
        title: 'سفارش ثبت شد',
        message: `کد سفارش: ${project.code}`,
      });
      // فاز ۱۲٫۳-هـ: صفحهٔ جزئیات کامل (فایل‌ها، لینک‌ها و تحویل) نه نمای‌عمومی.
      const detailBase =
        user?.role === 'admin' ? '/admin/projects/detail/' : '/panel/projects/detail/';
      router.push(`${detailBase}?id=${encodeURIComponent(project.id)}`);
    } catch (caught) {
      const message = errorText(caught, 'ثبت سفارش انجام نشد');
      setSubmitError(message);
      showToast({ type: 'error', title: 'ثبت نشد', message });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="prj-stack" aria-busy="true">
        <Skeleton height={120} />
        <Skeleton height={220} />
      </div>
    );
  }

  if (!user) {
    return (
      <Card>
        <CardBody>
          <div className="prj-gate">
            <Icon name="shield" size={28} />
            <h2>برای ثبت سفارش وارد شوید</h2>
            <p>سفارش به حساب شما متصل می‌شود تا بتوانید آن را پیگیری کنید.</p>
            <Link className="btn btn--primary btn--sm" href="/login/">
              ورود به حساب
            </Link>
          </div>
        </CardBody>
      </Card>
    );
  }

  if (!user.profileComplete) {
    return (
      <Card>
        <CardBody>
          <div className="prj-gate">
            <Icon name="user" size={28} />
            <h2>پروفایل را کامل کنید</h2>
            <p>پیش از ثبت سفارش، نام و نام کاربری باید تکمیل شود.</p>
            <Link className="btn btn--primary btn--sm" href="/profile/">
              تکمیل پروفایل
            </Link>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <>
      {/* فاز ۱۲٫۹-ی: مودال بیرون از <form> است تا Enter داخل پنجره‌ی فایل،
          فرم اصلی «ثبت سفارش» را بهاشتباه ارسال نکند. */}
      <form className="prj-form" onSubmit={submit} noValidate>
        {catalogError ? (
          <div className="prj-alert" role="alert">
            <Icon name="alert" size={18} />
            <span>{catalogError}</span>
            <Link className="btn btn--ghost btn--sm" href="/services/">
              مشاهده‌ی خدمت‌ها
            </Link>
          </div>
        ) : null}

        <Card id={DETAILS_SECTION} tabIndex={-1}>
          <CardHeader title="مشخصات سفارش" />
          <CardBody>
            <div className="prj-grid">
              <FormField
                label="عنوان سفارش"
                htmlFor="prj-name"
                required
                error={errors.name}
              >
                <Input
                  id="prj-name"
                  value={name}
                  invalid={Boolean(errors.name)}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="مثلاً تایپ پایان‌نامه"
                />
              </FormField>

              <FormField
                label="نوع خدمت"
                htmlFor="prj-service"
                required
                error={errors.serviceTypeId}
              >
                <Select
                  id="prj-service"
                  value={serviceTypeId}
                  disabled={catalogLoading}
                  invalid={Boolean(errors.serviceTypeId)}
                  onChange={(event) => setServiceTypeId(event.target.value)}
                >
                  <option value="">انتخاب کنید</option>
                  {services.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField
                label="زبان سند"
                htmlFor="prj-language"
                required
                error={errors.language}
              >
                <Select
                  id="prj-language"
                  value={language}
                  onChange={(event) => setLanguage(event.target.value)}
                >
                  {languages.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField
                label="نوع منبع"
                htmlFor="prj-source"
                required
                error={errors.sourceType}
              >
                <Select
                  id="prj-source"
                  value={sourceType}
                  onChange={(event) => setSourceType(event.target.value)}
                >
                  {SOURCE_TYPES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField
                label="تعداد صفحه‌ی منبع"
                htmlFor="prj-pages"
                required
                error={errors.sourcePageCount}
              >
                <Input
                  id="prj-pages"
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={pageCount}
                  invalid={Boolean(errors.sourcePageCount)}
                  onChange={(event) => setPageCount(event.target.value)}
                />
              </FormField>

              <FormField
                label="مهلت تحویل"
                htmlFor="prj-deadline-value"
                required
                error={errors.deliveryHours}
                hint="عددی از ۱ تا ۲۴ همراه با واحد ساعت، روز یا هفته انتخاب کنید. مهلت از زمان تأیید بیعانه محاسبه می‌شود، نه از زمان ثبت."
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: 8,
                  }}
                >
                  <Input
                    id="prj-deadline-value"
                    type="number"
                    min={DELIVERY_VALUE_MIN}
                    max={DELIVERY_VALUE_MAX}
                    inputMode="numeric"
                    value={deliveryValue}
                    invalid={Boolean(errors.deliveryHours)}
                    onChange={(event) => setDeliveryValue(event.target.value)}
                  />
                  <Select
                    id="prj-deadline-unit"
                    aria-label="واحد مهلت تحویل"
                    value={deliveryUnit}
                    invalid={Boolean(errors.deliveryHours)}
                    onChange={(event) => setDeliveryUnit(event.target.value)}
                  >
                    {DELIVERY_UNITS.map((unit) => (
                      <option key={unit.value} value={unit.value}>
                        {unit.label}
                      </option>
                    ))}
                  </Select>
                </div>
              </FormField>

              <FormField label="فرمت خروجی" required error={errors.outputFormat}>
                <div
                  id="prj-format"
                  className="prj-format-options"
                  role="group"
                  aria-label="فرمت خروجی"
                  tabIndex={-1}
                >
                  {siteOrder.allowedOutputFormats.map((item) => (
                    <label key={item} className="prj-format-option">
                      <input
                        type="checkbox"
                        checked={outputFormats.includes(item)}
                        onChange={(event) =>
                          setOutputFormats((current) =>
                            event.target.checked
                              ? Array.from(new Set([...current, item]))
                              : current.filter((value) => value !== item),
                          )
                        }
                      />
                      {item}
                    </label>
                  ))}
                </div>
              </FormField>
            </div>

            {creditEnabled && (
              <FormField label="روش پرداخت" htmlFor="prj-payment-mode">
                <Select
                  id="prj-payment-mode"
                  value={paymentMode}
                  onChange={(event) => setPaymentMode(event.target.value as 'cash' | 'credit')}
                >
                  <option value="credit">اعتباری</option>
                  <option value="cash">نقدی</option>
                </Select>
              </FormField>
            )}

            <div className="prj-grid prj-grid--one">
              <FormField label="توضیحات" htmlFor="prj-desc">
                <Textarea
                  id="prj-desc"
                  rows={3}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="توضیح کوتاه درباره‌ی سند"
                />
              </FormField>
              <FormField label="نیازمندی‌های ویژه" htmlFor="prj-special">
                <Textarea
                  id="prj-special"
                  rows={2}
                  value={specialRequirements}
                  onChange={(event) => setSpecialRequirements(event.target.value)}
                />
              </FormField>
            </div>

            <div
              id={ATTACHMENTS_SECTION}
              tabIndex={-1}
              className={cx(
                'prj-grid prj-grid--one',
                submitIssues.some((issue) => issue.key === ATTACHMENT_ISSUE) &&
                  'prj-attachment-field--warning',
              )}
            >
              <FormField label="فایل‌های ضمیمه" htmlFor="prj-files">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <Button
                    id="prj-files"
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFmOpen(true)}
                    leadingIcon={<Icon name="paperclip" size={14} />}
                  >
                    افزودن فایل یا لینک
                  </Button>
                  {attachedFiles.length > 0 && (
                    <div className="fm-list">
                      {attachedFiles.map((file) => (
                        <div key={file.id} className="fm-item fm-item--uploaded">
                          <div className="fm-item__icon">
                            <Icon name="fileText" size={20} />
                          </div>
                          <div className="fm-item__body">
                            <FileName
                              name={file.originalName}
                              className="fm-item__name"
                            />
                            <div className="fm-item__meta">
                              <span>{file.fileCode || 'جدید'}</span>
                              <UploaderBadge
                                username={user?.username}
                                avatarUrl={user?.avatarUrl}
                                sizeBytes={file.sizeBytes}
                              />
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            iconOnly
                            onClick={() =>
                              setAttachedFiles((prev) =>
                                prev.filter((f) => f.id !== file.id),
                              )
                            }
                          >
                            <Icon name="x" size={16} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  {attachedLinks.length > 0 && (
                    <div className="fm-list">
                      {attachedLinks.map((link) => (
                        <div key={link.id} className="fm-link-item">
                          <div className="fm-link-item__icon">
                            <Icon name="link" size={20} />
                          </div>
                          <div className="fm-link-item__body">
                            <div className="fm-link-item__url">{link.url}</div>
                            {link.description && (
                              <div className="fm-link-item__desc">{link.description}</div>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            iconOnly
                            onClick={() =>
                              setAttachedLinks((prev) =>
                                prev.filter((l) => l.id !== link.id),
                              )
                            }
                          >
                            <Icon name="x" size={16} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </FormField>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="استاندارد طراحی" />
          <CardBody>
            <div className="prj-grid">
              <FormField
                label="حالت طراحی"
                htmlFor="prj-design-mode"
                error={errors['design.mode']}
              >
                <Select
                  id="prj-design-mode"
                  value={designMode}
                  onChange={(event) => {
                    const next = event.target.value as 'standard' | 'custom';
                    setDesignMode(next);
                    // فاز ۱۲٫۲-و: حالت سفارشی از همان مقادیر استاندارد آغاز می‌شود.
                    if (next === 'custom') {
                      setPresetId('');
                      setSpec({ ...DEFAULT_DESIGN_SPEC });
                    }
                  }}
                >
                  <option value="standard">استاندارد</option>
                  <option value="custom">سفارشی</option>
                </Select>
              </FormField>

              <FormField label="الگوی آماده" htmlFor="prj-preset">
                <Select
                  id="prj-preset"
                  value={presetId}
                  onChange={(event) => setPresetId(event.target.value)}
                >
                  <option value="">پیش‌فرض سامانه</option>
                  {presets.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </Select>
              </FormField>

              {designMode === 'custom' ? (
                <FormField label="زیرحالت" htmlFor="prj-submode">
                  <Select
                    id="prj-submode"
                    value={designSubmode}
                    onChange={(event) =>
                      setDesignSubmode(event.target.value as 'like_original' | 'custom')
                    }
                  >
                    <option value="like_original">مانند فایل اصلی</option>
                    <option value="custom">تنظیمات دلخواه</option>
                  </Select>
                </FormField>
              ) : null}
              {likeOriginal ? (
                <div className="prj-submode-notice" role="note">
                  <Icon name="sparkles" size={17} />
                  <p>
                    فایل نهایی تا جای ممکن مطابق فایل اصلی تهیه‌شود، ولی یکسان بودن دقیق
                    آن تضمین‌شود. اگر پس از بررسی اولیه اجرای این درخواست ممکن نباشد،
                    سفارش توسط مدیریت لغو‌شود.
                  </p>
                </div>
              ) : null}
            </div>

            <div className="prj-grid prj-spec">
              <FormField label="قلم فارسی" htmlFor="prj-font">
                <Input
                  disabled={likeOriginal}
                  id="prj-font"
                  value={String(spec.fontFa ?? '')}
                  onChange={(event) => updateSpec('fontFa', event.target.value)}
                />
              </FormField>
              <FormField label="اندازه‌ی متن" htmlFor="prj-size">
                <Input
                  disabled={likeOriginal}
                  id="prj-size"
                  type="number"
                  min={8}
                  max={24}
                  value={String(spec.bodySize ?? 14)}
                  onChange={(event) => updateSpec('bodySize', Number(event.target.value))}
                />
              </FormField>
              <FormField label="فاصله‌ی خطوط" htmlFor="prj-spacing">
                <Input
                  disabled={likeOriginal}
                  id="prj-spacing"
                  type="number"
                  step="0.1"
                  min={1}
                  max={3}
                  value={String(spec.lineSpacing ?? 1.5)}
                  onChange={(event) =>
                    updateSpec('lineSpacing', Number(event.target.value))
                  }
                />
              </FormField>
              <FormField label="اندازه کاغذ" htmlFor="prj-paper">
                <Select
                  disabled={likeOriginal}
                  id="prj-paper"
                  value={String(spec.paperSize ?? 'A4')}
                  onChange={(event) => updateSpec('paperSize', event.target.value)}
                >
                  {PAPER_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="حاشیه‌ی بالا (cm)" htmlFor="prj-mt">
                <Input
                  disabled={likeOriginal}
                  id="prj-mt"
                  type="number"
                  step="0.1"
                  value={String(spec.margins?.top ?? 2.5)}
                  onChange={(event) =>
                    updateSpec('margins.top', Number(event.target.value))
                  }
                />
              </FormField>
              <FormField label="حاشیه‌ی چپ (cm)" htmlFor="prj-ml">
                <Input
                  disabled={likeOriginal}
                  id="prj-ml"
                  type="number"
                  step="0.1"
                  value={String(spec.margins?.left ?? 3)}
                  onChange={(event) =>
                    updateSpec('margins.left', Number(event.target.value))
                  }
                />
              </FormField>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="برآورد هزینه" />
          <CardBody>
            <div className="prj-summary">
              <div>
                <span>نرخ پایه‌ی هر صفحه</span>
                <strong>
                  <Money value={service?.pricePerPage ?? 0} />
                </strong>
              </div>
              <div>
                <span>هزینه‌ی برآوردی</span>
                <strong>
                  <Money value={estimate} />
                </strong>
              </div>
              <div>
                <span>بیعانه‌ی تقریبی</span>
                <strong>
                  <Money value={deposit} />
                </strong>
              </div>
            </div>
            <p className="prj-note">
              {isUrgent(hours)
                ? `مهلت ${formatHours(hours)} فوری محسوب می‌شود و ضریب فوریت اعمال شده است.`
                : 'برآورد بر اساس نرخ پایه است؛ نرخ نهایی توسط مدیر و پیش از شروع کار اعلام می‌شود.'}
            </p>
            <p className="prj-note">
              مبالغ فقط در سرور محاسبه و ذخیره می‌شوند؛ این فرم هیچ مبلغی ارسال نمی‌کند.
            </p>

            {submitError ? (
              <div className="prj-alert" role="alert">
                <Icon name="alert" size={18} />
                <span>{submitError}</span>
              </div>
            ) : null}

            <p className="prj-note">
              پیش از ثبت سفارش می‌توانید سیاست اصلاح را مطالعه کنید؛ درخواست اصلاح وضعیت
              سفارش و مهلت تحویل را تغییر نمی‌دهد.
            </p>
            {submitIssues.length > 0 ? (
              <div className="prj-submit-issues" role="alert">
                <Icon name="alert" size={18} />
                <div>
                  <strong>پیش از ثبت سفارش، موارد زیر را اصلاح کنید:</strong>
                  <ol>
                    {submitIssues.map((issue, index) => (
                      <li key={`${index}-${issue.key}`}>
                        <button
                          type="button"
                          className="prj-issue-link"
                          onClick={() => handleIssueClick(issue.key)}
                        >
                          {issue.message}
                        </button>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            ) : null}

            <div className="prj-actions">
              <Button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setPolicyOpen(true)}
              >
                <Icon name="shield" size={15} />
                سیاست اصلاح
              </Button>
              <Button type="submit" loading={submitting} disabled={catalogLoading}>
                ثبت سفارش
              </Button>
              <Link className="btn btn--ghost btn--sm" href="/panel/projects/">
                انصراف
              </Link>
            </div>
          </CardBody>
        </Card>
      </form>

      {/* Phase 8: File Manager Modal — بیرون از فرم (توضیح بالا) */}
      <FileManagerModal
        open={fmOpen}
        onClose={() => setFmOpen(false)}
        config={{
          role: user?.role === 'admin' ? 'admin' : 'customer',
          defaultTab: 'upload',
          title: 'فایل‌های ضمیمه سفارش',

          excludeIds: attachedFiles.map((file) => file.id),
          excludeSignatures: attachedFiles.map((file) =>
            localFileSignature(file.originalName, file.sizeBytes),
          ),
        }}
        onSelect={(result) => {
          setAttachedFiles((prev) => [...prev, ...result.files]);
          setAttachedLinks((prev) => [...prev, ...result.links]);
        }}
      />
      {/* فاز ۱۲٫۱۲-هـ: سیاست اصلاح بدون ترک فرم سفارش تازه */}
      <RevisionPolicyDialog open={policyOpen} onClose={() => setPolicyOpen(false)} />
    </>
  );
}
