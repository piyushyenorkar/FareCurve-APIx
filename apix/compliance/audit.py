"""Persisting compliance decisions.

The auditor is intentionally dumb: it writes what it is told. The value is that the
gate cannot hand out permission without calling it first, so ``compliance_audit``
is a complete record by construction rather than by discipline.
"""

from __future__ import annotations

import hashlib
from datetime import datetime, timezone

from sqlalchemy import select

from apix.db import session_scope
from apix.db.models import ComplianceAudit, RobotsSnapshot


def _sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8", errors="replace")).hexdigest()


class ComplianceAuditor:
    """Writes robots snapshots and access decisions to the database."""

    def __init__(self, run_uid: str | None = None) -> None:
        self.run_uid = run_uid
        self.decisions: list[dict] = []

    # -------------------------------------------------------------- snapshots
    def record_robots(
        self,
        *,
        source_slug: str,
        host: str,
        checked_path: str,
        verdict: str,
        raw_text: str,
        http_status: int | None,
        governing_group: str | None,
        governing_rule: str | None,
        rule_line_number: int | None,
        crawl_delay: float | None,
        effective_delay: float | None,
        anomalies: list | None,
        sitemaps: list | None,
        fetched_at: datetime | None = None,
        keep_raw: bool = True,
    ) -> int:
        digest = _sha256(raw_text)
        with session_scope() as s:
            previous = s.scalars(
                select(RobotsSnapshot)
                .where(RobotsSnapshot.source_slug == source_slug)
                .order_by(RobotsSnapshot.fetched_at.desc())
                .limit(1)
            ).first()
            changed = previous is not None and previous.content_sha256 != digest

            snap = RobotsSnapshot(
                source_slug=source_slug,
                host=host,
                fetched_at=fetched_at or datetime.now(timezone.utc),
                http_status=http_status,
                checked_path=checked_path,
                verdict=verdict,
                governing_group=governing_group,
                governing_rule=governing_rule,
                rule_line_number=rule_line_number,
                crawl_delay=crawl_delay,
                effective_delay=effective_delay,
                anomalies=anomalies or [],
                sitemaps=sitemaps or [],
                content_sha256=digest,
                raw_robots_txt=raw_text if keep_raw else None,
                changed_from_previous=changed,
            )
            s.add(snap)
            s.flush()
            return snap.id

    # -------------------------------------------------------------- decisions
    def record_decision(
        self,
        *,
        source_slug: str,
        target_url: str,
        decision: str,
        reason_code: str,
        reason_detail: str | None,
        user_agent: str,
        robots_snapshot_id: int | None = None,
        delay_applied_seconds: float | None = None,
        hourly_budget_remaining: int | None = None,
    ) -> None:
        row = {
            "run_uid": self.run_uid,
            "decided_at": datetime.now(timezone.utc),
            "source_slug": source_slug,
            "target_url": target_url,
            "decision": decision,
            "reason_code": reason_code,
            "reason_detail": reason_detail,
            "user_agent": user_agent,
            "robots_snapshot_id": robots_snapshot_id,
            "delay_applied_seconds": delay_applied_seconds,
            "hourly_budget_remaining": hourly_budget_remaining,
        }
        self.decisions.append(row)
        with session_scope() as s:
            s.add(ComplianceAudit(**row))

    # ------------------------------------------------------------------ views
    def summary(self) -> dict[str, int]:
        out: dict[str, int] = {}
        for d in self.decisions:
            out[d["decision"]] = out.get(d["decision"], 0) + 1
        return out
