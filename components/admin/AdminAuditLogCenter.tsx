'use client';

import React, { useState, useMemo } from 'react';
import {
  History,
  Search,
  Download,
  ShieldCheck,
  Lock,
  Eye,
  X,
  ArrowUpDown,
  Filter,
  FileText,
} from 'lucide-react';
import { useMarketplace } from '@/context/MarketplaceContext';
import { AuditLogEntry, UserRole } from '@/lib/types';
import { maskIbanInText, downloadCsvFile } from '@/lib/utils';

type AuditTargetFilter = 'all' | AuditLogEntry['targetType'];
type AuditRoleFilter = 'all' | UserRole;
type AuditDateRange = 'all' | 'today' | '7d' | '30d' | '90d';
type AuditSortOrder = 'newest' | 'oldest';

export default function AdminAuditLogCenter() {
  const {
    lang,
    t,
    auditLogs,
    sellers,
    products,
    orders,
    coupons,
    tickets,
    users,
    reviews,
    questions,
  } = useMarketplace();

  const [searchQuery, setSearchQuery] = useState('');
  const [targetTypeFilter, setTargetTypeFilter] = useState<AuditTargetFilter>('all');
  const [roleFilter, setRoleFilter] = useState<AuditRoleFilter>('all');
  const [actorFilter, setActorFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<AuditDateRange>('all');
  const [sortOrder, setSortOrder] = useState<AuditSortOrder>('newest');
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  // Reference anchor date derived deterministically from dataset (or current date)
  const referenceTimestamp = useMemo(() => {
    const timestamps = auditLogs
      .map((l) => new Date(l.createdAt.replace(' ', 'T')).getTime())
      .filter((ts) => Number.isFinite(ts));
    if (timestamps.length === 0) return new Date('2026-09-28T23:59:59Z').getTime();
    return Math.max(...timestamps, new Date('2026-09-28T23:59:59Z').getTime());
  }, [auditLogs]);

  const uniqueActors = useMemo(() => {
    const set = new Set<string>();
    auditLogs.forEach((l) => {
      if (l.actorName) set.add(l.actorName);
    });
    return Array.from(set);
  }, [auditLogs]);

  // Resolve non-sensitive target context for drawer inspection
  const resolveTargetSummary = (log: AuditLogEntry): { labelAr: string; labelEn: string } => {
    switch (log.targetType) {
      case 'seller': {
        const s = sellers.find((item) => item.id === log.targetId);
        return s
          ? {
              labelAr: `متجر: ${s.nameAr} (${s.cityAr})`,
              labelEn: `Boutique: ${s.nameEn} (${s.cityEn})`,
            }
          : { labelAr: `سجل تاجر #${log.targetId}`, labelEn: `Seller Record #${log.targetId}` };
      }
      case 'product': {
        const p = products.find((item) => item.id === log.targetId);
        return p
          ? {
              labelAr: `منتج: ${p.titleAr} (SKU: ${p.sku})`,
              labelEn: `Product: ${p.titleEn} (SKU: ${p.sku})`,
            }
          : { labelAr: `منتج #${log.targetId}`, labelEn: `Product #${log.targetId}` };
      }
      case 'order':
      case 'return': {
        const o = orders.find(
          (item) => item.id === log.targetId || item.orderNumber === log.targetId
        );
        return o
          ? {
              labelAr: `الطلب ${o.orderNumber} · الحالة: ${o.status}`,
              labelEn: `Order ${o.orderNumber} · Status: ${o.status}`,
            }
          : { labelAr: `الطلب #${log.targetId}`, labelEn: `Order #${log.targetId}` };
      }
      case 'coupon': {
        const c = coupons.find((item) => item.id === log.targetId || item.code === log.targetId);
        return c
          ? {
              labelAr: `كوبون خصم: ${c.code} (${c.titleAr})`,
              labelEn: `Promo Coupon: ${c.code} (${c.titleEn})`,
            }
          : { labelAr: `كوبون #${log.targetId}`, labelEn: `Coupon #${log.targetId}` };
      }
      case 'ticket': {
        const tk = tickets.find(
          (item) => item.id === log.targetId || item.ticketNumber === log.targetId
        );
        return tk
          ? {
              labelAr: `تذكرة #${tk.ticketNumber} (${tk.workflowType || 'support'})`,
              labelEn: `Ticket #${tk.ticketNumber} (${tk.workflowType || 'support'})`,
            }
          : { labelAr: `تذكرة #${log.targetId}`, labelEn: `Ticket #${log.targetId}` };
      }
      case 'customer': {
        const u = users.find((item) => item.id === log.targetId);
        return u
          ? {
              labelAr: `عميل: ${u.name} (${u.loyaltyTier})`,
              labelEn: `Customer: ${u.name} (${u.loyaltyTier})`,
            }
          : { labelAr: `حساب عميل #${log.targetId}`, labelEn: `Customer #${log.targetId}` };
      }
      case 'review': {
        const r = reviews.find((item) => item.id === log.targetId);
        return r
          ? {
              labelAr: `تقييم منتج (${r.rating}/5): ${r.title}`,
              labelEn: `Product Review (${r.rating}/5): ${r.title}`,
            }
          : { labelAr: `تقييم #${log.targetId}`, labelEn: `Review #${log.targetId}` };
      }
      case 'question': {
        const q = questions.find((item) => item.id === log.targetId);
        return q
          ? {
              labelAr: `استفسار منتج: ${q.questionAr}`,
              labelEn: `Product Q&A: ${q.questionEn}`,
            }
          : { labelAr: `استفسار #${log.targetId}`, labelEn: `Question #${log.targetId}` };
      }
      case 'settings':
        return log.targetId === 'privatePlatformSettings'
          ? {
              labelAr: 'إعدادات الحوكمة الداخلية للمنصة (privatePlatformSettings)',
              labelEn: 'Internal Governance Settings (privatePlatformSettings)',
            }
          : {
              labelAr: 'الإعدادات العامة للمنصة والشحن (publicPlatformSettings)',
              labelEn: 'Public Platform & Shipping Settings (publicPlatformSettings)',
            };
      case 'homepage':
      default:
        return {
          labelAr: `إعدادات الواجهة الرئيسية (${log.targetId})`,
          labelEn: `Storefront Homepage Config (${log.targetId})`,
        };
    }
  };

  const filteredLogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const dayMs = 24 * 60 * 60 * 1000;

    const filtered = auditLogs.filter((log) => {
      if (targetTypeFilter !== 'all' && log.targetType !== targetTypeFilter) return false;
      if (roleFilter !== 'all' && log.actorRole !== roleFilter) return false;
      if (actorFilter !== 'all' && log.actorName !== actorFilter) return false;

      if (dateRange !== 'all') {
        const logTs = new Date(log.createdAt.replace(' ', 'T')).getTime();
        if (Number.isFinite(logTs)) {
          const diffDays = (referenceTimestamp - logTs) / dayMs;
          if (dateRange === 'today' && diffDays > 1.5) return false;
          if (dateRange === '7d' && diffDays > 7) return false;
          if (dateRange === '30d' && diffDays > 30) return false;
          if (dateRange === '90d' && diffDays > 90) return false;
        }
      }

      if (!q) return true;
      return (
        log.id.toLowerCase().includes(q) ||
        log.actorName.toLowerCase().includes(q) ||
        log.actorRole.toLowerCase().includes(q) ||
        log.targetType.toLowerCase().includes(q) ||
        log.targetId.toLowerCase().includes(q) ||
        log.actionAr.toLowerCase().includes(q) ||
        log.actionEn.toLowerCase().includes(q)
      );
    });

    return [...filtered].sort((a, b) => {
      const cmp = b.createdAt.localeCompare(a.createdAt);
      return sortOrder === 'newest' ? cmp : -cmp;
    });
  }, [
    auditLogs,
    searchQuery,
    targetTypeFilter,
    roleFilter,
    actorFilter,
    dateRange,
    sortOrder,
    referenceTimestamp,
  ]);

  const auditStats = useMemo(() => {
    const adminCount = auditLogs.filter((l) => l.actorRole === 'admin').length;
    const sellerCount = auditLogs.filter((l) => l.actorRole === 'seller').length;
    const financialTargets = auditLogs.filter(
      (l) => l.targetType === 'ticket' || l.targetType === 'return' || l.targetType === 'seller'
    ).length;
    return {
      total: auditLogs.length,
      filtered: filteredLogs.length,
      adminCount,
      sellerCount,
      financialTargets,
    };
  }, [auditLogs, filteredLogs]);

  const handleExportAuditCsv = () => {
    const headers = ['timestamp', 'actor', 'role', 'targetType', 'targetId', 'action'];
    const rows = filteredLogs.map((log) => [
      log.createdAt,
      log.actorName,
      log.actorRole,
      log.targetType,
      log.targetId,
      maskIbanInText(lang === 'ar' ? log.actionAr : log.actionEn),
    ]);
    downloadCsvFile(`atheel-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  const targetTypeOptions: { id: AuditTargetFilter; ar: string; en: string }[] = [
    { id: 'all', ar: 'جميع الكيانات (All Targets)', en: 'All Target Types' },
    { id: 'seller', ar: 'التجار (seller)', en: 'Sellers (seller)' },
    { id: 'product', ar: 'المنتجات (product)', en: 'Products (product)' },
    { id: 'order', ar: 'الطلبات (order)', en: 'Orders (order)' },
    { id: 'return', ar: 'المرتجعات (return)', en: 'Returns (return)' },
    { id: 'ticket', ar: 'التذاكر والخزينة (ticket)', en: 'Tickets & Treasury (ticket)' },
    { id: 'customer', ar: 'العملاء والمحافظ (customer)', en: 'Customers (customer)' },
    { id: 'coupon', ar: 'الكوبونات (coupon)', en: 'Coupons (coupon)' },
    { id: 'review', ar: 'التقييمات (review)', en: 'Reviews (review)' },
    { id: 'question', ar: 'الأسئلة (question)', en: 'Questions (question)' },
    { id: 'homepage', ar: 'واجهة المتجر (homepage)', en: 'Homepage (homepage)' },
    { id: 'settings', ar: 'إعدادات المنصة (settings)', en: 'Platform Settings (settings)' },
  ];

  const getRoleLabel = (role: UserRole) => {
    if (role === 'admin') return t('مسؤول المنصة (admin)', 'Admin (admin)');
    if (role === 'seller') return t('تاجر معتمد (seller)', 'Seller (seller)');
    return t('عميل (customer)', 'Customer (customer)');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-[#E6E0D6] p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#0B4F3F] font-bold">
            <History className="w-4 h-4 text-[#C59B27]" />
            <span>
              {t(
                'مركز سجل التدقيق الرقابي غير القابل للتعديل',
                'IMMUTABLE EXECUTIVE AUDIT LOG CENTER'
              )}
            </span>
          </div>
          <h2 className="text-xl font-bold text-[#141413]">
            {t(
              'سجل الرقابة والحوكمة للعمليات الإدارية والمالية',
              'Platform Governance, Security & Financial Audit Trail'
            )}
          </h2>
          <p className="text-xs text-[#57534E] max-w-3xl">
            {t(
              'توثيق زمني غير قابل للحذف أو التعديل لكافة قرارات الإدارة، تسويات الخزينة، فحص المرتجعات، اعتماد المتاجر، وتحديثات الكتالوج بدون كشف أي بيانات سرية أو أرقام آيبان كاملة.',
              'Append-only immutable trace of administrative decisions, treasury status transitions, return resolutions, seller approvals, and catalog moderation with strict PII/IBAN masking.'
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportAuditCsv}
            disabled={filteredLogs.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0B4F3F] hover:bg-[#083D30] disabled:opacity-40 text-white text-xs font-bold transition-colors"
          >
            <Download className="w-4 h-4 text-[#C59B27]" />
            <span>
              {t('تصدير السجل المفلتر (CSV)', 'Export Filtered Audit CSV')} ({filteredLogs.length})
            </span>
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-[#E6E0D6] p-4 shadow-xs">
          <div className="text-xs text-[#8C857B]">
            {t('إجمالي العمليات الموثقة', 'Total Immutable Events')}
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-[#141413] mt-1">
            {auditStats.total}
          </div>
          <div className="text-[11px] text-[#57534E] mt-0.5">
            {t('المطابقة للفلتر الحالي:', 'Matching active filter:')}{' '}
            <span className="font-mono font-bold text-[#0B4F3F]">{auditStats.filtered}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E6E0D6] p-4 shadow-xs">
          <div className="text-xs text-[#8C857B]">
            {t('قرارات مسؤولي المنصة (Admin)', 'Executive Admin Actions')}
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-[#0B4F3F] mt-1">
            {auditStats.adminCount}
          </div>
          <div className="text-[11px] text-[#57534E] mt-0.5">
            {t('عمليات التجار الموثقة:', 'Merchant Operations:')}{' '}
            <span className="font-mono font-bold text-[#141413]">{auditStats.sellerCount}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E6E0D6] p-4 shadow-xs">
          <div className="text-xs text-[#8C857B]">
            {t('عمليات الخزينة والمرتجعات والتجار', 'Treasury, Return & Seller Events')}
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-[#C59B27] mt-1">
            {auditStats.financialTargets}
          </div>
          <div className="text-[11px] text-[#57534E] mt-0.5">
            {t('تخضع لحجب الآيبان التلقائي', 'Protected by automatic IBAN masking')}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E6E0D6] p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#8C857B]">
              {t('حالة الحصانة الرقابية', 'Audit Immutability Policy')}
            </span>
            <Lock className="w-4 h-4 text-[#0B4F3F]" />
          </div>
          <div className="text-sm font-bold text-[#1B6B45] mt-2">
            {t('إضافة فقط — القراءة محصورة بالإدارة', 'Append-Only · Admin Read-Only')}
          </div>
          <div className="text-[11px] text-[#57534E] mt-0.5 font-mono">
            allow update, delete: if false
          </div>
        </div>
      </div>

      {/* Filters & Controls */}
      <div className="bg-white rounded-2xl border border-[#E6E0D6] p-5 shadow-xs space-y-4">
        {/* Date Range & Sort Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F3EFEA] pb-3.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-[#57534E] me-1 inline-flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-[#0B4F3F]" />
              {t('النطاق الزمني:', 'Date Range:')}
            </span>
            {(
              [
                { id: 'all', ar: 'كل الأوقات', en: 'All Time' },
                { id: 'today', ar: 'اليوم', en: 'Today' },
                { id: '7d', ar: 'آخر ٧ أيام', en: '7 Days' },
                { id: '30d', ar: 'آخر ٣٠ يوماً', en: '30 Days' },
                { id: '90d', ar: 'آخر ٩٠ يوماً', en: '90 Days' },
              ] as const
            ).map((range) => (
              <button
                key={range.id}
                type="button"
                onClick={() => setDateRange(range.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  dateRange === range.id
                    ? 'bg-[#0B4F3F] text-white'
                    : 'bg-[#FAF8F5] text-[#57534E] hover:bg-[#F3EFEA]'
                }`}
              >
                {lang === 'ar' ? range.ar : range.en}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSortOrder((prev) => (prev === 'newest' ? 'oldest' : 'newest'))}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] hover:border-[#0B4F3F] text-xs font-bold text-[#141413]"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-[#0B4F3F]" />
              <span>
                {sortOrder === 'newest'
                  ? t('الأحدث أولاً (Newest First)', 'Newest First')
                  : t('الأقدم أولاً (Oldest First)', 'Oldest First')}
              </span>
            </button>
          </div>
        </div>

        {/* Target Type, Role, Actor & Search Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-3">
            <label className="block text-[11px] font-semibold text-[#8C857B] mb-1">
              {t('تصفية حسب نوع الكيان (Target Type)', 'Filter by Target Type')}
            </label>
            <select
              value={targetTypeFilter}
              onChange={(e) => setTargetTypeFilter(e.target.value as AuditTargetFilter)}
              className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-semibold text-[#141413]"
            >
              {targetTypeOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {lang === 'ar' ? opt.ar : opt.en}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="block text-[11px] font-semibold text-[#8C857B] mb-1">
              {t('تصفية حسب الدور (Role)', 'Filter by Role')}
            </label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as AuditRoleFilter)}
              className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-semibold text-[#141413]"
            >
              <option value="all">{t('جميع الأدوار', 'All Roles')}</option>
              <option value="admin">{t('مسؤول (admin)', 'Admin (admin)')}</option>
              <option value="seller">{t('تاجر (seller)', 'Seller (seller)')}</option>
              <option value="customer">{t('عميل (customer)', 'Customer (customer)')}</option>
            </select>
          </div>

          <div className="lg:col-span-3">
            <label className="block text-[11px] font-semibold text-[#8C857B] mb-1">
              {t('تصفية حسب المنفّذ (Actor)', 'Filter by Actor')}
            </label>
            <select
              value={actorFilter}
              onChange={(e) => setActorFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-semibold text-[#141413]"
            >
              <option value="all">{t('جميع المنفذين', 'All Actors')}</option>
              {uniqueActors.map((actor) => (
                <option key={actor} value={actor}>
                  {actor}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-4">
            <label className="block text-[11px] font-semibold text-[#8C857B] mb-1">
              {t('بحث نصي في السجل الرقابي', 'Search Audit Trail')}
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-[#8C857B] absolute top-1/2 -translate-y-1/2 start-3.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t(
                  'ابحث بالوصف، اسم المنفذ، نوع الكيان، أو المعرّف...',
                  'Search by action text, actor, target type, or ID...'
                )}
                className="w-full ps-10 pe-4 py-2 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs text-[#141413]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-[#E6E0D6] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-[#FAF8F5] text-[#57534E] border-b border-[#E6E0D6]">
              <tr>
                <th className="py-3.5 px-4 text-start font-bold">
                  {t('الطابع الزمني (Timestamp)', 'Timestamp')}
                </th>
                <th className="py-3.5 px-4 text-start font-bold">
                  {t('المنفّذ (Actor)', 'Actor')}
                </th>
                <th className="py-3.5 px-4 text-start font-bold">
                  {t('الدور (Role)', 'Role')}
                </th>
                <th className="py-3.5 px-4 text-start font-bold">
                  {t('الإجراء الموثق (Action)', 'Action')}
                </th>
                <th className="py-3.5 px-4 text-start font-bold">
                  {t('نوع الكيان (Target Type)', 'Target Type')}
                </th>
                <th className="py-3.5 px-4 text-start font-bold">
                  {t('معرّف الهدف (Target ID)', 'Target ID')}
                </th>
                <th className="py-3.5 px-4 text-end font-bold">
                  {t('التفاصيل', 'Details')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3EFEA]">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#8C857B]">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-[#8C857B]" />
                    <div className="font-bold text-[#141413]">
                      {t(
                        'لا توجد سجلات تدقيق مطابقة لمعايير البحث الحالية',
                        'No audit log entries match the current filters'
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="hover:bg-[#FAF8F5] cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono text-[11px] text-[#57534E] whitespace-nowrap">
                      {log.createdAt.replace('T', ' ').slice(0, 19)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#141413] whitespace-nowrap">
                      {log.actorName}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`font-mono font-bold text-[11px] ${
                          log.actorRole === 'admin'
                            ? 'text-[#0B4F3F]'
                            : log.actorRole === 'seller'
                            ? 'text-[#B45309]'
                            : 'text-[#57534E]'
                        }`}
                      >
                        {log.actorRole}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[#141413] max-w-md">
                      <div className="line-clamp-2 font-medium">
                        {maskIbanInText(lang === 'ar' ? log.actionAr : log.actionEn)}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] uppercase font-bold text-[#0B4F3F] whitespace-nowrap">
                      {log.targetType}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-[#57534E] whitespace-nowrap">
                      #{log.targetId}
                    </td>
                    <td className="py-3.5 px-4 text-end whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLog(log);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#E6E0D6] hover:border-[#0B4F3F] text-[11px] font-bold text-[#141413]"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#0B4F3F]" />
                        <span>{t('فحص', 'Inspect')}</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Log Detail Modal / Drawer */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E6E0D6] max-w-2xl w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-[#E6E0D6] pb-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#0B4F3F]">
                  <ShieldCheck className="w-4 h-4 text-[#C59B27]" />
                  <span>
                    {t('بطاقة توثيق العملية الرقابية', 'IMMUTABLE AUDIT RECORD DOSSIER')} · #
                    {selectedLog.id}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-[#141413] mt-1">
                  {t(
                    'تفاصيل الحدث الإداري والرقابي الموثق',
                    'Recorded Governance & Operational Event Details'
                  )}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="p-2 rounded-lg text-[#8C857B] hover:text-[#141413] hover:bg-[#FAF8F5]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] space-y-1">
                <span className="text-[#8C857B] block">
                  {t('المنفّذ (Actor):', 'Actor Name:')}
                </span>
                <span className="font-bold text-[#141413] text-sm">{selectedLog.actorName}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] space-y-1">
                <span className="text-[#8C857B] block">
                  {t('الصلاحية / الدور (Role):', 'Actor Role:')}
                </span>
                <span className="font-mono font-bold text-[#0B4F3F] text-sm">
                  {getRoleLabel(selectedLog.actorRole)}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] space-y-1">
                <span className="text-[#8C857B] block">
                  {t('الكيان المستهدف (Target):', 'Target Entity:')}
                </span>
                <div className="font-mono font-bold text-[#141413]">
                  {selectedLog.targetType} · #{selectedLog.targetId}
                </div>
                <div className="text-[11px] text-[#57534E]">
                  {lang === 'ar'
                    ? resolveTargetSummary(selectedLog).labelAr
                    : resolveTargetSummary(selectedLog).labelEn}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] space-y-1">
                <span className="text-[#8C857B] block">
                  {t('الطابع الزمني (Timestamp):', 'Recorded Timestamp:')}
                </span>
                <span className="font-mono font-bold text-[#141413] text-sm">
                  {selectedLog.createdAt}
                </span>
              </div>
            </div>

            {/* Bilingual Action Text (Sanitized) */}
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] space-y-1.5 text-xs">
                <div className="font-bold text-[#0B4F3F]">
                  {t('وصف الإجراء بالعربية (Action Arabic):', 'Action Description (Arabic):')}
                </div>
                <p className="text-[#141413] leading-relaxed" dir="rtl">
                  {maskIbanInText(selectedLog.actionAr)}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] space-y-1.5 text-xs">
                <div className="font-bold text-[#0B4F3F]">
                  {t('وصف الإجراء بالإنجليزية (Action English):', 'Action Description (English):')}
                </div>
                <p className="text-[#141413] leading-relaxed" dir="ltr">
                  {maskIbanInText(selectedLog.actionEn)}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#EBF3F0]/60 border border-[#0B4F3F]/20 flex items-start gap-2.5 text-[11px] text-[#0B4F3F]">
              <Lock className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                {t(
                  'حوكمة السجلات الرقابية: هذا السجل غير قابل للتعديل أو الحذف (Immutable Record) ومحصن ضد كشف أي بيانات سرية أو أرقام آيبان كاملة.',
                  'Audit Governance: This record is strictly immutable (append-only, cannot be edited or deleted) and sanitized against exposing hidden credentials or full IBANs.'
                )}
              </span>
            </div>

            <div className="flex justify-end pt-2 border-t border-[#E6E0D6]">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-5 py-2 rounded-xl bg-[#141413] text-white text-xs font-bold"
              >
                {t('إغلاق البطاقة الرقابية', 'Close Audit Dossier')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
