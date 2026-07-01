# Account (`/account`)

User account page. Consists of a header and a left navigation with tabs + section content.

## SEO / social networks

- **Meta title**: string
- **Meta description**: text

## 0. If not logged in

- **Text**: `"Please sign in to view your account"`
- **Button**: `"Sign In"` (opens `LoginModal`)

## 1. Account Header

- **Eyebrow**: `"Welcome back"`
- **H1**: `{firstName}` (user's first name)
- **Button**: `"Sign Out"` (with icon)

## 2. Sidebar Navigation (left column)

List of sections — tabs (from `NAV_ITEMS` in `AccountPage.tsx`, **exact labels**):

- `My Data` (icon: `User`) — personal information
- `My Orders` (icon: `ShoppingBag`) — orders
- `My Bonuses` (icon: `Star`) — bonuses and earnings history
- `Service Maintenance` (icon: `Wrench`) — repair requests
- `Purchase History` (icon: `Clock`) — parcel tracking and transaction history
- `Wishlist` (icon: `Heart`) — favorites
- `Waiting List` (icon: `Bell`) — waiting list
- `Refer a Friend` (icon: `Users`) — referral program
- `Feedback` (icon: `MessageSquare`) — leave a review
- `Subscription Management` (icon: `Mail`) — newsletter subscriptions

> ⚠ There is **no** separate `Loyalty Card` section/tab. The `LoyaltyCard` component is embedded inside sections (for example, `My Bonuses`).

## 3. Section content

### 3.1. My Data Section

View and edit personal information (with edit mode).

| Field | Label | Placeholder |
|---|---|---|
| `firstName` | `"First Name"` | `"Jane"` |
| `email` | `"Email"` | `"you@example.com"` |
| `phone` | `"Phone"` | `"+44 20 0000 0000"` |
| `shoeSize` | `"Shoe Size"` | `"38"` |
| `clothingSize` | `"Clothing Size"` | `"S"` |
| `gender` | `"Gender"` (select: female/male/other) | — |

- **Button**: `"Save"` (aria-label `"Save personal information"`)
- **Button**: `"Cancel"` (aria-label `"Cancel editing personal information"`)

### 3.2. My Orders Section

List of orders as expandable cards.

**Order card fields** (exact labels — all uppercase tracking):
- `Order ID` — e.g. `"ORD-2026-001234"`
- `Date Placed` — date with icon
- `Status` — text status (with color)
- `Tracking` — tracking number (if available)
- `Est. Delivery` — estimated delivery date (if available)

**Items** — list of items in the order with thumbnail, name, price `{price × qty}`.

**Card footer**:
- **Caption**: `"Order Total"` + amount
- **Button**: aria-label `"View details for order {id}"`
- **Button**: `"Track Order"` (if tracking is available)
- **Button**: `"Reorder"`

### 3.3. My Bonuses Section

Consists of an embedded `LoyaltyCard` at the top + history.

**Loyalty Card (card at the top)**:
- **Label**: `"Loyalty Status"` — status (Bronze/Silver/Gold)
- **Label**: `"Discount"` — discount %
- **Label**: `"Bonuses"` — current bonus balance
- Progress bar to the next level

**History**:
- **H4**: `"Bonus Transaction History"`
- List of bonus accruals/redemptions

### 3.4. Service Maintenance Section

Service/repair requests.

- **H2**: heading
- **Subtitle/Label**: `"Submit a Service Request"`

| Field | Label | Placeholder |
|---|---|---|
| `item` | `"Item"` | `"e.g. Tailored Trench Coat"` |
| `description` | `"Description"` (textarea) | `"Describe the issue or alteration needed…"` |

- **Button**: `"Submit Request"`
- List of existing requests: `Item`, `Status`, `Date`

### 3.5. Purchase History Section

Parcel tracking + transaction history.

- **H2**: `"Track Your Parcel"`
- Card: `Carrier`: `"Royal Mail Tracked"` + `Tracking Number`
- **Button**: `"Copy"` (copy tracking number)
- Status timeline
- **Subtitle**: `"Transaction Record"`
- **H2**: transaction history — list with date, description, amount

### 3.6. Wishlist Section

Counterpart of `/favorites`:

- **Empty text**: `"Your wishlist is empty"`
- Product cards with favorite button (aria-label `"Remove from wishlist"`)
- Color/Size select inline
- **Button**: aria-label `"Quick view {name}"`

### 3.7. Waiting List Section

List of items "notify when available".

- **Eyebrow**: `"Never Miss Out"`
- **H2**: section heading
- Cards with notification toggle — aria-label `"Enable notifications for {name}"` / `"Disable…"`
- aria-label `"Remove {name} from waiting list"`

### 3.8. Refer a Friend Section

- **Eyebrow**: `"Exclusive Offer"`
- **H2**: program heading
- Referral code (with `"Copy"` button)
- **Email field**: placeholder `"friend@example.com, another@example.com"`
- **Button**: `"Send Invite"`
- **Subtitle**: `"How It Works"` — steps 1/2/3

### 3.9. Feedback Section

- **Eyebrow**: `"Your Voice Matters"`
- **H2**: heading
- **Stars** for rating — aria-label `"Rate {N} stars"`
- **Textarea**: placeholder `"Tell us what you loved or what we can improve…"`
- **Button**: `"Send Feedback"`

### 3.10. Subscription Management Section

List of subscription toggles (role=switch).

- aria-label: `"{label}"` for each toggle
- Subscriptions: Newsletter / Promo emails / Order updates / Wishlist alerts / etc.

