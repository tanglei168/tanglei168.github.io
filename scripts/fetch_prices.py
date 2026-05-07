#!/usr/bin/env python3
"""每日抓取持仓基础数据 (PE / 市值 / 52 周区间)
实时价格由前端拉取，本脚本只更新慢变量。"""
import json
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

import yaml
import yfinance as yf

ROOT = Path(__file__).parent.parent
TICKERS_FILE = ROOT / "src" / "content" / "dashboard" / "tickers.yml"
OUTPUT_FILE = ROOT / "public" / "dashboard" / "snapshots" / "prices-latest.json"
HISTORY_DIR = ROOT / "public" / "dashboard" / "snapshots" / "history"

CN_TZ = timezone(timedelta(hours=8))


def fetch_one(ticker_info):
    ticker = ticker_info["ticker"]
    try:
        t = yf.Ticker(ticker)
        info = t.info or {}
        hist = t.history(period="2d")

        if hist.empty:
            raise ValueError(f"无历史数据: {ticker}")

        last_close = float(hist["Close"].iloc[-1])
        prev_close = float(hist["Close"].iloc[-2]) if len(hist) > 1 else last_close
        change_pct = (last_close - prev_close) / prev_close * 100 if prev_close else 0

        week52_high = info.get("fiftyTwoWeekHigh") or last_close
        week52_low = info.get("fiftyTwoWeekLow") or last_close
        from_high_pct = (last_close - week52_high) / week52_high * 100 if week52_high else 0

        return {
            **ticker_info,
            "price": round(last_close, 2),
            "change_pct": round(change_pct, 2),
            "pe_ttm": info.get("trailingPE"),
            "pe_forward": info.get("forwardPE"),
            "market_cap": info.get("marketCap"),
            "week52_high": round(week52_high, 2),
            "week52_low": round(week52_low, 2),
            "from_high_pct": round(from_high_pct, 2),
            "currency": info.get("currency", "USD"),
            "fetched_at": datetime.now(CN_TZ).isoformat(),
            "status": "ok",
        }
    except Exception as e:
        print(f"[WARN] {ticker} 抓取失败: {e}", file=sys.stderr)
        return {
            **ticker_info,
            "status": "error",
            "error": str(e),
            "fetched_at": datetime.now(CN_TZ).isoformat(),
        }


def main():
    with open(TICKERS_FILE, "r", encoding="utf-8") as f:
        cfg = yaml.safe_load(f)

    result = {
        "last_updated": datetime.now(CN_TZ).isoformat(),
        "cn": [fetch_one(t) for t in cfg["holdings"]["cn"]],
        "us": [fetch_one(t) for t in cfg["holdings"]["us"]],
    }

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    HISTORY_DIR.mkdir(parents=True, exist_ok=True)
    today = datetime.now(CN_TZ).strftime("%Y-%m-%d")
    with open(HISTORY_DIR / f"{today}.json", "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    ok_count = sum(1 for x in result["cn"] + result["us"] if x.get("status") == "ok")
    total = len(result["cn"]) + len(result["us"])
    print(f"✓ 价格数据已更新: {ok_count}/{total} 成功")


if __name__ == "__main__":
    main()
