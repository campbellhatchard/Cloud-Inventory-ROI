'use strict';

const MAX_ERROR_LENGTH = 500;

function safeError(result, error) {
  const value = error?.message || result?.category || result?.state || 'Email provider did not accept the notification.';
  return String(value).replace(/[\r\n]+/g, ' ').slice(0, MAX_ERROR_LENGTH);
}

async function enqueueProspectSubmissionNotification(client, { submissionId, recipientUserId }) {
  const result = await client.query(
    `INSERT INTO prospect_submission_notifications(submission_id,recipient_user_id)
     VALUES($1,$2)
     ON CONFLICT(submission_id) DO NOTHING
     RETURNING id,submission_id,status`,
    [submissionId, recipientUserId]
  );
  return result.rows[0] || null;
}

async function claimNotification(transaction, submissionId) {
  return transaction(async (client) => {
    const claimed = await client.query(
      `SELECT n.id,n.submission_id,n.recipient_user_id,n.status,n.attempt_count,
              u.email,u.username,ds.company,sub.answer_count
         FROM prospect_submission_notifications n
         JOIN discovery_submissions sub ON sub.id=n.submission_id
         JOIN discovery_sessions ds ON ds.id=sub.discovery_session_id
         JOIN users u ON u.id=n.recipient_user_id
        WHERE n.submission_id=$1
          AND n.status<>'sent'
          AND (n.next_attempt_at<=NOW() OR (n.status='sending' AND n.updated_at<NOW()-INTERVAL '10 minutes'))
        FOR UPDATE OF n SKIP LOCKED`,
      [submissionId]
    );
    const notification = claimed.rows[0];
    if (!notification) return null;
    await client.query(
      `UPDATE prospect_submission_notifications
          SET status='sending',attempt_count=attempt_count+1,updated_at=NOW(),last_error=NULL
        WHERE id=$1`,
      [notification.id]
    );
    return { ...notification, attempt_count: Number(notification.attempt_count || 0) + 1 };
  });
}

async function dispatchProspectSubmissionNotification({ transaction, query, submissionId, sendDiscoverySubmitted, appUrl }) {
  const notification = await claimNotification(transaction, submissionId);
  if (!notification) return { executed: false, state: 'not_due_or_already_sent' };

  let result;
  let thrown;
  try {
    result = await sendDiscoverySubmitted(
      notification.email,
      notification.username,
      notification.company || 'Your prospect',
      Number(notification.answer_count || 0),
      `${appUrl}/?tab=disc`
    );
  } catch (error) {
    thrown = error;
  }

  if (result?.ok === true) {
    await query(
      `UPDATE prospect_submission_notifications
          SET status='sent',sent_at=NOW(),updated_at=NOW(),last_error=NULL,provider_message_id=$2
        WHERE id=$1`,
      [notification.id, result.providerMessageId || result.messageId || null]
    );
    return { executed: true, sent: true, state: 'sent', notificationId: notification.id };
  }

  const delayMinutes = Math.min(60, Math.max(1, 2 ** Math.min(notification.attempt_count, 5)));
  const errorMessage = safeError(result, thrown);
  await query(
    `UPDATE prospect_submission_notifications
        SET status='failed',last_error=$2,next_attempt_at=NOW()+($3::text||' minutes')::interval,updated_at=NOW()
      WHERE id=$1`,
    [notification.id, errorMessage, delayMinutes]
  );
  return { executed: true, sent: false, state: result?.state || 'failed', notificationId: notification.id };
}

async function processPendingProspectSubmissionNotifications({ transaction, query, sendDiscoverySubmitted, appUrl, limit = 20 }) {
  const due = await query(
    `SELECT submission_id
       FROM prospect_submission_notifications
      WHERE status IN ('pending','failed','sending')
        AND (next_attempt_at<=NOW() OR (status='sending' AND updated_at<NOW()-INTERVAL '10 minutes'))
      ORDER BY next_attempt_at,created_at
      LIMIT $1`,
    [limit]
  );
  const results = [];
  for (const row of due.rows) {
    results.push(await dispatchProspectSubmissionNotification({
      transaction, query, submissionId: row.submission_id, sendDiscoverySubmitted, appUrl
    }));
  }
  return results;
}

module.exports = {
  enqueueProspectSubmissionNotification,
  dispatchProspectSubmissionNotification,
  processPendingProspectSubmissionNotifications,
  safeError
};
