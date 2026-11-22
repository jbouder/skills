#!/usr/bin/env python3
"""Estimate how long each day really was, for the overtime check.

Usage:
  day_hours.py <gather.json> <meetings.json>

meetings.json is a list of the meetings counted on the sheet, each
{"start": "YYYY-MM-DDTHH:MM", "end": "YYYY-MM-DDTHH:MM"} in local time.

For each day it prints:
  meetingHours  the meetings' union, each overlap-free block counted at
                least minMeetingHours
  workHours     active time in Claude Code sessions that are not personal,
                outside those meetings
  evidenceHours the two added together
  overtime      true when evidenceHours >= hoursPerDay + overtimeThreshold
  target        the hours the day should add up to

Claude Code time misses work done elsewhere and can include stretches where
an agent ran while the user did something else, so this is an estimate.
"""

import json
import sys
from datetime import datetime, timedelta


def parse(s):
    return datetime.fromisoformat(s[:16])


def merge(intervals):
    out = []
    for a, b in sorted(intervals):
        if out and a <= out[-1][1]:
            out[-1] = (out[-1][0], max(out[-1][1], b))
        else:
            out.append((a, b))
    return out


def subtract(spans, holes):
    out = []
    for a, b in spans:
        cur = [(a, b)]
        for h0, h1 in holes:
            nxt = []
            for x, y in cur:
                if h1 <= x or h0 >= y:
                    nxt.append((x, y))
                    continue
                if x < h0:
                    nxt.append((x, h0))
                if h1 < y:
                    nxt.append((h1, y))
            cur = nxt
        out.extend(cur)
    return out


def hours(intervals):
    return sum((b - a).total_seconds() for a, b in intervals) / 3600


def main():
    week = json.load(open(sys.argv[1]))
    meetings = json.load(open(sys.argv[2]))
    cfg = week["config"]
    per_day = float(cfg.get("hoursPerDay", 8))
    threshold = float(cfg.get("overtimeThreshold", 1))
    floor = float(cfg.get("minMeetingHours", 0.5))
    inc = float(cfg.get("increment", 0.25))

    blocks = merge([(parse(m["start"]), parse(m["end"])) for m in meetings])
    work = merge([(parse(a), parse(b)) for s in week["sessions"] if not s.get("ignored")
                  for a, b in s.get("spans", [])])
    work = subtract(work, blocks)

    out = {}
    for day in week["window"]["days"]:
        d = datetime.fromisoformat(day["date"])
        lo, hi = d, d + timedelta(days=1)
        clip = lambda iv: [(max(a, lo), min(b, hi)) for a, b in iv if b > lo and a < hi]
        mh = sum(max(hours([blk]), floor) for blk in clip(blocks))
        wh = hours(clip(work))
        ev = mh + wh
        over = ev >= per_day + threshold
        target = round(ev / inc) * inc if over else (per_day if day["workDay"] else 0)
        out[day["date"]] = {"meetingHours": round(mh, 2), "workHours": round(wh, 2),
                            "evidenceHours": round(ev, 2), "overtime": over, "target": target}
    print(json.dumps(out, indent=1))


if __name__ == "__main__":
    sys.exit(main())
