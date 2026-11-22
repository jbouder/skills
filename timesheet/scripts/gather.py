#!/usr/bin/env python3
"""Gather local evidence for a weekly timesheet.

Reads, for one week:
  - Claude Code session transcripts (~/.claude/projects/*/*.jsonl): active
    minutes per local day (gaps over idleMinutes are idle), split across the
    repos each session edited
  - the user's commits across every git repo under the repos dir
  - the user's GitHub PRs: authored, reviewed (with review times) and commented
  - Claude Code memory for each repo that had activity
  - the private config (~/.claude/timesheet/config.json) and the project
    each repo maps to under its rules

Prints one JSON document. Nothing is written. Every source is optional: a
missing file or a failing command becomes a note in "warnings".

Usage:
  gather.py [--start YYYY-MM-DD] [--end YYYY-MM-DD] [--last] [--no-github]

Each session carries its active spans and whether it is personal (ignored),
for day_hours.py.

Without dates the window is Monday to Friday of the current week (on a
weekend, the week that just ended). --last picks the week before that.
"""

import argparse
import json
import os
import re
import subprocess
import sys
from datetime import date, datetime, time, timedelta
from pathlib import Path

HOME = Path.home()
CONFIG_PATH = Path(os.environ.get("TIMESHEET_CONFIG", HOME / ".claude" / "timesheet" / "config.json"))
STANDUP_CONFIG = HOME / ".claude" / "standup.json"
PROJECTS_DIR = HOME / ".claude" / "projects"
SKIP_DIRS = {"node_modules", ".venv", "venv", "dist", "build", ".git", "__pycache__", ".tox"}

DEFAULT_CONFIG = {
    "hoursPerDay": 8,
    "increment": 0.25,
    "minMeetingHours": 0.5,
    "overtimeThreshold": 1,
    "workDays": [0, 1, 2, 3, 4],
    "reposDir": None,
    "maxRepoDepth": 3,
    "idleMinutes": 10,
    "outputDir": "~/timesheets",
    "internalProject": "Internal",
    "workTypes": ["Meetings", "Development", "Design", "Planning", "Admin"],
    "rules": [],
    "ignore": [],
}

warnings = []


def expand(p):
    return Path(os.path.expanduser(p)) if p else None


def load_config():
    cfg = dict(DEFAULT_CONFIG)
    exists = CONFIG_PATH.exists()
    if exists:
        try:
            cfg.update(json.loads(CONFIG_PATH.read_text()))
        except Exception as e:  # noqa: BLE001
            warnings.append(f"config unreadable ({e}); using defaults")
    if not cfg.get("reposDir"):
        try:
            cfg["reposDir"] = json.loads(STANDUP_CONFIG.read_text()).get("reposDir")
        except Exception:  # noqa: BLE001
            pass
    cfg["reposDir"] = cfg.get("reposDir") or "~/repos"
    return cfg, exists


def run(args, cwd=None, timeout=30):
    try:
        r = subprocess.run(args, cwd=cwd, capture_output=True, text=True, timeout=timeout)
    except Exception as e:  # noqa: BLE001
        return None, str(e)
    if r.returncode != 0:
        return None, (r.stderr or r.stdout).strip()[:300]
    return r.stdout, None


def default_window(today, last):
    monday = today - timedelta(days=today.weekday())
    if today.weekday() >= 5 and not last:
        return monday, monday + timedelta(days=4)
    if last:
        monday -= timedelta(days=7)
    return monday, monday + timedelta(days=4)


def local_tz():
    return datetime.now().astimezone().tzinfo


def to_local(iso):
    s = iso.replace("Z", "+00:00")
    return datetime.fromisoformat(s).astimezone(local_tz())


def split_by_day(start, end):
    """Minutes per local date between two aware datetimes."""
    out = {}
    cur = start
    while cur < end:
        nxt = datetime.combine(cur.date() + timedelta(days=1), time.min, tzinfo=cur.tzinfo)
        seg_end = min(end, nxt)
        out[cur.date().isoformat()] = out.get(cur.date().isoformat(), 0) + round((seg_end - cur).total_seconds() / 60)
        cur = seg_end
    return out


# ---------- repos ----------

def find_repos(root, max_depth):
    repos = []
    if not root or not root.exists():
        warnings.append(f"repos dir {root} not found")
        return repos

    def walk(d, depth):
        try:
            entries = list(os.scandir(d))
        except OSError:
            return
        if any(e.name == ".git" for e in entries):
            repos.append(Path(d))
            return
        if depth >= max_depth:
            return
        for e in entries:
            if e.is_dir(follow_symlinks=False) and e.name not in SKIP_DIRS and not e.name.startswith("."):
                walk(e.path, depth + 1)

    walk(root, 0)
    return repos


