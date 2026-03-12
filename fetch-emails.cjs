/**
 * Fetch last 10 emails using IMAP (works with app password)
 */

require('dotenv').config();
const Imap = require('imap');
const { simpleParser } = require('mailparser');

const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

if (!SMTP_USER || !SMTP_PASS) {
  console.error('❌ SMTP credentials not found in .env');
  process.exit(1);
}

const imap = new Imap({
  user: SMTP_USER,
  password: SMTP_PASS,
  host: 'imap.gmail.com',
  port: 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false }
});

function fetchEmails(limit = 10) {
  return new Promise((resolve, reject) => {
    imap.once('ready', () => {
      imap.openBox('INBOX', false, (err, box) => {
        if (err) {
          reject(err);
          return;
        }

        // Fetch last N messages
        imap.search(['ALL'], (err, results) => {
          if (err) {
            reject(err);
            return;
          }

          if (!results || results.length === 0) {
            resolve([]);
            return;
          }

          // Get last N messages
          const uids = results.slice(-limit).reverse();
          
          const fetch = imap.fetch(uids, {
            bodies: '',
            struct: true
          });

          const emails = [];
          let processed = 0;

          fetch.on('message', (msg, seqno) => {
            let emailData = {
              id: seqno,
              threadId: seqno,
              from: { name: '', email: '' },
              to: [],
              subject: '',
              snippet: '',
              body: '',
              receivedAt: new Date(),
              isRead: false,
              isStarred: false,
              labels: [],
              category: 'unclassified'
            };

            msg.on('body', (stream, info) => {
              simpleParser(stream, (err, parsed) => {
                if (err) {
                  console.error('Error parsing email:', err);
                  processed++;
                  if (processed === uids.length) {
                    imap.end();
                    resolve(emails);
                  }
                  return;
                }

                emailData.from = {
                  name: parsed.from?.text || parsed.from?.value?.[0]?.name || '',
                  email: parsed.from?.value?.[0]?.address || parsed.from?.text || ''
                };
                emailData.to = parsed.to?.value?.map(t => t.address) || [parsed.to?.text] || [];
                emailData.subject = parsed.subject || '(No Subject)';
                emailData.body = parsed.text || parsed.html || '';
                emailData.snippet = emailData.body.substring(0, 100);
                emailData.receivedAt = parsed.date || new Date();
                emailData.isRead = !parsed.flags?.has('\\Seen');
                emailData.isStarred = parsed.flags?.has('\\Flagged');

                emails.push(emailData);
                processed++;

                if (processed === uids.length) {
                  imap.end();
                  resolve(emails);
                }
              });
            });

            msg.once('attributes', (attrs) => {
              emailData.id = attrs.uid;
            });
          });

          fetch.once('error', (err) => {
            reject(err);
          });
        });
      });
    });

    imap.once('error', (err) => {
      reject(err);
    });

    imap.once('end', () => {
      console.log('Connection ended');
    });

    imap.connect();
  });
}

async function main() {
  try {
    console.log('📧 Fetching last 10 emails from', SMTP_USER);
    console.log('');

    const emails = await fetchEmails(10);

    console.log(`✅ Found ${emails.length} emails:\n`);

    emails.forEach((email, index) => {
      console.log(`${index + 1}. From: ${email.from.name || email.from.email}`);
      console.log(`   Subject: ${email.subject}`);
      console.log(`   Date: ${email.receivedAt.toLocaleString()}`);
      console.log(`   Snippet: ${email.snippet.substring(0, 60)}...`);
      console.log('');
    });

    // Also output as JSON
    console.log('\n--- JSON Output ---');
    console.log(JSON.stringify(emails, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('Invalid credentials')) {
      console.error('\n💡 Make sure you\'re using an App Password, not your regular Gmail password.');
      console.error('   Get one at: https://myaccount.google.com/apppasswords');
    }
    process.exit(1);
  }
}

main();

