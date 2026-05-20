#!/usr/bin/env python3
import json
import sys
import os

try:
    from paddleocr import PaddleOCR
except ImportError:
    print(json.dumps({"error": "PaddleOCR not installed. Run: pip install paddlepaddle paddleocr"}))
    sys.exit(1)


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Missing image path argument"}))
        sys.exit(1)

    image_path = sys.argv[1]
    if not os.path.exists(image_path):
        print(json.dumps({"error": f"Image not found: {image_path}"}))
        sys.exit(1)

    ocr = PaddleOCR(use_angle_cls=True, lang="en", show_log=False)
    result = ocr.ocr(image_path, cls=True)

    if not result or not result[0]:
        print(json.dumps({"error": "No text detected in image"}))
        sys.exit(0)

    lines = []
    for line in result[0]:
        bbox, (text, confidence) = line
        x_center = (bbox[0][0] + bbox[2][0]) / 2
        y_center = (bbox[0][1] + bbox[2][1]) / 2
        lines.append({
            "text": text,
            "confidence": round(confidence, 3),
            "x": round(x_center, 1),
            "y": round(y_center, 1),
        })

    # Group by row (same y = same receipt line)
    lines.sort(key=lambda l: (l["y"], l["x"]))
    rows = []
    current_row = []
    current_y = None
    for l in lines:
        if current_y is None:
            current_y = l["y"]
            current_row = [l]
        elif abs(l["y"] - current_y) < 20:
            current_row.append(l)
        else:
            rows.append(current_row)
            current_y = l["y"]
            current_row = [l]
    if current_row:
        rows.append(current_row)

    # Build receipt lines: combine text left-to-right within each row
    receipt_lines = []
    for row in rows:
        row.sort(key=lambda l: l["x"])
        combined = " ".join(l["text"] for l in row).strip()
        avg_conf = round(sum(l["confidence"] for l in row) / len(row), 3)
        avg_x = round(sum(l["x"] for l in row) / len(row), 1)
        avg_y = round(current_y, 1) if current_y == row[0]["y"] else round(sum(l["y"] for l in row) / len(row), 1)
        if combined:
            receipt_lines.append({
                "text": combined,
                "confidence": avg_conf,
                "x": avg_x,
                "y": avg_y,
            })

    output = {
        "success": True,
        "lines": receipt_lines,
    }
    print(json.dumps(output))


if __name__ == "__main__":
    main()
