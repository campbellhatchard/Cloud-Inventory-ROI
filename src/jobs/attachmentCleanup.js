'use strict';

const { query } = require('../db');
const { getEvidenceStorage } = require('../storage/r2-storage');

async function cleanupStaleSolutionFitEvidence({ limit = 50 } = {}) {
  const storage = getEvidenceStorage();
  if (!storage.isAvailable()) return { skipped: true, reason: 'storage-unavailable', stalePending: 0, deletionRetries: 0 };
  const stale = await query(`WITH expired AS (SELECT id FROM handoff_attachments
    WHERE status IN ('PENDING','FAILED') AND removed_at IS NULL AND created_at<NOW()-INTERVAL '24 hours'
      AND (upload_expires_at IS NULL OR upload_expires_at<NOW())
    ORDER BY created_at LIMIT $1 FOR UPDATE SKIP LOCKED)
    UPDATE handoff_attachments a SET status='REMOVED',removed_at=NOW(),deletion_status='PENDING',updated_at=NOW()
    FROM expired WHERE a.id=expired.id RETURNING a.id,a.storage_key`, [limit]);
  const stalePending = stale.rows.length;
  const retries = await query(`SELECT id,storage_key FROM handoff_attachments
    WHERE status='REMOVED' AND deletion_status IN ('PENDING','RETRY') ORDER BY updated_at LIMIT $1`, [limit]);
  let deletionRetries = 0;
  for (const row of retries.rows) {
    try {
      await storage.deleteObject({ key: row.storage_key });
      await query(`UPDATE handoff_attachments SET deletion_status='DELETED',deletion_error=NULL,updated_at=NOW() WHERE id=$1`, [row.id]);
      deletionRetries += 1;
    } catch (error) {
      await query(`UPDATE handoff_attachments SET deletion_status='RETRY',deletion_error=$2,updated_at=NOW() WHERE id=$1`, [row.id, String(error.message || 'Delete retry failed').slice(0, 500)]);
    }
  }
  return { skipped: false, stalePending, deletionRetries };
}

module.exports = { cleanupStaleSolutionFitEvidence };
