#!/usr/bin/env python3
"""8 维度炒作识别评分，从 tickers.yml 读取并计算等级。"""
import json
from datetime import datetime, timezone, timedelta
from pathlib import Path

import yaml

ROOT = Path(__file__).parent.parent
TICKERS_FILE = ROOT / "src" / "content" / "dashboard" / "tickers.yml"
OUTPUT_FILE = ROOT / "public" / "dashboard" / "snapshots" / "hype-scores.json"

CN_TZ = timezone(timedelta(hours=8))


def classify(total):
    if total >= 18:
        return "strong"
    elif total >= 12:
        return "moderate"
    elif total >= 8:
        return "partial"
    else:
        return "hype"


def main():
    with open(TICKERS_FILE, "r", encoding="utf-8") as f:
        cfg = yaml.safe_load(f)

    domains = []
    for d in cfg["hype_assessment"]["domains"]:
        total = sum(d["scores"])
        domains.append({
            **d,
            "total": total,
            "max": 24,
            "level": classify(total),
        })

    output = {
        "last_updated": datetime.now(CN_TZ).isoformat(),
        "dimensions": cfg["hype_assessment"]["dimensions"],
        "domains": domains,
        "core_principle": "真趋势是叙事最终被现金流验证，炒作是叙事永远在等待现金流验证",
    }

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"✓ 炒作评分已更新: {len(domains)} 个领域")


if __name__ == "__main__":
    main()
