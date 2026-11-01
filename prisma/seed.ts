import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting MenuMitra database seeding...");

  // Clean existing records in sequence
  await prisma.scanEvent.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.reviewSubmission.deleteMany();
  await prisma.rewardRule.deleteMany();
  await prisma.reviewSettings.deleteMany();
  await prisma.websiteConfig.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.table.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.menuCategory.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.supportTicket.deleteMany();
  await prisma.user.deleteMany();
  await prisma.restaurant.deleteMany();
  await prisma.package.deleteMany();

  console.log("Cleared old records.");

  // 1. Create Packages
  const basicPkg = await prisma.package.create({
    data: {
      name: "BASIC",
      slug: "basic",
      price: 499,
      features: JSON.stringify(["menu", "qr"]),
      description: "Digital Menu & Smart QR codes for contactless dining",
      active: true,
    },
  });

  const standardPkg = await prisma.package.create({
    data: {
      name: "STANDARD",
      slug: "standard",
      price: 1499,
      features: JSON.stringify(["menu", "qr", "website", "orders"]),
      description: "Menu + Branded Website + Online Table Ordering & Kitchen Kanban",
      active: true,
    },
  });

  const premiumPkg = await prisma.package.create({
    data: {
      name: "PREMIUM",
      slug: "premium",
      price: 2999,
      features: JSON.stringify(["menu", "qr", "website", "orders", "reviewReward"]),
      description: "All-in-one Growth Suite with Google Review Scratch & Win rewards",
      active: true,
    },
  });

  console.log("✅ Packages created: Basic, Standard, Premium");

  // 2. Create Super Admin User
  const adminPasswordHash = await bcrypt.hash("Admin@123", 10);
  const superAdmin = await prisma.user.create({
    data: {
      name: "Platform Administrator",
      email: "admin@menumitra.com",
      passwordHash: adminPasswordHash,
      role: "SUPER_ADMIN",
    },
  });
  console.log(`✅ Super Admin created: ${superAdmin.email}`);

  // 3. Create Demo Premium Restaurant: Tandoori Nights
  const restaurant = await prisma.restaurant.create({
    data: {
      name: "Tandoori Nights",
      slug: "tandoori-nights",
      packageId: premiumPkg.id,
      phone: "+91 98765 43210",
      address: "45, Khau Galli, Opp. Royal Plaza, MG Road",
      city: "Mumbai, Maharashtra",
      timings: "12:00 PM - 11:30 PM (Mon-Sun)",
      googleReviewLink: "https://g.page/r/demo-tandoori-nights/review",
      logo: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&auto=format&fit=crop&q=80",
      cover: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop&q=80",
      status: "ACTIVE",
    },
  });
  console.log(`✅ Demo Restaurant created: ${restaurant.name} (${restaurant.slug})`);

  // 4. Create Demo Owner User
  const ownerPasswordHash = await bcrypt.hash("Owner@123", 10);
  const owner = await prisma.user.create({
    data: {
      name: "Vikram Oberoi",
      email: "owner@tandoorinights.com",
      passwordHash: ownerPasswordHash,
      role: "OWNER",
      restaurantId: restaurant.id,
    },
  });
  console.log(`✅ Demo Owner created: ${owner.email}`);

  // 5. Create Review Settings
  await prisma.reviewSettings.create({
    data: {
      restaurantId: restaurant.id,
      popupEnabled: true,
      popupDelaySeconds: 6,
      autoApprove: true,
      cooldownDays: 30,
      minBill: 250,
      googleReviewLink: "https://g.page/r/demo-tandoori-nights/review",
    },
  });

  // 6. Create Website Config
  await prisma.websiteConfig.create({
    data: {
      restaurantId: restaurant.id,
      template: "MODERN",
      published: true,
      sections: JSON.stringify({
        hero: {
          headline: "Authentic North Indian Charcoal Flavours in Mumbai",
          subheadline: "Experience wood-fired kebabs, slow-simmered curries, and warm hospitality since 2012.",
          ctaText: "Explore Our Menu",
          badge: "Awarded Best Mughlai 2024",
        },
        about: {
          title: "Our Culinary Story",
          story: "Founded by Master Chef Vikram Oberoi, Tandoori Nights was born from a passion for authentic Punjabi and Awadhi dum cooking. Every single spice is hand-roasted in-house, and our black lentils simmer for 24 slow hours over glowing charcoal.",
          signatureDish: "24-Hour Charcoal Dal Makhani Royale",
        },
        hours: {
          weekday: "12:00 PM – 11:30 PM",
          weekend: "11:30 AM – 12:00 Midnight",
          note: "Happy Hours: 4 PM to 7 PM on weekdays",
        },
        contact: {
          phone: "+91 98765 43210",
          email: "reservations@tandoorinights.in",
          address: "45, Khau Galli, Opp. Royal Plaza, MG Road, Mumbai 400001",
        },
        gallery: [
          "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&auto=format&fit=crop&q=80",
          "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=600&auto=format&fit=crop&q=80",
          "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&auto=format&fit=crop&q=80",
          "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop&q=80",
        ],
      }),
    },
  });

  // 7. Create Tables 1 to 8
  for (let i = 1; i <= 8; i++) {
    await prisma.table.create({
      data: {
        restaurantId: restaurant.id,
        number: i,
      },
    });
  }

  // 8. Create Menu Categories
  const catStarters = await prisma.menuCategory.create({
    data: {
      restaurantId: restaurant.id,
      name: "Chatori Dilli Starters",
      order: 0,
    },
  });

  const catTandoor = await prisma.menuCategory.create({
    data: {
      restaurantId: restaurant.id,
      name: "Tandoor & Kebabs",
      order: 1,
    },
  });

  const catCurries = await prisma.menuCategory.create({
    data: {
      restaurantId: restaurant.id,
      name: "Shahi Curries & Biryani",
      order: 2,
    },
  });

  const catDesserts = await prisma.menuCategory.create({
    data: {
      restaurantId: restaurant.id,
      name: "Breads & Meetha",
      order: 3,
    },
  });

  // 9. Create 16 Authentic Menu Items
  const items = [
    // Starters
    {
      categoryId: catStarters.id,
      name: "Dahi Ke Sholay",
      description: "Crispy bread pockets stuffed with hung spiced yogurt, bell peppers, and fresh coriander.",
      price: 240,
      isVeg: true,
      tags: JSON.stringify(["Chef Special"]),
      image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&auto=format&fit=crop&q=80",
      order: 0,
    },
    {
      categoryId: catStarters.id,
      name: "Amritsari Fish Fry",
      description: "River sole fish crisped in carom seed batter with mint chutney & pickled radish.",
      price: 390,
      isVeg: false,
      tags: JSON.stringify(["Spicy", "Bestseller"]),
      image: "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=400&auto=format&fit=crop&q=80",
      order: 1,
    },
    {
      categoryId: catStarters.id,
      name: "Papdi Chaat Royale",
      description: "Crunchy flour crisps loaded with sweet yogurt, tamarind chutney, and pomegranates.",
      price: 180,
      isVeg: true,
      tags: JSON.stringify(["Popular"]),
      image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&auto=format&fit=crop&q=80",
      order: 2,
    },
    {
      categoryId: catStarters.id,
      name: "Galouti Kebab Sliders",
      description: "Melt-in-mouth smoked lamb patties infused with 32 Lucknowi spices on miniature rotis.",
      price: 440,
      isVeg: false,
      tags: JSON.stringify(["Chef Special"]),
      image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=400&auto=format&fit=crop&q=80",
      order: 3,
    },
    // Tandoor
    {
      categoryId: catTandoor.id,
      name: "Charcoal Paneer Tikka",
      description: "Fresh cottage cheese cubes marinated in mustard oil, crushed chilies, and clay oven roasted.",
      price: 290,
      isVeg: true,
      tags: JSON.stringify(["Bestseller"]),
      image: "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400&auto=format&fit=crop&q=80",
      order: 0,
    },
    {
      categoryId: catTandoor.id,
      name: "Murgh Malai Tikka",
      description: "Tender boneless chicken steeped in cashew cream, white pepper, and cardamom.",
      price: 360,
      isVeg: false,
      tags: JSON.stringify(["Mild", "Kids Favorite"]),
      image: "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=400&auto=format&fit=crop&q=80",
      order: 1,
    },
    {
      categoryId: catTandoor.id,
      name: "Tandoori Soya Chaap",
      description: "Soy ribs tossed in spicy hung curd tandoori marinade, smoked to perfection.",
      price: 260,
      isVeg: true,
      tags: JSON.stringify(["Spicy"]),
      image: "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400&auto=format&fit=crop&q=80",
      order: 2,
    },
    {
      categoryId: catTandoor.id,
      name: "Bhatti Da Murgh (Half)",
      description: "Signature whole leg chicken in dark charred marinade with raw onion rings & lemon wedge.",
      price: 380,
      isVeg: false,
      tags: JSON.stringify(["Bestseller", "Spicy"]),
      image: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=400&auto=format&fit=crop&q=80",
      order: 3,
    },
    // Curries & Biryani
    {
      categoryId: catCurries.id,
      name: "Dal Makhani Royale",
      description: "Black urad dal slow-simmered for 24 hours on coal embers with white butter and cream.",
      price: 310,
      isVeg: true,
      tags: JSON.stringify(["Bestseller", "Must Try"]),
      image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&auto=format&fit=crop&q=80",
      order: 0,
    },
    {
      categoryId: catCurries.id,
      name: "Old Delhi Butter Chicken",
      description: "Tandoori chicken pulled and folded into rich silken makhani gravy with fenugreek butter.",
      price: 420,
      isVeg: false,
      tags: JSON.stringify(["Bestseller"]),
      image: "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=400&auto=format&fit=crop&q=80",
      order: 1,
    },
    {
      categoryId: catCurries.id,
      name: "Paneer Lababdar",
      description: "Soft cottage cheese chunks cooked in rich onion-tomato gravy with grated paneer.",
      price: 330,
      isVeg: true,
      tags: JSON.stringify(["Chef Special"]),
      image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&auto=format&fit=crop&q=80",
      order: 2,
    },
    {
      categoryId: catCurries.id,
      name: "Dum Gosht Biryani",
      description: "Aged basmati rice sealed in earthen handi with tender mutton, saffron, and fried onions.",
      price: 490,
      isVeg: false,
      tags: JSON.stringify(["Bestseller"]),
      image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&auto=format&fit=crop&q=80",
      order: 3,
    },
    {
      categoryId: catCurries.id,
      name: "Subz Handi Biryani",
      description: "Garden fresh seasonal vegetables layered with fragrant basmati rice & mint raita.",
      price: 340,
      isVeg: true,
      tags: JSON.stringify(["Popular"]),
      image: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=400&auto=format&fit=crop&q=80",
      order: 4,
    },
    // Breads & Desserts
    {
      categoryId: catDesserts.id,
      name: "Garlic Butter Chur Chur Naan",
      description: "Crispy layered naan topped with roasted garlic flakes and clarified butter.",
      price: 80,
      isVeg: true,
      tags: JSON.stringify(["Bestseller"]),
      image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&auto=format&fit=crop&q=80",
      order: 0,
    },
    {
      categoryId: catDesserts.id,
      name: "Shahi Gulab Jamun (2 pcs)",
      description: "Warm khoya dumplings filled with pistachio center in rose-cardamom saffron syrup.",
      price: 130,
      isVeg: true,
      tags: JSON.stringify(["Bestseller"]),
      image: "https://images.unsplash.com/photo-1593701461250-d7b22dfd3a77?w=400&auto=format&fit=crop&q=80",
      order: 1,
    },
    {
      categoryId: catDesserts.id,
      name: "Rabdi Matka Kulfi",
      description: "Slow-reduced creamy milk kulfi infused with saffron strands and crushed almonds.",
      price: 160,
      isVeg: true,
      tags: JSON.stringify(["Must Try"]),
      image: "https://images.unsplash.com/photo-1505394033641-40c6ad1178d7?w=400&auto=format&fit=crop&q=80",
      order: 2,
    },
  ];

  const createdItems = [];
  for (const item of items) {
    const created = await prisma.menuItem.create({
      data: {
        restaurantId: restaurant.id,
        ...item,
      },
    });
    createdItems.push(created);
  }
  console.log(`✅ Created ${createdItems.length} Indian menu items with INR pricing`);

  // 10. Create Reward Rules for Review System
  const rule20 = await prisma.rewardRule.create({
    data: {
      restaurantId: restaurant.id,
      label: "20% Off on Your Next Meal",
      type: "PERCENT",
      value: 20,
      weight: 45,
      expiryDays: 30,
      usageLimit: 1,
      active: true,
    },
  });

  const ruleFreeDessert = await prisma.rewardRule.create({
    data: {
      restaurantId: restaurant.id,
      label: "Free Shahi Gulab Jamun (2 Pcs)",
      type: "FREE_ITEM",
      value: 130,
      weight: 35,
      expiryDays: 14,
      usageLimit: 1,
      active: true,
    },
  });

  const ruleFlat100 = await prisma.rewardRule.create({
    data: {
      restaurantId: restaurant.id,
      label: "Flat ₹100 Off on Bill",
      type: "FLAT",
      value: 100,
      weight: 20,
      expiryDays: 30,
      usageLimit: 1,
      active: true,
    },
  });

  console.log("✅ Created 3 weighted reward rules for Google Review Scratch Cards");

  // 11. Create Sample Orders
  const order1 = await prisma.order.create({
    data: {
      restaurantId: restaurant.id,
      tableNumber: 3,
      customerName: "Rahul Sharma",
      phone: "+91 98111 22334",
      notes: "Make it medium spicy, extra lemon please",
      total: 810,
      status: "PREPARING",
      paymentMode: "PAY_AT_COUNTER",
      items: {
        create: [
          { menuItemId: createdItems[0].id, name: createdItems[0].name, price: createdItems[0].price, quantity: 1 },
          { menuItemId: createdItems[4].id, name: createdItems[4].name, price: createdItems[4].price, quantity: 1 },
          { menuItemId: createdItems[13].id, name: createdItems[13].name, price: createdItems[13].price, quantity: 2 },
        ],
      },
    },
  });

  const order2 = await prisma.order.create({
    data: {
      restaurantId: restaurant.id,
      tableNumber: 5,
      customerName: "Pooja Verma",
      phone: "+91 97222 33445",
      notes: "Please pack raita separately",
      total: 1240,
      status: "READY",
      paymentMode: "UPI",
      items: {
        create: [
          { menuItemId: createdItems[9].id, name: createdItems[9].name, price: createdItems[9].price, quantity: 1 },
          { menuItemId: createdItems[8].id, name: createdItems[8].name, price: createdItems[8].price, quantity: 1 },
          { menuItemId: createdItems[13].id, name: createdItems[13].name, price: createdItems[13].price, quantity: 3 },
          { menuItemId: createdItems[14].id, name: createdItems[14].name, price: createdItems[14].price, quantity: 2 },
        ],
      },
    },
  });

  const order3 = await prisma.order.create({
    data: {
      restaurantId: restaurant.id,
      tableNumber: 1,
      customerName: "Amitabh Sen",
      phone: "+91 99333 44556",
      notes: "Quick delivery needed, rushing for movie",
      total: 560,
      status: "NEW",
      paymentMode: "PAY_AT_COUNTER",
      items: {
        create: [
          { menuItemId: createdItems[1].id, name: createdItems[1].name, price: createdItems[1].price, quantity: 1 },
          { menuItemId: createdItems[2].id, name: createdItems[2].name, price: createdItems[2].price, quantity: 1 },
        ],
      },
    },
  });

  const order4 = await prisma.order.create({
    data: {
      restaurantId: restaurant.id,
      tableNumber: 2,
      customerName: "Kavita Reddy",
      phone: "+91 96444 55667",
      total: 1850,
      status: "COMPLETED",
      paymentMode: "CASH",
      items: {
        create: [
          { menuItemId: createdItems[11].id, name: createdItems[11].name, price: createdItems[11].price, quantity: 2 },
          { menuItemId: createdItems[5].id, name: createdItems[5].name, price: createdItems[5].price, quantity: 2 },
          { menuItemId: createdItems[14].id, name: createdItems[14].name, price: createdItems[14].price, quantity: 3 },
        ],
      },
    },
  });

  console.log("✅ Created 4 sample orders with realistic statuses (NEW, PREPARING, READY, COMPLETED)");

  // 12. Create Sample Coupons
  const sampleSubmission = await prisma.reviewSubmission.create({
    data: {
      restaurantId: restaurant.id,
      name: "Sneha Patel",
      phone: "+91 98888 77777",
      screenshotUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80",
      imageHash: "sample-demo-sha256-hash-sneha-review",
      status: "APPROVED",
    },
  });

  await prisma.coupon.create({
    data: {
      restaurantId: restaurant.id,
      rewardRuleId: rule20.id,
      submissionId: sampleSubmission.id,
      code: "MITRA-TREAT20",
      phone: "+91 98888 77777",
      status: "ACTIVE",
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.coupon.create({
    data: {
      restaurantId: restaurant.id,
      rewardRuleId: ruleFreeDessert.id,
      code: "MITRA-SWEETJAMUN",
      phone: "+91 91234 56789",
      status: "REDEEMED",
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      redeemedAt: new Date(),
      billAmount: 850,
      discountApplied: 130,
    },
  });

  await prisma.coupon.create({
    data: {
      restaurantId: restaurant.id,
      rewardRuleId: ruleFlat100.id,
      code: "MITRA-SAVE100",
      phone: "+91 99887 66554",
      status: "ACTIVE",
      expiresAt: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
    },
  });

  console.log("✅ Created 3 sample coupons (2 ACTIVE, 1 REDEEMED)");

  // 13. Create Sample Invoices
  await prisma.invoice.create({
    data: {
      restaurantId: restaurant.id,
      packageId: premiumPkg.id,
      amount: premiumPkg.price,
      status: "PAID",
      paymentId: "INV_INIT_TANDOORI_PREMIUM",
    },
  });

  // 14. Create Sample ScanEvents for analytics
  const sources = ["MENU_QR", "TABLE_QR", "DIRECT"];
  for (let i = 0; i < 24; i++) {
    const hoursAgo = Math.floor(Math.random() * 48);
    await prisma.scanEvent.create({
      data: {
        restaurantId: restaurant.id,
        source: sources[i % sources.length],
        tableNumber: (i % 8) + 1,
        timestamp: new Date(Date.now() - hoursAgo * 60 * 60 * 1000),
      },
    });
  }

  // 15. Default Platform Settings
  await prisma.platformSetting.upsert({
    where: { key: "BUSINESS_UPI_ID" },
    update: {},
    create: {
      key: "BUSINESS_UPI_ID",
      value: "menumitra@icici",
      description: "Default official UPI VPA for receiving subscription payments",
    },
  });

  await prisma.platformSetting.upsert({
    where: { key: "BUSINESS_UPI_NAME" },
    update: {},
    create: {
      key: "BUSINESS_UPI_NAME",
      value: "MenuMitra SaaS",
      description: "Official Payee Name displayed on UPI scan apps",
    },
  });

  console.log("✅ Seed complete! Database is ready with demo data.");
}

main()
  .catch((e) => {
    console.error("❌ Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
