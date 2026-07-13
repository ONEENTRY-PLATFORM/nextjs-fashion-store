import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { DeliveryMethodStore } from '../app/pages/checkout/DeliveryMethodStore';
import { DeliveryMethodInfoProvider } from '../lib/oneentry/checkout/DeliveryMethodInfoContext';
import { PICKUP_STORES } from '../app/data/checkoutConfig';

const GUEST_CONTACT_EMPTY = { fullName: '', phone: '', email: '' };

const sharedArgs = {
  checked: true,
  onChange: fn(),
  stores: PICKUP_STORES,
  selectedStore: PICKUP_STORES[0],
  setSelectedStore: fn(),
  storeDropOpen: false,
  setStoreDropOpen: fn(),
  isLoggedIn: true,
  guestContact: GUEST_CONTACT_EMPTY,
  setGuestContact: fn(),
  guestContactErrors: {},
};

const meta = {
  title: 'Pages / Checkout / DeliveryMethodStore',
  component: DeliveryMethodStore,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 600 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DeliveryMethodStore>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default: first store selected, dropdown closed, local fallback labels. */
export const Default: Story = {
  args: { ...sharedArgs },
};

/** Dropdown open showing the store list. */
export const DropdownOpen: Story = {
  name: 'Dropdown open',
  args: { ...sharedArgs, storeDropOpen: true },
};

/** Second store selected. */
export const SecondStoreSelected: Story = {
  name: 'Second store selected',
  args: { ...sharedArgs, selectedStore: PICKUP_STORES[1] },
};

/** Card in unchecked / collapsed state. */
export const Unchecked: Story = {
  name: 'Unchecked (collapsed)',
  args: { ...sharedArgs, checked: false },
};

/** OE-driven copy: title, subtitle and perks replaced by the CMS via
 *  `DeliveryMethodInfoProvider`. No public prop changes needed. */
export const WithOECopy: Story = {
  name: 'OE-driven copy',
  decorators: [
    (Story) => (
      <DeliveryMethodInfoProvider
        data={{
          home: { title: '', subtitle: '', perks: [] },
          store: {
            title: 'Click & Collect',
            subtitle: 'Ready in 1 hour · Try before you buy',
            perks: ['Free pickup', 'Fitting room available', 'Same-day collection'],
          },
          locker: { title: '', subtitle: '', pinHint: '' },
        }}
      >
        <Story />
      </DeliveryMethodInfoProvider>
    ),
  ],
  args: { ...sharedArgs },
};
