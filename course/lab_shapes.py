"""CPU processor evidence; optional GPU inference. Never invent model answers."""
import argparse
import importlib.metadata
import json
import platform
from pathlib import Path

import torch
from PIL import Image, ImageDraw
from transformers import AutoProcessor

ROOT = Path(__file__).resolve().parent
MODELS = {
    "llava": "llava-hf/llava-1.5-7b-hf",
    "qwen": "Qwen/Qwen2.5-VL-3B-Instruct",
}


def make_image(path, side):
    im = Image.new("RGB", (side, side), "white")
    d = ImageDraw.Draw(im)
    # A deterministic, self-created OCR fixture; not a real-world benchmark.
    lines = ["SAMPLE INVOICE", "ID: INV-042", "ITEM      QTY      PRICE",
             "Notebook   3      12.50", "TOTAL: 37.50", "PAID: NO"]
    for i, line in enumerate(lines):
        d.text((side // 12, side // 10 + i * side // 11), line,
               fill="black", font_size=max(12, side // 30))
    im.save(path)
    return im


def main():
    a = argparse.ArgumentParser()
    a.add_argument("--model", choices=MODELS, default="qwen")
    a.add_argument("--sizes", nargs="+", type=int, default=[336, 672])
    a.add_argument("--infer", action="store_true")
    a.add_argument("--out", type=Path, default=ROOT / "evidence" / "lab-shapes.json")
    args = a.parse_args()
    args.out.parent.mkdir(parents=True, exist_ok=True)
    model_id = MODELS[args.model]
    # Explicit sizes below remain below this budget and avoid unexpected resize.
    kwargs = {"min_pixels": 28 * 28, "max_pixels": 1280 * 28 * 28} if args.model == "qwen" else {}
    processor = AutoProcessor.from_pretrained(model_id, **kwargs)
    versions = {n: importlib.metadata.version(n) for n in ["torch", "transformers", "pillow", "accelerate"]}
    result = {"model": model_id, "python": platform.python_version(), "versions": versions,
              "cuda": torch.cuda.is_available(), "processor_only": not args.infer,
              "fixture": "self-created synthetic invoice, not a benchmark", "cases": []}
    model = None
    if args.infer:
        if not torch.cuda.is_available():
            raise RuntimeError("GPU inference requested, but CUDA is unavailable. Use processor-only mode.")
        from transformers import LlavaForConditionalGeneration, Qwen2_5_VLForConditionalGeneration
        cls = Qwen2_5_VLForConditionalGeneration if args.model == "qwen" else LlavaForConditionalGeneration
        model = cls.from_pretrained(model_id, torch_dtype=torch.float16, device_map="auto")
        model.eval()
    for side in args.sizes:
        image_path = args.out.parent / f"invoice-{side}.png"
        im = make_image(image_path, side)
        prompt = "Read ID, total, and paid status. Answer only with a JSON object."
        if args.model == "qwen":
            text = processor.apply_chat_template(
                [{"role": "user", "content": [{"type": "image"}, {"type": "text", "text": prompt}]}],
                tokenize=False, add_generation_prompt=True)
            image_token = "<|image_pad|>"
        else:
            text = "USER: <image>\n" + prompt + " ASSISTANT:"
            image_token = "<image>"
        inputs = processor(text=[text], images=[im], return_tensors="pt")
        case = {"source_size": [side, side], "fixture_file": image_path.name,
                "prompt": prompt, "input_shapes": {k: list(v.shape) for k, v in inputs.items()},
                "expanded_image_placeholders": int((inputs["input_ids"] == processor.tokenizer.convert_tokens_to_ids(image_token)).sum())}
        if args.model == "qwen":
            grid = inputs["image_grid_thw"][0].tolist()
            case["image_grid_thw"] = grid
            case["expected_llm_visual_tokens"] = grid[0] * grid[1] * grid[2] // 4
        else:
            h, w = inputs["pixel_values"].shape[-2:]
            case["expected_llm_visual_tokens"] = h // 14 * (w // 14)
        assert case["expanded_image_placeholders"] == case["expected_llm_visual_tokens"], case
        if model is not None:
            inputs = inputs.to(model.device)
            with torch.inference_mode():
                generated = model.generate(**inputs, do_sample=False, max_new_tokens=128)
            case["actual_model_output"] = processor.batch_decode(
                generated[:, inputs["input_ids"].shape[1]:], skip_special_tokens=True)[0]
        result["cases"].append(case)
    args.out.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
