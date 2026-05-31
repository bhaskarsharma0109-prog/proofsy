const http = require('http');
const { PDFDocument } = require('pdf-lib');

let tokenCookie = null;
let templateId = null;
let eventId = null;
let certId = null;

const email = `sig-test-${Date.now()}@org.com`;
const registerData = JSON.stringify({
  orgName: 'Signature Verification Org',
  name: 'Sig Tester',
  email: email,
  password: 'password123'
});

console.log('1. Registering user/org...');
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
        name: 'Cryptographic Signing Event',
        date: new Date().toISOString(),
        organizerName: 'System Integrity',
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

          // Issue certificate
          console.log('\n6. Issuing a certificate...');
          const issueData = JSON.stringify({
            eventId: eventId,
            name: 'Sig Student',
            email: 'student@signature.com'
          });

          postJSONWithBearer('/api/v1/certificates', issueData, apiKey, (status, resBody) => {
            console.log('Issuance status:', status);
            const certResult = JSON.parse(resBody);
            certId = certResult.data.id;

            // Polling: Wait for certificate to generate
            console.log('\nWaiting for certificate to generate...');
            waitForStatus(certId, 'generated', 15, tokenCookie, () => {
              
              // Get certificate details
              getJSON(`/api/certificates/${certId}`, tokenCookie, (status, resBody) => {
                const checkResult = JSON.parse(resBody);
                const cert = checkResult.data;
                const pdfUrl = cert.pdfUrl;
                const pngUrl = cert.pngUrl;
                const svgUrl = cert.svgUrl;
                const signature = cert.cryptographicSignature;
                const verificationCode = cert.verificationCode;

                console.log(`\n7. Certificate generated!`);
                console.log(`- PDF URL: ${pdfUrl}`);
                console.log(`- PNG URL: ${pngUrl}`);
                console.log(`- SVG URL: ${svgUrl}`);
                console.log(`- Signature (base64): ${signature ? signature.substring(0, 32) + '...' : 'NULL'}`);
                console.log(`- Verification Code: ${verificationCode}`);

                if (!signature) {
                  console.error('FAIL: No signature found in certificate document!');
                  process.exit(1);
                }

                if (!pngUrl || !svgUrl) {
                  console.error('FAIL: No pngUrl or svgUrl returned in certificate details!');
                  process.exit(1);
                }

                // 8. Download PDF and parse it using pdf-lib
                console.log('\n8. Downloading certificate PDF...');
                downloadPDF(pdfUrl, async (pdfBuffer) => {
                  try {
                    console.log('PDF downloaded successfully. Size:', pdfBuffer.length, 'bytes');
                    
                    const pdfDoc = await PDFDocument.load(pdfBuffer);
                    const subject = pdfDoc.getSubject();
                    const keywords = pdfDoc.getKeywords();

                    console.log('PDF Metadata Subject:', subject);
                    console.log('PDF Metadata Keywords:', keywords);

                    if (!subject) {
                      console.error('FAIL: No Subject found in PDF properties!');
                      process.exit(1);
                    }

                    // Subject should be a deterministic JSON payload
                    const payload = JSON.parse(subject);
                    if (payload.verificationCode !== verificationCode || payload.recipientName !== 'Sig Student') {
                      console.error('FAIL: PDF Metadata Subject mismatch!', payload);
                      process.exit(1);
                    }
                    console.log('SUCCESS: PDF Metadata Subject matches certificate payload.');

                    // Keywords should contain the signature
                    if (!keywords || !keywords.includes(signature)) {
                      console.error('FAIL: PDF Metadata Keywords does not contain the signature!', keywords);
                      process.exit(1);
                    }
                    console.log('SUCCESS: PDF Metadata Keywords contains the exact cryptographic signature.');

                    // Download and verify PNG asset
                    console.log('\nDownloading certificate PNG...');
                    downloadPDF(pngUrl, (pngBuffer) => {
                      console.log('PNG downloaded successfully. Size:', pngBuffer.length, 'bytes');
                      if (pngBuffer.length < 5000) {
                        console.error('FAIL: PNG image file is too small or invalid!', pngBuffer.length);
                        process.exit(1);
                      }
                      console.log('SUCCESS: PNG downloaded and size verified.');

                      // Download and verify SVG asset
                      console.log('\nDownloading certificate SVG...');
                      downloadPDF(svgUrl, (svgBuffer) => {
                        console.log('SVG downloaded successfully. Size:', svgBuffer.length, 'bytes');
                        if (svgBuffer.length < 1000) {
                          console.error('FAIL: SVG vector file is too small or invalid!', svgBuffer.length);
                          process.exit(1);
                        }
                        const svgStr = svgBuffer.toString();
                        if (!svgStr.includes('<svg') || !svgStr.includes(verificationCode)) {
                          console.error('FAIL: SVG content does not match correct vector schema!', svgStr.substring(0, 100));
                          process.exit(1);
                        }
                        console.log('SUCCESS: SVG downloaded and vector schema verified.');

                        // 9. Call verify API
                        console.log('\n9. Verifying signature via verify API portal...');
                        getJSON(`/api/verify/${verificationCode}`, null, (verifyStatus, verifyBody) => {
                          const verifyResult = JSON.parse(verifyBody);
                          console.log('Verify API Response:', JSON.stringify(verifyResult, null, 2));

                          if (!verifyResult.success || !verifyResult.data.isValid) {
                            console.error('FAIL: Verification API returned invalid!');
                            process.exit(1);
                          }

                          const verifyCert = verifyResult.data.certificate;
                          if (!verifyCert.isCryptographicallyVerified || verifyCert.cryptographicSignature !== signature) {
                            console.error('FAIL: Verification API isCryptographicallyVerified or signature mismatch!', verifyCert);
                            process.exit(1);
                          }

                          if (!verifyCert.pngUrl || !verifyCert.svgUrl) {
                            console.error('FAIL: Verification API did not return pngUrl or svgUrl!', verifyCert);
                            process.exit(1);
                          }

                          console.log('\nAll PDF, PNG, and SVG Cryptographic Dynamic Export E2E tests passed successfully! 🎓🖼️ vector🔒🏁');
                          process.exit(0);
                        });
                      });
                    });
                  } catch (parseErr) {
                    console.error('FAIL: Error parsing PDF with pdf-lib:', parseErr);
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
    port: 80, // Request via Nginx proxy on port 80
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
    port: 80, // Request via Nginx proxy on port 80
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
  const headers = {};
  if (cookie) {
    headers['Cookie'] = cookie;
  }

  const req = http.request({
    hostname: 'localhost',
    port: 80, // Request via Nginx proxy on port 80
    path: path,
    method: 'GET',
    headers: headers
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
    port: 80, // Request via Nginx proxy on port 80
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

function downloadPDF(pdfUrl, cb) {
  const req = http.request({
    hostname: 'localhost',
    port: 80,
    path: pdfUrl,
    method: 'GET'
  }, res => {
    const chunks = [];
    res.on('data', chunk => chunks.push(chunk));
    res.on('end', () => {
      const buffer = Buffer.concat(chunks);
      cb(buffer);
    });
  });
  req.on('error', e => console.error('Download error:', e));
  req.end();
}
