/**
 * Скрипт миграции: нормализация полей phone и phone2 у существующих лидов.
 * Формат в БД: 7XXXXXXXXXX (11 цифр).
 * Запуск: npx ts-node -r tsconfig-paths/register scripts/normalize-lead-phones.ts
 * Требуется MONGODB_URI в окружении или .env.
 */

import * as mongoose from 'mongoose';
import { normalizePhone, isValidNormalizedPhone } from '../src/common/utils/phone';

const COLLECTION = 'leads';

async function run() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/astracore';
  console.log('Connecting to', uri.replace(/\/\/[^@]+@/, '//***@'));
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (!db) throw new Error('No DB');
  const coll = db.collection(COLLECTION);
  const cursor = coll.find({});
  let updated = 0;
  let skipped = 0;
  let errors = 0;
  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    if (!doc || !doc._id) continue;
    const updates: { phone?: string; phone2?: string } = {};
    if (doc.phone && String(doc.phone).trim()) {
      const normalized = normalizePhone(doc.phone);
      if (isValidNormalizedPhone(normalized) && normalized !== String(doc.phone).trim()) {
        updates.phone = normalized;
      } else if (!isValidNormalizedPhone(normalized)) {
        console.warn(`Lead ${doc._id}: phone "${doc.phone}" → normalized "${normalized}" (invalid, left as-is)`);
        skipped++;
      }
    }
    if (doc.phone2 && String(doc.phone2).trim()) {
      const normalized = normalizePhone(doc.phone2);
      if (isValidNormalizedPhone(normalized) && normalized !== String(doc.phone2).trim()) {
        updates.phone2 = normalized;
      } else if (!isValidNormalizedPhone(normalized)) {
        console.warn(`Lead ${doc._id}: phone2 "${doc.phone2}" → normalized "${normalized}" (invalid, left as-is)`);
        skipped++;
      }
    }
    if (Object.keys(updates).length > 0) {
      try {
        await coll.updateOne({ _id: doc._id }, { $set: updates });
        updated++;
      } catch (e) {
        console.error('Update error', doc._id, e);
        errors++;
      }
    }
  }
  console.log('Done. Updated:', updated, 'Skipped (invalid):', skipped, 'Errors:', errors);
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
