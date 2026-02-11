import admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const CLIENTS_COLLECTION = "clients";
const STRAIGHT_EDGE_DOC_ID = "straightedgebarbershop";

function collectCategoryValues(docData) {
  const values = [];
  const categoryCandidates = [
    docData?.category,
    docData?.categories,
    docData?.serviceCategory,
    docData?.serviceCategories,
    docData?.tags
  ];

  for (const candidate of categoryCandidates) {
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

async function getAllowedCategoriesFromClients() {
  const snapshots = await db.collection(CLIENTS_COLLECTION).get();
  const allCategories = new Set();

  snapshots.forEach((doc) => {
    const values = collectCategoryValues(doc.data() || {});
    values.forEach((value) => allCategories.add(value));
  });

  return Array.from(allCategories).sort((a, b) => a.localeCompare(b));
}

function chooseBestCategory(allowedCategories) {
  const barberRelated = allowedCategories.filter((category) =>
    /(barber|hair|groom|beauty)/i.test(category)
  );

  if (barberRelated.length) {
    return barberRelated[0];
  }

  return allowedCategories[0] || null;
}

export const updateStraightEdgeProfileDaily = onSchedule(
  {
    schedule: "0 3 * * *",
    timeZone: "America/Chicago",
    region: "us-central1"
  },
  async () => {
    const allowedCategories = await getAllowedCategoriesFromClients();
    const chosenCategory = chooseBestCategory(allowedCategories);
    const categories = chosenCategory ? [chosenCategory] : [];

    await db.collection(CLIENTS_COLLECTION).doc(STRAIGHT_EDGE_DOC_ID).set(
      {
        username: STRAIGHT_EDGE_DOC_ID,
        slug: STRAIGHT_EDGE_DOC_ID,
        isPublished: true,
        status: "active",
        category: chosenCategory,
        categories,
        lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        dailyStats: {
          allowedCategoryCount: allowedCategories.length,
          selectedCategory: chosenCategory,
          updatedBy: "cloud-scheduler",
          runDate: new Date().toISOString().slice(0, 10)
        },
        lastUpdate: new Date().toLocaleDateString("en-US")
      },
      { merge: true }
    );

    logger.info("Daily Straight Edge profile update complete", {
      docPath: `${CLIENTS_COLLECTION}/${STRAIGHT_EDGE_DOC_ID}`,
      allowedCategoryCount: allowedCategories.length,
      selectedCategory: chosenCategory
    });
  }
);
