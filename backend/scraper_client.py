import os

import httpx


class ScraperClient:
    def __init__(self) -> None:
        self.api_key = os.getenv("ANAKIN_SCRAPER_API_KEY", "")
        self.base_url = os.getenv("SCRAPER_BASE_URL", "https://api.anakin.io/v1/scrape")

    @property
    def configured(self) -> bool:
        return bool(self.api_key)

    async def fetch(self, url: str) -> dict:
        if not self.configured:
            raise RuntimeError("ANAKIN_SCRAPER_API_KEY is not configured")

        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(
                self.base_url,
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={"url": url, "format": "markdown"},
            )
            if response.is_error:
                raise RuntimeError(f"Scraper HTTP {response.status_code}: {response.text[:300]}")
            return response.json()
