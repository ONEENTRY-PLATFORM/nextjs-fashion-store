'use client';
import {
  ChatBubbleLeftRightIcon,
  DevicePhoneMobileIcon,
  EnvelopeIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';
import Image from 'next/image';
import React from 'react';

import { FOOTER_ARIA, FOOTER_DYNAMIC_ARIA, FOOTER_LABELS as FL } from '@/app/data/commonLabels';
import {
  BOTTOM_LINKS,
  COMPANY_INFO,
  FOOTER_LINKS,
  type FooterLink,
  PAYMENT_METHOD_NAMES,
  SOCIAL_LINKS,
  SUPPORT_ITEMS,
} from '@/app/data/footerConfig';
import { LOGO_ALT } from '@/app/data/headerConfig';
import { fillTokens } from '@/app/utils/fillTokens';
import logoImage from '@/assets/kekimoro-logo-white.png';
import { Link } from '@/lib/i18n/navigation';
import { useT } from '@/lib/oneentry/labels/DictContext';
import { footerBottomLinksFromMenu, type FooterColumn, footerColumnsFromMenu } from '@/lib/oneentry/menus/adapt-footer';
import { useFooterColumnsMenu, useFooterMenu } from '@/lib/oneentry/menus/FooterMenuContext';

import { NewsletterForm } from './NewsletterForm';

const PAYMENT_ICON_SRC: Record<string, string> = {
  Visa: '/icons/payment/visa.svg',
  Mastercard: '/icons/payment/mastercard.svg',
  Amex: '/icons/payment/amex.svg',
  'Apple Pay': '/icons/payment/apple-pay.svg',
  'Google Pay': '/icons/payment/google-pay.svg',
  PayPal: '/icons/payment/paypal.svg',
  Klarna: '/icons/payment/klarna.svg',
  Maestro: '/icons/payment/maestro.svg',
};

const SOCIAL_ICON_SRC: Record<string, string> = {
  TikTok: '/icons/social/tiktok.svg',
  Facebook: '/icons/social/facebook.svg',
  Instagram: '/icons/social/instagram.svg',
  YouTube: '/icons/social/youtube.svg',
  Pinterest: '/icons/social/pinterest.svg',
};

export function Footer() {
  const lLogoAlt = useT('header_logo_alt', LOGO_ALT);
  const aLegalLinks = useT('footer_aria_legal_links', FOOTER_ARIA.legalLinks);
  const aFollowOn = useT('footer_aria_follow_on', FOOTER_DYNAMIC_ARIA.followOn);
  const cmsColumnsMenu = useFooterColumnsMenu();
  const cmsLegalMenu = useFooterMenu();

  // Branding copy from the OE `footer` set — the fields marketing changes
  // without a release. `COMPANY_INFO` / `SUPPORT_ITEMS` remain the fallback.
  const lCustomerSupport = useT('footer_customer_support', FL.customerSupport);
  const lNewsletterHead = useT('footer_newsletter_heading', FL.newsletterHeading);
  const lPaymentMethods = useT('footer_accepted_payment_methods', FL.acceptedPaymentMethods);
  const lFollowUs = useT('footer_follow_us', FL.followUs);
  const lDescription = useT('footer_company_description', COMPANY_INFO.description);
  const lPhone = useT('footer_support_phone', COMPANY_INFO.phone);
  const lCopyright = useT('footer_copyright', COMPANY_INFO.copyright);

  // Four support cards are a fixed layout slot, so each key is read with its
  // own top-level hook call — a loop would break the rules of hooks. The icon
  // stays in code: it selects a component, it is not copy.
  const support1Title = useT('footer_support_1_title', SUPPORT_ITEMS[0]?.title ?? '');
  const support1Desc = useT('footer_support_1_desc', SUPPORT_ITEMS[0]?.desc ?? '');
  const support2Title = useT('footer_support_2_title', SUPPORT_ITEMS[1]?.title ?? '');
  const support2Desc = useT('footer_support_2_desc', SUPPORT_ITEMS[1]?.desc ?? '');
  const support3Title = useT('footer_support_3_title', SUPPORT_ITEMS[2]?.title ?? '');
  const support3Desc = useT('footer_support_3_desc', SUPPORT_ITEMS[2]?.desc ?? '');
  const support4Title = useT('footer_support_4_title', SUPPORT_ITEMS[3]?.title ?? '');
  const support4Desc = useT('footer_support_4_desc', SUPPORT_ITEMS[3]?.desc ?? '');
  const supportItems = [
    { title: support1Title, desc: support1Desc },
    { title: support2Title, desc: support2Desc },
    { title: support3Title, desc: support3Desc },
    { title: support4Title, desc: support4Desc },
  ].filter((item) => item.title || item.desc);

  // Social profile URLs: the network name keys the icon asset and stays in
  // code, only the destination is CMS-editable.
  const tiktokHref = useT('footer_social_tiktok', SOCIAL_LINKS[0]?.href ?? '');
  const facebookHref = useT('footer_social_facebook', SOCIAL_LINKS[1]?.href ?? '');
  const instagramHref = useT('footer_social_instagram', SOCIAL_LINKS[2]?.href ?? '');
  const youtubeHref = useT('footer_social_youtube', SOCIAL_LINKS[3]?.href ?? '');
  const pinterestHref = useT('footer_social_pinterest', SOCIAL_LINKS[4]?.href ?? '');
  const socialLinks = SOCIAL_LINKS.map((s, i) => ({
    name: s.name,
    href: [tiktokHref, facebookHref, instagramHref, youtubeHref, pinterestHref][i] ?? s.href,
  })).filter((s) => s.href.length > 0);

  // The two halves of the footer navigation come from two different OE menus:
  // `bottom_menu` carries the link columns, `footer` the legal bottom bar. Each
  // half falls back to its local dataset independently, so a tenant that has
  // only one of them keeps the coded copy for the other.
  const cmsColumns = footerColumnsFromMenu(cmsColumnsMenu);
  const columns: FooterColumn[] =
    cmsColumns.length > 0
      ? cmsColumns
      : Object.entries(FOOTER_LINKS).map(([title, links]) => ({
          key: title,
          title,
          links: links.map((l: FooterLink) => ({ key: l.href + l.label, label: l.label, href: l.href })),
        }));

  const cmsBottomLinks = footerBottomLinksFromMenu(cmsLegalMenu);
  const bottomLinks =
    cmsBottomLinks.length > 0
      ? cmsBottomLinks
      : BOTTOM_LINKS.map((l) => ({ key: l.href, label: l.label, href: l.href }));
  return (
    <footer className="bg-black text-white" data-testid="site-footer">
      {/* Support Bar */}
      <div className="border-b border-white/10">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 py-8 md:grid-cols-4 lg:px-8">
          {(() => {
            // Icon *components*, not elements — an array of JSX elements is an
            // array of children React wants keys on, and rendering them by
            // index also re-mounts each icon whenever the list order shifts.
            const SUPPORT_ICONS = [
              QuestionMarkCircleIcon,
              DevicePhoneMobileIcon,
              ChatBubbleLeftRightIcon,
              EnvelopeIcon,
            ];
            return supportItems.map((item, i) => {
              const Icon = SUPPORT_ICONS[i];
              return (
                <div key={item.title} className="text-center" data-testid="footer-support-item">
                  <div className="mb-2 flex justify-center text-white">{Icon ? <Icon className="size-6" /> : null}</div>
                  <p className="mb-1 text-xs font-medium tracking-widest uppercase">{item.title}</p>
                  <p className="text-xs text-white/50">{item.desc}</p>
                </div>
              );
            });
          })()}
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-6">
          {/* Brand Column */}
          <div className="col-span-2 lg:col-span-2">
            <Image src={logoImage} alt={lLogoAlt} width={183} height={40} className="mb-4 object-contain" />
            <p className="mb-4 max-w-xs text-xs leading-relaxed text-white/50" data-testid="footer-company-description">
              {lDescription}
            </p>
            <p className="mb-2 text-xs text-white/40">{lCustomerSupport}</p>
            <a
              href={`tel:${lPhone.replace(/\s/g, '')}`}
              className="text-sm font-medium transition-colors hover:text-white/70"
              data-testid="footer-support-phone"
            >
              {lPhone}
            </a>
            <p className="mt-4 text-xs text-white/30" data-testid="footer-copyright">
              {lCopyright}
            </p>
          </div>

          {/* Link Columns */}
          {columns.map((column) => (
            <nav key={column.key} aria-label={column.title} data-testid="footer-column">
              <h4
                className="mb-4 text-xs font-medium tracking-widest text-white/80 uppercase"
                data-testid="footer-column-title"
              >
                {column.title}
              </h4>
              <ul className="space-y-2">
                {column.links.map((link) => (
                  <li key={link.key}>
                    <Link
                      href={link.href}
                      className="block text-xs text-white/50 transition-colors hover:text-white"
                      data-testid="footer-column-link"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>

      {/* Newsletter */}
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
          <p className="mb-4 text-center text-xs tracking-widest text-white/40 uppercase">{lNewsletterHead}</p>
          <NewsletterForm />
        </div>
      </div>

      {/* Payment Methods */}
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
          <p className="mb-4 text-center text-xs tracking-widest text-white/40 uppercase">{lPaymentMethods}</p>
          <div className="flex flex-wrap justify-center gap-3">
            {PAYMENT_METHOD_NAMES.map((name) => {
              const src = PAYMENT_ICON_SRC[name];
              return (
                <div
                  key={name}
                  className="flex min-w-16 items-center justify-center bg-white/5 px-2 py-1 transition-colors hover:bg-white/10"
                >
                  {src ? (
                    <Image src={src} alt={name} width={60} height={40} className="h-6 w-auto" unoptimized />
                  ) : (
                    <span className="text-xs font-bold">{name}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Social Media */}
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
          <p className="mb-4 text-center text-xs tracking-widest text-white/40 uppercase">{lFollowUs}</p>
          <div className="flex flex-wrap justify-center gap-4">
            {socialLinks.map(({ name, href }) => {
              const src = SOCIAL_ICON_SRC[name];
              return (
                <a
                  key={name}
                  href={href}
                  aria-label={fillTokens(aFollowOn, { network: name })}
                  rel="noopener noreferrer"
                  target="_blank"
                  className="group flex size-9 items-center justify-center bg-white/10 transition-all duration-200 hover:bg-white active:bg-gray-200"
                >
                  {src ? (
                    <Image
                      src={src}
                      alt={name}
                      width={20}
                      height={20}
                      className="size-5 group-hover:invert"
                      unoptimized
                    />
                  ) : null}
                </a>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <nav
          aria-label={aLegalLinks}
          className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-4 p-4 lg:px-8"
          data-testid="footer-bottom-bar"
        >
          {bottomLinks.map((link, i, arr) => (
            <span key={link.key} className="flex items-center gap-4">
              <Link
                href={link.href}
                className="text-xs text-white/40 transition-colors hover:text-white/70"
                data-testid="footer-bottom-link"
              >
                {link.label}
              </Link>
              {i < arr.length - 1 && <span className="text-xs text-white/20">|</span>}
            </span>
          ))}
        </nav>
      </div>
    </footer>
  );
}
