const http = require('http');
const fs = require('fs');
const path = require('path');

let tokenCookie = null;
let templateId = null;
let eventId = null;
let certId = null;
let fontId = null;

const email = `fonts-test-${Date.now()}@org.com`;
const registerData = JSON.stringify({
  orgName: 'Collegiate Fonts Org',
  name: 'Fonts Tester',
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

      // Now, let's upload a custom font
      console.log('\n4. Reading a local TTF file and uploading it as "Crimson College" custom font...');
      
      const fontSourcePath = path.join(__dirname, '../backend/storage/fonts/Inter-normal.ttf');
      if (!fs.existsSync(fontSourcePath)) {
        console.error(`FAIL: Local font source not found at ${fontSourcePath}`);
        process.exit(1);
      }
      
      const fontBuffer = fs.readFileSync(fontSourcePath);
      const boundary = '----WebKitFormBoundaryFontTest';
      const name = 'Crimson College';
      const fontWeight = 'normal';

      const parts = [
        `--${boundary}\r\nContent-Disposition: form-data; name="name"\r\n\r\n${name}\r\n`,
        `--${boundary}\r\nContent-Disposition: form-data; name="fontWeight"\r\n\r\n${fontWeight}\r\n`,
        `--${boundary}\r\nContent-Disposition: form-data; name="fontFile"; filename="CrimsonCollege-normal.ttf"\r\nContent-Type: font/ttf\r\n\r\n`,
        fontBuffer,
        `\r\n--${boundary}--\r\n`
      ];

      const bodyBuffer = Buffer.concat(parts.map(p => typeof p === 'string' ? Buffer.from(p) : p));

      uploadFont(bodyBuffer, boundary, tokenCookie, (uploadStatus, uploadBody) => {
        console.log('Upload status:', uploadStatus);
        console.log('Upload response:', uploadBody);

        const uploadResult = JSON.parse(uploadBody);
        if (uploadStatus !== 201 || !uploadResult.success) {
          console.error('FAIL: Custom font upload failed!');
          process.exit(1);
        }

        fontId = uploadResult.data.id;
        const fontFamily = uploadResult.data.family;
        console.log(`SUCCESS! Uploaded Font ID: ${fontId}, Family: ${fontFamily}`);

        // Fetch custom fonts list to verify GET endpoint
        console.log('\n5. Verifying custom fonts GET list endpoint...');
        getJSON('/api/custom-fonts', tokenCookie, (listFontsStatus, listFontsBody) => {
          const listFontsResult = JSON.parse(listFontsBody);
          console.log('Fonts list body:', listFontsBody);
          if (listFontsStatus !== 200 || listFontsResult.data.length === 0) {
            console.error('FAIL: Listing custom fonts failed!');
            process.exit(1);
          }

          // Modify our template text layer to use "CrimsonCollege" font
          console.log('\n6. Modifying template layers to use our custom collegiate font...');
          const updateData = JSON.stringify({
            textLayers: [
              {
                variable: 'recipient_name',
                label: 'Recipient Name',
                x: 528,
                y: 300,
                fontSize: 44,
                fontFamily: fontFamily, // "CrimsonCollege"
                fontWeight: 'normal',
                color: '#1a1a1a',
                textAlign: 'center'
              }
            ]
          });

          putJSON(`/api/templates/${templateId}`, updateData, tokenCookie, (updateStatus, updateBody) => {
            console.log('Template update status:', updateStatus);

            // Create event using this template
            console.log('\n7. Creating event linked to custom-font template...');
            const eventData = JSON.stringify({
              name: 'Custom Font Graduation',
              date: new Date().toISOString(),
              organizerName: 'Crimson Registrar',
              templateId: templateId
            });

            postJSON('/api/events', eventData, tokenCookie, (status, resBody) => {
              const eventResult = JSON.parse(resBody);
              eventId = eventResult.data.id;
              console.log('Event ID:', eventId);

              // Turn on Developer REST API to issue certificates
              console.log('\n8. Activating REST API to get API Key...');
              putJSON('/api/integrations/rest-api', JSON.stringify({ connected: true }), tokenCookie, (status, resBody) => {
                const restResult = JSON.parse(resBody);
                const apiKey = restResult.data.apiKey;
                console.log('API Key:', apiKey);

                // Issue certificate
                console.log('\n9. Issuing a certificate under custom font event...');
                const issueData = JSON.stringify({
                  eventId: eventId,
                  name: 'Elite Graduate',
                  email: 'graduate@crimson.edu'
                });

                postJSONWithBearer('/api/v1/certificates', issueData, apiKey, (status, resBody) => {
                  console.log('Issuance status:', status);
                  const certResult = JSON.parse(resBody);
                  certId = certResult.data.id;

                  // Polling: Wait for background worker to render using CrimsonCollege font
                  console.log('\n10. Waiting for worker to process and generate certificate...');
                  waitForStatus(certId, 'generated', 15, tokenCookie, () => {
                    
                    // Fetch certificate and verify details
                    getJSON(`/api/certificates/${certId}`, tokenCookie, (status, resBody) => {
                      const finalResult = JSON.parse(resBody);
                      console.log('Final certificate status:', finalResult.data.status);
                      
                      if (finalResult.data.status !== 'generated') {
                        console.error('FAIL: Certificate was not generated successfully with custom font!');
                        process.exit(1);
                      }

                      console.log('\nAll Phase 7 Custom Font Uploads E2E tests passed successfully! 🏁🔤🎓🚀');
                      process.exit(0);
                    });
                  });
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