def repo_meta(path, repos_root):
    rel = path.relative_to(repos_root) if repos_root in path.parents else Path(path.name)
    parts = rel.parts
    remote, _ = run(["git", "remote", "get-url", "origin"], cwd=path, timeout=5)
    remote = (remote or "").strip()
    m = re.search(r"[:/]([^/:]+)/([^/]+?)(?:\.git)?$", remote)
    return {
        "repo": path.name,
        "path": str(path),
        "folder": "/".join(parts[:-1]) or None,
        "remote": remote or None,
        "remoteOwner": m.group(1) if m else None,
    }


def author_emails(cfg):
    emails = set(cfg.get("authorEmails") or [])
    out, _ = run(["git", "config", "--global", "user.email"], timeout=5)
    if out and out.strip():
        emails.add(out.strip())
    return sorted(emails)


def commits_for(path, emails, since, until):
    args = ["git", "log", "--all", "--no-merges", f"--since={since}", f"--until={until}",
            "--format=%H\x1f%aI\x1f%ae\x1f%s"]
    for e in emails:
        args.append(f"--author={e}")
    out, err = run(args, cwd=path, timeout=20)
    if out is None:
        return []
    rows = []
    for line in out.splitlines():
        sha, when, _email, subject = (line.split("\x1f") + ["", "", "", ""])[:4]
        lt = to_local(when)
        rows.append({"sha": sha[:9], "date": lt.date().isoformat(), "time": lt.strftime("%H:%M"), "subject": subject})
    return rows


# ---------- rules ----------

def apply_rules(meta, rules, ignore):
    fields = {
        "repo": meta.get("repo") or "",
        "folder": meta.get("folder") or "",
        "remote": meta.get("remote") or "",
        "path": meta.get("path") or "",
    }
    # A rule wins over ignore, so one repo in an ignored folder can still count.
    for r in rules:
        on = r.get("on", "any")
        targets = fields.values() if on == "any" else [fields.get(on, "")]
        if any(t and re.search(r["match"], t, re.I) for t in targets):
            return {"project": r["project"], "type": r.get("type"), "by": r["match"]}
    for pat in ignore:
        if any(re.search(pat, v, re.I) for v in fields.values() if v):
            return {"ignored": True, "by": pat}
    return None


# ---------- Claude Code sessions ----------

def repo_of_path(p, repos):
    best = None
    for r in repos:
        rp = r["path"]
        if p == rp or p.startswith(rp + "/"):
            if best is None or len(rp) > len(best["path"]):
                best = r
    return best


def human_text(msg):
    c = (msg or {}).get("content")
    if isinstance(c, str):
        return c
    if isinstance(c, list):
        return " ".join(b.get("text", "") for b in c if isinstance(b, dict) and b.get("type") == "text")
    return ""


def parse_transcript(path, lo, hi):
    stamps, cwd, topic, files = [], None, "", {}
    with open(path, errors="replace") as fh:
        for line in fh:
            if '"timestamp"' not in line:
                continue
            try:
                d = json.loads(line)
            except Exception:  # noqa: BLE001
                continue
            if d.get("isSidechain") or not d.get("timestamp") or d.get("type") not in ("user", "assistant"):
                continue
            try:
                t = to_local(d["timestamp"])
            except ValueError:
                continue
            if d.get("cwd") and not cwd:
                cwd = d["cwd"]
            if d["type"] == "user" and not topic and (d.get("origin") or {}).get("kind", "human") == "human":
                text = human_text(d.get("message")).strip()
                if text and not text.startswith("<"):
                    topic = text[:240]
            if d["type"] == "assistant":
                for b in (d.get("message") or {}).get("content") or []:
                    if isinstance(b, dict) and b.get("type") == "tool_use" and b.get("name") in ("Edit", "Write", "NotebookEdit"):
                        fp = (b.get("input") or {}).get("file_path")
                        if fp:
                            files[fp] = files.get(fp, 0) + 1
            if lo <= t < hi:
                stamps.append(t)
    return sorted(stamps), cwd, topic, files


def active_intervals(stamps, idle):
    """Pairs of consecutive messages no more than `idle` minutes apart."""
    gap = timedelta(minutes=idle)
    out = []
    for a, b in zip(stamps, stamps[1:]):
        if b - a <= gap:
            if out and out[-1][1] == a:
                out[-1] = (out[-1][0], b)
            else:
                out.append((a, b))
    return out


