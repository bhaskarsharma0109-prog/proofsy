const http = require('http');

let tokenCookie = null;
let templateId = null;
let eventId = null;
let certId = null;
let verificationCode = null;

const email = `analytics-test-${Date.now()}@org.com`;
const registerData = JSON.stringify({
  orgName: 'Analytics Test Org',
  name: 'Analytics Tester',
  email: email,
  password: 'password123'
});

console.log('1. Registering user...');
postJSON('/api/auth/register', registerData, null, (status, resBody, cookies) => {
  if (status !== 201) {
    console.error('Registration failed:', resBody);
    process.exit(1);
  }
  
  tokenCookie = cookies.find(c => c.startsWith('token=')).split(';')[0];
  console.log('Success! Token cookie:', tokenCookie);

  console.log('\n2. Seeding starter templates...');
  postJSON('/api/templates/seed', '{}', null, (seedStatus, seedBody) => {
    console.log('Seed Status:', seedStatus);

    console.log('\n3. Fetching templates to get template ID...');
    getJSON('/api/templates', tokenCookie, (listStatus, listBody) => {
      const listResult = JSON.parse(listBody);
      templateId = listResult.data[0].id;
      console.log('Selected Template ID:', templateId);

      // Create event
      console.log('\n4. Creating a test event...');
      const eventData = JSON.stringify({
        name: 'Analytics Testing Event',
        date: new Date().toISOString(),
        organizerName: 'System Analytics',
        templateId: templateId
      });

      postJSON('/api/events', eventData, tokenCookie, (status, resBody) => {
        const eventResult = JSON.parse(resBody);
        eventId = eventResult.data.id;
        console.log('Event ID:', eventId);

        // Turn on Developer REST API to issue certificates
        console.log('\n5. Activating REST API to get API Key...');
        putJSON('/api/integrations/rest-api', JSON.stringify({ connected: true }), tokenCookie, (status, resBody) => {
          const restResult = JSON.parse(resBody);
          const apiKey = restResult.data.apiKey;
          console.log('API Key:', apiKey);

          // Issue first certificate
          console.log('\n6. Issuing a certificate...');
          const issueData = JSON.stringify({
            eventId: eventId,
            name: 'Analytics Student',
            email: 'student@analytics.com'
          });

          postJSONWithBearer('/api/v1/certificates', issueData, apiKey, (status, resBody) => {
            console.log('Issuance status:', status);
            const certResult = JSON.parse(resBody);
            certId = certResult.data.id;
            verificationCode = certResult.data.verificationCode;
            console.log(`Certificate ID: ${certId}, Code: ${verificationCode}`);

            // Polling: Wait for the certificate to generate so signature verification is valid
            console.log('\nWaiting for certificate to generate...');
            waitForStatus(certId, 'generated', 15, tokenCookie, () => {
              
              console.log('\n7. Simulating 5 public verification hits...');

              // Visit 1: LinkedIn referral on iOS (mobile)
              const hit1 = {
                path: `/api/verify/${verificationCode}?ref=linkedin`,
                headers: {
                  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
                  'Referer': 'https://www.linkedin.com/'
                }
              };

              // Visit 2: Twitter referral on Windows Chrome (desktop)
              const hit2 = {
                path: `/api/verify/${verificationCode}?ref=twitter`,
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36',
                  'Referer': 'https://t.co/'
                }
              };

              // Visit 3: QR scan referral on Android Firefox (mobile)
              const hit3 = {
                path: `/api/verify/${verificationCode}?ref=qr`,
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Android 13; Mobile; rv:109.0) Gecko/113.0 Firefox/113.0'
                }
              };

              // Visit 4: Direct hit on Desktop Mac Safari (desktop)
              const hit4 = {
                path: `/api/verify/${verificationCode}`,
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Safari/605.1.15'
                }
              };

              // Visit 5: Offline referral on Android Chrome (mobile)
              const hit5 = {
                path: `/api/verify/${verificationCode}?ref=offline`,
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36'
                }
              };

              const hits = [hit1, hit2, hit3, hit4, hit5];
              let hitsCompleted = 0;

              hits.forEach((hit, idx) => {
                simulateVerifyHit(hit.path, hit.headers, (status, body) => {
                  console.log(`Hit ${idx + 1} status: ${status}`);
                  hitsCompleted++;
                  
                  if (hitsCompleted === hits.length) {
                    console.log('\nWaiting for asynchronous MongoDB writes to complete...');
                    setTimeout(() => {
                      console.log('\n8. Checking aggregated verification analytics...');
                      getJSON('/api/certificates/verification-analytics', tokenCookie, (status, resBody) => {
                        console.log('Analytics status:', status);
                        const result = JSON.parse(resBody);
                        console.log('Analytics response:\n', JSON.stringify(result, null, 2));

                        // Asserts
                        if (status !== 200) {
                          console.error('FAIL: Fetching analytics failed!');
                          process.exit(1);
                        }

                        const data = result.data;

                        if (data.totalVerifications < 5) {
                          console.error(`FAIL: Expected total verifications >= 5, got ${data.totalVerifications}`);
                          process.exit(1);
                        }

                        if (data.referrals.linkedin < 1 || data.referrals.twitter < 1 || data.referrals.qr < 1 || data.referrals.direct < 1 || data.referrals.offline < 1) {
                          console.error('FAIL: Referral distribution count is incorrect!', data.referrals);
                          process.exit(1);
                        }

                        if (data.devices.desktop < 2 || data.devices.mobile < 3) {
                          console.error('FAIL: Device breakdown count is incorrect!', data.devices);
                          process.exit(1);
                        }

                        if (!Array.isArray(data.recentAudits) || data.recentAudits.length < 5) {
                          console.error('FAIL: Recent audits list should have at least 5 logs!', data.recentAudits);
                          process.exit(1);
                        }

                        // Verify audits data populated correctly
                        const audit = data.recentAudits[0];
                        if (!audit.verificationCode || !audit.recipientName || !audit.eventName || !audit.referralSource || !audit.browser || !audit.os || !audit.deviceType || !audit.timestamp) {
                          console.error('FAIL: Missing populated properties on recentAudits log!', audit);
                          process.exit(1);
                        }

                        console.log('\nAll Phase 6 Verification Analytics E2E tests passed successfully! 🏁📊🚀');
                        process.exit(0);
                      });
                    }, 1000);
                  }
                });
              });
            });
          });
        });
      });
    });
  });
});

