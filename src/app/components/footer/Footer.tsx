'use client';
import {
  ChatBubbleLeftRightIcon,
  DevicePhoneMobileIcon,
  EnvelopeIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';
import Image from 'next/image';
import React from 'react';

import { HEADER_COPY } from '@/app/components/header/copy';
import { BOTTOM_LINKS, FOOTER_LINKS, type FooterLink, PAYMENT_METHOD_NAMES } from '@/app/data/footerConfig';
import { fillTokens } from '@/app/utils/fillTokens';
import logoImage from '@/assets/kekimoro-logo-white.png';
import { Link } from '@/lib/i18n/navigation';
import { useDict, useT } from '@/lib/oneentry/labels/DictContext';
import { footerBottomLinksFromMenu, type FooterColumn, footerColumnsFromMenu } from '@/lib/oneentry/menus/adapt-footer';
import { useFooterColumnsMenu, useFooterMenu } from '@/lib/oneentry/menus/FooterMenuContext';

import { FOOTER_COPY, SOCIAL_NETWORKS } from './copy';
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
  const L = useDict('footer_', FOOTER_COPY);
  // `header_logo_alt` is shared with the header, so it keeps its own marker.
  const lLogoAlt = useT('header_logo_alt', HEADER_COPY.logoAlt);
  const cmsColumnsMenu = useFooterColumnsMenu();
  const cmsLegalMenu = useFooterMenu();

  // Widened to `string`: the overlay carries the literal types of the shipped
  // copy, which makes TS read the right side of `title || desc` as unreachable.
  const supportItems = (
    [
      { title: L.support1Title, desc: L.support1Desc },
      { title: L.support2Title, desc: L.support2Desc },
      { title: L.support3Title, desc: L.support3Desc },
      { title: L.support4Title, desc: L.support4Desc },
    ] as { title: string; desc: string }[]
  ).filter((item) => item.title || item.desc);

  const socialHrefs = [L.socialTiktok, L.socialFacebook, L.socialInstagram, L.socialYoutube, L.socialPinterest];
  const socialLinks = SOCIAL_NETWORKS.map((name, i) => ({ name, href: socialHrefs[i] ?? '' })).filter(
    (s) => s.href.length > 0,
  );

  // The two halves of the footer navigation come from two different OE menus: `bottom_menu` carries the link columns, `footer` the legal bottom bar.
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
            // Icon *components*, not elements.
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
              {L.companyDescription}
            </p>
            <p className="mb-2 text-xs text-white/40">{L.customerSupport}</p>
            <a
              href={`tel:${L.supportPhone.replace(/\s/g, '')}`}
              className="text-sm font-medium transition-colors hover:text-white/70"
              data-testid="footer-support-phone"
            >
              {L.supportPhone}
            </a>
            <p className="mt-4 text-xs text-white/30" data-testid="footer-copyright">
              {L.copyright}
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
          <p className="mb-4 text-center text-xs tracking-widest text-white/40 uppercase">{L.newsletterHeading}</p>
          <NewsletterForm />
        </div>
      </div>

      {/* Payment Methods */}
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
          <p className="mb-4 text-center text-xs tracking-widest text-white/40 uppercase">{L.acceptedPaymentMethods}</p>
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
          <p className="mb-4 text-center text-xs tracking-widest text-white/40 uppercase">{L.followUs}</p>
          <div className="flex flex-wrap justify-center gap-4">
            {socialLinks.map(({ name, href }) => {
              const src = SOCIAL_ICON_SRC[name];
              return (
                <a
                  key={name}
                  href={href}
                  aria-label={fillTokens(L.ariaFollowOn, { network: name })}
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
          aria-label={L.ariaLegalLinks}
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
