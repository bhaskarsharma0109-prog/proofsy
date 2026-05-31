/**
 * Generate LinkedIn "Add to Profile" certification URL
 * @see https://www.linkedin.com/pulse/how-add-certificate-your-linkedin-profile-using-url-parameters
 */
function generateLinkedInAddUrl({ certName, orgName, issueDate, certUrl, certId, expirationDate }) {
  const params = new URLSearchParams();
  params.set("startTask", "CERTIFICATION_NAME");
  params.set("name", certName || "Certificate");
  params.set("organizationName", orgName || "Proofsy");
  
  if (issueDate) {
    const d = new Date(issueDate);
    params.set("issueYear", String(d.getFullYear()));
    params.set("issueMonth", String(d.getMonth() + 1));
  }
  
  if (expirationDate) {
    const d = new Date(expirationDate);
    params.set("expirationYear", String(d.getFullYear()));
    params.set("expirationMonth", String(d.getMonth() + 1));
  }
  
  if (certUrl) params.set("certUrl", certUrl);
  if (certId) params.set("certId", certId);
  
  return `https://www.linkedin.com/profile/add?${params.toString()}`;
}

module.exports = { generateLinkedInAddUrl };
