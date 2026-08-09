'use client';
import { useDict, useT } from '../../../../lib/oneentry/labels/DictContext';
import { useAuth } from '../../../context/AuthContext';
import { CONSENT_LABELS } from '../../../data/accountLabels';
import { SectionTitle } from '../shared';

export function ConsentSection() {
  const L = useDict('user_account_personal_data_consent_', CONSENT_LABELS);
  const { user, updateConsent } = useAuth();
  const consent = user?.consent ?? { dataProcessing: false, crossBorder: false };
  const dataConsent = consent.dataProcessing;
  const crossBorderConsent = consent.crossBorder;
  const lTitle = useT('u_a_p_d_c_title', L.title);
  const lRevoke = useT('u_a_p_d_c_text', L.revokeWarning);

  const setData = (val: boolean) => {
    void updateConsent({ dataProcessing: val, crossBorder: crossBorderConsent });
  };
  const setCrossBorder = (val: boolean) => {
    void updateConsent({ dataProcessing: dataConsent, crossBorder: val });
  };

  const items = [
    { label: L.consentDataProcessing, value: dataConsent, onChange: () => setData(!dataConsent) },
    { label: L.consentCrossBorder, value: crossBorderConsent, onChange: () => setCrossBorder(!crossBorderConsent) },
  ];

  return (
    <div>
      <SectionTitle title={lTitle} />
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between border border-[#e5e7eb] p-4">
            <p className="pr-4 text-sm text-gray-700">{item.label}</p>
            <button
              onClick={item.onChange}
              className={`relative h-6 w-12 shrink-0 rounded-[12px] transition-colors focus-visible:outline-none ${
                item.value ? 'bg-black' : 'bg-[#d1d5db]'
              }`}
            >
              <span
                className={`absolute top-0.5 size-5 rounded-full bg-white transition-all ${
                  item.value ? 'left-6.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>
        ))}
        <p className="text-xs leading-relaxed text-gray-400">{lRevoke}</p>
      </div>
    </div>
  );
}
