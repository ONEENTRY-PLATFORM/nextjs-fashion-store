# OneEntry — system attribute sets: discovery report + integration plan

Проект: `https://e-commerce.oneentry.cloud` (App-токен, locale: `en` — единственная активная).

## 1. Что такое «системные» наборы атрибутов

Тип атрибут-сетов `type.id = 10` (`type = "system"`) в OneEntry — это словарь UI-меток / нединамических текстов (кнопки, заголовки секций, статусы, подсказки). Значения лежат **не в `value`** (он у схемы пустой), а внутри `schema[key].initialValue[lang].value`. Поэтому правильный путь — `Content API → /api/content/attributes-sets/marker/{marker}` или SDK `AttributesSets.getAttributeSetByMarker(marker)` и разбор поля `schema`.

⚠ Метод `getAttributesByMarker` возвращает только описания (тип, listTitles, validators) — реальные строки оттуда не достать. Нужен `getAttributeSetByMarker`.

## 2. Что в проекте есть всего (Content API, App-токен)

| Сущность | Количество | Примечание |
|---|---|---|
| Все attribute-sets | 83 | `total` из `/attributes-sets` |
| type=10 system (UI-метки) | **33** | целевая категория |
| type=4 forPages | 7 | схемы страниц |
| type=5 forProducts | 9 | 8 импортных + 1 ручной `forProducts_clothing` |
| type=7 forForms | 12 | схемы форм |
| Pages | 118 | большая иерархия `women/men → подкатегории`, checkout, info, stores |
| Auth providers | 4 | `email` (form `signin`) + Google/Apple/Facebook OAuth |
| Product statuses | 4 | `in_stock`, `out_of_stock`, `coming_soon`, `preorder` |
| Locales | 1 | `en` (English USA) |

Известное ограничение Content API: список `/attributes-sets` отдаёт максимум 10 элементов за раз и игнорирует `limit/offset`. Пейджинацией не пройти — недостающие маркеры приходится либо угадывать, либо доставать через админ-доступ.

## 3. Собрано системных сетов: 21 из 33

Каждая запись — `marker | "Title" | N полей | пример строки`.

| Marker | Title | N | Назначение / куда вешать на фронт |
|---|---|---|---|
| `sign_in` | Sign In | 5 | `LoginModal.tsx` / `RegisterModal.tsx` |
| `user_account` | User Account | 22 | `/account` (раздел сверху, общие подписи) |
| `user_account_silver_status` | Silver Status | 8 | блок статуса лояльности |
| `user_account_wishlist` | Wishlist | 1 | заголовок в Account → Wishlist |
| `user_account_feedback` | Feedback | 9 | подсекция Feedback |
| `my_orders` | My Orders | 12 | вкладка «Мои заказы» |
| `my_bonuses` | My Bonuses | 4 | вкладка «Бонусы» |
| `purchase_history` | Purchase History | 27 | детальная история покупок |
| `service_maintenance` | Service Maintenance | 34 | заявки на сервис |
| `waiting_list` | Waiting List | 15 | лист ожидания |
| `product-card` | Product Card | 14 | `ProductCard.tsx` / PDP |
| `product_card_delivery_returns` | Delivery & Returns | 8 | блок Delivery/Returns на PDP |
| `product_card_actions` | Product Card Actions | 3 | actions (share/copy и т.п.) |
| `customer-reviews` | Customer Reviews | 5 | блок отзывов на PDP |
| `special_offers_product_card` | Special Offers | 4 | бандл «Complete the Look» |
| `sale_page` | Sale Page | 6 | `/sale` (таймер, счётчики) |
| `new_arrivals_page` | New Arrivals Page | 3 | `/new` |
| `checkout_cart` | Checkout - Cart | 16 | шаг 1 чекаута |
| `checkout_delivery` | Checkout - Delivery | 12 | шаг 2 |
| `checkout_payment` | Checkout - Payment Method | 17 | шаг 3 |
| `checkout_confirmed` | Order Confirmed | 14 | страница подтверждения |

Полный JSON-дамп с initialValue по каждому ключу: `.claude/temp/system-sets-full.json`.

