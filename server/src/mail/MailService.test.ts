import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../db.js';
import { MailService } from './MailService.js';

process.env.MAIL_PROVIDER = 'local';
process.env.MAIL_DOMAIN = 'example.test';

const service = new MailService();

function cleanup() {
  db.prepare("DELETE FROM attachments WHERE entity_type='mail_message'").run();
  db.prepare("DELETE FROM mail_messages WHERE owner_user_id LIKE 'test-%'").run();
  db.prepare("DELETE FROM mail_accounts WHERE user_id LIKE 'test-%'").run();
}

test('creates a mailbox without storing a password', async () => {
  cleanup();
  const account = await service.createAccount({ userId: 'test-user-a', username: 'Alice' });
  assert.equal(account.address, 'alice@example.test');
  const row = db.prepare('SELECT credential_ref FROM mail_accounts WHERE id=?').get(account.id) as any;
  assert.equal(row.credential_ref, '');
  cleanup();
});

test('sends local mail and updates unread counts', async () => {
  cleanup();
  await service.createAccount({ userId: 'test-user-a', username: 'alice' });
  await service.createAccount({ userId: 'test-user-b', username: 'bob' });

  const sent = await service.sendMessage('test-user-a', {
    to: 'bob@example.test',
    subject: 'Hello',
    bodyHtml: '<p>Hi Bob</p>',
  });
  assert.equal(sent.folder, 'sent');

  const inbox = service.listMessages({ userId: 'test-user-b', folder: 'inbox' });
  assert.equal(inbox.total, 1);
  assert.equal(inbox.messages[0]?.subject, 'Hello');
  assert.equal(service.getFolders('test-user-b').find(f => f.folder === 'inbox')?.unread, 1);

  service.markRead('test-user-b', inbox.messages[0]!.id, true);
  assert.equal(service.getFolders('test-user-b').find(f => f.folder === 'inbox')?.unread, 0);
  cleanup();
});

test('moves and deletes messages by owner only', async () => {
  cleanup();
  await service.createAccount({ userId: 'test-user-a', username: 'alice' });
  await service.createAccount({ userId: 'test-user-b', username: 'bob' });
  await service.sendMessage('test-user-a', { to: 'bob@example.test', subject: 'Move me', bodyHtml: 'body' });
  const message = service.listMessages({ userId: 'test-user-b', folder: 'inbox' }).messages[0]!;

  service.move('test-user-b', message.id, 'trash');
  assert.equal(service.listMessages({ userId: 'test-user-b', folder: 'trash' }).total, 1);

  assert.throws(() => service.move('test-user-a', message.id, 'trash'));
  service.delete('test-user-b', message.id);
  assert.equal(service.listMessages({ userId: 'test-user-b', folder: 'deleted' }).total, 1);
  cleanup();
});

test('rejects recipients without a local mailbox', async () => {
  cleanup();
  await service.createAccount({ userId: 'test-user-a', username: 'alice' });
  await assert.rejects(
    () => service.sendMessage('test-user-a', { to: 'missing@example.test', subject: 'Nope', bodyHtml: 'body' }),
    /站内邮箱/
  );
  cleanup();
});
