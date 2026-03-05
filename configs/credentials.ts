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
  lastName: 'TestingTareq',
  email: 'tareq@storagely.io',
  phone: '5551234567',
  address: 'NYC',
  city: 'NYC',
  province: {
    southCarolina: 'South Carolina',
    newJersey: 'New Jersey',
    alberta: 'Alberta',
    alaska: 'Alaska',
    alabama: 'Alabama'
  },
  zipCode: '29690', // South Carolina zip for Travelers Rest
  alternatePhone: '01674646008',
  alternateEmail: 'tareqmamun14@gmail.com',
  driversLicense: '6244114',
  driversLicenseState: 'South Carolina',
  birthMonth: '01',
  birthDate: '1',
  birthYear: '1990',
  paymentInfo: {
    cardNumber: '5555 5555 5555 5555',
    expiryDate: '05 / 55',
    cvv: '555'
  }
};

// Single-page layout specific credentials (for Huntsville and similar)
export const SINGLE_PAGE_USER = {
  firstName: 'Test',
  lastName: 'TestingTareq',
  email: 'tareq@storagely.io',
  phone: '5551234567',
  address: '6255 Towncenter Drive Suite 831',
  city: 'Clemmons',
  province: {
    southCarolina: 'South Carolina',
    newJersey: 'New Jersey',
    alberta: 'Alberta',
    alaska: 'Alaska',
    alabama: 'Alabama',
    northCarolina: 'North Carolina',
    georgia: 'Georgia',
    arizona: 'Arizona',
    colorado: 'Colorado'
  },
  zipCode: '27012', // NC zip for Clemmons
  alternatePhone: '01674646008',
  alternateEmail: 'tareqmamun14@gmail.com',
  driversLicense: '6244114',
  driversLicenseState: 'South Carolina',
  birthMonth: '01',
  birthDate: '1',
  birthYear: '1990',
  paymentInfo: {
    cardNumber: '4482130130935591',
    expiryDate: '04 / 29',
    cvv: '471'
  }
};