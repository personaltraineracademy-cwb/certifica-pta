import "server-only";

import { firebaseBucket } from "@/lib/firebase-admin";

function storageBucket() {
  return firebaseBucket();
}

export async function uploadPrivateFile(
  path: string,
  data: Buffer,
  contentType: string,
) {
  await storageBucket().file(path).save(data, {
    contentType,
    resumable: false,
    metadata: { cacheControl: "private, max-age=3600" },
  });
  return path;
}

export async function downloadPrivateFile(path: string) {
  const [data] = await storageBucket().file(path).download();
  return data;
}

export async function deletePrivateFile(path: string) {
  await storageBucket().file(path).delete({ ignoreNotFound: true });
}