// Polling Helper
function waitForStatus(certId, targetStatus, retriesLeft, tokenCookie, cb) {
  if (retriesLeft <= 0) {
    console.error(`FAIL: Timed out waiting for status "${targetStatus}" for certificate ${certId}`);
    process.exit(1);
  }
  setTimeout(() => {
    getJSON(`/api/certificates/${certId}`, tokenCookie, (status, resBody) => {
      const res = JSON.parse(resBody);
      if (res.data.status === targetStatus) {
        cb();
      } else {
        console.log(`Checking status: current is "${res.data.status}", waiting for "${targetStatus}"... (${retriesLeft} retries left)`);
        waitForStatus(certId, targetStatus, retriesLeft - 1, tokenCookie, cb);
      }
    });
  }, 1000);
}

// HTTP Helpers

function postJSON(path, data, cookie, cb) {
  const headers = {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  };
  if (cookie) {
    headers['Cookie'] = cookie;
  }

  const req = http.request({
    hostname: 'localhost',
    port: 80,
    path: path,
    method: 'POST',
    headers: headers
  }, res => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => cb(res.statusCode, body, res.headers['set-cookie'] || []));
  });
  req.on('error', e => console.error('Req error:', e));
  req.write(data);
  req.end();
}

function putJSON(path, data, cookie, cb) {
  const req = http.request({
    hostname: 'localhost',
    port: 80,
    path: path,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
      'Cookie': cookie
    }
  }, res => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => cb(res.statusCode, body));
  });
  req.on('error', e => console.error('Req error:', e));
  req.write(data);
  req.end();
}

function getJSON(path, cookie, cb) {
  const req = http.request({
    hostname: 'localhost',
    port: 80,
    path: path,
    method: 'GET',
    headers: {
      'Cookie': cookie
    }
  }, res => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => cb(res.statusCode, body));
  });
  req.on('error', e => console.error('Req error:', e));
  req.end();
}

function postJSONWithBearer(path, data, apiKey, cb) {
  const req = http.request({
    hostname: 'localhost',
    port: 80,
    path: path,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
      'Authorization': `Bearer ${apiKey}`
    }
  }, res => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => cb(res.statusCode, body));
  });
  req.on('error', e => console.error('Req error:', e));
  req.write(data);
  req.end();
}

function simulateVerifyHit(path, headers, cb) {
  const req = http.request({
    hostname: 'localhost',
    port: 80,
    path: path,
    method: 'GET',
    headers: headers
  }, res => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => cb(res.statusCode, body));
  });
  req.on('error', e => console.error('Verify hit error:', e));
  req.end();
}
