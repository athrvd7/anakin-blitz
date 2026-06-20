import json
import os

import httpx

from prompts import PLAN_PROMPT, SOURCE_SUMMARY_PROMPT, VERDICT_PROMPT


class LLMClient:
    def __init__(self) -> None:
        self.api_key = os.getenv("MISTRAL_API_KEY", "")
        self.model = os.getenv("MISTRAL_MODEL", "mistral-small-latest")

    @property
    def configured(self) -> bool:
        return bool(self.api_key)

    async def generate(self, prompt: str, *, json_mode: bool = False) -> str:
        if not self.configured:
            raise RuntimeError("MISTRAL_API_KEY is not configured")

        body = {
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.2,
        }
        if json_mode:
            body["response_format"] = {"type": "json_object"}

        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                "https://api.mistral.ai/v1/chat/completions",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json=body,
            )
            if response.is_error:
                raise RuntimeError(f"Mistral HTTP {response.status_code}: {response.text[:300]}")
            data = response.json()
            return data["choices"][0]["message"]["content"]

    async def plan_tools(self, query: str, max_sources: int) -> list[dict]:
        text = await self.generate(PLAN_PROMPT.format(query=query), json_mode=True)
        data = json.loads(text)
        tools = data.get("tools", data) if isinstance(data, dict) else data
        if not isinstance(tools, list):
            return []
        return [tool for tool in tools if isinstance(tool, dict) and "type" in tool][:max_sources]

    async def summarize_source(self, query: str, result: dict) -> str:
        raw = json.dumps(result.get("data", {}), ensure_ascii=False)[:8000]
        return await self.generate(
            SOURCE_SUMMARY_PROMPT.format(
                source_name=result["source"],
                query=query,
                raw_data=raw,
            )
        )

    async def verdict(self, query: str, summaries: list[str]) -> str:
        source_summaries = "\n".join(summaries)[:12000]
        return await self.generate(
            VERDICT_PROMPT.format(
                query=query,
                source_summaries=source_summaries,
            )
        )
