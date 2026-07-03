export type SecurityEventType =
  | 'login_failed'
  | 'login_banned'
  | 'rate_limit_exceeded'
  | 'flag_submitted'
  | 'admin_ban'
  | 'admin_unban'
  | 'admin_promote'
  | 'admin_flag_dismiss'
  | 'admin_comment_delete'
  | 'admin_review_delete'
  | 'admin_feature_review';

export type SecurityEvent = {
  event:     SecurityEventType;
  actor:     string;          // gamerTag, email, or IP
  target?:   string;          // reviewId, userId, commentId, etc.
  detail?:   string;
  timestamp: string;
};

export function logSecurityEvent(
  event: SecurityEventType,
  actor: string,
  target?: string,
  detail?: string,
): void {
  const entry: SecurityEvent = {
    event,
    actor,
    target,
    detail,
    timestamp: new Date().toISOString(),
  };
  // Structured JSON on stderr so it's captured by any log aggregator
  // without polluting stdout (which Next.js uses for request logs).
  process.stderr.write('[SECURITY] ' + JSON.stringify(entry) + '\n');
}