def minutes_by_day(intervals):
    days = {}
    for a, b in intervals:
        for k, v in split_by_day(a, b).items():
            days[k] = days.get(k, 0) + v
    return {k: v for k, v in sorted(days.items()) if v}


def merge(intervals):
    out = []
    for a, b in sorted(intervals):
        if out and a <= out[-1][1]:
            out[-1] = (out[-1][0], max(out[-1][1], b))
        else:
            out.append((a, b))
    return out


def claude_sessions(start, end, repos, idle):
    if not PROJECTS_DIR.is_dir():
        warnings.append("no ~/.claude/projects; Claude Code session time not collected")
        return [], {}
    lo = datetime.combine(start, time.min, tzinfo=local_tz())
    hi = datetime.combine(end + timedelta(days=1), time.min, tzinfo=local_tz())
    out, every = [], []
    for f in PROJECTS_DIR.glob("*/*.jsonl"):
        try:
            if datetime.fromtimestamp(f.stat().st_mtime, tz=local_tz()) < lo:
                continue
        except OSError:
            continue
        stamps, cwd, topic, files = parse_transcript(f, lo, hi)
        spans = active_intervals(stamps, idle)
        if not spans:
            continue
        every.extend(spans)
        home = repo_of_path(cwd or "", repos)
        touched = {}
        for fp, n in files.items():
            full = fp if fp.startswith("/") else os.path.join(cwd or "", fp)
            r = repo_of_path(full, repos)
            key = r["path"] if r else "(outside repos)"
            touched[key] = touched.get(key, 0) + n
        out.append({
            "sessionId": f.stem,
            "first": stamps[0].strftime("%Y-%m-%d %H:%M"),
            "last": stamps[-1].strftime("%Y-%m-%d %H:%M"),
            "activeMinutesByDay": minutes_by_day(spans),
            "spans": [[a.strftime("%Y-%m-%dT%H:%M"), b.strftime("%Y-%m-%dT%H:%M")] for a, b in spans],
            "cwd": cwd,
            "repoPath": home["path"] if home else None,
            "topic": topic,
            "editsByRepo": touched,
        })
    out.sort(key=lambda s: s["first"])
    return out, minutes_by_day(merge(every))


# ---------- github ----------

def gh_json(args):
    out, err = run(["gh", *args], timeout=60)
    if out is None:
        warnings.append(f"gh {' '.join(args[:3])}: {err}")
        return []
    try:
        return json.loads(out)
    except Exception:  # noqa: BLE001
        return []


def github(start, end):
    rng = f"{start.isoformat()}..{end.isoformat()}"
    fields = "repository,title,number,url,state,updatedAt,createdAt,isDraft"
    authored = gh_json(["search", "prs", "--author", "@me", "--updated", rng, "--limit", "300", "--json", fields])
    reviewed = gh_json(["search", "prs", "--reviewed-by", "@me", "--updated", rng, "--limit", "100", "--json", fields])
    commented = gh_json(["search", "issues", "--commenter", "@me", "--updated", rng, "--limit", "100",
                         "--include-prs", "--json", "repository,title,number,url,updatedAt,isPullRequest"])
    login_out, _ = run(["gh", "api", "user", "--jq", ".login"], timeout=15)
    login = (login_out or "").strip()
    authored_urls = {p["url"] for p in authored}
    reviews = []
    for p in reviewed[:40]:
        if p["url"] in authored_urls:
            continue
        repo = p["repository"]["nameWithOwner"]
        data = gh_json(["api", f"repos/{repo}/pulls/{p['number']}/reviews", "--paginate"])
        for rv in data or []:
            if (rv.get("user") or {}).get("login") != login or not rv.get("submitted_at"):
                continue
            lt = to_local(rv["submitted_at"])
            if start <= lt.date() <= end:
                reviews.append({"repo": repo, "number": p["number"], "title": p["title"],
                                "date": lt.date().isoformat(), "time": lt.strftime("%H:%M"),
                                "state": rv.get("state")})

    def slim(items):
        return [{"repo": i["repository"]["nameWithOwner"], "number": i["number"], "title": i["title"],
                 "state": i.get("state"), "createdAt": i.get("createdAt"), "updatedAt": i.get("updatedAt")}
                for i in items]

    return {
        "login": login or None,
        "authoredPrs": slim(authored),
        "reviews": reviews,
        "commentedOn": [c for c in slim(commented) if c["repo"]],
    }


# ---------- memory ----------

def encode_project(path):
    return re.sub(r"[^A-Za-z0-9]", "-", path)


