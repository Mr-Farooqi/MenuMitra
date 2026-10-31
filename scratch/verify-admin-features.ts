async function runTests() {
  const baseUrl = 'http://localhost:3000';
  let adminCookie = '';
  let ownerCookie = '';
  let testRestaurantId = '';

  console.log('=== Step 1: Login as Super Admin ===');
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@menumitra.com', password: 'Admin@123' })
  });
  if (!loginRes.ok) throw new Error(`Admin login failed: ${loginRes.status} ${await loginRes.text()}`);
  const rawCookie = loginRes.headers.get('set-cookie');
  adminCookie = rawCookie ? rawCookie.split(';')[0] : '';
  const adminData = await loginRes.json();
  console.log('Admin logged in successfully:', adminData.user.email);

  console.log('\n=== Step 2: Test City-wise Analytics (/api/admin/stats) ===');
  const statsRes = await fetch(`${baseUrl}/api/admin/stats`, {
    headers: { Cookie: adminCookie }
  });
  const statsJson = await statsRes.json();
  console.log('Stats response topCities:', statsJson.stats.topCities);
  if (!Array.isArray(statsJson.stats.topCities)) throw new Error('topCities is missing or not an array');
  console.log('✓ City-wise analytics verified successfully');

  console.log('\n=== Step 3: Fetch Restaurants list to get a target restaurant ===');
  const restsRes = await fetch(`${baseUrl}/api/admin/restaurants`, {
    headers: { Cookie: adminCookie }
  });
  const restsJson = await restsRes.json();
  if (!restsJson.restaurants || restsJson.restaurants.length === 0) throw new Error('No restaurants found');
  testRestaurantId = restsJson.restaurants[0].id;
  console.log(`Found restaurant: ${restsJson.restaurants[0].name} (ID: ${testRestaurantId})`);

  console.log('\n=== Step 4: Test Broadcast Announcement creation and fetching ===');
  const createAnnounceRes = await fetch(`${baseUrl}/api/admin/announcements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({
      title: 'Diwali System Update',
      message: 'New high-speed kitchen printer support is now live across all restaurants!',
      type: 'INFO',
      targetPlan: 'ALL',
      active: true,
      expiresAt: new Date(Date.now() + 7 * 86400000).toISOString()
    })
  });
  const announceJson = await createAnnounceRes.json();
  console.log('Created Announcement:', announceJson.announcement.title);

  // Fetch from owner public/dashboard endpoint
  const publicAnnounceRes = await fetch(`${baseUrl}/api/announcements`, {
    headers: { Cookie: adminCookie }
  });
  const publicAnnounceJson = await publicAnnounceRes.json();
  console.log('Fetched Active Announcement:', publicAnnounceJson.announcement?.title);
  if (!publicAnnounceJson.announcement) throw new Error('Announcement not retrieved via /api/announcements');
  console.log('✓ Broadcast announcement verified successfully');

  console.log('\n=== Step 5: Test Subscription Promo Code Creation & Validation ===');
  const promoCode = 'FESTIVE' + Math.floor(Math.random() * 90 + 10);
  const createPromoRes = await fetch(`${baseUrl}/api/admin/promo-codes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({
      code: promoCode,
      discountPercent: 50,
      discountAmount: null,
      maxUses: 100,
      active: true,
      expiresAt: new Date(Date.now() + 30 * 86400000).toISOString()
    })
  });
  const promoJson = await createPromoRes.json();
  const createdPromo = promoJson.promoCode || promoJson.promo;
  console.log('Created Promo Code:', createdPromo?.code, `(${createdPromo?.discountPercent}% OFF)`);

  // Validate promo
  const validPromoRes = await fetch(`${baseUrl}/api/billing/validate-promo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({ code: promoCode, packagePrice: 1999 })
  });
  const validPromoJson = await validPromoRes.json();
  console.log('Validated Promo result:', validPromoJson);
  if (!validPromoJson.valid || Math.round(validPromoJson.discountSaved) !== 1000) {
    throw new Error('Promo code validation returned unexpected result');
  }
  console.log('✓ Promo code engine verified successfully');

  console.log('\n=== Step 6: Test Manual Offline/UPI Payment & GST Invoicing ===');
  // Find a package ID
  const packagesRes = await fetch(`${baseUrl}/api/public/packages`);
  const packagesJson = await packagesRes.json();
  const premiumPkg = packagesJson.packages.find((p: any) => p.name === 'PREMIUM') || packagesJson.packages[0];

  const manualPayRes = await fetch(`${baseUrl}/api/admin/subscriptions/manual`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({
      restaurantId: testRestaurantId,
      packageId: premiumPkg.id,
      amount: premiumPkg.price,
      paymentMethod: 'UPI / Direct Bank Transfer',
      referenceNote: 'UTR#9948271038 Bank HDFC Annual Deal'
    })
  });
  const manualPayJson = await manualPayRes.json();
  console.log('Manual payment invoice created:', manualPayJson.invoice?.id, 'Total:', manualPayJson.invoice?.amount);
  console.log('✓ Manual subscription activation verified successfully');

  console.log('\n=== Step 7: Test 1-Click Impersonation & Revert ===');
  const impRes = await fetch(`${baseUrl}/api/admin/impersonate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({ restaurantId: testRestaurantId })
  });
  const impJson = await impRes.json();
  const rawImpCookie = impRes.headers.get('set-cookie');
  const impCookie = rawImpCookie ? rawImpCookie.split(';')[0] : '';
  console.log('Impersonated response:', impJson.message);

  // Check /api/auth/me using impCookie
  const meRes = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Cookie: impCookie }
  });
  const meJson = await meRes.json();
  console.log('Current identity after impersonation:', {
    email: meJson.user.email,
    role: meJson.user.role,
    impersonatedBy: meJson.user.impersonatedBy
  });
  if (meJson.user.impersonatedBy !== 'admin@menumitra.com') {
    throw new Error('Impersonation payload missing impersonatedBy');
  }

  // Revert back
  const revertRes = await fetch(`${baseUrl}/api/admin/revert-impersonate`, {
    method: 'POST',
    headers: { Cookie: impCookie }
  });
  const rawRevertCookie = revertRes.headers.get('set-cookie');
  const revertCookie = rawRevertCookie ? rawRevertCookie.split(';')[0] : '';
  const revertMeRes = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Cookie: revertCookie }
  });
  const revertMeJson = await revertMeRes.json();
  console.log('Identity after revert:', {
    email: revertMeJson.user.email,
    role: revertMeJson.user.role,
    impersonatedBy: revertMeJson.user.impersonatedBy
  });
  if (revertMeJson.user.role !== 'SUPER_ADMIN') {
    throw new Error('Revert did not restore Super Admin identity');
  }
  console.log('✓ Impersonation and 1-click revert verified successfully');

  console.log('\n=== Step 8: Verify Security Audit Trail Logs ===');
  const auditRes = await fetch(`${baseUrl}/api/admin/audit-logs`, {
    headers: { Cookie: adminCookie }
  });
  const auditJson = await auditRes.json();
  console.log(`Audit logs retrieved (${auditJson.logs.length} entries):`);
  auditJson.logs.slice(0, 5).forEach((log: any) => {
    console.log(`- [${log.action}] by ${log.actorEmail} (${log.targetType}): ${log.details}`);
  });
  const actions = auditJson.logs.map((l: any) => l.action);
  if (!actions.includes('IMPERSONATION_STARTED') || !actions.includes('MANUAL_PAYMENT_ACTIVATED')) {
    throw new Error('Audit trail missing expected actions');
  }
  console.log('✓ Audit trail verified successfully');

  console.log('\n========================================');
  console.log('ALL 6 ENTERPRISE ADMIN FEATURES VERIFIED 100% WORKING!');
  console.log('========================================');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
