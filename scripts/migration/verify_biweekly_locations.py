"""Check one reviewed bulletin batch against the native map and its three public pages."""
import argparse
import gzip
import hashlib
import json
import re
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path


LABELS = {
    "de": {"counted": "Auf der Karte gezählt", "reference": "Nur Kartenreferenz", "unmapped": "Ohne bestätigten Kartenbezug"},
    "en": {"counted": "Counted on the map", "reference": "Map reference only", "unmapped": "No verified map match"},
    "zh": {"counted": "计入地图统计", "reference": "仅作地图参照，不计数", "unmapped": "尚无可核实地图位置"},
}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def digest(data):
    return hashlib.sha256(data).hexdigest()


class CardLabels(HTMLParser):
    def __init__(self):
        super().__init__()
        self.cards = {}
        self.card = None
        self.label = False

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if tag == "article" and "data-card" in values:
            self.card = values["data-card"]
            require(self.card not in self.cards, f"Duplicate displayed card {self.card}")
            self.cards[self.card] = []
        if tag == "p" and self.card is not None and "data-map-status" in values:
            self.label = True
            self.cards[self.card].append([values["data-map-status"], ""])

    def handle_data(self, data):
        if self.label:
            self.cards[self.card][-1][1] += data

    def handle_endtag(self, tag):
        if tag == "p":
            self.label = False
        if tag == "article":
            self.card = None
            self.label = False


def native_loader(site):
    manifest = json.loads((site / "safety/manifest.json").read_bytes())
    index = json.loads((site / "safety/lossless/index.json").read_bytes())
    prefix = "/safety/" + manifest["generation"] + "/"
    def asset(record):
        path = record["path"]
        require(re.fullmatch(r"/safety/lossless/(?:registry-[0-9a-f]{64}\.json|[0-9a-f]{64}\.json\.gz)", path), "Invalid map asset path")
        data = (site / path[1:]).read_bytes()
        require(digest(data) == record["sha256"], f"Changed map asset {path}")
        return data
    def load(logical):
        name = prefix + logical
        page, = [p for p in index["pages"] if p["firstLogicalPath"] <= name <= p["lastLogicalPath"]]
        entry, = [d for d in json.loads(asset(page))["descriptors"] if d["logicalPath"] == name]
        return json.loads(gzip.decompress(asset(entry)))
    return index["city"], manifest, load


def grid_counts(doc, mode):
    return Counter(i for cell in doc["hex"][mode]["features"] for i in cell["properties"]["event_ids"])


def verify(site, city, batch):
    require(re.fullmatch(r"\d{4}-\d{2}-\d{2}", batch), "Invalid bulletin batch")
    folder = site / "updates" / batch
    cards = json.loads((folder / "bulletins.json").read_bytes())
    by_id = {c["card_id"]: c for c in cards}
    require(len(by_id) == len(cards), "Duplicate source card")
    map_city, manifest, load = native_loader(site)
    require(map_city == city.lower(), "Map city mismatch")
    statuses = {}
    counted = set()
    for month in sorted({c["map_review"]["month"] for c in cards}):
        require(re.fullmatch(r"\d{4}-(0[1-9]|1[0-2])", month), "Invalid map month")
        doc = load("months/" + month + ".json")
        year = load(manifest["years"][month[:4]]["path"])
        grids = [grid_counts(x, mode) for x in (doc, year) for mode in ("overview", "detail")]
        for event in doc["events"]:
            key = event.get("provider_card_key")
            if key not in by_id:
                continue
            row = by_id[key]["map_review"]
            require(key not in statuses and key.startswith(city.lower() + ":") and row["month"] == month, f"{key}: card identity/month")
            loc = event.get("provider_location")
            require(isinstance(loc, dict) and digest(json.dumps(loc, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()) == row["location_sha256"], f"{key}: source location changed")
            require(row["source_sha256"] == event["source_sha256"] and re.fullmatch(r"[a-f0-9]{64}",row["review_sha256"]), f"{key}: review version")
            require(bool(row["police_id"]) and bool(row["reason"].strip()), f"{key}: review identity or reason missing")
            scenes = event.get("scene_locations") or []
            primaries = [s for s in scenes if s.get("primary_for_count") is True]
            shapes = [s for s in scenes if s.get("coordinates") or s.get("geometry") or s.get("candidate_road_geometry")]
            if primaries:
                require(len(primaries)==1 and loc["precision"]=="STREET" and None not in (loc["latitude"],loc["longitude"]) and event.get("coordinates") and primaries[0] in shapes, f"{key}: invalid primary point")
                require(row["police_id"] not in counted, f"{key}: police bulletin already counted")
                counted.add(row["police_id"])
                status = "counted"
            else:
                require(not event.get("coordinates"), f"{key}: point without count decision")
                status = "reference" if shapes else "unmapped"
            require(status == row["status"] and all(g[event["id"]] == int(status=="counted") for g in grids), f"{key}: map decision or hex count mismatch")
            statuses[key] = status
    require(statuses.keys()==by_id.keys(), "Public card missing from native monthly map")
    for lang, labels in LABELS.items():
        parser = CardLabels()
        parser.feed((folder / (lang+".html")).read_text())
        require(set(parser.cards)==set(by_id), f"{lang}: public card coverage")
        for key, status in statuses.items():
            require(parser.cards[key]==[[status, labels[status]]], f"{lang}/{key}: missing or incorrect visible map label")
    return Counter(statuses.values())


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("site",type=Path)
    parser.add_argument("city")
    parser.add_argument("batch")
    args=parser.parse_args()
    print(dict(verify(args.site,args.city,args.batch)))