def read_description(md):
    try:
        head = md.read_text()[:1200]
    except OSError:
        return None
    m = re.search(r"^description:\s*\"?(.+?)\"?\s*$", head, re.M)
    return m.group(1)[:300] if m else None


def memory_for(paths):
    out = []
    for p in sorted(paths):
        d = PROJECTS_DIR / encode_project(p) / "memory"
        if not d.is_dir():
            continue
        files = []
        for md in sorted(d.glob("*.md")):
            if md.name == "MEMORY.md":
                continue
            files.append({"file": str(md), "description": read_description(md)})
        index = d / "MEMORY.md"
        out.append({
            "repoPath": p,
            "index": index.read_text()[:4000] if index.exists() else None,
            "files": files[:40],
        })
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--start")
    ap.add_argument("--end")
    ap.add_argument("--last", action="store_true", help="use the previous Monday to Friday")
    ap.add_argument("--no-github", action="store_true")
    a = ap.parse_args()

    cfg, cfg_exists = load_config()
    today = date.today()
    if a.start:
        start = date.fromisoformat(a.start)
        end = date.fromisoformat(a.end) if a.end else start + timedelta(days=4)
    else:
        start, end = default_window(today, a.last)

    repos_root = expand(cfg["reposDir"]).resolve()
    repo_paths = find_repos(repos_root, int(cfg.get("maxRepoDepth", 3)))
    repos = [repo_meta(p, repos_root) for p in repo_paths]

    emails = author_emails(cfg)
    if not emails:
        warnings.append("no git user.email; commits not collected")
    since = datetime.combine(start, time.min).isoformat()
    until = datetime.combine(end + timedelta(days=1), time.min).isoformat()

    seen = set()
    by_repo = {}
    for r in repos:
        rows = []
        for c in commits_for(r["path"], emails, since, until) if emails else []:
            if c["sha"] in seen:
                continue
            seen.add(c["sha"])
            rows.append(c)
        if rows:
            by_repo[r["path"]] = rows

    sessions, union_by_day = claude_sessions(start, end, repos, int(cfg.get("idleMinutes", 10)))

    active = set(by_repo)
    for s in sessions:
        if s["repoPath"]:
            active.add(s["repoPath"])
        active.update(k for k in s["editsByRepo"] if k.startswith("/"))

    repo_index = {r["path"]: r for r in repos}
    active_repos = []
    for p in sorted(active):
        meta = dict(repo_index.get(p) or {"repo": Path(p).name, "path": p})
        meta["mapping"] = apply_rules(meta, cfg.get("rules", []), cfg.get("ignore", []))
        meta["commits"] = by_repo.get(p, [])
        meta["sessionMinutesByDay"] = {}
        for s in sessions:
            edits = s["editsByRepo"]
            total = sum(edits.values())
            if total and p in edits:
                share = edits[p] / total
            elif not total and s["repoPath"] == p:
                share = 1.0
            else:
                continue
            for d, m in s["activeMinutesByDay"].items():
                meta["sessionMinutesByDay"][d] = meta["sessionMinutesByDay"].get(d, 0) + round(m * share)
        active_repos.append(meta)

    # A session is personal when every repo it touched is ignored, or, with no
    # repo, when its folder matches an ignore pattern.
    ignored_paths = {r["path"] for r in active_repos if (r["mapping"] or {}).get("ignored")}
    for s in sessions:
        keys = [k for k in s["editsByRepo"] if k.startswith("/")] or ([s["repoPath"]] if s["repoPath"] else [])
        if keys:
            s["ignored"] = all(k in ignored_paths for k in keys)
        else:
            rel = os.path.relpath(s["cwd"], repos_root) if s["cwd"] else ".."
            s["ignored"] = not rel.startswith("..") and any(re.search(p, rel, re.I) for p in cfg.get("ignore", []))

    gh = {} if a.no_github else github(start, end)

    days = []
    d = start
    while d <= end:
        days.append({"date": d.isoformat(), "weekday": d.strftime("%a"),
                     "workDay": d.weekday() in cfg.get("workDays", [0, 1, 2, 3, 4])})
        d += timedelta(days=1)

    print(json.dumps({
        "window": {"start": start.isoformat(), "end": end.isoformat(), "days": days,
                   "timezone": str(datetime.now().astimezone().tzname())},
        "config": {**cfg, "path": str(CONFIG_PATH), "exists": cfg_exists},
        "activeRepos": active_repos,
        "claudeActiveMinutesByDay": union_by_day,
        "sessions": sessions,
        "github": gh,
        "memory": memory_for(active),
        "warnings": warnings,
    }, indent=1))


if __name__ == "__main__":
    sys.exit(main())
