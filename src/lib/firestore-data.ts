import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { firestore } from "@/lib/firebase-admin";

export type DataValue = Record<string, unknown>;

const collectionName = (name: string) => `certifica_${name}`;
const snake = (value: string) => value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
const camel = (value: string) => value.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());

function fromFirestore(value: unknown): unknown {
  if (value instanceof Timestamp) return value.toDate();
  if (Array.isArray(value)) return value.map(fromFirestore);
  if (value && typeof value === "object" && !Buffer.isBuffer(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [camel(key), fromFirestore(item)]));
  }
  return value;
}

function toFirestore(value: unknown): unknown {
  if (value instanceof Date) return Timestamp.fromDate(value);
  if (Array.isArray(value)) return value.map(toFirestore);
  if (value && typeof value === "object" && !Buffer.isBuffer(value)) {
    return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined).map(([key, item]) => [snake(key), toFirestore(item)]));
  }
  return value;
}

export async function getRecord<T extends DataValue>(collection: string, id: string) {
  const snapshot = await firestore().collection(collectionName(collection)).doc(id).get();
  return snapshot.exists ? ({ id: snapshot.id, ...fromFirestore(snapshot.data()) as DataValue } as unknown as T) : null;
}

export async function listRecords<T extends DataValue>(collection: string) {
  const snapshot = await firestore().collection(collectionName(collection)).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...fromFirestore(doc.data()) as DataValue } as unknown as T));
}

export async function findRecords<T extends DataValue>(collection: string, filters: Record<string, unknown>) {
  let query: FirebaseFirestore.Query = firestore().collection(collectionName(collection));
  for (const [key, value] of Object.entries(filters)) query = query.where(snake(key), "==", toFirestore(value));
  const snapshot = await query.get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...fromFirestore(doc.data()) as DataValue } as unknown as T));
}

export async function createRecord<T extends DataValue>(collection: string, data: T, id = crypto.randomUUID()) {
  await firestore().collection(collectionName(collection)).doc(id).set(toFirestore(data) as DataValue);
  return { id, ...data };
}

export async function updateRecord(collection: string, id: string, data: DataValue) {
  await firestore().collection(collectionName(collection)).doc(id).update(toFirestore(data) as DataValue);
}

export async function deleteRecord(collection: string, id: string) {
  await firestore().collection(collectionName(collection)).doc(id).delete();
}

export async function incrementRecord(collection: string, id: string, field: string, amount = 1) {
  await firestore().collection(collectionName(collection)).doc(id).update({ [snake(field)]: FieldValue.increment(amount) });
}

export async function writeBatch(operations: Array<{ collection: string; id: string; data?: DataValue; delete?: boolean }>) {
  for (let start = 0; start < operations.length; start += 400) {
    const batch = firestore().batch();
    for (const operation of operations.slice(start, start + 400)) {
      const ref = firestore().collection(collectionName(operation.collection)).doc(operation.id);
      if (operation.delete) batch.delete(ref);
      else batch.set(ref, toFirestore(operation.data ?? {}) as DataValue, { merge: true });
    }
    await batch.commit();
  }
}
