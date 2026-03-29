export const CORE_ACCOUNTS = [
  {
    name: 'Super Admin',
    email: 'admin@factory.com',
    password: 'password123',
    role: 'admin',
    department: 'Management'
  },
  {
    name: 'Main Accountant',
    email: 'accountant@factory.com',
    password: 'password123',
    role: 'accountant',
    department: 'Finance'
  },
  {
    name: 'Factory Supervisor',
    email: 'staff@factory.com',
    password: 'password123',
    role: 'staff',
    department: 'Production'
  },
  {
    name: 'General Manager',
    email: 'manager@factory.com',
    password: 'password123',
    role: 'admin',
    department: 'Management'
  }
];

export const DEFAULT_SETTINGS = {
  phone_numbers: '01000000000, 01111111111',
  whatsapp: '01000000000',
  facebook_url: 'https://facebook.com/factory',
  instagram_url: 'https://instagram.com/factory',
  address: '123 Factory St, Industrial Zone',
  other_info: 'B2B Order Tracking System default settings.'
};

export const ALL_STAGES = [
  'New Batches',
  'Filing team',
  'Approved Files',
  'Design & Cut Pieces Ready',
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
  'Design & Cut Pieces Ready': 'Factory Dept',
  'Ready for Embroidery': 'Embroidery',
  'EMB Done': 'Embroidery',
  'Quality Control 1': 'QA Dept',
  'Stitching': 'Production',
  'Buttons': 'Production',
  'Quality Control 2': 'QA Dept',
  'Shipping Section': 'Logistics',
  'Shipped': 'Logistics'
};
