#!/usr/bin/env python3
"""GPU-free POPE-style scorer (stdlib only) —— 教学最小脚本,采用严格协议。

读取黄金标签与模型预测两个 JSONL,计算 POPE 的混淆矩阵与指标。
不需要 GPU、不需要模型。用于 Lab 的 C 级最小评分实验,把 L9 的
TP/FP/FN/TN、Precision/Recall/F1、yes-ratio、真实正例率亲手算一遍。

严格协议(出任何不合规都报错退出,绝不输出"貌似有效"的成绩):
  - label 只能是 "yes" / "no"(大小写不限),否则报错。
  - answer 必须是受控格式: yes / no / 是 / 否(去空格、大小写不限),
    否则报错(本脚本不做自由文本语义判断,见 Lab 说明)。
  - gold 与 pred 的 id 必须一一对应: 不允许缺失、多余、重复。
  - 以上任一不满足 → 打印错误并以非零状态退出。

JSONL 每行一个对象:
  gold.jsonl : {"id": "q1", "label": "yes"}     # yes = 图里真的有该对象
  pred.jsonl : {"id": "q1", "answer": "yes"}     # 受控格式: yes/no/是/否

用法:
  python score_pope.py --gold pope_mini_gold.jsonl --pred pope_mini_pred.jsonl
"""
import argparse
import json
import sys

YES = {"yes", "是"}
NO = {"no", "否"}


def die(msg):
    sys.stderr.write("错误: " + msg + "\n")
    sys.exit(1)


def parse_controlled(value, where):
    t = str(value).strip().lower()
    if t in YES:
        return "yes"
    if t in NO:
        return "no"
    die("%s 不是受控格式(只接受 yes/no/是/否),实际收到: %r" % (where, value))


def load_jsonl_strict(path, field, kind):
    """读入 {id: value},严格禁止重复 id。"""
    out = {}
    with open(path, encoding="utf-8") as f:
        for i, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                o = json.loads(line)
            except json.JSONDecodeError as e:
                die("%s 第 %d 行不是合法 JSON: %s" % (path, i, e))
            if "id" not in o or field not in o:
                die("%s 第 %d 行缺少 'id' 或 '%s'" % (path, i, field))
            qid = o["id"]
            if qid in out:
                die("%s 出现重复 id: %r" % (path, qid))
            out[qid] = o[field]
    if not out:
        die("%s 没有任何记录" % path)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--gold", required=True)
    ap.add_argument("--pred", required=True)
    args = ap.parse_args()

    gold_raw = load_jsonl_strict(args.gold, "label", "gold")
    pred_raw = load_jsonl_strict(args.pred, "answer", "pred")

    # id 必须一一对应
    gset, pset = set(gold_raw), set(pred_raw)
    missing = gset - pset
    extra = pset - gset
    if missing:
        die("pred 缺少这些 id: %s" % sorted(missing))
    if extra:
        die("pred 有多余 id(gold 里没有): %s" % sorted(extra))

    gold = {k: parse_controlled(v, "gold[%s].label" % k) for k, v in gold_raw.items()}
    pred = {k: parse_controlled(v, "pred[%s].answer" % k) for k, v in pred_raw.items()}

    tp = fp = fn = tn = 0
    for qid in gold:
        g, a = gold[qid], pred[qid]
        if g == "yes" and a == "yes":
            tp += 1
        elif g == "no" and a == "yes":
            fp += 1
        elif g == "yes" and a == "no":
            fn += 1
        else:
            tn += 1

    n = len(gold)  # 与 pred 一一对应,分母一致
    precision = tp / (tp + fp) if (tp + fp) else 0.0
    recall = tp / (tp + fn) if (tp + fn) else 0.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) else 0.0
    acc = (tp + tn) / n
    yes_ratio = (tp + fp) / n
    true_pos_rate = (tp + fn) / n  # 真实正例率,分母与上面一致

    print("样本数 n = %d" % n)
    print("混淆矩阵: TP=%d  FP=%d  FN=%d  TN=%d" % (tp, fp, fn, tn))
    print("Precision = %.3f" % precision)
    print("Recall    = %.3f" % recall)
    print("F1        = %.3f" % f1)
    print("Accuracy  = %.3f" % acc)
    print("yes-ratio = %.3f   (对照真实正例率 = %.3f)" % (yes_ratio, true_pos_rate))
    print("\n解读: FP 就是幻觉(图里没有却答有); yes-ratio 要对照真实正例率看,不是固定 0.5。")


if __name__ == "__main__":
    main()
