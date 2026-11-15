"""Model providers behind one interface. Backend only; keys never leave the server or logs.

gemini     -> google-genai          (GEMINI_API_KEY)
anthropic  -> anthropic SDK          (ANTHROPIC_API_KEY)
simulated  -> deterministic local stand-in, no network, clearly labelled "simulated"
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass

from app.config import get_settings

# Set by the seed script so demo history never makes paid calls, even when keys are present.
FORCE_SIMULATE = False


class ProviderError(Exception):
    """A provider call failed (network, auth, quota, timeout, refusal, empty output)."""


@dataclass
class ProviderResult:
    text: str
    input_tokens: int
    output_tokens: int
    simulated: bool


def call(
    provider: str, model: str, system: str, prompt: str, timeout: int, max_tokens: int = 1200
) -> ProviderResult:
    s = get_settings()
    if FORCE_SIMULATE:
        return _simulate(system, prompt)
    if provider == "gemini":
        if s.gemini_api_key is None:
            if s.ai_demo_simulate:
                return _simulate(system, prompt)
            raise ProviderError("no GEMINI_API_KEY configured")
        return _gemini(s.gemini_api_key.get_secret_value(), model, system, prompt, timeout)
    if provider == "anthropic":
        if s.anthropic_api_key is None:
            if s.ai_demo_simulate:
                return _simulate(system, prompt)
            raise ProviderError("no ANTHROPIC_API_KEY configured")
        return _anthropic(
            s.anthropic_api_key.get_secret_value(), model, system, prompt, timeout, max_tokens
        )
    if provider == "simulated":
        return _simulate(system, prompt)
    raise ProviderError(f"unknown provider {provider!r}")


def _gemini(key: str, model: str, system: str, prompt: str, timeout: int) -> ProviderResult:
    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=key, http_options=types.HttpOptions(timeout=timeout * 1000))
        resp = client.models.generate_content(
            model=model,
            contents=prompt,
            config=types.GenerateContentConfig(system_instruction=system),
        )
    except Exception as exc:  # never include exception text: it can echo request details
        raise ProviderError(f"gemini call failed ({type(exc).__name__})") from None
    text = (resp.text or "").strip()
    if not text:
        raise ProviderError("gemini returned no text")
    usage = resp.usage_metadata
    return ProviderResult(
        text=text,
        input_tokens=int(getattr(usage, "prompt_token_count", 0) or 0),
        output_tokens=int(getattr(usage, "candidates_token_count", 0) or 0),
        simulated=False,
    )


def _anthropic(
    key: str, model: str, system: str, prompt: str, timeout: int, max_tokens: int
) -> ProviderResult:
    import anthropic

    client = anthropic.Anthropic(api_key=key, timeout=float(timeout), max_retries=1)
    try:
        # Short rewording task: low effort keeps cost and latency down.
        resp = client.messages.create(
            model=model,
            max_tokens=max_tokens,
            system=system,
            output_config={"effort": "low"},
            messages=[{"role": "user", "content": prompt}],
        )
    except anthropic.RateLimitError:
        raise ProviderError("anthropic rate limited") from None
    except anthropic.APITimeoutError:
        raise ProviderError("anthropic timeout") from None
    except anthropic.APIStatusError as exc:
        raise ProviderError(f"anthropic HTTP {exc.status_code}") from None
    except anthropic.APIConnectionError:
        raise ProviderError("anthropic connection error") from None
    if resp.stop_reason == "refusal":
        raise ProviderError("anthropic declined the request")
    text = "".join(b.text for b in resp.content if b.type == "text").strip()
    if not text:
        raise ProviderError("anthropic returned no text")
    return ProviderResult(
        text=text,
        input_tokens=resp.usage.input_tokens,
        output_tokens=resp.usage.output_tokens,
        simulated=False,
    )


TONE_OPENERS = {
    "formal": "We write regarding",
    "friendly": "Thank you for working with us on",
    "firm": "We need your prompt attention regarding",
    "concise": "Re:",
}


def _simulate(system: str, prompt: str) -> ProviderResult:
    """Deterministic stand-in so the governance features can be demonstrated without keys."""
    if "Return JSON" in system:  # critique task
        issues = []
        if len(prompt) > 1400:
            issues.append("Message is long; consider trimming the introduction.")
        if "?" not in prompt:
            issues.append("Consider inviting questions explicitly.")
        score = 5 - len(issues)
        verdict = "ok" if score >= 4 else "revise"
        text = json.dumps({"score": score, "verdict": verdict, "issues": issues})
    else:
        tone = re.search(r"Tone: (\w+)", system)
        t = tone.group(1).lower() if tone else "formal"
        body = prompt.split("---\n", 1)[-1]
        text = re.sub(r"^Regarding", TONE_OPENERS.get(t, "Regarding"), body, count=1, flags=re.M)
        if t == "friendly":
            text = text.replace("Please share", "Could you please share")
        if t == "firm":
            text = text.replace("Please share", "Please make sure you share")
    return ProviderResult(
        text=text,
        input_tokens=max(1, (len(system) + len(prompt)) // 4),
        output_tokens=max(1, len(text) // 4),
        simulated=True,
    )
