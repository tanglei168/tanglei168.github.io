#!/usr/bin/env python3
"""指标数据 - 红黄旗状态。
大部分字段需要人工维护（季报数据），在 INDICATOR_VALUES 中更新。"""
import json
from datetime import datetime, timezone, timedelta
from pathlib import Path

import yaml

ROOT = Path(__file__).parent.parent
TICKERS_FILE = ROOT / "src" / "content" / "dashboard" / "tickers.yml"
OUTPUT_FILE = ROOT / "public" / "dashboard" / "snapshots" / "indicators.json"

CN_TZ = timezone(timedelta(hours=8))

# ========== 人工维护区域 — 每季度财报后更新 ==========
INDICATOR_VALUES = {
    "msft_capex":       {"value": "+138% YoY", "status": "green", "note": "$190B 指引，创纪录"},
    "googl_capex":      {"value": "持续增加",  "status": "green", "note": "$110B，2027 显著增加"},
    "meta_capex":       {"value": "$135B",      "status": "green", "note": "上调指引"},
    "amzn_capex":       {"value": "$120B",      "status": "green", "note": "持续投入"},
    "nvda_dc_revenue":  {"value": "+78% YoY",  "status": "green", "note": "Q1 财报 5/20"},
    "openai_growth":    {"value": "约 240% YoY","status": "green", "note": "ARR $24B"},
    "anthropic_growth": {"value": "约 1400% YoY","status":"green", "note": "ARR $30B"},
    "hbm_price":        {"value": "持续上涨",  "status": "green", "note": "供需仍紧张"},
    "alibaba_cloud":    {"value": "+18% YoY",  "status": "green", "note": "三年最快"},
}
# ========== 人工维护区域结束 ==========


def main():
    with open(TICKERS_FILE, "r", encoding="utf-8") as f:
        cfg = yaml.safe_load(f)

    indicators = []
    for ind in cfg["indicators"]:
        val = INDICATOR_VALUES.get(ind["id"], {})
        indicators.append({
            **ind,
            "current_value": val.get("value", "—"),
            "status": val.get("status", "unknown"),
            "note": val.get("note", "等待数据"),
        })

    output = {
        "last_updated": datetime.now(CN_TZ).isoformat(),
        "indicators": indicators,
        "systemic": {
            "capex_to_revenue_ratio": "13:1",
            "capex_to_revenue_status": "red",
            "capex_to_revenue_note": "2026 美国四大 $725B / AI 收入约 $54B",
            "history": [
                {"period": "2000 电信泡沫", "ratio": 6.0,  "status": "bubble"},
                {"period": "2005-10 互联网", "ratio": 0.25, "status": "healthy"},
                {"period": "2025 AI",        "ratio": 7.0,  "status": "warning"},
                {"period": "2026 AI",        "ratio": 13.0, "status": "warning"},
            ],
        },
    }

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"✓ 指标数据已更新: {len(indicators)} 个指标")


if __name__ == "__main__":
    main()
