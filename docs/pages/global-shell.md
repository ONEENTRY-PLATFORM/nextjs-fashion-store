# Global blocks (Header / Footer / Modals)

These blocks are rendered on every page via the root layout.

## Global SEO settings (applied by default to all pages)

- **Title template**: string
- **Site name (default title)**: string
- **Default description**: text
- **Site URL (metadataBase)**: string
- **Default OG image**: image
- **Twitter handle**: string
- **Locale**: string
- **Favicon**: image
- **Icon 32×32**: image
- **Icon 192×192**: image
- **Apple touch icon (180×180)**: image
- **Theme color**: string
- **PWA manifest name**: string
- **PWA manifest short_name**: string
- **PWA background_color**: string

## 1. Header (desktop)

> Source of constants: `data/headerConfig.ts`. Sticky `top-0`.

### Top Bar (black strip, md+ only)

Hidden on mobile (`hidden md:block`).

**Left**:
- **Region selector** (dropdown with `GlobeAltIcon` + `ChevronDown`): `Europe` (default), `United Kingdom`, `United States`, `Australia`
- **Language selector** (dropdown with `ChevronDown`): `EN` (default), `DE`, `FR`, `IT`, `ES`

**Right**:
- **Support phone** (with `PhoneIcon`): `"+44 20 7946 0958"` (`SUPPORT_PHONE`)
- **Store Locations** (with `MapPinIcon`, button): `"Store Locations"` → `/stores`

### Main Header (white strip)

- **Logo** (left, link to `/`): alt = `"ONEENTRY FASHION"` (`LOGO_ALT`)
- **Hamburger** (mobile only, before the logo): aria-label `"Open menu"` → opens `HeaderMobileDrawer`

### Main Navigation (center, desktop only)
- aria-label: `"Main navigation"`
- ⚠ **Only two items** — gender toggle:
  - **`WOMEN`** (uppercase) — leads to `/women/clothing`, active — accent `WOMEN_COLOR` + bottom underline
  - **`MEN`** (uppercase) — leads to `/men/clothing`, active — accent `MEN_COLOR`
- On hover over either item, a `HeaderMegaMenu` appears below with subcategories (`SUB_CATEGORIES`)

### Header Mega Menu (drop-down menu on hover)

Layout from `MEGA_DATA[gender][subcat]` (see `data/categories.ts`).

- Sub-categories in a row (`SUB_CATEGORIES`): `"Shoes"`, `"Clothing"`, `"Bags"`, `"Accessories"`, `"New"`, `"Sale"`
- Megamenu columns — 1–2 per subcat:
  - **Column title** (uppercase): `"CLOTHING"` / `"SHOES"` / `"BAGS"` / `"ACCESSORIES"` / `"SEASONAL TRENDS"`
  - Heading color depends on gender (women — `ACCENT_WOMEN`, men — `ACCENT_MEN`)
  - Items — subcategory links (examples for women/clothing: `Pants & Shorts`, `Jeans`, `Sheepskin Coats & Fur`, `Jackets`, `Coats`, `Dresses & Skirts`, `Shirts`, `Sweaters`, `Hoodies`, `T-shirts`, `Underwear`)

### Search (right group)
- **Desktop** (lg+): expand-on-hover field (10px collapsed → 256px expanded)
  - Placeholder `"Search"` (exact from `SEARCH_PLACEHOLDER`)
  - field aria-label: `"Search products"`
  - `Search` icon on the right
- **Mobile**: only a toggle button with `Search` icon (aria-label `"Toggle search"`) — expands the field into a row under the main header

### Account / Wishlist / Bag (icons on the right)
- **Account** (`User` icon, hidden md:flex): aria-label `"My account"`
  - Logged in → `/account`
  - Not logged in → opens `LoginModal`
- **Wishlist** (`Heart` icon): aria-label `"Wishlist"` → `/favorites`
  - **Counter bubble** (if `wishlistCount > 0`): pink (WOMEN_COLOR) circle with the number in the top-right corner
- **Bag** (`ShoppingBag` icon): aria-label `"Shopping bag"` → opens `MiniCart`
  - **Counter bubble** (if `totalItems > 0`): accent-colored (depends on gender) circle with the number

## 2. Header (mobile)

- **Hamburger**: aria-label `"Open menu"` → opens `HeaderMobileDrawer`
- **Search field**: placeholder `"Search..."` (exact from `SEARCH_PLACEHOLDER_MOBILE`)
- field aria-label: `"Search products"`

### Mobile Drawer (`HeaderMobileDrawer`)

Side panel on the left (overlay 50% black).

- **Header**: logo (alt `"ONEENTRY FASHION"`) + **Close button** (icon `X`, aria-label `"Close menu"`)
- **Gender Switch**: two buttons `"WOMEN"` / `"MEN"` (the active one is highlighted with accent color, navigates to `/women/clothing` or `/men/clothing`)
- **Categories list** (from `SUB_CATEGORIES`): `Shoes`, `Clothing`, `Bags`, `Accessories`, `New`, `Sale`
  - Categories `clothing/shoes/bags/accessories` — expandable (with `ChevronDown` arrow)
  - Inside the expanded view — sections from `MEGA_DATA[gender][cat]` with titles (accent color) and items
