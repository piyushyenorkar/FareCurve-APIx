"""The gate: the only door through which a fare request may pass.

Usage from an adapter:

    decision = await gate.request_access(spec, url)
    if not decision.allowed:
        return decision.to_blocked_observation(...)
    ...   # only now may a network call happen

Two things make this more than a helper function:

1. It is **enforced by construction**, not by convention. ``BaseFareSource.fetch``
   in ``apix/sources/base.py`` calls the gate itself; a subclass implements
   ``_fetch_allowed`` and is never handed a URL it has not been cleared for.
2. It **re-evaluates live**. The verdicts in ``apix.domain`` are documentation.
   The gate fetches robots.txt (cached to a TTL, so we are not hammering it) and
   decides fresh each run. If Cleartrip opens its search path tomorrow, APIx starts
   collecting Cleartrip tomorrow with no code change. If Akasa closes theirs, APIx
   stops, immediately, on its own.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from apix.compliance.audit import ComplianceAuditor
from apix.compliance.limiter import HostRateLimiter, RateLimitExceeded
from apix.compliance.robots import RobotsPolicy
from apix.config import settings
from apix.domain import ComplianceVerdict, SourceSpec, SourceType


class RobotsDeniedError(RuntimeError):
    def __init__(self, url: str, rule: str) -> None:
        super().__init__(f"robots.txt denies {url} (rule: {rule})")
        self.url = url
        self.rule = rule


@dataclass
class AccessDecision:
    allowed: bool
    verdict: ComplianceVerdict
    reason_code: str
    reason_detail: str
    url: str
    source_slug: str
    governing_rule: str | None = None
    crawl_delay: float | None = None
    effective_delay: float | None = None
    delay_waited: float = 0.0
    budget_remaining: int | None = None
    robots_snapshot_id: int | None = None
    anomalies: list = field(default_factory=list)

    @property
    def is_blocked_by_policy(self) -> bool:
        return not self.allowed and self.reason_code.startswith("ROBOTS")


class ComplianceGate:
    """Evaluates robots.txt, applies politeness, records everything."""

    def __init__(
        self,
        auditor: ComplianceAuditor | None = None,
        *,
        user_agent: str | None = None,
        respect_robots: bool | None = None,
    ) -> None:
        self.user_agent = user_agent or settings.user_agent
        self.policy = RobotsPolicy(
            self.user_agent,
            ttl_hours=settings.robots_cache_ttl_hours,
            product_token="APIxBot",
        )
        self.limiter = HostRateLimiter(
            default_delay=settings.default_crawl_delay_seconds,
            hourly_cap=settings.max_requests_per_host_per_hour,
        )
        self.auditor = auditor or ComplianceAuditor()
        self.respect_robots = settings.respect_robots if respect_robots is None else respect_robots
        self._snapshot_ids: dict[str, int] = {}

    # ------------------------------------------------------------------- checks
    async def evaluate(self, spec: SourceSpec, url: str, *, force: bool = False) -> AccessDecision:
        """Decide, record, and return — without waiting. No network fare call yet."""
        if spec.source_type is SourceType.OFFICIAL_API:
            decision = AccessDecision(
                allowed=True,
                verdict=ComplianceVerdict.NOT_APPLICABLE,
                reason_code="OFFICIAL_API_TOS",
                reason_detail=(
                    f"Access governed by the provider's API terms of service "
                    f"({spec.tos_url or 'see provider docs'}), not by robots.txt. "
                    "Credentialled, rate-limited, sanctioned access."
                ),
                url=url,
                source_slug=spec.slug,
            )
            self._audit(spec, decision)
            return decision

        allowed, rules, rule = await self.policy.is_allowed(url, force=force)
        group = rules.select_group("APIxBot")
        crawl_delay = rules.crawl_delay_for("APIxBot")
        host = rules.host or url
        effective_delay = self.limiter.set_delay(host, crawl_delay)

        if rules.fetch_status is None:
            reason_code = "ROBOTS_UNREACHABLE"
            detail = (
                "robots.txt could not be fetched. RFC 9309 §2.3.1 says a crawler "
                "SHOULD assume complete disallow when robots.txt is unreachable, so "
                "this source is skipped for this run."
            )
        elif not allowed:
            reason_code = "ROBOTS_DISALLOW"
            detail = (
                f"Denied by '{'Allow' if rule and rule.allow else 'Disallow'}: "
                f"{rule.pattern}' at line {rule.source_line} of {host}/robots.txt, "
                f"in the group User-agent: {', '.join(group.user_agents) if group else '?'}."
                if rule
                else "Denied by robots.txt."
            )
        elif rule is not None:
            reason_code = "ROBOTS_ALLOW_EXPLICIT"
            detail = (
                f"Permitted by 'Allow: {rule.pattern}' at line {rule.source_line}; it is "
                "the most specific matching rule in the governing group."
            )
        elif group is None or not group.rules:
            reason_code = "ROBOTS_NO_RULES"
            detail = (
                "The governing group contains no Disallow directives, so every path is "
                "permitted."
            )
        else:
            reason_code = "ROBOTS_ALLOW_NO_MATCH"
            detail = (
                f"No rule in the governing group (User-agent: "
                f"{', '.join(group.user_agents)}) matches this path, so it is permitted "
                "by default under RFC 9309 §2.2.2."
            )

        if rules.fetch_status is None:
            allowed = False

        verdict = ComplianceVerdict.ALLOW if allowed else ComplianceVerdict.DENY
        snap_id = self.auditor.record_robots(
            source_slug=spec.slug,
            host=host,
            checked_path=url,
            verdict=verdict.value,
            raw_text=rules.raw,
            http_status=rules.fetch_status,
            governing_group=", ".join(group.user_agents) if group else None,
            governing_rule=(f"{'Allow' if rule.allow else 'Disallow'}: {rule.pattern}" if rule else None),
            rule_line_number=rule.source_line if rule else None,
            crawl_delay=crawl_delay,
            effective_delay=effective_delay,
            anomalies=[list(a) for a in rules.anomalies],
            sitemaps=rules.sitemaps,
        )
        self._snapshot_ids[spec.slug] = snap_id

        if not self.respect_robots and not allowed:
            # The override exists so that turning it on is loud and auditable.
            import os

            if os.getenv("APIX_I_UNDERSTAND_THIS_IS_NON_COMPLIANT") != "yes":
                raise RuntimeError(
                    "APIX_RESPECT_ROBOTS=false requires "
                    "APIX_I_UNDERSTAND_THIS_IS_NON_COMPLIANT=yes. APIx will not "
                    "quietly ignore robots.txt."
                )

        decision = AccessDecision(
            allowed=allowed,
            verdict=verdict,
            reason_code=reason_code,
            reason_detail=detail,
            url=url,
            source_slug=spec.slug,
            governing_rule=(f"{'Allow' if rule.allow else 'Disallow'}: {rule.pattern}" if rule else None),
            crawl_delay=crawl_delay,
            effective_delay=effective_delay,
            budget_remaining=self.limiter.remaining_budget(host),
            robots_snapshot_id=snap_id,
            anomalies=[list(a) for a in rules.anomalies],
        )
        self._audit(spec, decision)
        return decision

    async def request_access(
        self, spec: SourceSpec, url: str, *, force: bool = False
    ) -> AccessDecision:
        """Evaluate, then actually wait out the politeness delay if permitted."""
        decision = await self.evaluate(spec, url, force=force)
        if not decision.allowed:
            return decision

        from urllib.parse import urlsplit

        host = urlsplit(url).netloc
        try:
            decision.delay_waited = await self.limiter.acquire(host)
        except RateLimitExceeded as exc:
            decision.allowed = False
            decision.reason_code = "RATE_LIMIT_EXHAUSTED"
            decision.reason_detail = (
                f"{exc}. APIx refuses rather than queues, so a scheduling bug cannot "
                "become a burst against a public site. The shortfall is reported in the "
                "confidence score for the day."
            )
            self._audit(spec, decision)
        decision.budget_remaining = self.limiter.remaining_budget(host)
        return decision

    # ------------------------------------------------------------------ internal
    def _audit(self, spec: SourceSpec, decision: AccessDecision) -> None:
        self.auditor.record_decision(
            source_slug=spec.slug,
            target_url=decision.url,
            decision="ALLOW" if decision.allowed else "DENY",
            reason_code=decision.reason_code,
            reason_detail=decision.reason_detail,
            user_agent=self.user_agent,
            robots_snapshot_id=decision.robots_snapshot_id,
            delay_applied_seconds=decision.effective_delay,
            hourly_budget_remaining=decision.budget_remaining,
        )

    # ------------------------------------------------------------------- helpers
    async def matrix(self, specs=None, *, force: bool = True) -> list[AccessDecision]:
        """Evaluate every source's fare-search path. Powers ``apix compliance check``
        and the dashboard's compliance matrix."""
        from apix.domain import SOURCES

        out: list[AccessDecision] = []
        for spec in specs or SOURCES:
            url = (
                f"{spec.base_url}{spec.search_path_template}"
                if spec.search_path_template.startswith("/")
                else spec.search_path_template
            )
            out.append(await self.evaluate(spec, url, force=force))
        return out

