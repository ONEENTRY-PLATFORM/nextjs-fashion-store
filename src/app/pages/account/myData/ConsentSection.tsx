'use client'
import { useAuth } from '../../../context/AuthContext';
import { SectionTitle } from '../shared';
import { CONSENT_LABELS as L } from '../../../data/accountLabels';
import { useT } from '../../../../lib/oneentry/labels/AccountLabelsContext';

export function ConsentSection() {
  const { user, updateConsent } = useAuth();
  const consent = user?.consent ?? { dataProcessing: false, crossBorder: false };
  const dataConsent = consent.dataProcessing;
  const crossBorderConsent = consent.crossBorder;
  const lTitle  = useT('user_account_personal_data_consent', 'u_a_p_d_c_title', L.title);
  const lRevoke = useT('user_account_personal_data_consent', 'u_a_p_d_c_text',  L.revokeWarning);

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
        {items.map(item => (
          <div key={item.label} className="flex items-center justify-between p-4 border border-[#e5e7eb]">
            <p className="text-sm text-gray-700 pr-4">{item.label}</p>
            <button
              onClick={item.onChange}
              className={`flex-shrink-0 w-12 h-6 relative focus-visible:outline-none transition-colors rounded-[12px] ${
                item.value ? 'bg-black' : 'bg-[#d1d5db]'
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${
                  item.value ? 'left-[26px]' : 'left-0.5'
                }`}
              />
            </button>
          </div>
        ))}
        <p className="text-xs text-gray-400 leading-relaxed">
          {lRevoke}
        </p>
      </div>
    </div>
  );
}
