// configs/credentials.ts

import { Environment } from './urls';

export const ADMIN_CREDENTIALS = {
  [Environment.STAGING]: {
    email: 'admin@localhost.com',
    password: 'adminadmin'
  },
  [Environment.PRODUCTION]: {
    email: 'admin@localhost.com',
    password: 'adminadmin'
  }
};

export const TEST_USER = {
  firstName: 'Test',
  lastName: 'Testing_Tareq',
  email: 'tareq@storagely.io',
  phone: '5551234567',
  address: 'NYC',
  city: 'NYC',
  province: {
    alberta: 'Alberta',
    alaska: 'Alaska',
    alabama: 'Alabama'
  },
  zipCode: '99540',
  alternatePhone: '01674646008',
  alternateEmail: 'tareqmamun14@gmail.com',
  driversLicense: '6244114',
  driversLicenseState: 'Alaska',
  birthMonth: '01',
  birthDate: '1',
  birthYear: '1990',
  paymentInfo: {
    cardNumber: '5555 5555 5555 5555',
    expiryDate: '05 / 55',
    cvv: '555'
  }
};