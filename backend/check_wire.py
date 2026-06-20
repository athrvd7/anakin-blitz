import asyncio
import sys
from pathlib import Path

from dotenv import load_dotenv

from wire_client import WireClient


async def main() -> None:
    load_dotenv(Path(__file__).with_name(".env"))
    action = sys.argv[1] if len(sys.argv) > 1 else "reddit.search"
    client = WireClient()
    print(f"url={client.task_url}")
    print(f"action={client.action_id(action)}")
    try:
        data = await client.call(action, {"query": "LangGraph", "limit": 1})
        print("ok", str(data)[:1000])
    except Exception as exc:
        print(type(exc).__name__, str(exc)[:1000])


if __name__ == "__main__":
    asyncio.run(main())
