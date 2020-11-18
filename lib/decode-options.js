import { decode } from 'base-64';

export default function decodeSettings(headers) {
  return JSON.parse(decode(headers['x-client-options']));
}
