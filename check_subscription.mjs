import { getDb } from "./server/db.ts";

const db = await getDb();
if (!db) {
  console.log("Database connection failed");
  process.exit(1);
}

// Get all subscriptions
const subscriptions = await db.query.organizationSubscriptions.findMany({
  with: {
    plan: true,
  },
});

console.log("Subscriptions in database:");
subscriptions.forEach((sub) => {
  console.log(`- Organization ${sub.organizationId}: Plan ${sub.plan.name} (slug: ${sub.plan.slug})`);
});
