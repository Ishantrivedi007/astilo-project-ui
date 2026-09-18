"""One-off seed for the Store catalogue — adds more realistic products with
real photos, detailed descriptions, and an Amazon-style categorized spec
sheet (the `specs` JSON column: [{"group": ..., "items": [{"label", "value"}]}]).

Run from the astilo-project-be directory:
    python -m scripts.seed_demo_products
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db import get_session, init_db  # noqa: E402
from app.models import Product  # noqa: E402


def specs(*groups):
    """groups: list of (group_name, [(label, value), ...])"""
    return [{"group": g, "items": [{"label": l, "value": v} for l, v in items]} for g, items in groups]


PRODUCTS = [
    {
        "name": "Nova X12 Smartphone",
        "category": "Mobiles",
        "price": 699.0,
        "stock": 34,
        "image_url": "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800",
        "description": (
            "The Nova X12 packs a 6.7\" AMOLED display, a triple-camera system with a 50MP "
            "main sensor, and all-day battery life into a sleek aluminum-and-glass body. "
            "5G-ready, IP68 water resistant, and fast enough for anything you throw at it."
        ),
        "specs": specs(
            ("Display", [
                ("Screen size", "6.7 inches"),
                ("Type", "AMOLED, 120Hz"),
                ("Resolution", "2412 x 1080"),
                ("Peak brightness", "1500 nits"),
            ]),
            ("Camera", [
                ("Main", "50MP, f/1.8, OIS"),
                ("Ultra-wide", "12MP, f/2.2"),
                ("Telephoto", "10MP, 3x optical zoom"),
                ("Front", "32MP, f/2.4"),
            ]),
            ("Battery & Charging", [
                ("Capacity", "5000mAh"),
                ("Wired charging", "45W fast charging"),
                ("Wireless charging", "15W"),
                ("Est. video playback", "Up to 20 hours"),
            ]),
            ("Performance", [
                ("Chipset", "Octa-core, 4nm"),
                ("RAM", "8GB"),
                ("Storage", "256GB, expandable"),
            ]),
            ("Connectivity & Build", [
                ("Network", "5G"),
                ("Water resistance", "IP68"),
                ("Ports", "USB-C"),
                ("Weight", "189g"),
            ]),
        ),
    },
    {
        "name": "AeroBook 14 Laptop",
        "category": "Laptops",
        "price": 1099.0,
        "stock": 18,
        "image_url": "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800",
        "description": (
            "A 14-inch ultraportable built for creators and multitaskers alike. The AeroBook 14 "
            "pairs a razor-thin magnesium chassis with a vivid 2.8K display, a full day of "
            "battery life, and enough power under the hood for video editing on the go."
        ),
        "specs": specs(
            ("Display", [
                ("Screen size", "14 inches"),
                ("Resolution", "2880 x 1800 (2.8K)"),
                ("Refresh rate", "90Hz"),
                ("Brightness", "400 nits"),
            ]),
            ("Performance", [
                ("Processor", "8-core, up to 4.8GHz"),
                ("RAM", "16GB LPDDR5"),
                ("Storage", "512GB NVMe SSD"),
                ("Graphics", "Integrated 10-core GPU"),
            ]),
            ("Battery & Ports", [
                ("Battery life", "Up to 18 hours"),
                ("Charging", "65W USB-C fast charge"),
                ("Ports", "2x USB-C, 1x USB-A, HDMI, headphone jack"),
            ]),
            ("Build", [
                ("Material", "CNC-machined magnesium alloy"),
                ("Weight", "1.29 kg"),
                ("Keyboard", "Backlit, 1.3mm travel"),
            ]),
        ),
    },
    {
        "name": "Halcyon Pro Noise-Cancelling Headphones",
        "category": "Audio",
        "price": 249.0,
        "stock": 46,
        "image_url": "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=800",
        "description": (
            "Over-ear comfort meets studio-grade sound. Adaptive active noise cancellation "
            "blocks out the world, while 40mm drivers deliver rich, balanced audio for up to "
            "40 hours on a single charge. Includes a multipoint Bluetooth connection for "
            "seamless device switching."
        ),
        "specs": specs(
            ("Audio", [
                ("Driver size", "40mm dynamic"),
                ("Frequency response", "18Hz–24kHz"),
                ("Noise cancellation", "Adaptive ANC, up to 38dB reduction"),
                ("Codec support", "LDAC, AAC, SBC"),
            ]),
            ("Battery", [
                ("Playback (ANC on)", "Up to 32 hours"),
                ("Playback (ANC off)", "Up to 40 hours"),
                ("Fast charge", "10 min = 5 hours playback"),
            ]),
            ("Connectivity & Fit", [
                ("Bluetooth", "5.3, multipoint"),
                ("Weight", "254g"),
                ("Foldable", "Yes, with carrying case"),
            ]),
        ),
    },
    {
        "name": "Pulse Fit 3 Smartwatch",
        "category": "Wearables",
        "price": 179.0,
        "stock": 29,
        "image_url": "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800",
        "description": (
            "Track every workout, heartbeat, and night's sleep with the Pulse Fit 3. A bright "
            "always-on AMOLED display, built-in GPS, and 7-day battery life make it the "
            "companion that keeps up whether you're training or just getting through the day."
        ),
        "specs": specs(
            ("Display", [
                ("Screen", "1.4\" AMOLED, always-on"),
                ("Resolution", "454 x 454"),
                ("Glass", "Sapphire crystal"),
            ]),
            ("Health & Fitness", [
                ("Heart rate", "24/7 optical HR sensor"),
                ("SpO2", "Yes"),
                ("GPS", "Built-in, dual-band"),
                ("Water resistance", "5ATM"),
                ("Sport modes", "110+"),
            ]),
            ("Battery", [
                ("Typical use", "Up to 7 days"),
                ("With GPS on", "Up to 24 hours"),
                ("Charging", "Magnetic fast charge, 0-100% in 75 min"),
            ]),
            ("Build", [
                ("Case material", "Aerospace aluminum"),
                ("Weight", "38g (without band)"),
                ("Band", "Interchangeable silicone"),
            ]),
        ),
    },
    {
        "name": "Ridgeline 27\" 4K Monitor",
        "category": "Electronics",
        "price": 429.0,
        "stock": 21,
        "image_url": "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800",
        "description": (
            "A 27-inch 4K IPS monitor tuned for both work and play — 99% sRGB color accuracy "
            "for creative work, and a 144Hz refresh rate with HDR400 for everything else. "
            "Height, tilt, and swivel adjustable stand included."
        ),
        "specs": specs(
            ("Display", [
                ("Size", "27 inches"),
                ("Resolution", "3840 x 2160 (4K UHD)"),
                ("Panel type", "IPS"),
                ("Refresh rate", "144Hz"),
                ("HDR", "HDR400"),
                ("Color accuracy", "99% sRGB, Delta E < 2"),
            ]),
            ("Connectivity", [
                ("Ports", "2x HDMI 2.1, 1x DisplayPort 1.4, USB-C (90W PD)"),
                ("Speakers", "Built-in 2x 3W"),
            ]),
            ("Ergonomics", [
                ("Adjustments", "Height, tilt, swivel, pivot"),
                ("VESA mount", "100 x 100mm"),
            ]),
        ),
    },
    {
        "name": "Trailhead 45L Hiking Backpack",
        "category": "Bags",
        "price": 129.0,
        "stock": 33,
        "image_url": "https://images.unsplash.com/photo-1622260614153-03223fb72052?w=800",
        "description": (
            "Built for multi-day treks, the Trailhead 45L combines a ventilated back panel, "
            "an adjustable torso-length harness, and a rain-ready weatherproof shell — with "
            "enough room for everything from a tent to a week of layers."
        ),
        "specs": specs(
            ("Capacity & Fit", [
                ("Volume", "45 liters"),
                ("Torso fit", "Adjustable, S–XL"),
                ("Frame", "Internal aluminum stays"),
            ]),
            ("Materials", [
                ("Fabric", "420D ripstop nylon"),
                ("Water resistance", "DWR coating + rain cover included"),
            ]),
            ("Features", [
                ("Compartments", "Main, sleeping bag, hydration sleeve, 6 pockets"),
                ("Hip belt", "Padded, with gear loops"),
                ("Weight", "1.9 kg"),
            ]),
        ),
    },
    {
        "name": "Solstice Mirrorless Camera",
        "category": "Electronics",
        "price": 1299.0,
        "stock": 12,
        "image_url": "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800",
        "description": (
            "A full-frame mirrorless camera for photographers who refuse to compromise. "
            "26MP stacked sensor, 8K video, and in-body stabilization make the Solstice equally "
            "at home shooting weddings, wildlife, or your next short film."
        ),
        "specs": specs(
            ("Sensor & Image", [
                ("Sensor", "26MP full-frame stacked CMOS"),
                ("ISO range", "100–51200 (expandable to 204800)"),
                ("Image stabilization", "5-axis in-body, up to 8 stops"),
            ]),
            ("Video", [
                ("Max resolution", "8K30 / 4K120"),
                ("Color depth", "10-bit 4:2:2 internal"),
            ]),
            ("Autofocus", [
                ("System", "759-point phase detection"),
                ("Subject tracking", "Human, animal, vehicle"),
            ]),
            ("Build", [
                ("Body", "Magnesium alloy, weather-sealed"),
                ("Viewfinder", "9.44M-dot OLED EVF"),
                ("Battery life", "Up to 700 shots"),
            ]),
        ),
    },
    {
        "name": "Bassline Studio Monitor Speakers (Pair)",
        "category": "Audio",
        "price": 219.0,
        "stock": 24,
        "image_url": "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800",
        "description": (
            "Reference-quality studio monitors for mixing, mastering, and critical listening. "
            "A 5-inch woofer and silk-dome tweeter deliver a flat frequency response so you "
            "hear your mix exactly as it is — no coloration, no surprises."
        ),
        "specs": specs(
            ("Audio", [
                ("Woofer", "5-inch Kevlar-reinforced"),
                ("Tweeter", "1-inch silk dome"),
                ("Frequency response", "45Hz–22kHz"),
                ("Amplifier", "Bi-amped, 100W total"),
            ]),
            ("Connectivity", [
                ("Inputs", "XLR, TRS, RCA"),
                ("Controls", "Room EQ switches, volume"),
            ]),
            ("Build", [
                ("Enclosure", "MDF, acoustically damped"),
                ("Weight (each)", "5.4 kg"),
            ]),
        ),
    },
]


def main():
    init_db()
    created = 0
    with get_session() as session:
        for p in PRODUCTS:
            if session.query(Product).filter_by(name=p["name"]).first():
                print(f"skip (exists): {p['name']}")
                continue
            product = Product(
                name=p["name"],
                description=p["description"],
                price=p["price"],
                image_url=p["image_url"],
                category=p["category"],
                stock=p["stock"],
                specs=p["specs"],
            )
            session.add(product)
            created += 1
            print(f"created: {p['name']}")
    print(f"\nDone — {created} product(s) added.")


if __name__ == "__main__":
    main()
