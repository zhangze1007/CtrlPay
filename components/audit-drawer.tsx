'use client';

import * as React from 'react';
import { CheckCircle2, Download, FileClock, RefreshCw, XCircle } from 'lucide-react';
import { auditLog, type AuditEntry, type AuditTier } from '@/lib/audit-logger';
import { syncServerAudit } from '@/lib/audit-sync';
import { useCtrlPayStore } from '@/lib/store';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const TIERS: Array<AuditTier | 'ALL'> = ['ALL', 'T0', 'T1', 'T2', 'T3'];

export function AuditDrawer() {
  const userId = useCtrlPayStore((s) => s.userId);
  // Any store mutation appends to the log; re-read on each render trigger.
  const events = useCtrlPayStore((s) => s.events);
  const [entries, setEntries] = React.useState<readonly AuditEntry[]>([]);
  const [tier, setTier] = React.useState<AuditTier | 'ALL'>('ALL');
  const [status, setStatus] = React.useState<string>('ALL');

  // Pull server-recorded AGENT entries (chat tools, number-verifier) and merge them into
  // the local chain, then re-read. mergeExternal recomputes hashes so verifyChain still holds.
  const pull = React.useCallback(async () => {
    await syncServerAudit();
    setEntries([...auditLog.list(userId)].reverse());
  }, [userId]);

  React.useEffect(() => {
    void pull();
  }, [pull, events]);

  const chainOk = auditLog.verifyChain(userId);
  const statuses = ['ALL', ...Array.from(new Set(entries.map((e) => e.status)))];

  const exportEvidence = React.useCallback(() => {
    const payload = {
      schema: 'ctrlpay.execution-evidence-export.v1',
      exportedAt: new Date().toISOString(),
      tenant: userId,
      chainVerified: auditLog.verifyChain(userId),
      entryCount: auditLog.list(userId).length,
      note: 'Sandbox operation evidence. data_accessed stores field names only, never raw PII.',
      entries: auditLog.list(userId),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ctrlpay-execution-evidence-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [userId]);

  const visible = entries.filter(
    (e) => (tier === 'ALL' || e.permissionTier === tier) && (status === 'ALL' || e.status === status),
  );

  return (
    <Card className="dock-card">
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <FileClock className="h-4 w-4" /> Immutable Audit Log
          </CardTitle>
          <CardDescription>Append-only, hash-chained. Field names only — never raw PII values.</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={exportEvidence}
            title="Download the current hash-chained audit log as JSON"
          >
            <Download className="h-3.5 w-3.5" /> Export evidence
          </Button>
          <Badge variant={chainOk ? 'success' : 'danger'}>
            {chainOk ? (
              <>
                <CheckCircle2 className="mr-1 h-3 w-3" /> Chain verified
              </>
            ) : (
              <>
                <XCircle className="mr-1 h-3 w-3" /> Chain broken
              </>
            )}
          </Badge>
          <Button size="sm" variant="ghost" onClick={() => void pull()} aria-label="Sync and refresh audit log">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-1">
          {TIERS.map((t) => (
            <Button key={t} size="sm" variant={tier === t ? 'default' : 'outline'} onClick={() => setTier(t)}>
              {t}
            </Button>
          ))}
          <span className="mx-1 w-px self-stretch bg-holst-950/10" />
          {statuses.slice(0, 6).map((s) => (
            <Button key={s} size="sm" variant={status === s ? 'default' : 'outline'} onClick={() => setStatus(s)}>
              {s}
            </Button>
          ))}
        </div>

        <div className="max-h-80 space-y-2 overflow-y-auto scroll-thin pr-1">
          {visible.length === 0 && (
            <p className="text-xs text-muted-foreground">No audit entries yet. Interact with the sandbox.</p>
          )}
          {visible.map((e) => (
            <div key={e.logId} className="rounded-2xl bg-holst-50/70 p-2.5 text-xs ring-1 ring-inset ring-holst-950/5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{e.permissionTier}</Badge>
                <Badge variant={e.status === 'DECLINED' || e.status === 'BLOCKED' ? 'danger' : 'secondary'}>{e.status}</Badge>
                <span className="font-medium">{e.actionType}</span>
                <span className="text-muted-foreground">{e.actor}</span>
                <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                  {new Date(e.timestamp).toISOString().slice(11, 19)}
                </span>
              </div>
              <p className="mt-1 text-muted-foreground">
                data_accessed: <span className="font-mono">[{e.data_accessed.join(', ')}]</span>
              </p>
              <p className="text-muted-foreground">
                authorization_ref: <span className="font-mono">{e.authorization_ref}</span>
              </p>
              <p className="truncate text-muted-foreground">
                hash: <span className="font-mono">{e.entryHash}</span>
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
