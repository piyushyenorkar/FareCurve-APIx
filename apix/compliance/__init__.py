"""Compliance layer — the part of APIx that decides whether a request may happen.

Everything here is deliberately *upstream* of the network. A source adapter cannot
issue a request without first obtaining an ``AccessDecision`` from
``apix.compliance.gate``, and the gate writes an audit row for every decision it
makes — allow or deny. That audit trail is the evidence that the ethical-scraping
claim in the pitch is a property of the code, not a sentence in a slide.
"""

from apix.compliance.audit import ComplianceAuditor
from apix.compliance.gate import AccessDecision, ComplianceGate, RobotsDeniedError
from apix.compliance.limiter import HostRateLimiter
from apix.compliance.robots import RobotsPolicy, RobotsRules, parse_robots_txt

__all__ = [
    "AccessDecision",
    "ComplianceAuditor",
    "ComplianceGate",
    "HostRateLimiter",
    "RobotsDeniedError",
    "RobotsPolicy",
    "RobotsRules",
    "parse_robots_txt",
]
