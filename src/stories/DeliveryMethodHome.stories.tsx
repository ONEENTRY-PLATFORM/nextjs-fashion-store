import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { DeliveryMethodHome } from '../app/pages/checkout/DeliveryMethodHome';
import { FormPlaceholdersProvider } from '../lib/oneentry/forms/FormPlaceholdersContext';
import { DeliveryMethodInfoProvider } from '../lib/oneentry/checkout/DeliveryMethodInfoContext';

const EMPTY_ADDR_FORM = {
  fullName: '',
  phone: '',
  line1: '',
  city: '',
  postcode: '',
  instructions: '',
};

const DELIVERY_DATES = Array.from({ length: 5 }, (_, i) => {
  const d = new Date('2026-07-12');
  d.setDate(d.getDate() + i);
  return d;
});

const MOCK_ADDRESS = {
  id: 'a1',
  name: 'Home',
  full: '42 Baker Street, London NW1 6XE',
  fullName: 'Sophie Martin',
  phone: '+44 20 7946 0958',
  line1: '42 Baker Street',
  city: 'London',
  postcode: 'NW1 6XE',
};

const sharedArgs = {
  checked: true,
  onChange: fn(),
  isLoggedIn: false,
  savedAddresses: [],
  selectedAddressId: 'new',
  setSelectedAddressId: fn(),
  newAddrForm: EMPTY_ADDR_FORM,
  setNewAddrForm: fn(),
  addrErrors: {},
  setAddrErrors: fn(),
  newAddrConfirmed: false,
  setNewAddrConfirmed: fn(),
  saveNewAddr: false,
  setSaveNewAddr: fn(),
  onConfirmNewAddr: fn(),
  deliveryDates: DELIVERY_DATES,
  selectedDate: DELIVERY_DATES[0],
  setSelectedDate: fn(),
  selectedSlot: 'morning',
  setSelectedSlot: fn(),
};

const meta = {
  title: 'Pages / Checkout / DeliveryMethodHome',
  component: DeliveryMethodHome,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <FormPlaceholdersProvider forms={{}}>
        <div style={{ maxWidth: 600 }}>
          <Story />
        </div>
      </FormPlaceholdersProvider>
    ),
  ],
} satisfies Meta<typeof DeliveryMethodHome>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Guest checkout — blank address form, local fallback labels. */
export const GuestDefault: Story = {
  name: 'Guest — blank form',
  args: { ...sharedArgs },
};

/** Logged-in user with saved addresses. */
export const LoggedInWithSavedAddresses: Story = {
  name: 'Logged-in — saved addresses',
  args: {
    ...sharedArgs,
    isLoggedIn: true,
    savedAddresses: [MOCK_ADDRESS],
    selectedAddressId: 'a1',
  },
};

/** Logged-in, "Use a different address" selected, form open. */
export const LoggedInNewAddress: Story = {
  name: 'Logged-in — new address form open',
  args: {
    ...sharedArgs,
    isLoggedIn: true,
    savedAddresses: [MOCK_ADDRESS],
    selectedAddressId: 'new',
  },
};

/** OE-driven copy: title, subtitle and perks replaced by the CMS via
 *  `DeliveryMethodInfoProvider`. No public prop changes needed — context
 *  replaces literals transparently. */
export const WithOECopy: Story = {
  name: 'Guest — OE-driven copy',
  decorators: [
    (Story) => (
      <DeliveryMethodInfoProvider
        data={{
          home: {
            title: 'Next-Day Home Delivery',
            subtitle: '1 business day · Premium courier',
            perks: ['Free delivery', 'Signature required', 'Live tracking'],
          },
          store: { title: '', subtitle: '', perks: [] },
          locker: { title: '', subtitle: '', pinHint: '' },
        }}
      >
        <Story />
      </DeliveryMethodInfoProvider>
    ),
  ],
  args: { ...sharedArgs },
};

/** Card in unchecked / collapsed state. */
export const Unchecked: Story = {
  name: 'Unchecked (collapsed)',
  args: { ...sharedArgs, checked: false },
};

/** OE-driven time slots and a shortened 3-date strip supplied from the server
 *  layer — demonstrates the `timeSlots` and `deliveryDates` props that the
 *  OE `checkout_home_delivery` schedule config now feeds into the component. */
export const OEDrivenConfig: Story = {
  name: 'OE-driven slots & date strip',
  args: {
    ...sharedArgs,
    deliveryDates: Array.from({ length: 3 }, (_, i) => {
      const d = new Date('2026-07-15');
      d.setDate(d.getDate() + i);
      return d;
    }),
    selectedDate: (() => { const d = new Date('2026-07-15'); return d; })(),
    timeSlots: [
      { id: 'morning-express', label: '07:00 – 10:00', sub: 'Morning Express' },
      { id: 'afternoon',       label: '12:00 – 16:00', sub: 'Afternoon' },
      { id: 'late-evening',    label: '19:00 – 22:00', sub: 'Late Evening' },
    ],
    selectedSlot: 'morning-express',
  },
};
