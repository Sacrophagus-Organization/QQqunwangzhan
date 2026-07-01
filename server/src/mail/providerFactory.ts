import { LocalMailProvider } from './providers/LocalMailProvider.js';
import type { MailProvider } from './providers/MailProvider.js';

let provider: MailProvider | null = null;

export function getMailProvider(): MailProvider {
  if (provider) return provider;
  provider = new LocalMailProvider();
  return provider;
}

export function setMailProviderForTests(next: MailProvider | null) {
  provider = next;
}
