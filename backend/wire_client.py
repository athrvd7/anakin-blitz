import asyncio
import os
from urllib.parse import urljoin

import httpx

ACTION_ENV = {
    "reddit.search": "WIRE_ACTION_REDDIT_SEARCH",
    "hackernews.search": "WIRE_ACTION_HACKERNEWS_SEARCH",
    "github.search_repos": "WIRE_ACTION_GITHUB_SEARCH_REPOS",
    "github.repo": "WIRE_ACTION_GITHUB_REPO",
    "arxiv.search": "WIRE_ACTION_ARXIV_SEARCH",
    "wikipedia.summary": "WIRE_ACTION_WIKIPEDIA_SUMMARY",
}


class WireClient:
    def __init__(self) -> None:
        self.api_key = os.getenv("WIRE_API_KEY", "")
        self.base_url = os.getenv("WIRE_BASE_URL", "https://api.anakin.io/v1/wire")
        self.task_url = os.getenv("WIRE_TASK_URL") or f"{self.base_url}/task"

    @property
    def configured(self) -> bool:
        return bool(self.api_key)

    async def call(self, action: str, params: dict) -> dict:
        if not self.configured:
            raise RuntimeError("WIRE_API_KEY is not configured")

        action_id = self.action_id(action)
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(
                self.task_url,
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={"action_id": action_id, "params": params},
            )
            if response.is_error:
                raise RuntimeError(f"Wire HTTP {response.status_code}: {response.text[:300]}")
            data = response.json()
            if data.get("status") == "processing" and data.get("poll_url"):
                return await self.poll(client, data["poll_url"])
            return data

    def action_id(self, action: str) -> str:
        return os.getenv(ACTION_ENV.get(action, ""), action)

    async def poll(self, client: httpx.AsyncClient, poll_url: str) -> dict:
        url = urljoin(self.task_url, poll_url)
        for _ in range(40):
            await asyncio.sleep(0.5)
            response = await client.get(url, headers={"Authorization": f"Bearer {self.api_key}"})
            if response.is_error:
                raise RuntimeError(f"Wire poll HTTP {response.status_code}: {response.text[:300]}")
            data = response.json()
            status = data.get("status")
            if status in {"completed", "complete", "success", "done"}:
                return data.get("result") or data.get("data") or data
            if status in {"failed", "error"}:
                raise RuntimeError(f"Wire job failed: {str(data)[:300]}")
        raise RuntimeError("Wire job timed out")
