"""Per-host politeness: crawl-delay spacing plus an hourly cap.

Two independent constraints, both enforced:

  * **Spacing** — at least ``delay`` seconds between two requests to the same host.
    The delay is whichever is larger: the host's own ``Crawl-delay`` directive, or
    our configured floor. We never go faster than an operator asked us to.
  * **Hourly budget** — a sliding-window cap on requests per host per hour, so that
    even a bug in the scheduler cannot turn into a burst. When the budget is spent
    the limiter refuses rather than queues, and the run records a shortfall that
    shows up honestly in the confidence score.
"""

from __future__ import annotations

import asyncio
import time
from collections import defaultdict, deque
from dataclasses import dataclass


class RateLimitExceeded(RuntimeError):
    """Raised when a host's hourly budget is exhausted."""

    def __init__(self, host: str, cap: int) -> None:
        super().__init__(f"hourly request cap of {cap} reached for {host}")
        self.host = host
        self.cap = cap


@dataclass
class HostState:
    last_request_at: float = 0.0
    delay: float = 5.0
    timestamps: deque[float] | None = None

    def __post_init__(self) -> None:
        if self.timestamps is None:
            self.timestamps = deque()


class HostRateLimiter:
    def __init__(self, default_delay: float = 5.0, hourly_cap: int = 60) -> None:
        self.default_delay = default_delay
        self.hourly_cap = hourly_cap
        self._hosts: dict[str, HostState] = defaultdict(lambda: HostState(delay=default_delay))
        self._locks: dict[str, asyncio.Lock] = defaultdict(asyncio.Lock)
        self.total_waited_seconds: float = 0.0

    def set_delay(self, host: str, crawl_delay: float | None) -> float:
        """Adopt the stricter of (host's Crawl-delay, our configured floor)."""
        state = self._hosts[host]
        state.delay = max(self.default_delay, crawl_delay or 0.0)
        return state.delay

    def remaining_budget(self, host: str) -> int:
        state = self._hosts[host]
        self._evict(state)
        return max(0, self.hourly_cap - len(state.timestamps))

    def _evict(self, state: HostState) -> None:
        cutoff = time.monotonic() - 3600.0
        while state.timestamps and state.timestamps[0] < cutoff:
            state.timestamps.popleft()

    async def acquire(self, host: str) -> float:
        """Block until it is polite to hit ``host``. Returns seconds actually waited."""
        async with self._locks[host]:
            state = self._hosts[host]
            self._evict(state)
            if len(state.timestamps) >= self.hourly_cap:
                raise RateLimitExceeded(host, self.hourly_cap)

            now = time.monotonic()
            elapsed = now - state.last_request_at
            waited = 0.0
            if state.last_request_at and elapsed < state.delay:
                waited = state.delay - elapsed
                await asyncio.sleep(waited)
            stamp = time.monotonic()
            state.last_request_at = stamp
            state.timestamps.append(stamp)
            self.total_waited_seconds += waited
            return waited

    def snapshot(self) -> dict[str, dict[str, float | int]]:
        out: dict[str, dict[str, float | int]] = {}
        for host, state in self._hosts.items():
            self._evict(state)
            out[host] = {
                "delay_seconds": state.delay,
                "requests_last_hour": len(state.timestamps),
                "hourly_cap": self.hourly_cap,
                "remaining": max(0, self.hourly_cap - len(state.timestamps)),
            }
        return out
