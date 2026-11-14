import { Apinator } from '@apinator/server';

export const apinator = new Apinator({
  appId: process.env.APINATOR_APP_ID,
  key: process.env.APINATOR_KEY,
  secret: process.env.APINATOR_SECRET,
  cluster: 'us',
});