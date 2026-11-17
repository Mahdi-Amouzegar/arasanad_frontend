'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/account';
import {
  createProjectsApi,
  getDesignPresets,
  getPricingRules,
  getServiceTypes,
  type CreateProjectBody,
  type DesignPreset,
  type ServiceType,
} from '@/lib/projects/api';
import {
  DEFAULT_DESIGN_SPEC,
  DELIVERY_HOURS,
  LANGUAGES,
  OUTPUT_FORMATS,
  SOURCE_TYPES,
  calculateDeposit,
  calculateEstimate,
  changedDesignFields,
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
import { FileManagerModal, type SelectedFile, type SelectedLink } from '@/components/files/FileManagerModal';
import { createFilesApi } from '@/lib/files/api';
import { errorText, formatHours } from './ui-utils';
import { loadGuestDraft } from '@/lib/guest-order';

const EMPTY_RULES = { urgencyMultiplier: 1.3, depositRatio: 0.5, roundStep: 500 };

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
  const filesApi = useMemo(() => authedRequest ? createFilesApi(authedRequest) : null, [authedRequest]);

  // Phase 8: file attachment state
  const [fmOpen, setFmOpen] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<SelectedFile[]>([]);
  const [attachedLinks, setAttachedLinks] = useState<SelectedLink[]>([]);

  const [services, setServices] = useState<ServiceType[]>([]);
  const [presets, setPresets] = useState<DesignPreset[]>([]);
  const [rules, setRules] = useState(EMPTY_RULES);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [serviceTypeId, setServiceTypeId] = useState('');
  const [language, setLanguage] = useState<string>(LANGUAGES[0] ?? '');
  const [sourceType, setSourceType] = useState<string>(SOURCE_TYPES[0] ?? '');
  const [description, setDescription] = useState('');
  const [specialRequirements, setSpecialRequirements] = useState('');
  const [pageCount, setPageCount] = useState('10');
  const [deliveryHours, setDeliveryHours] = useState<string>('48');
  const [outputFormat, setOutputFormat] = useState<string>(OUTPUT_FORMATS[0] ?? '');

  const [designMode, setDesignMode] = useState<'standard' | 'custom'>('standard');
  const [designSubmode, setDesignSubmode] = useState<'like_original' | 'custom'>('like_original');
  const [presetId, setPresetId] = useState('');
  const [spec, setSpec] = useState<DesignSpec>({ ...DEFAULT_DESIGN_SPEC });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void Promise.all([getServiceTypes(), getDesignPresets(), getPricingRules()])
      .then(([serviceRows, presetRows, ruleRows]) => {
        if (!alive) return;
        setServices(serviceRows);
        setPresets(presetRows);
        setRules(ruleRows ?? EMPTY_RULES);
        setServiceTypeId((current) => current || serviceRows[0]?.id || '');
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
    setDeliveryHours(draft.urgent ? String(DELIVERY_HOURS[0]) : '48');
    showToast({
      type: 'success',
      title: 'پیش‌نویس بازگشایی شد',
      message: 'برآورد مهمان در فرم ثبت سفارش بازگردانده شد.',
    });
  }, [services, showToast]);

  const preset = presets.find((item) => item.id === presetId) ?? null;
  const baseSpec = (preset?.spec ?? DEFAULT_DESIGN_SPEC) as DesignSpec;

  // Selecting a preset prefills the spec; the user can still edit every field.
  useEffect(() => {
    setSpec(mergeDesignSpec(baseSpec, {}));
  }, [presetId, presets]); // eslint-disable-line react-hooks/exhaustive-deps

  const changed = useMemo(
    () => changedDesignFields(spec, baseSpec),
    [spec, baseSpec],
  );

  const service = services.find((item) => item.id === serviceTypeId) ?? null;
  const pages = Number(pageCount) || 1;
  const hours = Number(deliveryHours) || 48;
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
      deliveryHours: Number(deliveryHours),
      outputFormat,
      design: { mode: designMode, submode: designSubmode, presetId: presetId || null, spec },
    };
    const result = validateProjectDraft(draft);
    if (!result.ok) {
      setErrors(result.errors);
      showToast({ type: 'error', title: 'فرم ناقص است', message: 'موارد مشخص‌شده را اصلاح کنید.' });
      return;
    }
    setErrors({});

    const body: CreateProjectBody = {
      name: name.trim(),
      serviceTypeId,
      language,
      sourceType,
      description: description.trim(),
      sourcePageCount: Number(pageCount),
      deliveryHours: Number(deliveryHours),
      outputFormat,
      specialRequirements: specialRequirements.trim(),
      design: {
        mode: designMode,
        submode: designMode === 'custom' ? designSubmode : undefined,
        presetId: presetId || null,
        spec: spec as Record<string, unknown>,
      },
    };

    setSubmitting(true);
    try {
      const project = await api.createProject(body);

      // Phase 8: attach files and links to the new project
      if (filesApi && attachedFiles.length > 0) {
        await filesApi.attachFiles(
          attachedFiles.map((f) => f.id),
          'project_initial',
          project.id,
          'initial_file',
        );
      }
      if (filesApi && attachedLinks.length > 0) {
        // Links need to be attached via external-links API
        await authedRequest('/external-links/attach', {
          method: 'POST',
          body: {
            linkIds: attachedLinks.map((l) => l.id),
            entityType: 'project_initial',
            entityId: project.id,
            role: 'initial_file',
          },
        });
      }

      showToast({
        type: 'success',
        title: 'سفارش ثبت شد',
        message: `کد سفارش: ${project.code}`,
      });
      router.push(`/projects/detail/?id=${encodeURIComponent(project.id)}`);
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

      <Card>
        <CardHeader title="مشخصات سفارش" />
        <CardBody>
          <div className="prj-grid">
            <FormField label="عنوان سفارش" htmlFor="prj-name" required error={errors.name}>
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

            <FormField label="زبان سند" htmlFor="prj-language" required error={errors.language}>
              <Select
                id="prj-language"
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
              >
                {LANGUAGES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="نوع منبع" htmlFor="prj-source" required error={errors.sourceType}>
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
              htmlFor="prj-hours"
              required
              error={errors.deliveryHours}
              hint="مهلت از زمان تأیید بیعانه محاسبه می‌شود، نه از زمان ثبت."
            >
              <Select
                id="prj-hours"
                value={deliveryHours}
                invalid={Boolean(errors.deliveryHours)}
                onChange={(event) => setDeliveryHours(event.target.value)}
              >
                {DELIVERY_HOURS.map((item) => (
                  <option key={item} value={String(item)}>
                    {formatHours(item)}
                    {item <= 24 ? ' (فوری)' : ''}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="فرمت خروجی" htmlFor="prj-format" required error={errors.outputFormat}>
              <Select
                id="prj-format"
                value={outputFormat}
                onChange={(event) => setOutputFormat(event.target.value)}
              >
                {OUTPUT_FORMATS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

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

          {/* Phase 8: File attachment section */}
          <div className="prj-grid prj-grid--one">
            <FormField label="فایل‌های ضمیمه" htmlFor="prj-files">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Button
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
                          <div className="fm-item__name">{file.originalName}</div>
                          <div className="fm-item__meta">
                            <span>{file.fileCode || 'جدید'}</span>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          iconOnly
                          onClick={() => setAttachedFiles((prev) => prev.filter((f) => f.id !== file.id))}
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
                          onClick={() => setAttachedLinks((prev) => prev.filter((l) => l.id !== link.id))}
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
            <FormField label="حالت طراحی" htmlFor="prj-design-mode" error={errors['design.mode']}>
              <Select
                id="prj-design-mode"
                value={designMode}
                onChange={(event) => setDesignMode(event.target.value as 'standard' | 'custom')}
              >
                <option value="standard">استاندارد آراسند</option>
                <option value="custom">سفارشی</option>
              </Select>
            </FormField>

            <FormField label="الگوی آماده" htmlFor="prj-preset">
              <Select id="prj-preset" value={presetId} onChange={(event) => setPresetId(event.target.value)}>
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
          </div>

          <div className="prj-grid prj-spec">
            <FormField label="قلم فارسی" htmlFor="prj-font">
              <Input
                id="prj-font"
                value={String(spec.fontFa ?? '')}
                onChange={(event) => updateSpec('fontFa', event.target.value)}
              />
            </FormField>
            <FormField label="اندازه‌ی متن" htmlFor="prj-size">
              <Input
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
                id="prj-spacing"
                type="number"
                step="0.1"
                min={1}
                max={3}
                value={String(spec.lineSpacing ?? 1.5)}
                onChange={(event) => updateSpec('lineSpacing', Number(event.target.value))}
              />
            </FormField>
            <FormField label="اندازه‌ی کاغذ" htmlFor="prj-paper">
              <Input
                id="prj-paper"
                value={String(spec.paperSize ?? 'A4')}
                onChange={(event) => updateSpec('paperSize', event.target.value)}
              />
            </FormField>
            <FormField label="حاشیه‌ی بالا (cm)" htmlFor="prj-mt">
              <Input
                id="prj-mt"
                type="number"
                step="0.1"
                value={String(spec.margins?.top ?? 2.5)}
                onChange={(event) => updateSpec('margins.top', Number(event.target.value))}
              />
            </FormField>
            <FormField label="حاشیه‌ی چپ (cm)" htmlFor="prj-ml">
              <Input
                id="prj-ml"
                type="number"
                step="0.1"
                value={String(spec.margins?.left ?? 3)}
                onChange={(event) => updateSpec('margins.left', Number(event.target.value))}
              />
            </FormField>
          </div>

          <p className="prj-note" aria-live="polite">
            {changed.length === 0
              ? 'همه‌ی فیلدها مطابق استاندارد انتخاب‌شده‌اند.'
              : `${changed.length} فیلد نسبت به استاندارد تغییر کرده است: ${changed.join('، ')}`}
          </p>
          <p className="prj-note">
            مقادیر نهایی باید با آیین‌نامه‌ی رسمی دانشگاه تطبیق داده شوند.
          </p>
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
            مبالغ فقط در سرور محاسبه و ذخیره می‌شوند؛ این فرم هیچ مبلغی ارسال
            نمی‌کند.
          </p>

          {submitError ? (
            <div className="prj-alert" role="alert">
              <Icon name="alert" size={18} />
              <span>{submitError}</span>
            </div>
          ) : null}

          <div className="prj-actions">
            <Button type="submit" loading={submitting} disabled={catalogLoading}>
              ثبت سفارش
            </Button>
            <Link className="btn btn--ghost btn--sm" href="/panel/projects/">
              انصراف
            </Link>
          </div>
        </CardBody>
      </Card>

      {/* Phase 8: File Manager Modal */}
      <FileManagerModal
        open={fmOpen}
        onClose={() => setFmOpen(false)}
        config={{
          role: user?.role === 'admin' ? 'admin' : 'customer',
          defaultTab: 'upload',
          title: 'فایل‌های ضمیمه سفارش',
        }}
        onSelect={(result) => {
          setAttachedFiles((prev) => [...prev, ...result.files]);
          setAttachedLinks((prev) => [...prev, ...result.links]);
        }}
      />
    </form>
  );
}
