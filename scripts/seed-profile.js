import fs from "node:fs/promises";
import admin from "firebase-admin";

const PROFILE_DOC_ID = process.env.PROFILE_DOC_ID || "straightedgebarbershop";
const FIREBASE_SERVICE_ACCOUNT = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!FIREBASE_SERVICE_ACCOUNT) {
  throw new Error("Missing FIREBASE_SERVICE_ACCOUNT environment variable.");
}

const serviceAccountRaw = await fs.readFile(FIREBASE_SERVICE_ACCOUNT, "utf-8");
const serviceAccount = JSON.parse(serviceAccountRaw);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

function collectCategoriesFromClient(docData) {
  const values = [];
  const candidates = [
    docData?.category,
    docData?.categories,
    docData?.serviceCategory,
    docData?.serviceCategories,
    docData?.tags
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      for (const item of candidate) {
        if (typeof item === "string" && item.trim()) values.push(item.trim());
      }
      continue;
    }

    if (typeof candidate === "string" && candidate.trim()) {
      values.push(candidate.trim());
    }
  }

  return values;
}

async function getAllowedCategories() {
  const snapshots = await db.collection("clients").get();
  const allCategories = new Set();

  snapshots.forEach((doc) => {
    const categoryValues = collectCategoriesFromClient(doc.data() || {});
    for (const category of categoryValues) {
      allCategories.add(category);
    }
  });

  return Array.from(allCategories).sort((a, b) => a.localeCompare(b));
}

function pickCategories(allowedCategories) {
  if (!allowedCategories.length) return [];

  // Prefer categories that already mention barber/hair if they exist.
  const bestMatches = allowedCategories.filter((category) =>
    /(barber|hair|groom|beauty)/i.test(category)
  );

  if (bestMatches.length) {
    return [bestMatches[0]];
  }

  // Fallback: use the first existing category so we never invent a new list.
  return [allowedCategories[0]];
}

async function seedStraightEdgeProfile() {
  const allowedCategories = await getAllowedCategories();
  const selectedCategories = pickCategories(allowedCategories);

  const profileData = {
    businessName: "The Straight Edge Barbershop",
    name: "The Straight Edge Barbershop",
    username: "straightedgebarbershop",
    slug: "straightedgebarbershop",
    email: "owner@straightedgebarbershop.com",
    website: "https://straightedgebarbershop.com",
    photoUrl: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=600&q=80",
    bio: "Modern barbershop focused on clean fades, beard shaping, and classic cuts.",
    location: {
      city: "Tahlequah",
      state: "OK"
    },
    category: selectedCategories[0] || null,
    categories: selectedCategories,
    tags: ["barbershop", "mens grooming", "local business"],
    plan: "Standard Support",
    lastUpdate: new Date().toLocaleDateString("en-US"),
    notes: "Profile seeded automatically. Update any placeholder values in Firestore.",
    isPublished: true,
    status: "active",
    lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    dailyStats: {
      profileViews: 0,
      supportRequests: 0,
      updatedBy: "seed-script"
    }
  };

  await db.collection("clients").doc(PROFILE_DOC_ID).set(profileData, { merge: true });

  console.log(`Seeded profile doc: clients/${PROFILE_DOC_ID}`);
  console.log(`Allowed categories found: ${allowedCategories.join(", ") || "(none found)"}`);
  console.log(`Selected categories: ${selectedCategories.join(", ") || "(none selected)"}`);
}

await seedStraightEdgeProfile();
