import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { DeliveryMethodLocker } from '../app/pages/checkout/DeliveryMethodLocker';
import { DeliveryMethodInfoProvider } from '../lib/oneentry/checkout/DeliveryMethodInfoContext';
import { PARCEL_LOCKERS } from '../app/data/checkoutConfig';

const GUEST_CONTACT_EMPTY = { fullName: '', phone: '', email: '' };

const sharedArgs = {
  checked: true,
  onChange: fn(),
  selectedLocker: PARCEL_LOCKERS[0],
  setSelectedLocker: fn(),
  lockerDropOpen: false,
  setLockerDropOpen: fn(),
  isLoggedIn: true,
  guestContact: GUEST_CONTACT_EMPTY,
  setGuestContact: fn(),
  guestContactErrors: {},
};

const meta = {
  title: 'Pages / Checkout / DeliveryMethodLocker',
  component: DeliveryMethodLocker,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 600 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DeliveryMethodLocker>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default: first locker selected, dropdown closed, local fallback labels. */
export const Default: Story = {
  args: { ...sharedArgs },
};

/** Dropdown open showing the locker list. */
export const DropdownOpen: Story = {
  name: 'Dropdown open',
  args: { ...sharedArgs, lockerDropOpen: true },
};

/** Card in unchecked / collapsed state. */
export const Unchecked: Story = {
  name: 'Unchecked (collapsed)',
  args: { ...sharedArgs, checked: false },
};

/** OE-driven copy: title, subtitle and pinHint replaced by the CMS via
 *  `DeliveryMethodInfoProvider`. No public prop changes needed. */
export const WithOECopy: Story = {
  name: 'OE-driven copy',
  decorators: [
    (Story) => (
      <DeliveryMethodInfoProvider
        data={{
          home: { title: '', subtitle: '', perks: [] },
          store: { title: '', subtitle: '', perks: [] },
          locker: {
            title: 'Parcel Locker Collection',
            subtitle: '2–4 business days · Collect any time 24/7',
            pinHint: 'A one-time PIN will be sent by SMS when your parcel is ready.',
          },
        }}
      >
        <Story />
      </DeliveryMethodInfoProvider>
    ),
  ],
  args: { ...sharedArgs },
};
