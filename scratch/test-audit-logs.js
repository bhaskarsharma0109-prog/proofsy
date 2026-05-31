const http = require('http');
const fs = require('fs');
const path = require('path');

let tokenCookie = null;
let templateId = null;
let eventId = null;
let certId = null;
let fontId = null;

const email = `audit-test-${Date.now()}@college.edu`;
const registerData = JSON.stringify({
  orgName: 'Faculty Compliance College',
  name: 'Dean Audit Registrar',
  email: email,
  password: 'password123'
});

console.log('1. Registering Dean administrative user...');
postJSON('/api/auth/register', registerData, null, (status, resBody, cookies) => {
  if (status !== 201) {
    console.error('Registration failed:', resBody);
    process.exit(1);
  }
  
  tokenCookie = cookies.find(c => c.startsWith('token=')).split(';')[0];
  console.log('Success! Dean Session Token:', tokenCookie);

  console.log('\n2. Seeding starter templates to new college workspace...');
  postJSON('/api/templates/seed', '{}', null, (seedStatus, seedBody) => {
    console.log('Seed Status:', seedStatus);

    console.log('\n3. Fetching templates to get template ID...');
    getJSON('/api/templates', tokenCookie, (listStatus, listBody) => {
      const listResult = JSON.parse(listBody);
      templateId = listResult.data[0].id;
      console.log('Selected Template ID:', templateId);

      // Trigger "template_updated" by updating template text layers
      console.log('\n4. Modifying template layers to trigger "template_updated" audit log...');
      const updateData = JSON.stringify({
        name: 'Compliant Appraisal Template',
        textLayers: [
          {
            variable: 'recipient_name',
            label: 'Recipient Name',
            x: 528,
            y: 300,
            fontSize: 44,
            fontFamily: 'Inter',
            fontWeight: 'normal',
            color: '#2563eb',
            textAlign: 'center'
          }
        ]
      });

      putJSON(`/api/templates/${templateId}`, updateData, tokenCookie, (updateStatus, updateBody) => {
        console.log('Template update status:', updateStatus);
        if (updateStatus !== 200) {
          console.error('Template update failed:', updateBody);
          process.exit(1);
        }

        // Trigger "event_created" by creating graduation event
        console.log('\n5. Creating event linked to template to trigger "event_created" audit log...');
        const eventData = JSON.stringify({
          name: 'Annual convocation 2026',
          date: new Date().toISOString(),
          organizerName: 'Office of the Dean',
          templateId: templateId
        });

        postJSON('/api/events', eventData, tokenCookie, (eventStatus, eventBody) => {
          console.log('Event creation status:', eventStatus);
          const eventResult = JSON.parse(eventBody);
          eventId = eventResult.data.id;
          console.log('Event ID:', eventId);

          // Activate REST API & issue certificate programmatically
          console.log('\n6. Enabling Developer REST API to fetch API Key...');
          putJSON('/api/integrations/rest-api', JSON.stringify({ connected: true }), tokenCookie, (status, resBody) => {
            const restResult = JSON.parse(resBody);
            const apiKey = restResult.data.apiKey;
            console.log('API Key:', apiKey);

            // Trigger "certificate_issued" via Developer API
            console.log('\n7. Issuing certificate via REST API to trigger "certificate_issued" audit log...');
            const issueData = JSON.stringify({
              eventId: eventId,
              name: 'Bright Graduate',
              email: 'graduate@dean.edu'
            });

            postJSONWithBearer('/api/v1/certificates', issueData, apiKey, (issueStatus, issueBody) => {
              console.log('API Issuance status:', issueStatus);
              const certResult = JSON.parse(issueBody);
              certId = certResult.data.id;
              console.log('Issued Certificate ID:', certId);

              // Upload custom font to trigger "font_uploaded"
              console.log('\n8. Uploading custom font to trigger "font_uploaded" audit log...');
              const fontSourcePath = path.join(__dirname, '../backend/storage/fonts/Inter-normal.ttf');
              if (!fs.existsSync(fontSourcePath)) {
                console.error(`FAIL: Local font source not found at ${fontSourcePath}`);
                process.exit(1);
              }
              
              const fontBuffer = fs.readFileSync(fontSourcePath);
              const boundary = '----WebKitFormBoundaryFontTest';
              const name = 'Compliance Sans';
              const fontWeight = 'normal';

              const parts = [
                `--${boundary}\r\nContent-Disposition: form-data; name="name"\r\n\r\n${name}\r\n`,
                `--${boundary}\r\nContent-Disposition: form-data; name="fontWeight"\r\n\r\n${fontWeight}\r\n`,
                `--${boundary}\r\nContent-Disposition: form-data; name="fontFile"; filename="ComplianceSans-normal.ttf"\r\nContent-Type: font/ttf\r\n\r\n`,
                fontBuffer,
                `\r\n--${boundary}--\r\n`
              ];

              const bodyBuffer = Buffer.concat(parts.map(p => typeof p === 'string' ? Buffer.from(p) : p));

              uploadFont(bodyBuffer, boundary, tokenCookie, (uploadStatus, uploadBody) => {
                console.log('Upload status:', uploadStatus);
                const uploadResult = JSON.parse(uploadBody);
                fontId = uploadResult.data.id;
                console.log(`Font ID uploaded: ${fontId}`);

                // Assert and verify audit logs GET endpoint!
                console.log('\n9. Fetching workspace compliance audit ledger logs to verify accuracy...');
                getJSON('/api/audit-logs', tokenCookie, (auditStatus, auditBody) => {
                  console.log('Audit logs GET status:', auditStatus);
                  const auditResult = JSON.parse(auditBody);
                  
                  console.log('\n--- RETRIEVED AUDIT LOGS TIMELINE ---');
                  auditResult.data.forEach((log, i) => {
                    console.log(`[Log ${i + 1}] Action: ${log.action} | Operator: ${log.actorEmail} | Description: ${log.description}`);
                  });
                  console.log('-------------------------------------\n');

                  if (auditStatus !== 200 || !auditResult.success) {
                    console.error('FAIL: Audit logs query failed!');
                    process.exit(1);
                  }

                  const actions = auditResult.data.map(l => l.action);

                  // Assert that our critical operations are present in logs
                  const requiredActions = [
                    'font_uploaded',
                    'certificate_issued',
                    'rest_api_toggled',
                    'event_created',
                    'template_updated'
                  ];

                  let allFound = true;
                  for (const reqAction of requiredActions) {
                    if (actions.includes(reqAction)) {
                      console.log(`✓ Verified logged action: "${reqAction}"`);
                    } else {
                      console.error(`FAIL: Missing required logged action: "${reqAction}"`);
                      allFound = false;
                    }
                  }

                  // Verify operator details
                  const operatorEmails = auditResult.data.map(l => l.actorEmail);
                  const allEmailsMatch = operatorEmails.every(email => email === 'api-key@proofsy.io' || email === registerData.email);

                  if (allFound) {
                    console.log('\nAll Phase 8 College Compliance Audit E2E tests passed successfully! 🏁📋🎓🚀');
                    process.exit(0);
                  } else {
                    console.error('FAIL: Missing compliance actions in logged database!');
                    process.exit(1);
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

// HTTP Helpers

function postJSON(path, data, cookie, cb) {
  const req = http.request({
    hostname: 'localhost',
    port: 80,
    path: path,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
      'Cookie': cookie
    }
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

function uploadFont(bodyBuffer, boundary, cookie, cb) {
  const req = http.request({
    hostname: 'localhost',
    port: 80,
    path: '/api/custom-fonts',
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': bodyBuffer.length,
      'Cookie': cookie
    }
  }, res => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => cb(res.statusCode, body));
  });
  req.on('error', e => console.error('Upload font error:', e));
  req.write(bodyBuffer);
  req.end();
}
