export const ALL_STAGES = [
  'New Batches',
  'Filing team',
  'Approved Files',
  'Cut pieces ready',
  'Design ready',
  'Ready for Embroidery',
  'EMB Done',
  'Quality Control 1',
  'Stitching',
  'Buttons',
  'Quality Control 2',
  'Shipping Section',
  'Shipped'
];

export const DEPT_MAPPING: { [key: string]: string } = {
  'New Batches': 'Planning',
  'Filing team': 'Planning',
  'Approved Files': 'Planning',
  'Cut pieces ready': 'Factory Dept',
  'Design ready': 'Design',
  'Ready for Embroidery': 'Embroidery',
  'EMB Done': 'Embroidery',
  'Quality Control 1': 'QA Dept',
  'Stitching': 'Production',
  'Buttons': 'Production',
  'Quality Control 2': 'QA Dept',
  'Shipping Section': 'Logistics',
  'Shipped': 'Logistics'
};
