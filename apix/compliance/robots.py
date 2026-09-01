"""A strict RFC 9309 robots.txt parser.

Python ships ``urllib.robotparser``, and we do not use it, for three reasons that
each bit us during research:

1. It implements the 1996 draft, not RFC 9309 (Sep 2022). It has no ``$`` anchor and
   its ``*`` handling is incomplete.
2. It does not match against the query string, so ``Disallow: /flights/*?mode=*``
   — the rule that actually gates Goibibo — is invisible to it. A team using
   robotparser would score Goibibo ALLOW and scrape a path its operator denied.
3. It silently drops malformed lines, so SpiceJet's absolute-URL ``Disallow`` would
   vanish rather than be surfaced for a human decision.

Group selection follows RFC 9309 §2.2.1: a crawler obeys exactly ONE group — the one
whose user-agent token is the most specific (longest) case-insensitive match for its
product token — and does **not** inherit from ``*`` when a specific group exists.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from urllib.parse import unquote, urlsplit

NONSTANDARD_ABSOLUTE_DISALLOW = "NONSTANDARD_ABSOLUTE_DISALLOW"
NONSTANDARD_UNKNOWN_DIRECTIVE = "NONSTANDARD_UNKNOWN_DIRECTIVE"
NONSTANDARD_RULE_BEFORE_GROUP = "NONSTANDARD_RULE_BEFORE_GROUP"

_KNOWN_DIRECTIVES = {"user-agent", "allow", "disallow", "crawl-delay", "sitemap", "host"}


@dataclass(frozen=True)
class Rule:
    """One Allow/Disallow line, pre-compiled."""

    allow: bool
    pattern: str
    regex: re.Pattern[str]
    source_line: int

    @property
    def specificity(self) -> int:
        """RFC 9309 §2.2.2: the longest matching pattern wins. Length of the literal
        pattern is the tiebreak metric, wildcards included."""
        return len(self.pattern)


@dataclass
class RobotsGroup:
    user_agents: list[str] = field(default_factory=list)
    rules: list[Rule] = field(default_factory=list)
    crawl_delay: float | None = None


@dataclass
class RobotsRules:
    """Parsed robots.txt for one host."""

    host: str
    raw: str
    groups: list[RobotsGroup] = field(default_factory=list)
    sitemaps: list[str] = field(default_factory=list)
    anomalies: list[tuple[str, int, str]] = field(default_factory=list)
    fetch_status: int | None = None
    fetched_at: str | None = None

    # ------------------------------------------------------------------ helpers
    def select_group(self, product_token: str) -> RobotsGroup | None:
        """Return the single group that governs ``product_token`` (RFC 9309 §2.2.1).

        Two subtleties the standard library gets wrong and real files depend on:

        * A crawler obeys exactly one group — the most specific user-agent match —
          and does **not** inherit from ``*`` when a specific group exists.
        * If the same user-agent appears in several records, the records MUST be
          merged into one group. SpiceJet's file has two separate ``User-agent: *``
          records, and the second one holds all the real rules. A parser that keeps
          only the first would conclude SpiceJet permits ``/api/v1``.
        """
        token = product_token.lower()
        best_len = -1
        specific: list[RobotsGroup] = []
        wildcard: list[RobotsGroup] = []
        for group in self.groups:
            for ua in group.user_agents:
                ua_l = ua.lower()
                if ua_l == "*":
                    wildcard.append(group)
                    continue
                # A product token matches if the robots.txt value is a
                # case-insensitive substring of our token, so that a group named
                # "apixbot" governs "APIxBot/1.0 (+https://...)".
                if ua_l in token:
                    if len(ua_l) > best_len:
                        best_len = len(ua_l)
                        specific = [group]
                    elif len(ua_l) == best_len:
                        specific.append(group)

        chosen = specific or wildcard
        if not chosen:
            return None
        if len(chosen) == 1:
            return chosen[0]

        merged = RobotsGroup(user_agents=[])
        for group in chosen:
            for ua in group.user_agents:
                if ua not in merged.user_agents:
                    merged.user_agents.append(ua)
            merged.rules.extend(group.rules)
            if group.crawl_delay is not None:
                merged.crawl_delay = (
                    group.crawl_delay
                    if merged.crawl_delay is None
                    else max(merged.crawl_delay, group.crawl_delay)
                )
        return merged


    def crawl_delay_for(self, product_token: str) -> float | None:
        group = self.select_group(product_token)
        return group.crawl_delay if group else None

    def decide(self, product_token: str, path_with_query: str) -> tuple[bool, Rule | None]:
        """Return (allowed, governing_rule).

        Resolution order, per RFC 9309 §2.2.2:
          * only the selected group's rules are considered;
          * the most specific (longest) matching pattern wins;
          * on equal specificity, Allow beats Disallow;
          * no matching rule at all means allowed.
        """
        group = self.select_group(product_token)
        if group is None or not group.rules:
            return True, None

        target = _normalise_target(path_with_query)
        winner: Rule | None = None
        for rule in group.rules:
            if not rule.regex.match(target):
                continue
            if winner is None:
                winner = rule
                continue
            if rule.specificity > winner.specificity:
                winner = rule
            elif rule.specificity == winner.specificity and rule.allow and not winner.allow:
                winner = rule

        if winner is None:
            return True, None
        return winner.allow, winner


def _normalise_target(path_with_query: str) -> str:
    """Reduce a URL (absolute or relative) to the path+query robots.txt matches on."""
    if path_with_query.startswith(("http://", "https://")):
        parts = urlsplit(path_with_query)
        path_with_query = parts.path or "/"
        if parts.query:
            path_with_query += "?" + parts.query
    if not path_with_query.startswith("/"):
        path_with_query = "/" + path_with_query
    # %-decode so that %2F-style evasion cannot slip past a literal pattern.
    return unquote(path_with_query)


def _compile_pattern(pattern: str) -> re.Pattern[str]:
    """Translate a robots.txt path pattern into an anchored regex.

    Supported wildcards (RFC 9309 §2.2.3):
      ``*``  any sequence of characters, including none
      ``$``  end-of-URL anchor, only meaningful as the final character
    Everything else is literal. Matching is prefix-based unless ``$`` is present.
    """
    anchored_end = pattern.endswith("$")
    body = pattern[:-1] if anchored_end else pattern
    out: list[str] = []
    for ch in body:
        if ch == "*":
            out.append(".*")
        else:
            out.append(re.escape(ch))
    expr = "".join(out)
    if anchored_end:
        expr += r"\Z"
    return re.compile(expr)


def parse_robots_txt(
    text: str,
    *,
    host: str = "",
    fetch_status: int | None = None,
    fetched_at: str | None = None,
    strict_absolute_disallow: bool = True,
) -> RobotsRules:
    """Parse robots.txt into groups.

    ``strict_absolute_disallow`` is the SpiceJet decision, made explicit: when a
    ``Disallow`` value is an absolute URL (invalid under RFC 9309), we record the
    anomaly and, if strict, still honour the intent by using the URL's path. A
    permissive parser would discard the line and scrape a path the operator plainly
    meant to protect. We prefer to be wrong in the direction of restraint.
    """
    rules = RobotsRules(host=host, raw=text, fetch_status=fetch_status, fetched_at=fetched_at)
    current: RobotsGroup | None = None
    expecting_agents = False

    for lineno, raw_line in enumerate(text.splitlines(), start=1):
        line = raw_line.split("#", 1)[0].strip()
        if not line:
            continue
        if ":" not in line:
            rules.anomalies.append((NONSTANDARD_UNKNOWN_DIRECTIVE, lineno, raw_line.strip()))
            continue

        field_name, _, value = line.partition(":")
        key = field_name.strip().lower()
        value = value.strip()

        if key not in _KNOWN_DIRECTIVES:
            rules.anomalies.append((NONSTANDARD_UNKNOWN_DIRECTIVE, lineno, raw_line.strip()))
            continue

        if key == "sitemap":
            rules.sitemaps.append(value)
            continue

        if key == "user-agent":
            # Consecutive User-agent lines accumulate into one group.
            if current is None or not expecting_agents:
                current = RobotsGroup()
                rules.groups.append(current)
                expecting_agents = True
            current.user_agents.append(value)
            continue

        expecting_agents = False
        if current is None:
            # Rules before any User-agent line are undefined behaviour. Record and
            # attach them to an implicit '*' group so intent is not lost.
            rules.anomalies.append((NONSTANDARD_RULE_BEFORE_GROUP, lineno, raw_line.strip()))
            current = RobotsGroup(user_agents=["*"])
            rules.groups.append(current)

        if key == "crawl-delay":
            try:
                current.crawl_delay = float(value)
            except ValueError:
                rules.anomalies.append((NONSTANDARD_UNKNOWN_DIRECTIVE, lineno, raw_line.strip()))
            continue

        if key in ("allow", "disallow"):
            if value == "":
                # 'Disallow:' with an empty value means allow everything; 'Allow:'
                # with an empty value has no effect. Both are no-ops as rules.
                continue
            pattern = value
            if pattern.startswith(("http://", "https://")):
                rules.anomalies.append(
                    (NONSTANDARD_ABSOLUTE_DISALLOW, lineno, raw_line.strip())
                )
                if not strict_absolute_disallow:
                    continue
                parts = urlsplit(pattern)
                pattern = parts.path or "/"
                if parts.query:
                    pattern += "?" + parts.query
            if not pattern.startswith("/"):
                pattern = "/" + pattern
            current.rules.append(
                Rule(
                    allow=(key == "allow"),
                    pattern=pattern,
                    regex=_compile_pattern(pattern),
                    source_line=lineno,
                )
            )
    return rules


# ------------------------------------------------------------------------------------
# Fetching + caching
# ------------------------------------------------------------------------------------


class RobotsPolicy:
    """Fetches, caches and evaluates robots.txt for many hosts.

    HTTP status handling follows RFC 9309 §2.3.1 exactly:

      2xx  -> parse and obey
      3xx  -> follow up to 5 redirects (httpx does this for us)
      4xx  -> "unavailable"; the RFC permits unrestricted access. 429 is excluded
              and treated as unreachable.
      5xx / 429 / network error -> "unreachable"; the RFC says a crawler SHOULD
              assume complete disallow. We do exactly that, which is why an outage
              at a source makes APIx collect *less* data rather than misbehave.
    """

    def __init__(
        self,
        user_agent: str,
        *,
        cache_dir=None,
        ttl_hours: int = 24,
        timeout: float = 20.0,
        product_token: str | None = None,
    ) -> None:
        from pathlib import Path

        from apix.config import DATA_DIR

        self.user_agent = user_agent
        self.product_token = product_token or user_agent.split("/", 1)[0]
        self.cache_dir = Path(cache_dir or (DATA_DIR / "robots_cache"))
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.ttl_hours = ttl_hours
        self.timeout = timeout
        self._memory: dict[str, RobotsRules] = {}

    # ----------------------------------------------------------------- internals
    def _cache_path(self, host: str):
        safe = re.sub(r"[^a-z0-9.\-]", "_", host.lower())
        return self.cache_dir / f"{safe}.robots.txt"

    def _meta_path(self, host: str):
        return self._cache_path(host).with_suffix(".meta.json")

    def _read_cache(self, host: str) -> RobotsRules | None:
        import json
        from datetime import datetime, timedelta, timezone

        path, meta = self._cache_path(host), self._meta_path(host)
        if not path.exists() or not meta.exists():
            return None
        try:
            info = json.loads(meta.read_text("utf-8"))
            fetched = datetime.fromisoformat(info["fetched_at"])
        except Exception:
            return None
        if datetime.now(timezone.utc) - fetched > timedelta(hours=self.ttl_hours):
            return None
        return parse_robots_txt(
            path.read_text("utf-8", errors="replace"),
            host=host,
            fetch_status=info.get("status"),
            fetched_at=info["fetched_at"],
        )

    def _write_cache(self, host: str, text: str, status: int, fetched_at: str) -> None:
        import json

        self._cache_path(host).write_text(text, "utf-8")
        self._meta_path(host).write_text(
            json.dumps({"status": status, "fetched_at": fetched_at, "host": host}, indent=2),
            "utf-8",
        )

    # -------------------------------------------------------------------- fetching
    async def fetch(self, robots_url: str, *, force: bool = False) -> RobotsRules:
        from datetime import datetime, timezone

        import httpx

        host = urlsplit(robots_url).netloc
        if not force:
            if host in self._memory:
                return self._memory[host]
            cached = self._read_cache(host)
            if cached is not None:
                self._memory[host] = cached
                return cached

        now = datetime.now(timezone.utc).isoformat()
        status: int | None = None
        text = ""
        try:
            async with httpx.AsyncClient(
                timeout=self.timeout,
                follow_redirects=True,
                headers={"User-Agent": self.user_agent, "Accept": "text/plain,*/*"},
            ) as client:
                resp = await client.get(robots_url)
                status = resp.status_code
                if 200 <= status < 300:
                    text = resp.text
                elif status == 429 or status >= 500:
                    # Unreachable -> assume complete disallow.
                    text = "User-agent: *\nDisallow: /\n"
                else:
                    # 4xx -> unavailable -> unrestricted.
                    text = ""
        except Exception:
            status = None
            text = "User-agent: *\nDisallow: /\n"

        rules = parse_robots_txt(text, host=host, fetch_status=status, fetched_at=now)
        if status is not None and 200 <= status < 300:
            self._write_cache(host, text, status, now)
        self._memory[host] = rules
        return rules

    async def is_allowed(self, url: str, *, force: bool = False) -> tuple[bool, RobotsRules, Rule | None]:
        parts = urlsplit(url)
        robots_url = f"{parts.scheme or 'https'}://{parts.netloc}/robots.txt"
        rules = await self.fetch(robots_url, force=force)
        target = parts.path or "/"
        if parts.query:
            target += "?" + parts.query
        allowed, rule = rules.decide(self.product_token, target)
        return allowed, rules, rule