## 4. Что НЕ удалось достать (12 системных сетов)

Под `total=33`, но в Content API «спрятаны» — markers не угадываются. Вероятный состав по контексту проекта: `header`, `footer`, `menu`, `home_page`, `product_page` (общий), `search`/`filters`, `wishlist_page`, `cart_empty`, `cookies_consent`, `newsletter_popup`, `404/500_page`, `breadcrumbs/common`.

Способы добыть:
- через админ-панель OneEntry (Settings → Attribute Sets) — скопировать markers и докинуть в список;
- либо подключить админ-токен (есть `Admin*` сервисы в SDK) — App-токен под Content API не показывает скрытые сеты.

## 5. Текущее состояние фронта

В исходниках (`src/app/data/*.ts`) сейчас все статические тексты захардкожены: `footerConfig.ts`, `errorPageLabels.ts`, `infoPageLabels.ts`, `seoData.ts`, `faqData.ts`, `userData.ts`, `stores.ts`. SDK `oneentry` в зависимостях есть, но ни одного вызова к `defineOneEntry` нет — проект работает на `fetch` только для auth + wishlist/cart (см. `docs/ONEENTRY_INTEGRATION.md`).

## 6. Архитектурный план подключения

### 6.1. Базовая обвязка SDK (одноразово)

1. `.env.local`: добавить
   - `NEXT_PUBLIC_ONEENTRY_URL=https://e-commerce.oneentry.cloud`
   - `NEXT_PUBLIC_ONEENTRY_TOKEN=<app-token>`
   - (опционально) `ONEENTRY_TOKEN` для серверных рут с расширенными правами.
2. `.mcp.json`: прописать те же `ONEENTRY_URL`/`ONEENTRY_TOKEN` в `env` оф mcp-сервера, чтобы `inspect-api`/`get-project-config` работали без вопросов.
3. `src/lib/oneentry.ts` — singleton:
   ```ts
   import { defineOneEntry } from 'oneentry';
   export const oneentry = defineOneEntry(process.env.NEXT_PUBLIC_ONEENTRY_URL!, {
     token: process.env.NEXT_PUBLIC_ONEENTRY_TOKEN!,
   });
   ```
4. Тип-хелперы: `src/lib/oneentry/types.ts` — узкие интерфейсы (`SystemAttrValue`, `SystemSetSchema`).

### 6.2. Утилита «системных текстов» — главная вещь

```ts
// src/lib/oneentry/system-text.ts
import { cache } from 'react';
import { oneentry } from '@/lib/oneentry';

type Lang = 'en_US';

export const getSystemSet = cache(async (marker: string, lang: Lang = 'en_US') => {
  const set = await oneentry.AttributesSets.getAttributeSetByMarker(marker, lang);
  // schema[key].initialValue[lang].value — реальный текст
  return set?.schema ?? {};
});

export async function t(marker: string, key: string, fallback = '', lang: Lang = 'en_US') {
  const schema = await getSystemSet(marker, lang);
  return schema?.[key]?.initialValue?.[lang]?.value ?? fallback;
}
```

Особенности:
- React `cache()` => один запрос на rendering pass per (marker, lang);
- для клиентских компонент — серверный action `getSystemSet` + `next: { revalidate: 300 }`;
- fallback всегда нужен — чтобы при недоступности OneEntry приложение не ломалось.

### 6.3. Серверный компонент-обёртка для удобства

```tsx
// src/components/SystemText.tsx (server component)
import { t } from '@/lib/oneentry/system-text';
export async function SystemText({ set, k, fallback }: { set: string; k: string; fallback?: string }) {
  return <>{await t(set, k, fallback ?? k)}</>;
}
```

Внутри клиентских компонент тексты передаём prop'ом (RSC → CSC), либо хук `useSystemTexts(marker)` поверх RTK Query (если нужна client-side инвалидация).

### 6.4. Маппинг 21 системного сета на компоненты

