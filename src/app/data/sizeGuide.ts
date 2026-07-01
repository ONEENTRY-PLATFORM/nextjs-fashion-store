interface SizeRow {
  size: string;
  us: string;
  bust: string;
  waist: string;
  hip: string;
}

export const SIZE_GUIDE_DATA: SizeRow[] = [
  { size: 'XS', us: '0-2',   bust: '31-32"', waist: '24-25"', hip: '33-34"' },
  { size: 'S',  us: '4-6',   bust: '33-34"', waist: '26-27"', hip: '35-36"' },
  { size: 'M',  us: '8-10',  bust: '35-36"', waist: '28-29"', hip: '37-38"' },
  { size: 'L',  us: '12-14', bust: '37-39"', waist: '30-32"', hip: '39-41"' },
  { size: 'XL', us: '16-18', bust: '40-42"', waist: '33-35"', hip: '42-44"' },
];