- **Footer drawer** (at the bottom):
  - **Mobile footer links** (`MOBILE_FOOTER_LINKS`):
    - `"My Account"` (icon `User`) → `/account`
    - `"Store Locations"` (icon `MapPin`) → `/stores`
  - **Support phone** (icon `Phone`): `"+44 20 7946 0958"`

## 3. Mini Cart (drawer on the right)

Opens on click of the bag icon.

- aria-label: `"Your bag"`
- **H2**: `"Your Bag"`
- **Close button**: aria-label `"Close cart"`

### If the cart is empty
- **Text**: `"Your bag is empty"`
- **Button**: `"Continue Shopping"` or similar

### If there are items
- Item cards:
  - Image + alt = `name`
  - Name
  - **Size**: `"Size {M}"`
  - Price + quantity
  - **Remove button**: aria-label `"Remove {name} from cart"`
- **Bundle (Special Offer)**:
  - Badge `"Special Offer Bundle"`
  - Remove button aria-label — `"Remove bundle"`

### Mini-cart footer
- `Subtotal`: $XX.XX
- Hint: `"Shipping & discounts calculated at checkout"`
- **Button**: `"Checkout"` → `/checkout/delivery`
- **Button**: `"View Cart"` → `/cart`

## 4. Footer

> Source of constants: `data/footerConfig.ts`

### Support Bar (top of the Footer)

Grid of 4 cards (`SUPPORT_ITEMS`):

- **`HELP CENTER`** (icon `QuestionMarkCircle`) — `"Find answers online anytime"`
- **`TEXT US`** (icon `DevicePhoneMobile`) — `"24/7 Support"`
- **`LIVE CHAT`** (icon `ChatBubble`) — `"24/7 Support Chat"`
- **`EMAIL US`** (icon `Envelope`) — `"Submit via our inquiry form"`

### Brand Column
- Logo + alt = `"ONEENTRY FASHION"`
- **Description** (`COMPANY_INFO.description`): `"Premium fashion for men and women. Curated collections with fast worldwide delivery."`
- **Caption**: `"Customer Support:"`
- **Phone** (`tel:` link): `"+44 20 7946 0958"` (`COMPANY_INFO.phone`)
- **Copyright** (`COMPANY_INFO.copyright`): `"© 2026 ONEENTRY FASHION. All rights reserved."`

### Link Columns (×4) — exact from `FOOTER_LINKS`

Each column is a `nav` with `aria-label` = column title, **H4** = title.

**About Company**: `Sitemap`, `About Us`, `Rewards`, `Store Locator`, `Terms`, `Privacy Policy`, `Security`, `Accessibility`, `User Content Policy`

**Service**: `Gift Certificates`, `Refer a Friend`, `Corporate`, `Careers`

**Help**: `FAQ`, `Track Order`, `Delivery`, `Exchange`, `Sizing Guide`, `Care Guide`

**Customer Support**: `Help Center`, `E-mail Us`, `Live Chat`, `Call Us`

### Payment Methods
- **Heading**: `"Accepted Payment Methods"`
- Icons (8 total, exact from `PAYMENT_METHOD_NAMES`): `Visa`, `Mastercard`, `Amex`, `Maestro`, `Apple Pay`, `Google Pay`, `PayPal`, `Klarna`

### Social Media
- **Heading**: `"Follow Us"`
- Social media icons (order from `SOCIAL_LINKS`): `TikTok`, `Facebook`, `Instagram`, `YouTube`, `Pinterest`
- aria-label of each: `"Follow us on {name}"`

### Bottom Legal Links (`BOTTOM_LINKS`)
- container aria-label: `"Legal links"`
- Exact links: `Sitemap`, `Terms of Sale`, `Terms of Use`, `Privacy Policy`, `Promo Terms`

## 5. Login Modal (`LoginModal`)

- aria-labelledby: `login-modal-title`
- **H2**: `"Sign In"`
- **Close button** (×)

### Social Login
- **Button**: `"Continue with Google"` (Google logo)
- **Button**: `"Continue with Apple"` (Apple logo)
- **Button**: `"Continue with Facebook"` (Facebook logo)

### Email/Phone form
| Field | Placeholder |
|---|---|
| login (email or phone) | `"you@example.com or +44..."` |
| password | `"••••••••"` |

- **Show password toggle button**
- **Link**: `"Forgot password?"`
- **Button**: `"Sign In"`
- **Switch link**: `"Don't have an account? Create one"` → `RegisterModal`

## 6. Register Modal (`RegisterModal`)

- aria-labelledby: `register-modal-title`
- **H2**: `"Create Account"`
- **Close button** (×)

### Form fields
| Field | Placeholder |
|---|---|
| `firstName` | `"Jane"` |
| `email` | `"you@example.com"` |
| `password` | `"Min. 8 characters"` |
| `phone` | `"+44 20 0000 0000"` |
| `code` (OTP) | `"Enter 6-digit code"` |

- **Hint below OTP**: `"Enter any code to continue (demo mode)"`
- **Show password button** (eye icon)
- **Consent checkbox**: text contains links to `"Terms of Service"` and `"Personal Data Processing & Protection Policy"`
- **Button**: `"Create Account"`
- **Switch link**: `"Already have an account? Sign In"` → `LoginModal`
