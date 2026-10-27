'use strict';

/* One definition of customer-visible Solution Fit evidence. Pending, failed,
   removed, and cleanup-tombstoned uploads are deliberately excluded. */
const ACTIVE_ATTACHMENT_SQL = "status='ACTIVE' AND removed_at IS NULL";
const activeAttachmentSql = (alias = '') => {
  const prefix = alias ? `${String(alias).replace(/[^a-z0-9_]/gi, '')}.` : '';
  return `${prefix}status='ACTIVE' AND ${prefix}removed_at IS NULL`;
};
const isActiveAttachment = row => row?.status === 'ACTIVE' && !row?.removed_at;
const isPendingAttachment = row => ['PENDING', 'FAILED'].includes(row?.status) && !row?.removed_at;

module.exports = { ACTIVE_ATTACHMENT_SQL, activeAttachmentSql, isActiveAttachment, isPendingAttachment };