| Set | Куда подключить (первой волной) |
|---|---|
| `sign_in` | `src/app/components/LoginModal.tsx`, `RegisterModal.tsx` |
| `product-card`, `product_card_delivery_returns`, `product_card_actions`, `special_offers_product_card`, `customer-reviews` | `src/app/components/ProductCard.tsx`, `app/product/[slug]/page.tsx`, `QuickViewModal.tsx` |
| `sale_page` | `app/sale/page.tsx`, баннер таймера + счётчики |
| `new_arrivals_page` | `app/new/page.tsx` |
| `checkout_cart` | `app/cart/page.tsx`, `MiniCart.tsx` |
| `checkout_delivery` | `app/checkout/delivery_method/page.tsx`, `CheckoutStepper.tsx` |
| `checkout_payment` | `app/checkout/payment/page.tsx` |
| `checkout_confirmed` | `app/checkout/confirmation/page.tsx` |
| `user_account`, `user_account_silver_status`, `user_account_wishlist`, `user_account_feedback`, `my_orders`, `my_bonuses`, `service_maintenance`, `purchase_history`, `waiting_list` | `app/account/*` |

### 6.5. Порядок внедрения (волнами)

1. **Шаг 0 — инфра** (1 PR):
   - `.env.local`, `.mcp.json`, `src/lib/oneentry.ts`, `system-text.ts`, `SystemText.tsx`, юнит-тест на fallback.
2. **Шаг 1 — Account-зона** (8 сетов: user_account*, my_orders, my_bonuses, service_maintenance, purchase_history, waiting_list).
   - Самый «текстовый» раздел, риск самый низкий (за роутом авторизации).
3. **Шаг 2 — Checkout-флоу** (4 сета): cart → delivery → payment → confirmed. Здесь критично сделать fallback’ы, иначе ломается заказ.
4. **Шаг 3 — Product Card / PDP** (5 сетов): product-card + delivery_returns + actions + special_offers + customer-reviews. Самый часто рендерится — стоит проверить кэш.
5. **Шаг 4 — sale_page + new_arrivals_page** (2 сета).
6. **Шаг 5 — sign_in** (1 сет) — модалки логина/регистрации.
7. **Шаг 6 — добор 12 невидимых сетов**: запросить у клиента admin-доступ, забрать `header`/`footer`/`menu`/`home_page`/… и подключить аналогично.

### 6.6. Безопасные дефолты и тесты

- Каждый `t(set, key)` обязан принимать `fallback` (по умолчанию — текущий хардкод). Иначе любой sneak/404 у OneEntry свалит рендер.
- E2E-тест: при `NEXT_PUBLIC_ONEENTRY_URL=invalid` страницы продолжают рендериться (используя fallback).
- Storybook: для компонент с системными текстами создать вариант с моковыми значениями (через `__mocks__/system-text.ts`).

### 6.7. Чего НЕ делать

- Не использовать `getAttributesByMarker` (там `value: {}`).
- Не хранить тексты в Redux store — это статика, ей нужен только server cache.
- Не плодить `defineOneEntry()` в каждом файле — только один singleton.
- Не записывать токен `NEXT_PUBLIC_ONEENTRY_TOKEN` в репозиторий — только `.env.local`.

## 7. Чек-лист «готово» по системным сетам

- [ ] `src/lib/oneentry.ts` + `system-text.ts` + `<SystemText/>` + тест
- [ ] Account зона (9 сетов)
- [ ] Checkout (4 сета)
- [ ] Product Card / PDP (5 сетов)
- [ ] Sale / New Arrivals (2 сета)
- [ ] Sign In (1 сет)
- [ ] Получить admin-доступ → достать оставшиеся 12 системных сетов
- [ ] Документировать в `docs/ONEENTRY_INTEGRATION.md` маппинг компонент ↔ сет ↔ ключ

## 8. Сырьё для следующих шагов

- `.claude/temp/system-sets-full.json` — 21 системный сет, все поля + initialValue.en_US.value
- `.claude/temp/system-full.log` — человекочитаемый дамп
- `.claude/temp/inspect-all.log` — pages / auth providers / product statuses / locales
- `.claude/temp/inspect-system-sets.mjs` / `fetch-system-sets-full.mjs` / `probe-more.mjs` — рабочие скрипты (можно перезапускать)
